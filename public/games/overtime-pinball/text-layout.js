export function canvasSize(w,h){const width=Math.max(256,Math.min(1024,Math.round(w*96))),height=Math.max(32,Math.round(width*h/w));if(height<=512)return{width,height};return{width:Math.round(width*512/height),height:512};}
export function fitLabelFont(text,size,measure){let font=Math.floor(size.height*.74);while(font>8&&measure(font)>size.width*.88)font--;return font;}
// Fixed framebuffer budget prevents DPR3 phones / 4K desktops from multiplying fragment work without bound.
export function renderRatio(w,h,dpr=1,economy=false){return Math.min(dpr,economy?1.4:2,Math.sqrt((economy?2200000:3600000)/Math.max(1,w*h)));}
