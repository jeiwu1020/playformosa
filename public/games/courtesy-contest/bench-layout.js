// Opaque seated-body bounds, not transparent sprite-sheet cell widths.
const BODY={
 0:{left:95,right:290,anchor:181,height:323},
 1:{left:72,right:281,anchor:181,height:323},
 2:{left:69,right:255,anchor:181,height:323},
 3:{left:219,right:573,anchor:405,height:675},
 4:{left:147,right:528,anchor:353,height:675},
 5:{left:97,right:482,anchor:302,height:675}
};
export function carriageLayout(width,height,mobile){
 const sides=mobile?[[0,3],[4,5]]:[[0,3,1],[2,4,5]];
 const gap=width*.006,padding=Math.max(3,width*.009);
 const ratios=sides.map(types=>types.reduce((sum,type)=>sum+(BODY[type].right-BODY[type].left)/BODY[type].height,0));
 // Solve the entire row at once: six/four neighbours plus one exclusive hero
 // seat. These seated illustrations have larger heads/shorter bodies than the
 // standing sheets. Calibrate their body height to 350 adult units, rather
 // than the hero's 419px seated silhouette, so they no longer dwarf the pair.
 const bodyHeight=(width*.415-gap*(sides[0].length-1)-padding)/(Math.max(...ratios)+211/700);
 const baseScale=bodyHeight/350,vacancyWidth=211*baseScale+padding*2;
 const sideWidth=width*.415-vacancyWidth/2;
 const seats={};
 sides.forEach((types,side)=>{
  const seatedHeight=(sideWidth-gap*(types.length-1))/ratios[side];
  let edge=side?width/2+vacancyWidth/2:width*.085;
  for(const type of types){
   const b=BODY[type],scale=seatedHeight/b.height,w=(b.right-b.left)*scale;
   seats[type]={x:edge+(b.anchor-b.left)*scale,scale};edge+=w+gap;
  }
 });
 return{seats,baseScale,vacancyWidth};
}
export function benchLayout(width,height,mobile){return carriageLayout(width,height,mobile).seats;}
