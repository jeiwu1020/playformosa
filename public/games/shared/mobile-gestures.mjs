// Keep browser zoom gestures out of the whole game page without owning game input.
// Pointer Events, click activation, keyboard input and multi-finger controls remain
// with each game. Never synthesize clicks or stop event propagation here.
const installed = new WeakMap();
const nativeControl = 'button,a,input,textarea,select,summary,label,[contenteditable],[role="button"]';
const editableControl = 'input,textarea,[contenteditable]';
const prevent = event => { if (event.cancelable) event.preventDefault(); };

export function protectGameGestures(surface) {
  if (installed.has(surface)) return installed.get(surface);
  const listeners = [];
  let start = null;
  let lastTap = null;
  const listen = (type, handler) => {
    surface.addEventListener(type, handler, {passive: false, capture: true});
    listeners.push([type, handler]);
  };
  const reset = () => { start = null; lastTap = null; };
  const guardGesture = event => {
    // Keep desktop double-click text selection inside editable fields. Safari
    // pinch GestureEvents are still cancelled there; typing/paste/select are not.
    if (event.type === 'dblclick' && event.target?.closest?.(editableControl)) return;
    prevent(event);
  };
  // Safari's GestureEvents need an explicit fallback as well as touch-action.
  for (const type of ['gesturestart', 'gesturechange', 'dblclick']) listen(type, guardGesture);
  listen('touchstart', event => {
    if (event.touches?.length > 1) { reset(); prevent(event); return; }
    const finger = event.touches?.[0];
    start = finger ? {x: finger.clientX, y: finger.clientY, at: event.timeStamp} : null;
  });
  listen('touchmove', event => {
    if (event.touches?.length > 1) { reset(); prevent(event); return; }
    const finger = event.touches?.[0];
    if (start && finger && Math.hypot(finger.clientX - start.x, finger.clientY - start.y) > 24) reset();
  });
  listen('touchend', event => {
    const finger = event.changedTouches?.[0];
    // Preserve real native clicks on buttons/links, including user activation for
    // sharing. CSS handles their zoom policy; this fallback is for scenery taps.
    if (event.target?.closest?.(nativeControl) ||
        event.touches?.length || !start || !finger || event.timeStamp - start.at > 300) {
      reset(); return;
    }
    const tap = {x: finger.clientX, y: finger.clientY, at: event.timeStamp};
    const stationary = Math.hypot(tap.x - start.x, tap.y - start.y) <= 24;
    if (stationary && lastTap && tap.at - lastTap.at >= 0 && tap.at - lastTap.at < 320 &&
        Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) <= 24) prevent(event);
    lastTap = stationary ? tap : null;
    start = null;
  });
  listen('touchcancel', reset);
  const dispose = () => {
    for (const [type, handler] of listeners) surface.removeEventListener(type, handler, true);
    reset();
    installed.delete(surface);
  };
  installed.set(surface, dispose);
  return dispose;
}

export function installGameGestures(root = document) {
  const surfaces = [...root.querySelectorAll('[data-game-gesture-surface]')];
  // One capture listener set covers headers, body gaps, native dialog backdrops
  // and dialogs mounted later. Do not opt the platform landing page into this.
  if (surfaces.length && root.nodeType === 9) {
    root.documentElement.setAttribute('data-game-gesture-page', '');
    return [protectGameGestures(root)];
  }
  return surfaces.map(protectGameGestures);
}
if (typeof document !== 'undefined') installGameGestures(document);

