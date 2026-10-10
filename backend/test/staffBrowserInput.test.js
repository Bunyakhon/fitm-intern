const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { pressKey, clickMouse, activateButtonWithKey } = require('../scripts/staffBrowserInput');

// Transport contract tests only; this stub never claims Chrome/UI acceptance.
function transport() {
  const calls = [];
  return { calls, browser: { async send(method, params) { calls.push({ method, params }); } } };
}

for (const [name, key, code, keyCode, text] of [
  ['Enter', 'Enter', 'Enter', 13, '\r'], ['Space', ' ', 'Space', 32, ' '],
]) test(`CDP ${name} provides layout text for native button character activation`, async () => {
  const f = transport(), evidence = [];
  await pressKey(f.browser, name, event => evidence.push(event));
  assert.deepEqual(f.calls, [
    { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, modifiers: 0, text, unmodifiedText: text } },
    { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers: 0 } },
  ]);
  assert.ok(evidence.every(event => event.status === 'acknowledged'));
});

test('CDP Tab/Escape use raw keydown and keyup without a character event', async () => {
  const f = transport();
  for (const key of ['Tab', 'Escape']) await pressKey(f.browser, key);
  assert.deepEqual(f.calls.map(call => call.params.type), ['rawKeyDown', 'keyUp', 'rawKeyDown', 'keyUp']);
  assert.ok(f.calls.every(call => !Object.hasOwn(call.params, 'text') && !Object.hasOwn(call.params, 'unmodifiedText')));
});

test('Keyboard activation requires the latest connected enabled native button and real page focus', async () => {
  const f = transport(), button = { isConnected: true, disabled: false, tagName: 'BUTTON', type: 'button' };
  let element = button, pageFocus = true;
  const document = { querySelector: () => element, activeElement: button, hasFocus: () => pageFocus };
  const evaluate = expression => vm.runInNewContext(expression, { document });
  for (const changes of [
    { isConnected: false }, { disabled: true }, { tagName: 'DIV' }, { type: 'submit' },
  ]) {
    Object.assign(button, changes);
    await assert.rejects(activateButtonWithKey(f.browser, evaluate, '#staffCoopCancel', 'Enter'), /requires/);
    Object.assign(button, { isConnected: true, disabled: false, tagName: 'BUTTON', type: 'button' });
  }
  pageFocus = false;
  await assert.rejects(activateButtonWithKey(f.browser, evaluate, '#staffCoopCancel', 'Enter'), /requires/);
  pageFocus = true; element = null;
  await assert.rejects(activateButtonWithKey(f.browser, evaluate, '#staffCoopCancel', 'Enter'), /requires/);
  element = { ...button }; // Replaced element without updated focus must not receive keys.
  await assert.rejects(activateButtonWithKey(f.browser, evaluate, '#staffCoopCancel', 'Enter'), /requires/);
  assert.equal(f.calls.length, 0);
  document.activeElement = element;
  await activateButtonWithKey(f.browser, evaluate, '#staffCoopCancel', 'Enter');
  assert.equal(f.calls.length, 2);
});

test('Unsupported keys fail before transport dispatch', async () => {
  const f = transport();
  await assert.rejects(pressKey(f.browser, 'toString'), /Unsupported/);
  await assert.rejects(activateButtonWithKey(f.browser, () => true, '#staffCoopCancel', 'Tab'), /Unsupported/);
  assert.equal(f.calls.length, 0);
});

test('CDP input errors propagate and diagnostic sequence records failure', async () => {
  const evidence = [], problem = Error('Transport unavailable');
  await assert.rejects(pressKey({ send: async () => { throw problem; } }, 'Enter', event => evidence.push(event)), error => error === problem);
  assert.equal(evidence.length, 1); assert.equal(evidence[0].status, 'failed');
});

test('Mouse activation scrolls to an unobscured enabled control and sends native press/release', async () => {
  const f = transport(); let scrolled = false;
  const button = { isConnected: true, disabled: false,
    scrollIntoView() { scrolled = true; }, getBoundingClientRect: () => ({ left: 100, top: 200, width: 80, height: 40 }),
    contains: node => node === button };
  const document = { querySelector: () => button, elementFromPoint: () => button, hasFocus: () => true };
  const window = { innerWidth: 1280, innerHeight: 900 };
  const evaluate = expression => vm.runInNewContext(expression, { document, window });
  await clickMouse(f.browser, evaluate, '#staffCoopCancel');
  assert.equal(scrolled, true);
  assert.deepEqual(f.calls.map(call => call.params.type), ['mouseMoved', 'mousePressed', 'mouseReleased']);
  assert.ok(f.calls.every(call => call.method === 'Input.dispatchMouseEvent' && call.params.x === 140 && call.params.y === 220));
  assert.equal(f.calls[1].params.buttons, 1); assert.equal(f.calls[2].params.buttons, 0);
  f.calls.length = 0; button.disabled = true;
  await assert.rejects(clickMouse(f.browser, evaluate, '#staffCoopCancel'), /Unavailable/);
  button.disabled = false; document.elementFromPoint = () => ({});
  await assert.rejects(clickMouse(f.browser, evaluate, '#staffCoopCancel'), /obscured/);
  assert.equal(f.calls.length, 0);
});

test('Native mouse geometry uses instant scroll before hit-testing a below-viewport button', async () => {
  const f = transport(), evidence = []; let top = 1000;
  const button = { isConnected: true, disabled: false,
    scrollIntoView(options) { if (options.behavior === 'instant') top = 400; },
    getBoundingClientRect: () => ({left: 100, top, width: 80, height: 40}), contains: node => node === button };
  const window = {innerWidth: 1280, innerHeight: 900};
  const document = {querySelector: () => button, hasFocus: () => true, elementFromPoint: (x, y) => y < window.innerHeight ? button : null};
  await clickMouse(f.browser, expression => vm.runInNewContext(expression, {document, window}), '#staffCoopCancel', event => evidence.push(event));
  assert.equal(evidence[0].point.y, 1020); assert.equal(evidence[0].inViewport, false);
  assert.equal(evidence[1].point.y, 420); assert.equal(evidence[1].hitIsTarget, true);
  assert.equal(f.calls.length, 3); assert.ok(f.calls.every(call => call.params.y === 420));
  assert.ok(evidence.slice(2).every(event => event.status === 'acknowledged'));
});

test('Mouse geometry reselects a replacement element instead of using its removed predecessor', async () => {
  const f = transport(); let queries = 0;
  const original = {isConnected: true, disabled: false, scrollIntoView() {},
    getBoundingClientRect: () => ({left: 100, top: 200, width: 80, height: 40}), contains: node => node === original};
  const replacement = {...original, getBoundingClientRect: () => ({left: 300, top: 400, width: 80, height: 40}), contains: node => node === replacement};
  const document = {querySelector() { if (++queries === 1) return original; original.isConnected = false; return replacement; },
    elementFromPoint: () => queries === 1 ? original : replacement, hasFocus: () => true};
  await clickMouse(f.browser, expression => vm.runInNewContext(expression, {document, window: {innerWidth: 1280, innerHeight: 900}}), '#staffCoopCancel');
  assert.equal(queries, 3); assert.equal(original.isConnected, false);
  assert.ok(f.calls.every(call => call.params.x === 340 && call.params.y === 420));
});

test('Mouse hit-test waits if scrollIntoView returns a completion promise', async () => {
  const f = transport(); let top = 1000;
  const button = {isConnected: true, disabled: false, async scrollIntoView() {await Promise.resolve(); top = 400;},
    getBoundingClientRect: () => ({left: 100, top, width: 80, height: 40}), contains: node => node === button};
  const document = {querySelector: () => button, hasFocus: () => true, elementFromPoint: (x, y) => y < 900 ? button : null};
  await clickMouse(f.browser, expression => vm.runInNewContext(expression, {document, window: {innerWidth: 1280, innerHeight: 900}}), '#staffCoopCancel');
  assert.ok(f.calls.every(call => call.params.y === 420)); assert.equal(f.calls.length, 3);
});

for (const problem of ['offscreen', 'zero-size', 'covered']) test(`Mouse ${problem} failure retains geometry and sends no native event`, async () => {
  const f = transport(), evidence = [];
  const button = {isConnected: true, disabled: false, scrollIntoView() {},
    getBoundingClientRect: () => ({left: 100, top: problem === 'offscreen' ? 1000 : 200, width: problem === 'zero-size' ? 0 : 80, height: 40}),
    contains: node => node === button};
  const document = {querySelector: () => button, hasFocus: () => true, elementFromPoint: () => problem === 'covered' ? {} : button};
  const expected = {offscreen: 'Mouse coordinates outside viewport', 'zero-size': 'Mouse control has no layout box', covered: 'Mouse control is obscured'};
  await assert.rejects(clickMouse(f.browser, expression => vm.runInNewContext(expression, {document, window: {innerWidth: 1280, innerHeight: 900}}), '#staffCoopCancel', event => evidence.push(event)), error => {
    assert.equal(error.message, expected[problem]); assert.equal(error.diagnostic.operation, 'mouse-target-geometry');
    assert.equal(error.diagnostic.selector, '#staffCoopCancel'); assert.ok(error.diagnostic.rect); assert.ok(error.diagnostic.viewport);
    return true;
  });
  assert.equal(evidence.length, 2); assert.equal(f.calls.length, 0);
});

for (const problem of ['missing', 'disconnected', 'disabled']) test(`Mouse ${problem} state fails before scroll/dispatch and is retained`, async () => {
  const f = transport(), evidence = [];
  const element = problem === 'missing' ? null : {isConnected: problem !== 'disconnected', disabled: problem === 'disabled'};
  const document = {querySelector: () => element};
  await assert.rejects(clickMouse(f.browser, expression => vm.runInNewContext(expression, {document}), '#staffCoopCancel', event => evidence.push(event)), error => {
    assert.equal(error.message, 'Unavailable mouse control'); assert.equal(error.diagnostic.exists, problem !== 'missing');
    assert.equal(error.diagnostic.connected, problem === 'disabled'); return true;
  });
  assert.equal(evidence.length, 1); assert.equal(f.calls.length, 0);
});
