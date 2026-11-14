// Like the reference game's logical viewport: swap dimensions and rotate 90°.
// The iframe keeps CSS media queries, WebGL, dialogs and native hit testing in
// one logical coordinate space; no clientX/clientY correction is needed.
export function shellFrame(w,h,sideways,safe={}){
 const left=Math.max(0,safe.left||0),top=Math.max(0,safe.top||0),screenWidth=Math.max(1,w-left-Math.max(0,safe.right||0)),screenHeight=Math.max(1,h-top-Math.max(0,safe.bottom||0)),rotation=sideways&&h>w?90:0;
 return {left,top,screenWidth,screenHeight,width:rotation?screenHeight:screenWidth,height:rotation?screenWidth:screenHeight,rotation};
}
