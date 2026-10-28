// Scope this to the live game surface, never document/body or result/settings.
// iOS callouts/loupe gestures need touch-default suppression in addition to CSS.
// Pointer Events remain the sole gameplay input; do not generate duplicate taps,
// stop propagation, or interfere with pointercancel / the result contact guard.
export function protectPlaySurface(surface){
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 for(const type of ['selectstart','contextmenu','dragstart'])surface.addEventListener(type,prevent,{capture:true});
 for(const type of ['touchstart','touchmove','touchend'])surface.addEventListener(type,prevent,{passive:false});
}
