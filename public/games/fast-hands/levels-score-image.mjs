import {wrapScoreText} from './score-image.mjs';

const WIDTH=1080,HEIGHT=1350,TIMEOUT=8000;
const FONT='system-ui, -apple-system, "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const GREEN='#174941',MUTED='#66786a';
const failure=()=>new Error('本次成績圖片無法產生，請稍後再試。');
function bounded(promise,ms=TIMEOUT){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(failure()),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}

/** Presentation only: counts settled outcomes without changing game rules or times. */
export function describeLevelScore(state,mode=state?.mode){
 const results=state?.results;
 if(!['catch','duel'].includes(mode)||state?.mode!==mode||state.phase!=='done'||state.practice||!Array.isArray(results)||!results.length||mode==='duel'&&results.length!==10)throw new TypeError('需要已完成的正式挑戰成績。');
 if(results.some(result=>!result||!['player','ai','draw','none'].includes(result.winner)))throw new TypeError('成績資料不完整。');
 const wins=results.filter(r=>r.winner==='player').length,opponent=results.filter(r=>r.winner==='ai').length,draws=results.filter(r=>r.winner==='draw').length,early=results.filter(r=>r.reason==='early').length;
 const catching=mode==='catch',flight=results.at(-1).flightMs;
 const speed=Number.isFinite(flight)&&flight>0?` · 最快挑戰 ${Math.round(flight)} ms 飛行速度`:'';
 return Object.freeze({mode,modeText:catching?'玩具彈接接樂':'十回合對決',wins,opponent,draws,rounds:results.length,
  title:catching?`闖到第 ${results.length} 關`:wins>opponent?'你贏了快手王！':wins<opponent?'這次快手王贏了！':'十回合，不分高下！',
  scoreText:catching?`${wins} 關通過`:`${wins} : ${opponent}`,
  note:catching?`第 ${results.length} 關失誤${speed}。每次從第 1 關重新出發。`:`你的勝場 : 快手王勝場 · 搶跑 ${early} 次 · 平手 ${draws} 次`,
 });
}
export function levelScoreImageFilename(result){
 if(!['catch','duel'].includes(result?.mode)||!Number.isSafeInteger(result.wins)||result.wins<0||!Number.isSafeInteger(result.opponent)||result.opponent<0)throw failure();
 return result.mode==='catch'?`fast-hands-catch-${result.wins}-stages.png`:`fast-hands-duel-${result.wins}-${result.opponent}.png`;
}
function rect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function text(ctx,value,x,y,size=30,weight=700,color=GREEN,width=900){ctx.font=`${weight} ${size}px ${FONT}`;ctx.textBaseline='top';ctx.fillStyle=color;ctx.fillText(value,x,y,width);}
function paragraph(ctx,value,x,y,{size=30,lineHeight=43,maxLines=3}={}){ctx.font=`600 ${size}px ${FONT}`;wrapScoreText(ctx,value,900,{maxLines}).forEach((line,i)=>text(ctx,line,x,y+i*lineHeight,size,600,GREEN));}
async function decodedFrame(frame,doc){
 const output=await bounded(frame),blob=output?.blob;
 if(!blob||blob.type!=='image/png'||!Number.isFinite(blob.size)||blob.size<=0||output.width!==900||output.height!==620)throw failure();
 const win=doc.defaultView??globalThis,bitmap=win.createImageBitmap;
 if(typeof bitmap==='function'){
  let expired=false;
  const pending=Promise.resolve().then(()=>bitmap.call(win,blob)).then(image=>{if(expired){image?.close?.();throw failure();}return image;});
  let image;try{image=await bounded(pending);}catch(error){expired=true;throw error;}
  if(image.width!==900||image.height!==620){image.close?.();throw failure();}
  return{image,release:()=>image.close?.()};
 }
 const urls=win.URL??globalThis.URL,url=urls.createObjectURL(blob),image=doc.createElement('img');
 try{
  await new Promise((resolve,reject)=>{
   const finish=error=>{clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);error?reject(error):resolve();};
   const loaded=()=>finish(),failed=()=>finish(failure()),timer=setTimeout(failed,TIMEOUT);
   image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});image.src=url;
   if(image.complete&&image.naturalWidth>0)finish();
  });
  if(image.naturalWidth!==900||image.naturalHeight!==620)throw failure();
  return{image,release:()=>{image.removeAttribute('src');urls.revokeObjectURL(url);}};
 }catch(error){image.removeAttribute('src');urls.revokeObjectURL(url);throw error;}
}
/** Branded PNG using a previously captured actual frame, never the changing live stage. */
export async function createLevelScoreImage({result,frame=result?.frame,document:doc=globalThis.document}={}){
 if(!doc?.createElement||!result)throw failure();
 const frozen=Object.freeze({...result}),filename=levelScoreImageFilename(frozen);
 const fonts=doc.fonts?.ready?bounded(doc.fonts.ready,1500).catch(()=>{}):Promise.resolve();
 const source=await decodedFrame(frame,doc);
 try{
  await fonts;
  const canvas=doc.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d');if(!ctx)throw failure();
  ctx.fillStyle='#fff9e9';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.lineWidth=3;rect(ctx,28,28,1024,1294,36,'#fffdf6',GREEN);
  text(ctx,'FAST HANDS  /  快手王',90,77,28,800,MUTED);
  text(ctx,frozen.modeText,90,129,49,900);
  // The entire 900 × 620 captured frame is retained at 1:1, without cropping.
  ctx.drawImage(source.image,90,208,900,620);
  rect(ctx,76,858,928,203,25,'#dcebdd');text(ctx,'本次成績',110,884,27,700,MUTED,860);
  text(ctx,frozen.scoreText,108,931,94,900,GREEN,864);
  text(ctx,frozen.title,90,1090,39,800);
  paragraph(ctx,frozen.note,90,1152,{size:28,lineHeight:40,maxLines:2});
  text(ctx,'本裝置遊戲紀錄 · 挑戰你的下一次手速',90,1246,22,500,MUTED);
  text(ctx,'島遊無界工作室 | PLAYFORMOSA STUDIO',90,1287,20,500,MUTED);
  const blob=await bounded(new Promise((resolve,reject)=>{try{canvas.toBlob(resolve,'image/png');}catch(error){reject(error);}}));
  if(!blob||blob.type!=='image/png'||!Number.isFinite(blob.size)||blob.size<=0)throw failure();
  return{blob,filename};
 }finally{source.release();}
}
