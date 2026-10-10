// Never serialize expressions or raw RemoteObjects: they can contain credentials/PII.
const selectors = new Set(['#staffCoopCancel', '.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__cancel']);
const operations = new Set(['evaluate', 'mouse-target-before-scroll', 'mouse-target-geometry', 'keyboard-focus-check', 'focus-state', 'input-observer-stop']);
const messages = new Set(['Unavailable mouse control', 'Mouse control is obscured', 'Mouse control has no layout box', 'Mouse coordinates outside viewport']);
const types = new Set(['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'URIError', 'EvalError', 'DOMException', 'SecurityError', 'AggregateError']);
const functions = new Set(['clickMouse', 'evaluate', 'scrollIntoView', 'getBoundingClientRect', 'elementFromPoint', 'contains', 'querySelector']);

function safeContext(context = {}) {
  return { operation: operations.has(context.operation) ? context.operation : 'evaluate',
    ...(context.selector ? {selector: selectors.has(context.selector) ? context.selector : '[selector omitted]'} : {}) };
}
const position = value => Number.isInteger(value) && value >= 0 ? value + 1 : null;
function safeException(details, context) {
  const remote = details.exception || {}, firstLine = String(remote.description || remote.value || '').split('\n')[0];
  const type = types.has(remote.className) ? remote.className : types.has(firstLine.split(':')[0]) ? firstLine.split(':')[0] : 'Error';
  const originalMessage = firstLine.startsWith(`${type}: `) ? firstLine.slice(type.length + 2) : firstLine;
  const safeNativeMessage = /^(?:Cannot read properties of (?:null|undefined) \(reading '(?:isConnected|disabled|width|height|scrollIntoView|getBoundingClientRect|contains|elementFromPoint|value)'\)|(?:document\.(?:querySelector|elementFromPoint)|element\.(?:scrollIntoView|getBoundingClientRect|contains)) is not a function|(?:getComputedStyle|document|window) is not defined)$/;
  const allowed = messages.has(originalMessage) || safeNativeMessage.test(originalMessage);
  return { ...safeContext(context), type, message: allowed ? originalMessage : '[exception message omitted: may contain sensitive data]',
    messageRedacted: !allowed, location: {source: 'browser-evaluation', line: position(details.lineNumber), column: position(details.columnNumber)},
    frames: (details.stackTrace?.callFrames || []).slice(0, 12).map(frame => ({
      function: functions.has(frame.functionName) ? frame.functionName : '<anonymous>',
      source: frame.url ? 'browser-script' : 'browser-evaluation', line: position(frame.lineNumber), column: position(frame.columnNumber),
    })) };
}

function createBrowserEvaluate(browser, { onException } = {}) {
  return async function evaluate(expression, context = {}) {
    const response = await browser.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (!response.exceptionDetails) return response.result.value;
    const diagnostic = safeException(response.exceptionDetails, context);
    const cause = new Error(diagnostic.message); cause.name = diagnostic.type;
    cause.stack = `${cause.name}: ${cause.message}` + diagnostic.frames.map(frame =>
      `\n    at ${frame.function} (${frame.source}:${frame.line ?? '?'}:${frame.column ?? '?'})`).join('');
    const error = new Error(`Browser evaluation failed (${diagnostic.operation}${diagnostic.selector ? ` ${diagnostic.selector}` : ''}): ${diagnostic.type}: ${diagnostic.message}; ${diagnostic.location.source}:${diagnostic.location.line ?? '?'}:${diagnostic.location.column ?? '?'}`, { cause });
    error.name = 'BrowserEvaluationError'; error.diagnostic = diagnostic;
    try { await onException?.(diagnostic); }
    catch { error.diagnosticCaptureFailed = true; }
    throw error;
  };
}

// Diagnostic/observer cleanup failures must never replace the interaction failure.
async function withBrowserCleanup(action, cleanup, recordCleanupFailure = () => {}) {
  let failed = false;
  try { return await action(); }
  catch (error) { failed = true; throw error; }
  finally {
    try { await cleanup(); }
    catch (error) {
      if (!failed) throw error;
      try { recordCleanupFailure(error?.diagnostic || { operation: 'evaluate', message: 'Secondary browser cleanup failed' }); } catch {}
    }
  }
}

module.exports = { createBrowserEvaluate, safeContext, withBrowserCleanup };
