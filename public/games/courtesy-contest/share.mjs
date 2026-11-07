import {paintCourtesyScoreCard} from './score-card.mjs';
import {buildThreadsIntent,copyResultText,saveResultImage} from '../long-jump/share.mjs';
// Copy inside Phaser's postrender task, before resize can clear its drawing buffer.
export function copyResultFrame(document,source){
 const frozen=document.createElement('canvas');frozen.width=source.width;frozen.height=source.height;
 frozen.getContext('2d').drawImage(source,0,0);return frozen;
}
export function createCourtesySharing(document){
 const win=document.defaultView,$=id=>document.getElementById(id),image=$('share-image'),threads=$('share-threads'),copy=$('share-copy'),status=$('share-status'),dialog=$('share-fallback');
 const route=win.location.origin+'/games/courtesy-contest/';
 let generation=0,file=null,frozen=null,result=null,value='',pending=false,copyPending=false,url=null,returnFocus=null;
 const mobile=()=>Boolean(win.matchMedia?.('(pointer:coarse)').matches);
 const release=()=>{if(url){win.URL.revokeObjectURL(url);url=null;}};
 function close(){if(dialog.open)dialog.close();returnFocus?.focus({preventScroll:true});release();$('share-preview').removeAttribute('src');}
 $('close-share').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 function fallback(kind){release();returnFocus=document.activeElement;$('share-preview').hidden=kind!=='image';$('share-text').hidden=kind!=='text';$('fallback-note').textContent=kind==='image'?'長按圖片儲存或分享。':'請選取文字，長按或按 Ctrl/Cmd+C 複製。';if(kind==='image'){$('share-preview').src=url=win.URL.createObjectURL(file);}else{$('share-text').value=value;}if(!dialog.open)dialog.showModal();(kind==='text'?$('share-text'):$('close-share')).focus();if(kind==='text')$('share-text').select();return true;}
 function reset(){generation++;file=null;frozen=null;result=null;value='';pending=copyPending=false;close();image.disabled=true;image.textContent='製作成績圖…';copy.disabled=true;threads.removeAttribute('href');status.textContent='';$('result-photo').hidden=true;}
 function encode(){
  if(!frozen||!result)return;const token=generation;image.disabled=true;image.textContent='製作成績圖…';status.textContent='';
  try{
   const canvas=paintCourtesyScoreCard(frozen,result,()=>document.createElement('canvas'));
   canvas.toBlob(blob=>{if(token!==generation)return;try{if(!blob?.size||blob.type!=='image/png')throw Error();file=new win.File([blob],'playformosa-courtesy-contest.png',{type:'image/png'});image.disabled=false;image.textContent=mobile()?'分享成績圖片':'下載成績圖片';}catch{failed();}},'image/png');
  }catch{failed();}
  function failed(){if(token!==generation)return;file=null;image.disabled=false;image.textContent='重試製作成績圖';status.textContent='圖片未能完成，可重試；成績文字仍可複製。';}
 }
 image.onclick=()=>{
  if(pending)return;if(!file){encode();return;}const token=generation;pending=true;image.disabled=true;
  // The helper invokes native share synchronously in this activation handler.
  const task=saveResultImage(file,{mobile:mobile(),navigator:{canShare:payload=>win.navigator.canShare?.(payload)??false,share:payload=>win.navigator.share({...payload,title:'客氣大賽'})},download:current=>{release();url=win.URL.createObjectURL(current);const a=document.createElement('a');a.href=url;a.download=current.name;a.click();},openImage:()=>fallback('image')});
  task.then(out=>{if(token!==generation)return;if(out.status==='error'||out.status==='unsupported'){fallback('image');status.textContent='未能直接分享，請長按圖片儲存。';}else status.textContent=out.status==='cancelled'?'已取消分享。':out.status==='handed-off'?'已開啟系統分享。':out.status==='downloaded'?'已送出圖片下載。':'請長按圖片儲存或分享。';}).finally(()=>{if(token===generation){pending=false;image.disabled=false;}});
 };
 copy.onclick=()=>{if(copyPending||!value)return;const token=generation;copyPending=true;copy.disabled=true;copyResultText({text:value},{clipboard:win.navigator.clipboard}).then(out=>{if(token!==generation)return;if(out.status==='copied')status.textContent='已複製成績與網址。';else fallback('text');}).finally(()=>{if(token===generation){copyPending=false;copy.disabled=false;}});};
 return{reset,prepare(frame,data){reset();frozen=frame;result={...data};value=`客氣大賽｜${data.title}\n${data.count} 次互讓${data.bonus?'，連鎖 +'+data.bonus:''}｜${data.status}\n${data.remaining}\n${route}`;threads.href=buildThreadsIntent({text:value});copy.disabled=false;const photo=$('result-photo');photo.width=frame.width;photo.height=frame.height;photo.getContext('2d').drawImage(frame,0,0);photo.hidden=false;encode();}};
}
