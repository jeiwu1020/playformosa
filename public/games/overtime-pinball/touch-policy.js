// Keep two independent pointer presses available to L/R. Only browser gestures
// are cancelled; ordinary single-finger menu scrolling remains available.
const prevent=e=>{if(document.body.classList.contains('sideways-menus')&&e.target?.closest?.('#intro.menu-sheet,#intro,#pauseScreen,[data-game-menu]'))return;if(e.target?.closest?.('dialog,.pf-header,input,textarea,[contenteditable]'))return;if(e.cancelable)e.preventDefault();};
for(const type of ['gesturestart','gesturechange','gestureend','dblclick','selectstart','contextmenu','dragstart'])document.addEventListener(type,prevent,{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1)prevent(e);},{passive:false});
// CSS touch-action:manipulation prevents double-tap zoom on controls.
// Do not cancel touchend: menus depend on its synthesized click, including a
// quick tap immediately after releasing a flipper or another menu button.
