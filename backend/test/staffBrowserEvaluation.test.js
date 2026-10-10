const test = require('node:test');
const assert = require('node:assert/strict');
const { createBrowserEvaluate, withBrowserCleanup } = require('../scripts/staffBrowserEvaluation');

function exception(message = 'Error: Mouse control is obscured') {
  return {result: {type: 'object'}, exceptionDetails: {text: 'Uncaught', lineNumber: 6, columnNumber: 16,
    exception: {className: 'Error', description: message, objectId: 'never-record-remote-object'},
    stackTrace: {callFrames: [{functionName: 'clickMouse', url: '', lineNumber: 6, columnNumber: 16}]}}};
}

test('Browser evaluate retains returnByValue/awaitPromise and original successful values', async () => {
  const calls = [], value = {enabled: true};
  const evaluate = createBrowserEvaluate({async send(method, params) {calls.push({method, params}); return {result: {value}};}});
  assert.equal(await evaluate('1'), value);
  assert.deepEqual(calls, [{method: 'Runtime.evaluate', params: {expression: '1', returnByValue: true, awaitPromise: true}}]);
});

test('Browser evaluation exposes safe remote exception type/message/location/stack and context', async () => {
  const artifacts = [], evaluate = createBrowserEvaluate({send: async () => exception()}, {onException: diagnostic => artifacts.push(diagnostic)});
  await assert.rejects(evaluate('not recorded', {operation: 'mouse-target-geometry', selector: '#staffCoopCancel'}), error => {
    assert.equal(error.name, 'BrowserEvaluationError'); assert.match(error.message, /Error: Mouse control is obscured/);
    assert.match(error.message, /mouse-target-geometry #staffCoopCancel/);
    assert.equal(error.cause.name, 'Error'); assert.equal(error.cause.message, 'Mouse control is obscured');
    assert.match(error.cause.stack, /clickMouse \(browser-evaluation:7:17\)/);
    assert.equal(error.diagnostic.location.line, 7); assert.equal(error.diagnostic.messageRedacted, false); return true;
  });
  assert.equal(artifacts.length, 1); assert.doesNotMatch(JSON.stringify(artifacts), /not recorded|never-record-remote-object/);
});

test('Unknown exception messages, function names, URLs, selectors and expressions cannot leak private fixture data', async () => {
  const privateValue = 'student-private-fixture@example.invalid', response = exception(`Error: password token cookie JWT ${privateValue}\n raw stack`);
  response.exceptionDetails.stackTrace.callFrames[0].functionName = privateValue;
  response.exceptionDetails.stackTrace.callFrames[0].url = `http://user:password@localhost/private/${privateValue}?token=private-fixture`;
  const artifacts = [], evaluate = createBrowserEvaluate({send: async () => response}, {onException: diagnostic => artifacts.push(diagnostic)});
  await assert.rejects(evaluate(privateValue, {operation: privateValue, selector: privateValue}), error => {
    assert.equal(error.diagnostic.messageRedacted, true); assert.match(error.message, /message omitted/);
    assert.doesNotMatch(error.message + error.stack + error.cause.stack + JSON.stringify(error.diagnostic), /student-private-fixture|user:password|raw stack|cookie|JWT/);
    return true;
  });
  assert.doesNotMatch(JSON.stringify(artifacts), /student-private-fixture|user:password|raw stack|cookie|JWT/);
});

test('Known native JavaScript exceptions retain useful type and safe API message', async () => {
  const response = exception('TypeError: document.elementFromPoint is not a function'); response.exceptionDetails.exception.className = 'TypeError';
  const evaluate = createBrowserEvaluate({send: async () => response});
  await assert.rejects(evaluate('not recorded'), error => error.cause.name === 'TypeError' && error.cause.message === 'document.elementFromPoint is not a function');
});

test('Diagnostic file-write failure does not mask the original remote exception', async () => {
  const evaluate = createBrowserEvaluate({send: async () => exception()}, {onException: () => {throw Error('Artifact unavailable');}});
  await assert.rejects(evaluate('1'), error => {
    assert.equal(error.diagnosticCaptureFailed, true); assert.equal(error.cause.message, 'Mouse control is obscured');
    assert.doesNotMatch(error.message, /Artifact unavailable/); return true;
  });
});

test('CDP transport rejection propagates the same original error', async () => {
  const original = Error('Transport unavailable'), evaluate = createBrowserEvaluate({send: async () => {throw original;}});
  await assert.rejects(evaluate('1'), error => error === original);
});

test('Observer/focus diagnostic cleanup cannot mask the original interaction exception', async () => {
  const original = Error('Interaction failed'), diagnostics = [];
  await assert.rejects(withBrowserCleanup(async () => {throw original;}, async () => {throw Error('Cleanup failed');}, diagnostic => diagnostics.push(diagnostic)), error => error === original);
  assert.equal(diagnostics.length, 1); assert.doesNotMatch(JSON.stringify(diagnostics), /Cleanup failed/);
});

test('Secondary recorder failure also preserves the original interaction exception', async () => {
  const original = Error('Interaction failed');
  await assert.rejects(withBrowserCleanup(async () => {throw original;}, async () => {throw Error('Cleanup failed');}, () => {throw Error('Recorder failed');}), error => error === original);
});

test('Cleanup failure after successful interaction is reported, not silently accepted', async () => {
  const original = Error('Cleanup failed');
  await assert.rejects(withBrowserCleanup(async () => 42, async () => {throw original;}), error => error === original);
  assert.equal(await withBrowserCleanup(async () => 42, async () => {}), 42);
});

test('Even falsy JavaScript throws are not replaced by cleanup errors', async () => {
  for (const original of [null, undefined, false, 0]) {
    let caught = false;
    try { await withBrowserCleanup(async () => {throw original;}, async () => {throw Error('Cleanup failed');}); }
    catch (error) {caught = true; assert.equal(error, original);}
    assert.equal(caught, true);
  }
});
