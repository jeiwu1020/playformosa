// PlayFormosa navigation/sharing adapter. Reads completed UI only; never scores or simulates.
export function resultShareData(document,location){
 const get=id=>document.getElementById(id);
 if(get('result').hidden)return null;
 const score=get('score').textContent.trim(),verdict=get('verdict').textContent.trim();
 return {title:'別灑啊！｜PlayFormosa',text:`別灑啊！我推到 ${score} / 10.0 分！\n${verdict}\n離靶心 ${get('finalDistance').textContent.trim()} · 灑出 ${get('finalSpill').textContent.trim()}\nPlayFormosa 小遊戲・測試版`,url:location.origin+location.pathname};
}
export function wirePlatformSharing({document,navigator,location,MutationObserver=globalThis.MutationObserver}){
 const get=id=>document.getElementById(id),status=get('platformShareStatus'),dialog=get('platformCopyDialog');
 let busy=false,epoch=0;
 const current=token=>token===epoch&&!get('result').hidden;
 const content=data=>`${data.text}\n${data.url}`;
 function refreshThreads(){const data=resultShareData(document,location);if(data)get('platformThreads').href='https://www.threads.net/intent/post?text='+encodeURIComponent(content(data));else get('platformThreads').removeAttribute('href');}
 function closeCopy(){if(dialog.open){if(typeof dialog.close==='function')dialog.close();else{dialog.removeAttribute('open');dialog.open=false;}}(get('result').hidden?get('stage'):get('platformCopy')).focus();}
 function showCopy(text){get('platformCopyText').value=text;try{dialog.showModal();}catch{dialog.setAttribute('open','');dialog.open=true;}get('platformCopyText').focus();get('platformCopyText').select();status.textContent='請在文字框長按或按 Ctrl/Cmd+C 複製。';}
 async function copy(data,token){const text=content(data);try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);if(current(token))status.textContent='已複製成績文字與遊戲連結。';}catch{if(current(token))showCopy(text);}}
 get('platformCopy').addEventListener('click',()=>{const data=resultShareData(document,location);if(data)return copy(data,epoch);});
 get('platformShare').addEventListener('click',async()=>{
  const data=resultShareData(document,location);if(!data||busy)return;const token=epoch;busy=true;
  try{
   if(typeof navigator.share!=='function'){await copy(data,token);return;}
   await navigator.share(data);if(current(token))status.textContent='已分享成績文字與遊戲連結。';
  }catch(error){if(current(token)){if(error?.name==='AbortError')status.textContent='已取消分享。';else showCopy(content(data));}}
  finally{busy=false;}
 });
 get('platformThreads').addEventListener('click',event=>{const data=resultShareData(document,location);if(!data){event.preventDefault();return;}get('platformThreads').href='https://www.threads.net/intent/post?text='+encodeURIComponent(content(data));});
 get('platformCopyClose').addEventListener('click',closeCopy);
 refreshThreads();
 if(MutationObserver)new MutationObserver(()=>{if(get('result').hidden){epoch++;status.textContent='';if(dialog.open)closeCopy();}refreshThreads();}).observe(get('result'),{attributes:true,attributeFilter:['hidden']});
}
if(typeof document!=='undefined'&&document.getElementById('platformShare'))wirePlatformSharing({document,navigator,location});
