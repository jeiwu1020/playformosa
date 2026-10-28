// Cancel native selection/callouts, not clicks: ordinary buttons must retain
// keyboard focus and transient user activation for sharing and downloads.
const prevent=event=>{if(event.cancelable)event.preventDefault();};
export function protectSelection(surface){
 for(const type of ['selectstart','contextmenu','dragstart'])surface.addEventListener(type,prevent,{capture:true});
}

// Like hurdles, suppress iOS touch defaults only on the live game surface.
// Never bind this to document/body or the scrolling rules/results dialog.
// Pointer Events remain the sole gameplay input, including cancellation.
export function protectPlaySurface(surface){
 protectSelection(surface);
 for(const type of ['touchstart','touchmove','touchend'])surface.addEventListener(type,prevent,{passive:false});
}
