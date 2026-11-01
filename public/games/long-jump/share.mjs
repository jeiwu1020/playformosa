// Prepared result files keep the user's share click inside transient activation.
// Generation tokens prevent an old asynchronous PNG capture replacing a newer attempt.
export function createShareState(){
 let generation=0,currentFile=null,currentError=null;
 return {
  get file(){return currentFile;},
  get error(){return currentError;},
  begin(){generation++;currentFile=null;currentError=null;return generation;},
  accept(token,file){if(token!==generation)return false;currentFile=file;currentError=null;return true;},
  fail(token,message){if(token!==generation)return false;currentFile=null;currentError=String(message);return true;}
 };
}

export function makeResultFile(blob,FileCtor=globalThis.File){
 if(!blob||blob.type!=='image/png'||!Number.isFinite(blob.size)||blob.size<=0)throw new Error('Result capture did not produce a non-empty PNG.');
 if(typeof FileCtor!=='function')throw new Error('File creation is unavailable in this browser.');
 return new FileCtor([blob],'playformosa-long-jump.png',{type:'image/png'});
}

export async function shareResult(file,{navigator=globalThis.navigator,download}={}){
 if(!file)return 'error';
 let supported=false;
 try{supported=typeof navigator?.canShare==='function'&&typeof navigator?.share==='function'&&navigator.canShare({files:[file]});}catch{/* Unsupported capability probes may throw. */}
 if(supported){
  try{
   // Do not await preparation or scheduling before invoking share: activation may expire.
   const pending=navigator.share({files:[file],title:'四肢各有想法｜跳遠'});
   await pending;
   return 'shared';
  }catch(error){return error?.name==='AbortError'?'cancelled':'error';}
 }
 try{if(typeof download!=='function')return 'error';await download(file);return 'downloaded';}catch{return 'error';}
}

// Text/link compose only. A web intent cannot attach this browser-local PNG or prove publication.
export function buildThreadsIntent({text,url}){
 let link='';try{const parsed=new URL(url);if(parsed.protocol==='https:')link=parsed.href;}catch{}
 const intent=new URL('https://www.threads.com/intent/post');intent.searchParams.set('text',[String(text),link].filter(Boolean).join('\n'));return intent.href;
}
export function openThreads(data,{open=globalThis.open}={}){
 try{const popup=open(buildThreadsIntent(data),'_blank');if(!popup)return 'blocked';try{popup.opener=null;}catch{}return 'opened';}catch{return 'blocked';}
}
export async function saveResultImage(file,{mobile=false,text='',url='',navigator=globalThis.navigator,download,openImage}={}){
 if(!file)return{status:'error',reason:'ImageNotReady'};
 if(!mobile){try{download(file);return{status:'downloaded'};}catch(error){return{status:'error',reason:error?.name||'DownloadError'};}}
 const payload={files:[file],title:'四肢各有想法｜跳遠'};
 let supported=false;try{supported=typeof navigator?.canShare==='function'&&typeof navigator?.share==='function'&&navigator.canShare(payload);}catch{}
 if(!supported){try{return{status:openImage?.(file)?'opened-image':'unsupported'};}catch{return{status:'unsupported'};}}
 try{const pending=navigator.share(payload);await pending;return{status:'handed-off'};}catch(error){return error?.name==='AbortError'?{status:'cancelled'}:{status:'error',reason:error?.name||'ShareError'};}
}

// Clipboard success means the complete text/link write resolved, not merely that a click occurred.
export async function copyResultText({text='',url=''}={}, {clipboard=globalThis.navigator?.clipboard}={}){
 const value=[text,url].filter(part=>typeof part==='string'&&part.trim()).join('\n');
 if(!value)return{status:'error',reason:'EmptyContent'};
 if(typeof clipboard?.writeText!=='function')return{status:'error',reason:'ClipboardUnavailable'};
 try{await clipboard.writeText(value);return{status:'copied'};}catch(error){return{status:'error',reason:error?.name||'ClipboardError'};}
}

