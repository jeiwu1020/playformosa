export function viewPlan(width,height,angle='front'){
 const w=Number.isFinite(width)&&width>0?width:1,h=Number.isFinite(height)&&height>0?height:1,aspect=w/h,close=angle==='hands',halfH=close?Math.max(.43,.68/aspect):Math.max(.94,1.09/aspect);
 return{frustum:{left:-halfH*aspect,right:halfH*aspect,top:halfH,bottom:-halfH,near:.1,far:30},position:close?[1.25,1.55,4.4]:angle==='front'?[0,1.75,5.4]:[1.7,1.9,4.4],target:close?[0,1.10,.28]:[0,1.4,.24]};
}
