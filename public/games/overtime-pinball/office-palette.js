// A · 明亮辦公室. Presentation only; no collision or scoring configuration.
export const OFFICE_PALETTE=Object.freeze({ink:0x163e47,cream:0xfff2d5,teal:0x079fa5,mint:0xcdeddc,yellow:0xffd044,orange:0xff8154,blue:0x48c9d4});
export const OFFICE_SURFACES=Object.freeze({surround:0x103f50,lane:0x248f94,glass:0x86ded3,grid:'#bdddcf',floorCream:'#fff2d5',floorMint:'#cdeddc'});
// One baked texture for the existing floor mesh. Broad office zones read at phone
// scale; the low-contrast grid provides depth without competing with word lamps.
export function paintOfficeFloor(ctx,width,height){
 ctx.fillStyle=OFFICE_SURFACES.floorCream;ctx.fillRect(0,0,width,height);
 ctx.fillStyle=OFFICE_SURFACES.floorMint;ctx.fillRect(0,0,width,height*.32);ctx.fillRect(0,height*.48,width,height*.32);
 ctx.strokeStyle=OFFICE_SURFACES.grid;ctx.lineWidth=1;ctx.beginPath();
 for(let x=0;x<=9;x++){ctx.moveTo(x*width/9,0);ctx.lineTo(x*width/9,height);}
 for(let y=0;y<=17;y++){ctx.moveTo(0,y*height/17);ctx.lineTo(width,y*height/17);}
 ctx.stroke();
}
