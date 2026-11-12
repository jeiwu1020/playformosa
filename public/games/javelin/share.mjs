// Sharing uses the already-frozen actual result PNG, never a replay or a redraw.
export function javelinResultText(state,origin=''){
 const score=state.foul?'這次犯規，不計成績':`我擲出 ${state.distance.toFixed(2)} 公尺！`;
 return `四肢各有想法｜標槍\n${score}\n${state.foul?state.reason||'下次再挑戰':`${state.grade||'完成'} 級投擲`}\n遊戲成績，非正式運動紀錄。\n${origin}/games/javelin/`;
}
export function fileFromFrozenPhoto(photo,win){
 if(!photo?.url?.startsWith('data:image/png;base64,'))return null;
 const bytes=win.atob(photo.url.split(',')[1]),data=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)data[i]=bytes.charCodeAt(i);
 return new win.File([data],'playformosa-javelin.png',{type:'image/png'});
}
export function createJavelinShare(document,win){
 const $=id=>document.getElementById(id),fallback=$('shareFallback');let generation=0,file=null,url=null,source=null,busy=false,text='',returnFocus=null;
 const current=token=>token===generation;
 function reset(){generation++;busy=false;file=source=null;text='';if(url)win.URL.revokeObjectURL(url);url=null;if(fallback.open)fallback.close();$('shareFallbackImage').removeAttribute('src');$('shareFallbackText').value='';returnFocus=null;}
 function showFallback(focus){returnFocus=focus;$('shareFallbackText').value=text;$('shareFallbackImage').hidden=!url;if(url)$('shareFallbackImage').src=url;if(!fallback.open)fallback.showModal();fallback.scrollTop=0;$('shareFallbackTitle').focus({preventScroll:true});}
 function closeFallback(){fallback.close();returnFocus?.focus({preventScroll:true});}
 $('shareFallbackClose').onclick=closeFallback;fallback.addEventListener('cancel',e=>{e.preventDefault();closeFallback()});
 function bind(state,photo){
  const token=generation,threads=$('shareThreads'),image=$('shareImage'),copy=$('shareCopy'),status=$('shareStatus');
  const mobile=win.matchMedia?.('(pointer:coarse)').matches,note=value=>{if(current(token)&&status.isConnected)status.textContent=value};
  text=javelinResultText(state,win.location.origin);threads.href='https://www.threads.net/intent/post?text='+encodeURIComponent(text);
  if(source!==photo?.url){if(url)win.URL.revokeObjectURL(url);url=null;file=null;source=photo?.url;try{file=fileFromFrozenPhoto(photo,win);if(file)url=win.URL.createObjectURL(file);}catch{file=null;}}
  image.textContent=mobile?'分享成績圖片':'下載成績圖片';image.disabled=!file;if(!file)note(photo?.error||'這次沒有可分享的成績圖片。');
  image.onclick=()=>{if(busy||!file)return;if(mobile&&win.navigator.canShare?.({files:[file]})&&win.navigator.share){busy=true;let pending;try{pending=win.navigator.share({files:[file],title:'四肢各有想法｜標槍',text});}catch{busy=false;note('系統分享未完成，可長按圖片儲存。');showFallback(image);return;}Promise.resolve(pending).then(()=>note('已交給系統分享。'),error=>{if(!current(token)||!status.isConnected)return;if(error?.name==='AbortError')note('已取消分享，可以再試一次。');else{note('系統分享未完成，可長按圖片儲存。');showFallback(image)}}).finally(()=>{if(current(token))busy=false});}else if(mobile){note('可長按成績圖片儲存。');showFallback(image)}else{const link=document.createElement('a');link.href=url;link.download='playformosa-javelin.png';link.click();note('已啟動 PNG 下載。')}};
  copy.onclick=()=>{if(busy)return;busy=true;let pending;try{pending=win.navigator.clipboard?.writeText(text);if(!pending)throw Error('Clipboard unavailable')}catch{busy=false;note('請選取文字後手動複製。');showFallback(copy);return;}Promise.resolve(pending).then(()=>note('已複製成績與遊戲網址。'),()=>{if(current(token)&&status.isConnected){note('無法自動複製，請手動選取文字。');showFallback(copy)}}).finally(()=>{if(current(token))busy=false})};
  threads.onclick=()=>note('Threads 圖片需手動附加。');
 }
 return{bind,reset};
}
