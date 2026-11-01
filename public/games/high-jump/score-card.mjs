// Adapted from the actual PlayFormosa long-jump capture template; same studio typography hierarchy.
// All text blocks advance from measured ink bounds, never a guessed baseline.
export function paintScoreCard(source,info,createCanvas=()=>document.createElement('canvas'),renderScene=null){
 if(!source.width||!source.height)throw new Error('Game screenshot is not ready');
 const canvas=createCanvas();canvas.width=1080;canvas.height=1180;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image canvas unavailable');
 ctx.fillStyle='#f4f1e9';ctx.fillRect(0,0,1080,1180);
 const x=44,width=992,gap=14;let cursor=30;
 function metrics(value,size){const m=ctx.measureText?.(value);return{width:m?.width??[...value].length*size,ascent:m?.actualBoundingBoxAscent??size*.85,descent:m?.actualBoundingBoxDescent??size*.25};}
 function block(value,size,color='#172c3b',weight=700,maxLines=1){
  value=String(value??'');let lines=[];
  const set=()=>{ctx.font=`${weight} ${size}px system-ui, sans-serif`;};set();
  if(maxLines===1){while(size>16&&metrics(value,size).width>width){size--;set();}}
  let line='';for(const char of value){if(line&&metrics(line+char,size).width>width){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
  if(lines.length>maxLines){lines=lines.slice(0,maxLines);let last=lines.at(-1);while(last&&metrics(last+'…',size).width>width)last=last.slice(0,-1);lines[lines.length-1]=last+'…';}
  const measured=lines.map(text=>({text,...metrics(text,size)}));
  return{height:measured.reduce((sum,m)=>sum+m.ascent+m.descent,0)+Math.max(0,measured.length-1)*10,draw(top){set();ctx.fillStyle=color;let y=top;for(const m of measured){ctx.fillText(m.text,x,y+m.ascent);y+=m.ascent+m.descent+10;}}};
 }
 function place(b){b.draw(cursor);cursor+=b.height+gap;}
 place(block('PLAYFORMOSA STUDIO',27,'#607461'));
 place(block('四肢各有想法｜跳高',52));
 place(block('過桿成績',24,'#607461'));
 place(block(info.success?'過桿 '+info.height.toFixed(1)+' m':'未過桿',126,info.success?'#172c3b':'#b65b43',900));
 place(block(info.title||'',29,'#536954',700,2));
 const footer=[block('島遊無界 · PLAYFORMOSA',29,'#607461'),block('四肢各有想法｜跳高',22,'#7e8a80',500)];
 const footerHeight=footer.reduce((sum,b)=>sum+b.height+gap,0),h=Math.floor(Math.min(588,canvas.height-30-cursor-gap-footerHeight)),w=width;
 // Production re-renders the complete original pose at the photo's aspect; never crops a portrait athlete.
 const photo=renderScene?renderScene(w,h):source,scale=Math.min(w/photo.width,h/photo.height);
 ctx.fillStyle='#beded1';ctx.fillRect(x,cursor,w,h);ctx.drawImage(photo,x+(w-photo.width*scale)/2,cursor+(h-photo.height*scale)/2,photo.width*scale,photo.height*scale);
 ctx.strokeStyle='#d3dacb';ctx.lineWidth=2;ctx.strokeRect?.(x,cursor,w,h);cursor+=h+gap;
 footer.forEach(place);return canvas;
}

