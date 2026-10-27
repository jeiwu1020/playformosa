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
export function paintScoreCard(source,info,focus={x:.5,y:.5},createCanvas=()=>document.createElement('canvas')){
 if(!source.width||!source.height)throw new Error('Game screenshot is not ready');
 const canvas=createCanvas();canvas.width=1080;canvas.height=1180;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image canvas unavailable');
 ctx.fillStyle='#f4f1e9';ctx.fillRect(0,0,1080,1180);
 const text=(content,x,y,size,color='#172c3b',weight=700)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillText(content,x,y);};
 text('PLAYFORMOSA STUDIO',44,57,27,'#607461');text('四肢各有想法－跳遠',40,120,52);
 const {score}=resultDisplay(info);text('冒險里程 · 約',44,170,24,'#607461');text(score,38,258,score.length>12?76:score.length>9?92:126,info.valid?'#172c3b':'#b65b43',900);
 ctx.font='700 29px system-ui, sans-serif';const lines=[];let line='';for(const char of(info.title||'')){const candidate=line+char,width=ctx.measureText?ctx.measureText(candidate).width:[...candidate].length*30;if(width>980&&line){lines.push(line);line=char;}else line=candidate;}if(line)lines.push(line);lines.slice(0,2).forEach((value,i)=>text(value,44,311+i*35,29,'#536954'));
 const x=42,y=377,w=996,h=588,ratio=w/h,sw=source.width,sh=source.height;
 const cw=Math.min(sw,sh*ratio),ch=cw/ratio;
 const sx=clamp(focus.x*sw-cw/2,0,sw-cw),sy=clamp(focus.y*sh-ch*.45,0,sh-ch);
 ctx.drawImage(source,sx,sy,cw,ch,x,y,w,h);
 ctx.strokeStyle='#d3dacb';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
 text(info.journey||(info.valid?'這一跳，值得留念。':info.foul?'越線不計分，好笑照樣留念。':'下次再跟地心引力約。'),44,1020,30);
 if(info.foul)text('越線不計成績 · 旅遊紀錄保留',44,1052,20,'#b65b43');
 text('航線估算，非台北直線距離；太空為科幻航線',44,info.foul?1080:1060,info.foul?18:20,'#708176');
 text('島遊無界 · PLAYFORMOSA',44,info.foul?1114:1090,info.foul?25:29,'#607461');
 text('四肢各有想法－跳遠',44,1152,22,'#7e8a80',500);
 return canvas;
}
