import {prepareGameDialog} from './game-menus.js';
import {paintPinballScoreCard} from './score-card.mjs';
// Game-owned sharing: the caller invokes capture immediately after the settled render.
export function createPinballShare({document,container,status}){
 const win=document.defaultView,make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const mobile=()=>!!win.matchMedia?.('(pointer: coarse)').matches;
 const route=win.location.origin+'/games/overtime-pinball/';
 const threads=make('a','分享至Threads'),image=make('button'),copy=make('button','複製成績與網址');
 threads.dataset.share='threads';threads.target='_blank';threads.rel='noopener noreferrer';
 image.dataset.share='image';copy.dataset.share='copy';image.type=copy.type='button';
 for(const action of [threads,image,copy]){action.style.minWidth='44px';action.style.minHeight='44px';}
 container.classList.add('pf-share-actions');container.append(threads,image,copy);status.setAttribute('role','status');
 let generation=0,snapshot=null,frozen=null,file=null,text='',encoding=false,imageBusy=false,copyBusy=false,downloadURL=null;
 const fallback=prepareGameDialog(make('dialog'));fallback.className='pf-pinball-share-dialog';fallback.setAttribute('aria-label','儲存或複製本次成績');
 Object.assign(fallback.style,{maxWidth:'min(90vw,42rem)',maxHeight:'85dvh',overflow:'auto',overscrollBehavior:'contain',touchAction:'pan-y'});
 const fallbackContent=make('div'),close=make('button','關閉');close.type='button';close.style.minHeight='44px';fallback.append(fallbackContent,close);document.body.append(fallback);
 let opener=null,fallbackURL=null;
 function closeFallback(){if(fallback.open)fallback.close();}
 close.addEventListener('click',closeFallback);
 function clearFallback(){if(fallbackURL){win.URL.revokeObjectURL(fallbackURL);fallbackURL=null;}fallbackContent.replaceChildren();}
 fallback.addEventListener('close',()=>{if(fallback.open)return;clearFallback();opener?.focus({preventScroll:true});opener=null;});
 function showFallback(kind){
  clearFallback();opener=kind==='copy'?copy:image;
  if(kind==='copy'){
   const label=make('p','無法自動複製，請選取下方文字手動複製。'),field=make('textarea');field.value=text;field.readOnly=true;field.setAttribute('aria-label','本次成績與網址');field.style.width='100%';field.rows=6;fallbackContent.append(label,field);if(!fallback.open)fallback.showModal();field.focus();field.select();
  }else{
   const help=make('p','無法開啟圖片分享，請長按圖片儲存，或使用下方下載連結。'),preview=make('img'),download=make('a','下載成績圖片');fallbackURL=win.URL.createObjectURL(file);preview.src=fallbackURL;preview.alt=text;preview.style.maxWidth='100%';preview.style.height='auto';download.href=fallbackURL;download.download=file.name;download.style.display='block';download.style.minHeight='44px';fallbackContent.append(help,preview,download);if(!fallback.open)fallback.showModal();close.focus();
  }
 }
 function sync(){image.textContent=!file&&frozen&&!encoding?'重試準備成績圖片':mobile()?'分享成績圖片':'下載成績圖片';image.disabled=!snapshot||encoding||imageBusy||(!file&&!frozen);copy.disabled=!snapshot||copyBusy;threads.setAttribute('aria-disabled',String(!snapshot));}
 function encode(){
  if(!frozen||encoding)return;encoding=true;const token=generation;status.textContent='正在準備本次成績圖片…';sync();
  try{frozen.toBlob(blob=>{
   if(token!==generation)return;encoding=false;
   if(blob){file=new win.File([blob],`overtime-pinball-${snapshot.limit||'unlimited'}-${snapshot.score}.png`,{type:'image/png'});status.textContent='圖片已準備好；分享到 Threads 時請自行附上圖片。';}
   else status.textContent='圖片準備失敗，可按圖片按鈕重試；成績文字仍可分享。';sync();
  },'image/png');}catch{if(token===generation){encoding=false;status.textContent='圖片準備失敗，可按圖片按鈕重試；成績文字仍可分享。';sync();}}
 }
 threads.addEventListener('click',event=>{if(!snapshot){event.preventDefault();return;}status.textContent='Threads 將帶入成績與網址，圖片請自行附上。';});
 image.addEventListener('click',()=>{
  if(!snapshot||encoding||imageBusy)return;if(!file){encode();return;}
  if(!mobile()){
   const token=generation;imageBusy=true;sync();win.setTimeout(()=>{if(token===generation){imageBusy=false;sync();}},500);
   if(downloadURL)win.URL.revokeObjectURL(downloadURL);downloadURL=win.URL.createObjectURL(file);const link=make('a');link.href=downloadURL;link.download=file.name;document.body.append(link);link.click();link.remove();status.textContent='已開始下載成績圖片。';return;
  }
  const token=generation,files=[file];
  if(typeof win.navigator.share!=='function'||!win.navigator.canShare?.({files})){showFallback('image');status.textContent='此瀏覽器不支援圖片分享，可手動儲存。';return;}
  imageBusy=true;sync();let request;
  // Must stay synchronous with the trusted click: no encoding/await before share().
  try{request=win.navigator.share({files,title:'不准加班公司',text});}catch(error){request=Promise.reject(error);}
  Promise.resolve(request).then(()=>{if(token===generation)status.textContent='圖片分享已完成。';},error=>{
   if(token!==generation)return;
   if(error?.name==='AbortError')status.textContent='已取消分享，可隨時再試。';
   else{status.textContent='圖片分享未完成，可手動儲存。';showFallback('image');}
  }).finally(()=>{if(token===generation){imageBusy=false;sync();}});
 });
 copy.addEventListener('click',()=>{
  if(!snapshot||copyBusy)return;const token=generation;copyBusy=true;sync();let request;
  try{if(!win.navigator.clipboard?.writeText)throw Error('clipboard unavailable');request=win.navigator.clipboard.writeText(text);}catch(error){request=Promise.reject(error);}
  Promise.resolve(request).then(()=>{if(token===generation)status.textContent='已複製成績與網址。';},()=>{if(token===generation){status.textContent='無法自動複製，請手動複製。';showFallback('copy');}}).finally(()=>{if(token===generation){copyBusy=false;sync();}});
 });
 function reset(){
  generation++;snapshot=null;frozen=null;file=null;text='';encoding=false;imageBusy=false;copyBusy=false;closeFallback();clearFallback();opener=null;
  if(downloadURL){win.URL.revokeObjectURL(downloadURL);downloadURL=null;}threads.removeAttribute('href');status.textContent='';sync();
 }
 function capture(canvas,result){
  reset();snapshot=Object.freeze({...result});const mode=result.limit?`${result.limit/60} 分鐘模式`:'不限時模式';
  text=`不准加班公司｜${mode}｜本次 ${result.score} 分\n下班結算 · 玩家回報休閒成績\n${route}`;threads.href='https://www.threads.net/intent/post?text='+encodeURIComponent(text);
  try{
   if(!canvas.width||!canvas.height)throw Error('empty frame');
   frozen=paintPinballScoreCard(canvas,result,()=>make('canvas'));
   encode();
  }catch{frozen=null;status.textContent='無法取得本次遊戲圖片，仍可分享或複製成績文字。';sync();}
 }
 reset();return {capture,reset};
}

