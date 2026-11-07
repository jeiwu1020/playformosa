// Platform typography on a 1080px-wide card whose height follows its actual content.
// The photo is the frozen, complete final game frame, never a replacement illustration.
export function paintCourtesyScoreCard(source,info,createCanvas=()=>document.createElement('canvas')){
 if(!source.width||!source.height)throw Error('Game screenshot is not ready');
 const canvas=createCanvas();canvas.width=1080;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image canvas unavailable');
 const x=44,width=992,gap=14,margin=30;let cursor=margin;
 function metrics(value,size){const m=ctx.measureText(value);return{width:m.width,ascent:m.actualBoundingBoxAscent??size*.85,descent:m.actualBoundingBoxDescent??size*.25};}
 function block(value,size,color='#172c3b',weight=700,wrap=false){
  value=String(value??'');const set=()=>{ctx.font=`${weight} ${size}px system-ui, sans-serif`;};set();
  if(!wrap)while(size>16&&metrics(value,size).width>width){size--;set();}
  let lines=[],line='';for(const char of value){if(line&&metrics(line+char,size).width>width){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
  const measured=lines.map(text=>({text,...metrics(text,size)}));
  return{height:measured.reduce((sum,m)=>sum+m.ascent+m.descent,0)+Math.max(0,measured.length-1)*10,draw(top){set();ctx.fillStyle=color;let y=top;for(const m of measured){ctx.fillText(m.text,x,y+m.ascent);y+=m.ascent+m.descent+10;}}};
 }
 const heading=[
  block('PLAYFORMOSA STUDIO',27,'#607461'),
  block('客氣大賽',52),
  block('本次互讓成績',24,'#607461'),
  block(info.count+' 次互讓',126,'#172c3b',900),
  block(info.grade+' · '+info.title,29,'#536954',700,true),
  block(info.status+(info.bonus?' · 連鎖 +'+info.bonus:''),27,'#536954',700,true),
  block(info.remaining,27,'#536954',700,true)
 ];
 const footer=[block('島遊無界 · PLAYFORMOSA',29,'#607461'),block('客氣大賽',22,'#7e8a80',500)];
 const photoHeight=width*source.height/source.width;
 // Measure first: resizing clears the canvas and its font state, so each block restores its font.
 canvas.height=Math.ceil(margin*2+photoHeight+[...heading,...footer].reduce((sum,b)=>sum+b.height+gap,0));
 ctx.fillStyle='#f4f1e9';ctx.fillRect(0,0,canvas.width,canvas.height);
 function place(b){b.draw(cursor);cursor+=b.height+gap;}
 heading.forEach(place);
 ctx.drawImage(source,x,cursor,width,photoHeight);cursor+=photoHeight+gap;
 footer.forEach(place);return canvas;
}
