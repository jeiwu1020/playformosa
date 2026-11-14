// Geometry only: retain the game's measured render frame, never move its canvas.
export function observePlatformHeader(document){
 const win=document.defaultView,header=document.querySelector('.pf-header');
 const measure=()=>{const height=Math.ceil(header?.getBoundingClientRect().height||0);if(height>0)document.body.style.setProperty('--pf-header-height',`${height}px`)};
 const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(measure):null;
 if(header)observer?.observe(header);win.addEventListener('resize',measure);measure();
 return()=>{observer?.disconnect();win.removeEventListener('resize',measure)};
}
export function clipIntroFrame(frame,viewportHeight,headerHeight){
 if(!frame)return null;const bottom=viewportHeight-frame.y,top=Math.max(bottom-frame.h,headerHeight+8),height=bottom-top;
 return height>0?{...frame,h:height}:null;
}
