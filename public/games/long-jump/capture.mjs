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
 text('PLAYFORMOSA STUDIO',44,57,27,'#607461');text('四肢各有想法',40,120,52);
 text(info.valid?info.distance.toFixed(2)+' m':info.foul?'犯規':'未計分',38,258,126,info.valid?'#172c3b':'#b65b43',900);
 text(info.title,44,311,32,'#536954');
 const x=42,y=345,w=996,h=620,ratio=w/h,sw=source.width,sh=source.height;
 const cw=Math.min(sw,sh*ratio),ch=cw/ratio;
 const sx=clamp(focus.x*sw-cw/2,0,sw-cw),sy=clamp(focus.y*sh-ch*.45,0,sh-ch);
 ctx.drawImage(source,sx,sy,cw,ch,x,y,w,h);
 ctx.strokeStyle='#d3dacb';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
 text('起跳 '+(info.takeoffKmh===null?'—':info.takeoffKmh.toFixed(1)+' km/h')+'  ·  空翻 '+info.flips+' 圈',44,1020,31);
 text(info.valid?'最近沙痕：'+info.part+'  ·  助推 '+info.boosts+'/2':'這一跳不列入最佳成績  ·  助推 '+info.boosts+'/2',44,1066,28,'#607461');
 if(info.badge)text(info.badge,44,1112,29,'#536e37');
 text('跳遠試作 v0.3 · 遊戲成績分享圖',44,1152,22,'#7e8a80',500);
 return canvas;
}
