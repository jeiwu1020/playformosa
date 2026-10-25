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
   const pending=navigator.share({files:[file],title:'四肢各有想法｜跳遠成績'});
   await pending;
   return 'shared';
  }catch(error){return error?.name==='AbortError'?'cancelled':'error';}
 }
 try{if(typeof download!=='function')return 'error';await download(file);return 'downloaded';}catch{return 'error';}
}
