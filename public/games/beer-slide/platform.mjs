// UI-only sharing: game owns the score and passes an already frozen actual-round image.
import {drawBeerResultCard} from './share.mjs';
import {createResultDialog} from '../shared/game-ui.mjs';
function readResult(document,location){const get=id=>document.getElementById(id),score=get('score').textContent.trim(),verdict=get('verdict').textContent.trim(),distance=get('finalDistance').textContent.trim(),spill=get('finalSpill').textContent.trim();return {score,verdict,distance,spill,title:'別灑啊！｜PlayFormosa',text:`別灑啊！我推到 ${score} / 10.0 分！\n${verdict}\n離靶心 ${distance} · 灑出 ${spill}\nPlayFormosa 小遊戲・測試版`,url:location.origin+'/games/beer-slide/'};}
export function resultShareData(document,location){return document.getElementById('result').hidden?null:readResult(document,location);}
export function wirePlatformSharing({document,navigator,location,MutationObserver=globalThis.MutationObserver,mobile=()=>globalThis.matchMedia?.('(pointer: coarse)').matches||false,download=null}){
 const get=id=>document.getElementById(id),status=get('platformShareStatus'),button=get('platformShare');
 let epoch=0,busy=false,pending=false,file=null,snapshot=null,data=null,imageURL=null;
 const content=()=>data?`${data.text}\n${data.url}`:'';
 const current=token=>token===epoch&&!get('result').hidden;
 const copyModal=createResultDialog(get('platformCopyDialog'),{focusTarget:()=>get('platformCopyText'),returnFocus:()=>get('result').hidden?get('stage'):get('platformCopy')});
 const imageModal=createResultDialog(get('platformImageDialog'),{focusTarget:()=>get('platformImageClose'),returnFocus:()=>get('result').hidden?get('stage'):button});
 function clearImage(){if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;get('platformImage').removeAttribute('src');}
 function refreshThreads(){if(data&&!get('result').hidden)get('platformThreads').href='https://www.threads.net/intent/post?text='+encodeURIComponent(content());else get('platformThreads').removeAttribute('href');}
 function showCopy(){get('platformCopyText').value=content();copyModal.open();get('platformCopyText').select();status.textContent='請在文字框長按或按 Ctrl/Cmd+C 複製。';}
 function showImage(){if(!file)return;clearImage();imageURL=URL.createObjectURL(file);get('platformImage').src=imageURL;imageModal.open();status.textContent='無法直接分享；可長按圖片儲存，或再試一次。';}
 function reset(){epoch++;busy=false;pending=false;file=null;snapshot=null;data=null;button.disabled=true;button.textContent='製作成績圖…';status.textContent='';get('resultPhoto').hidden=true;get('resultPhoto').removeAttribute('src');if(get('platformCopyDialog').open)copyModal.close();if(get('platformImageDialog').open)imageModal.close();clearImage();refreshThreads();}
 function unavailable(){file=null;pending=false;button.disabled=!snapshot;button.textContent=snapshot?'重做成績圖':'圖片暫時無法產生';status.textContent='本局圖片未能保存；仍可複製成績與網址。';}
 function encode(){if(!snapshot||!data||pending)return;const token=epoch;pending=true;button.disabled=true;button.textContent='製作成績圖…';
  try{const card=drawBeerResultCard(document.createElement('canvas'),snapshot,data);card.toBlob(blob=>{if(token!==epoch)return;pending=false;if(!blob||blob.type!=='image/png'){unavailable();return;}try{file=new File([blob],'PlayFormosa-別灑啊-成績.png',{type:'image/png'});}catch{file=blob;}button.disabled=false;button.textContent=mobile()?'分享成績圖片':'下載成績圖片';status.textContent='';},'image/png');}catch{if(token===epoch)unavailable();}
 }
 function prepare(frozen){reset();data=readResult(document,location);snapshot=frozen;refreshThreads();if(!snapshot){unavailable();return;}try{get('resultPhoto').src=snapshot.toDataURL('image/png');get('resultPhoto').hidden=false;}catch{get('resultPhoto').hidden=true;}encode();}
 button.addEventListener('click',async()=>{
  if(!data||get('result').hidden||busy||pending)return;if(!file){encode();return;}const token=epoch,roundFile=file;
  if(!mobile()){try{(download||downloadFile)(roundFile);status.textContent='已送出圖片下載；Threads 圖片需自行附上。';}catch{showImage();}return;}
  busy=true;button.disabled=true;
  try{if(!navigator.share||!navigator.canShare?.({files:[roundFile]})){showImage();return;}
   // No capture, fetch or await before share: preserve the click's native activation.
   await navigator.share({files:[roundFile]});if(current(token))status.textContent='圖片已交給系統分享；可另按複製成績與網址。';
  }catch(error){if(current(token)){if(error?.name==='AbortError')status.textContent='已取消分享，想分享時再按一次即可。';else showImage();}}
  finally{if(token===epoch){busy=false;button.disabled=!file;}}
 });
 get('platformCopy').addEventListener('click',async()=>{if(!data||get('result').hidden)return;const token=epoch,text=content();try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);if(current(token))status.textContent='已複製成績文字與遊戲連結。';}catch{if(current(token))showCopy();}});
 get('platformThreads').addEventListener('click',event=>{refreshThreads();if(!data||get('result').hidden){event.preventDefault();return;}status.textContent='Threads 會帶入文字與網址；圖片請自行附上。';});
 get('platformCopyClose').addEventListener('click',()=>copyModal.close());get('platformImageClose').addEventListener('click',()=>{imageModal.close();clearImage();});get('platformImageDialog').addEventListener('close',clearImage);
 if(MutationObserver)new MutationObserver(()=>{if(get('result').hidden){if(get('platformCopyDialog').open)copyModal.close();if(get('platformImageDialog').open)imageModal.close();clearImage();}refreshThreads();}).observe(get('result'),{attributes:true,attributeFilter:['hidden']});
 function downloadFile(blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PlayFormosa-別灑啊-成績.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return {prepare,reset,unavailable};
}
export const platformSharing=typeof document!=='undefined'&&document.getElementById('platformShare')?wirePlatformSharing({document,navigator,location}):null;
