/* Presentation-only bootstrap. Keep game dimensions, input and audio ownership unchanged. */
(()=>{
 const doc=document,root=doc.documentElement;
 if(root.dataset.pfStartup!=='pending')return;
 let done=false,timer;
 const selector='dialog[data-pf-entry][open],dialog#entryDialog[open]';
 function ready(){
  const entry=doc.querySelector(selector);
  if(done||!entry||entry.hidden)return false;
  done=true;clearTimeout(timer);observer.disconnect();
  window.removeEventListener('error',failed,true);
  window.removeEventListener('unhandledrejection',failed);
  root.dataset.pfStartup='ready';
  doc.getElementById('pf-startup')?.remove();
  // Native/fallback modal focus may have been attempted while visually gated.
  if(!entry.contains(doc.activeElement)){
   const candidates=[entry.querySelector('[autofocus]'),...entry.querySelectorAll('button,a[href],summary,input,select,textarea,[tabindex]')];
   const target=candidates.find(el=>el&&!el.disabled&&!el.closest('[hidden],[inert]')&&el.getClientRects().length);
   (target||entry).focus({preventScroll:true});
  }
  return true;
 }
 function failed(){
  if(ready()||done)return;
  const status=doc.getElementById('pf-startup-status');
  if(status)status.textContent='準備時間較久，或遊戲未能載入。你可以重新載入，或返回首頁。';
  root.dataset.pfStartup='waiting';
  // Keep observing: a slow connection can still finish without a forced reload.
 }
 const observer=new MutationObserver(ready);
 observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});
 window.addEventListener('error',failed,true);
 window.addEventListener('unhandledrejection',failed);
 timer=setTimeout(failed,15000);
 ready();
})();
