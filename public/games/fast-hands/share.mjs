import {createScoreImage,normalizeScoreResult} from './score-image.mjs';

const ENCODE_TIMEOUT_MS=12000;
const mobileAgent=/Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i;
const DEFAULT_IDS={dialog:'resultDialog',image:'resultDownload',status:'downloadStatus',threads:'resultThreads',copy:'resultCopy',fallback:'shareFallback',fallbackImage:'shareFallbackImage',fallbackText:'shareFallbackText',fallbackClose:'shareFallbackClose',portrait:'resultPortrait'};

/** This controller only prepares local images and user-initiated share actions. */
export function mountFastHandsSharing({document=globalThis.document,createImage=createScoreImage,navigator=document.defaultView?.navigator,location=document.defaultView?.location,mobile,adapter}={}) {
  const win=document.defaultView??globalThis,$=id=>document.getElementById(id);
  const ids={...DEFAULT_IDS,...adapter?.ids};
  const dialog=$(ids.dialog),image=$(ids.image),status=$(ids.status),threads=$(ids.threads),copy=$(ids.copy);
  const fallback=$(ids.fallback),fallbackImage=$(ids.fallbackImage),fallbackText=$(ids.fallbackText),fallbackClose=$(ids.fallbackClose);
  const urls=win.URL??globalThis.URL,setTimer=win.setTimeout.bind(win),clearTimer=win.clearTimeout.bind(win);
  let generation=0,surface=0,operation=0,destroyed=false,round=null,encoded=null,encoding=false,shareBusy=false,copyBusy=false,fallbackURL=null,returnFocus=null;
  let encodingTimer=null,sourceResult=null,preparation=null;
  const downloadURLs=new Map(),listeners=[];
  const current=token=>!destroyed&&generation===token;
  const visible=()=>dialog.open&&!dialog.hidden&&dialog.isConnected!==false;
  // A newer action owns feedback/focus; older requests must still release their
  // own busy state in this round, without reopening a dismissed fallback.
  const currentOperation=(token,action)=>current(token)&&operation===action;
  const visibleRequest=(token,view,action)=>currentOperation(token,action)&&surface===view&&visible();
  const isMobile=()=>mobile?Boolean(mobile()):Boolean(win.matchMedia?.('(pointer: coarse)').matches||mobileAgent.test(navigator?.userAgent??''));
  const note=value=>{status.textContent=value;};
  function listen(element,type,fn){element.addEventListener(type,fn);listeners.push(()=>element.removeEventListener(type,fn));}
  function imageLabel(){image.textContent=isMobile()?'分享成績圖片':'下載成績圖';}
  function hideFallback({restoreFocus=false}={}) {
    fallback.hidden=true;fallbackImage.hidden=true;fallbackImage.removeAttribute('src');fallbackText.value='';
    if(fallbackURL)urls.revokeObjectURL(fallbackURL);fallbackURL=null;
    const target=returnFocus;returnFocus=null;
    if(restoreFocus&&visible())target?.focus({preventScroll:true});
  }
  function showFallback(kind) {
    hideFallback();returnFocus=kind==='image'?image:copy;
    fallbackText.readOnly=true;fallbackText.value=round.text;fallbackText.hidden=kind==='image';
    fallbackImage.hidden=kind!=='image';
    if(kind==='image') {
      try{fallbackURL=urls.createObjectURL(encoded.blob);fallbackImage.src=fallbackURL;}
      catch{fallbackImage.hidden=true;fallbackText.hidden=false;note('圖片暫時無法開啟；仍可手動複製成績與網址。');}
    }
    fallback.hidden=false;
    if(kind==='copy'||fallbackImage.hidden){fallbackText.focus({preventScroll:true});fallbackText.select();}
    else fallbackClose.focus({preventScroll:true});
    fallback.scrollIntoView?.({block:'nearest'});
  }
  function clearDownloads(){for(const [url,timer] of downloadURLs){clearTimer(timer);urls.revokeObjectURL(url);}downloadURLs.clear();}
  function reset() {
    generation++;surface++;round=null;encoded=null;encoding=false;shareBusy=false;copyBusy=false;sourceResult=null;preparation=null;
    if(encodingTimer!==null)clearTimer(encodingTimer);encodingTimer=null;
    hideFallback();clearDownloads();image.disabled=true;copy.disabled=true;imageLabel();note('');
    threads.removeAttribute('href');threads.setAttribute('aria-disabled','true');
  }
  function encode() {
    if(destroyed||!round||encoding)return Promise.resolve();
    const token=generation,action=operation,source=round;encoding=true;encoded=null;image.disabled=true;image.textContent='製作成績圖…';note('成績圖製作中…');
    let timer;
    const pending=new Promise((resolve,reject)=>{
      timer=setTimer(()=>reject(Error('Image preparation timeout')),ENCODE_TIMEOUT_MS);encodingTimer=timer;
      try{Promise.resolve(createImage({result:source.result,mode:source.mode,portrait:$(ids.portrait),document,...source.imageOptions})).then(resolve,reject);}
      catch(error){reject(error);}
    });
    preparation=pending.then(output=>{
      if(!current(token))return;
      const blob=output?.blob;
      if(!blob||blob.type!=='image/png'||!Number.isFinite(blob.size)||blob.size<=0)throw Error('No PNG');
      const filename=typeof output.filename==='string'&&output.filename.endsWith('.png')?output.filename:'fast-hands-result.png';
      let file=null;try{const FileCtor=win.File??globalThis.File;if(typeof FileCtor==='function')file=new FileCtor([blob],filename,{type:'image/png'});}catch{}
      encoded={blob,file,filename};imageLabel();if(currentOperation(token,action))note('');
    }).catch(()=>{
      if(!current(token))return;
      encoded=null;image.textContent='重做成績圖';if(currentOperation(token,action))note('成績圖片暫時無法產生，請重試；仍可分享至 Threads 或複製成績與網址。');
    }).finally(()=>{
      clearTimer(timer);if(encodingTimer===timer)encodingTimer=null;
      if(current(token)){encoding=false;image.disabled=false;}
    });
    return preparation;
  }
  function prepare(result,mode) {
    if(destroyed)return Promise.resolve();
    const frozenMode=adapter?.normalizeMode?adapter.normalizeMode(mode):mode==='touch'?'touch':'mouse';
    if(round&&sourceResult===result&&round.mode===frozenMode){if(encoded)imageLabel();return preparation??Promise.resolve();}
    reset();sourceResult=result;
    // Explicit adapters supply a frozen presentation, never live gameplay state.
    const prepared=adapter?.snapshot?.(result,frozenMode,location);
    const frozen=prepared?Object.freeze(prepared.result):Object.freeze({...result,...normalizeScoreResult(result,frozenMode)});
    const url=new URL('/games/fast-hands/',location.origin).href;
    const text=prepared?prepared.text:['快手王｜PlayFormosa',frozen.title,frozen.success?`本輪完成時間：${frozen.timeText} 秒`:'本輪未完成',frozen.comment,`輸入方式：${frozen.modeText}`,url].join('\n');
    round=Object.freeze({result:frozen,mode:frozenMode,text,imageOptions:prepared?.imageOptions});copy.disabled=false;
    const intent=new URL('https://www.threads.com/intent/post');intent.searchParams.set('text',text);threads.href=intent.href;threads.removeAttribute('aria-disabled');
    return encode();
  }
  function download() {
    const url=urls.createObjectURL(encoded.blob),anchor=document.createElement('a');anchor.href=url;anchor.download=encoded.filename;
    const timer=setTimer(()=>{urls.revokeObjectURL(url);downloadURLs.delete(url);},60000);downloadURLs.set(url,timer);
    try{document.body.appendChild(anchor);anchor.click();note('成績圖已產生，請查看瀏覽器下載項目。');}
    finally{anchor.remove();}
  }
  function shareImage() {
    if(destroyed||!round||!visible()||shareBusy||encoding)return;
    const action=++operation;
    if(!encoded){void encode();return;}
    hideFallback();
    if(!isMobile()) {try{download();}catch{note('下載未能啟動，可開啟圖片後儲存。');showFallback('image');}return;}
    const token=generation,view=surface,payload={files:[encoded.file]};
    let supported=false;
    try{supported=Boolean(encoded.file&&typeof navigator?.share==='function'&&typeof navigator?.canShare==='function'&&navigator.canShare(payload));}catch{}
    if(!supported){note('此瀏覽器無法直接分享圖片，請長按下方圖片儲存。');showFallback('image');return;}
    shareBusy=true;image.disabled=true;
    const finish=()=>{if(current(token)){shareBusy=false;image.disabled=encoding||!round;}};
    const failed=error=>{
      if(!visibleRequest(token,view,action))return;
      if(error?.name==='AbortError')note('已取消分享，想分享時可再試一次。');
      else{note('系統分享未完成，請長按下方圖片儲存。');showFallback('image');}
    };
    try {
      // PNG encoding is already complete. Keep the native call inside this click.
      const pending=navigator.share(payload);
      Promise.resolve(pending).then(()=>{if(visibleRequest(token,view,action))note('圖片已交給系統分享；可另按複製成績與網址。');},failed).finally(finish);
    } catch(error){failed(error);finish();}
  }
  function copyResult() {
    if(destroyed||!round||!visible()||copyBusy)return;
    const token=generation,view=surface,action=++operation,text=round.text;copyBusy=true;copy.disabled=true;hideFallback();
    const finish=()=>{if(current(token)){copyBusy=false;copy.disabled=!round;}};
    const failed=()=>{if(visibleRequest(token,view,action)){note('無法自動複製，請選取下方文字後手動複製。');showFallback('copy');}};
    try {
      if(typeof navigator?.clipboard?.writeText!=='function')throw Error('Clipboard unavailable');
      Promise.resolve(navigator.clipboard.writeText(text)).then(()=>{if(visibleRequest(token,view,action))note('已複製成績文字與遊戲網址。');},failed).finally(finish);
    } catch{failed();finish();}
  }
  threads.target='_blank';threads.rel='noopener noreferrer';fallbackText.readOnly=true;
  listen(image,'click',shareImage);listen(copy,'click',copyResult);
  listen(threads,'click',event=>{if(destroyed||!round||!visible()){event.preventDefault();return;}operation++;note('Threads 會帶入成績文字與遊戲網址；圖片需自行附上。');});
  listen(fallbackClose,'click',()=>{operation++;hideFallback({restoreFocus:true});});
  listen(dialog,'close',()=>{surface++;hideFallback();});
  function destroy(){if(destroyed)return;reset();destroyed=true;for(const remove of listeners)remove();}
  reset();
  return {prepare,reset,destroy};
}
