// Native CDP input for cancellation acceptance; never invokes element.click().
// CDP text is layout output: Enter needs CR to generate the button's keypress.
// https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/Input.ts
const { safeContext } = require('./staffBrowserEvaluation');
const keys = {
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
};

async function pressKey(browser, name, record = () => {}) {
  if (!Object.hasOwn(keys, name)) throw Error('Unsupported acceptance key');
  const { text, ...identity } = keys[name];
  const down = { type: text ? 'keyDown' : 'rawKeyDown', ...identity, modifiers: 0 };
  if (text) { down.text = text; down.unmodifiedText = text; }
  async function dispatch(params) {
    const entry = { ...params, status: 'sent' }; record(entry);
    try { await browser.send('Input.dispatchKeyEvent', params); entry.status = 'acknowledged'; }
    catch (error) { entry.status = 'failed'; throw error; }
  }
  await dispatch(down);
  await dispatch({ type: 'keyUp', ...identity, modifiers: 0 });
}

async function clickMouse(browser, evaluate, selector, record = () => {}) {
  const inspect = scroll => `(async () => {
    let element = document.querySelector(${JSON.stringify(selector)});
    let state = { exists: !!element, connected: !!element?.isConnected, disabled: !!element?.disabled };
    if (!state.connected || state.disabled) return state;
    if (${scroll}) {
      await element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
      element = document.querySelector(${JSON.stringify(selector)});
      state = { exists: !!element, connected: !!element?.isConnected, disabled: !!element?.disabled };
      if (!state.connected || state.disabled) return state;
    }
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const inViewport = Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight;
    const hit = inViewport ? document.elementFromPoint(x, y) : null;
    return { ...state, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, point: { x, y },
      viewport: { width: window.innerWidth, height: window.innerHeight }, inViewport, hitExists: !!hit,
      hitIsTarget: !!hit && element.contains(hit), pageHasFocus: document.hasFocus() };
  })()`;
  async function inspectTarget(scroll) {
    const context = { operation: scroll ? 'mouse-target-geometry' : 'mouse-target-before-scroll', selector };
    const state = await evaluate(inspect(scroll), context);
    const diagnostic = { ...safeContext(context), ...state }; record(diagnostic);
    function fail(message) { const error = new Error(message); error.diagnostic = { ...diagnostic, type: 'Error', message }; throw error; }
    if (!state.connected || state.disabled) fail('Unavailable mouse control');
    if (scroll) {
      if (!state.rect.width || !state.rect.height) fail('Mouse control has no layout box');
      if (!state.inViewport) fail('Mouse coordinates outside viewport');
      if (!state.hitIsTarget) fail('Mouse control is obscured');
    }
    return state;
  }
  await inspectTarget(false);
  const { point } = await inspectTarget(true);
  async function dispatch(params) {
    const entry = { operation: params.type, ...point, status: 'sent' }; record(entry);
    try { await browser.send('Input.dispatchMouseEvent', params); entry.status = 'acknowledged'; }
    catch (error) { entry.status = 'failed'; throw error; }
  }
  await dispatch({ type: 'mouseMoved', ...point, button: 'none', buttons: 0 });
  await dispatch({ type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
  await dispatch({ type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
}

async function activateButtonWithKey(browser, evaluate, selector, name, record) {
  if (!['Enter', 'Space'].includes(name)) throw Error('Unsupported button activation key');
  const focused = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    return !!element?.isConnected && element.tagName === 'BUTTON' && element.type === 'button'
      && !element.disabled && document.activeElement === element && document.hasFocus();
  })()`, { operation: 'keyboard-focus-check', selector });
  if (!focused) throw Error('Keyboard activation requires the current enabled native button to have page focus');
  await pressKey(browser, name, record);
}

module.exports = { pressKey, clickMouse, activateButtonWithKey };
