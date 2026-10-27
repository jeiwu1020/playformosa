import {resultDisplay} from './presentation.mjs';
// Rendering and copying must be adjacent: a WebGL canvas with the default buffer may clear between frames.
export function captureResultPng({render,source,paint}){
 try{
  render();
  const canvas=paint(source);
  return new Promise((resolve,reject)=>{
   if(typeof canvas.toBlob!=='function'){reject(new Error('PNG encoding unavailable'));return;}
   canvas.toBlob(blob=>blob&&blob.size>0?resolve(blob):reject(new Error('PNG encoding returned no image')),'image/png');
  });
 }catch(error){return Promise.reject(error);}
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// All text blocks advance from measured ink bounds, never a guessed baseline.
export function paintScoreCard(source,info,focus={x:.5,y:.5},createCanvas=()=>document.createElement('canvas'),preview=null){
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
 place(block('四肢各有想法－跳遠',52));
 place(block('冒險里程 · 約',24,'#607461'));
 place(block(resultDisplay(info).score,126,info.valid?'#172c3b':'#b65b43',900));
 place(block(info.title||'',29,'#536954',700,2));
 const footer=[block(info.journey||(info.valid?'這一跳，值得留念。':info.foul?'越線不計分，好笑照樣留念。':'下次再跟地心引力約。'),30,'#172c3b',700,2)];
 if(info.foul)footer.push(block('越線不計成績 · 探索紀錄保留',22,'#b65b43'));
 footer.push(block('島遊無界 · PLAYFORMOSA',29,'#607461'),block('四肢各有想法－跳遠',22,'#7e8a80',500));
 const footerHeight=footer.reduce((sum,b)=>sum+b.height+gap,0),h=Math.floor(Math.min(588,canvas.height-30-cursor-gap-footerHeight)),w=width,ratio=w/h,sw=source.width,sh=source.height;
 const cw=Math.min(sw,sh*ratio),ch=cw/ratio,sx=clamp(focus.x*sw-cw/2,0,sw-cw),sy=clamp(focus.y*sh-ch*.45,0,sh-ch);
 ctx.drawImage(source,sx,sy,cw,ch,x,cursor,w,h);
 // The modal shows this same photograph, with its own responsive HTML score/verdict.
 if(preview){preview.width=w;preview.height=h;const context=preview.getContext('2d');if(!context)throw new Error('Preview canvas unavailable');context.drawImage(source,sx,sy,cw,ch,0,0,w,h);}
 ctx.strokeStyle='#d3dacb';ctx.lineWidth=2;ctx.strokeRect(x,cursor,w,h);cursor+=h+gap;
 footer.forEach(place);return canvas;
}

// A separate 2D bitmap survives WebGL resize/clear and is shared by preview and PNG retries.
export function createLandingCapture(createCanvas=()=>document.createElement('canvas')){
 let current=null;return{get current(){return current;},reset(){current=null;},freeze(source,focus={x:.5,y:.5}){
  if(current)return current;if(!source.width||!source.height)throw new Error('Landing frame unavailable');
  const canvas=createCanvas();canvas.width=source.width;canvas.height=source.height;const context=canvas.getContext('2d');if(!context)throw new Error('Landing image canvas unavailable');context.drawImage(source,0,0);
  current={canvas,focus:{x:focus.x,y:focus.y}};return current;
 }};
}
