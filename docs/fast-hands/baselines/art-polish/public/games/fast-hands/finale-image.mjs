import {itemArtFrame} from './levels-rules.mjs';

const TIMEOUT_MS=8000;
const failure=()=>new Error('本次畫面圖片無法產生，請稍後再試。');
function bounded(promise){
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(failure()),TIMEOUT_MS);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}
function dimensions(source){return [source?.naturalWidth??source?.width,source?.naturalHeight??source?.height];}
function hasPixels(source){const [w,h]=dimensions(source);return Number.isFinite(w)&&w>0&&Number.isFinite(h)&&h>0&&source?.complete!==false;}
async function readyImage(image){
 if(!image)throw failure();
 if(hasPixels(image))return image;
 if(typeof image.decode==='function')await bounded(image.decode());
 else if(typeof image.addEventListener==='function')await new Promise((resolve,reject)=>{
  const done=error=>{clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);error?reject(error):resolve();};
  const loaded=()=>done(),failed=()=>done(failure());const timer=setTimeout(failed,TIMEOUT_MS);
  image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
  if(hasPixels(image))done();
 });
 if(!hasPixels(image))throw failure();return image;
}
function finitePoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y);}
function contain(ctx,source,width,height){const [sw,sh]=dimensions(source),scale=Math.min(width/sw,height/sh);ctx.drawImage(source,(width-sw*scale)/2,(height-sh*scale)/2,sw*scale,sh*scale);}
function encode(canvas){
 let encoded;
 if(typeof canvas.toBlob==='function')encoded=new Promise((resolve,reject)=>{try{canvas.toBlob(resolve,'image/png');}catch(error){reject(error);}});
 else if(typeof canvas.convertToBlob==='function')encoded=canvas.convertToBlob({type:'image/png'});
 else if(typeof canvas.toDataURL==='function'){
  const data=canvas.toDataURL('image/png');if(!data.startsWith('data:image/png;base64,'))throw failure();
  const bytes=Uint8Array.from(atob(data.slice(data.indexOf(',')+1)),char=>char.charCodeAt(0));encoded=Promise.resolve(new Blob([bytes],{type:'image/png'}));
 }else throw failure();
 return bounded(encoded).then(blob=>{if(!blob||blob.type!=='image/png'||!blob.size)throw failure();return blob;});
}
/** Capture actual scene pixels; the caller owns object URLs. Never changes the live canvas.
 * renderFrame must be synchronous: WebGL preserveDrawingBuffer:false requires copying
 * in this same turn, before any image/font load or promise continuation can yield.
 * fallback image references must correspond to the supplied frozen pose names.
 */
export async function captureFinaleImage({document=globalThis.document,canvas,renderFrame,fallback,width=900,height=620}={}){
 if(!document?.createElement||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192)throw failure();
 const output=document.createElement('canvas');output.width=width;output.height=height;
 const ctx=output.getContext('2d');if(!ctx)throw failure();ctx.fillStyle='#eee9d9';ctx.fillRect(0,0,width,height);
 if(canvas){
  const rendered=renderFrame?.();
  if(rendered===false)throw failure();
  if(rendered&&typeof rendered.then==='function'){Promise.resolve(rendered).catch(()=>{});throw failure();}
  if(!hasPixels(canvas))throw failure();
  contain(ctx,canvas,width,height);
 }else{
  if(!fallback||!['duel','catch'].includes(fallback.mode))throw failure();
  // Copy all mutable pose/item data before image readiness can yield.
  const {mode,from,to,atlas,showDart}=fallback;
  const motion=structuredClone(fallback.motion),item=structuredClone(fallback.item);
  const mix=motion?.fallbackFrame?.mix,overlay=motion?.overlay;
  if(!Number.isFinite(mix)||mix<0||mix>1||!overlay)throw failure();
  await Promise.all([readyImage(from),readyImage(to),...(mode==='duel'?[readyImage(atlas)]:[])]);
  // Fallback assets share the fixed orthographic 900 × 620 frame.
  for(const source of [from,to]){const [w,h]=dimensions(source);if(w!==900||h!==620)throw failure();}
  const scale=Math.min(width/900,height/620),w=900*scale,h=620*scale,x=(width-w)/2,y=(height-h)/2;
  ctx.drawImage(from,x,y,w,h);ctx.globalAlpha=mix;ctx.drawImage(to,x,y,w,h);ctx.globalAlpha=1;
  if(mode==='duel'){
   const center=overlay.prizeArtCenter,corners=overlay.prizeArtCorners;
   if(!finitePoint(center)||!Array.isArray(corners)||corners.length!==4||!corners.every(finitePoint)||!Number.isInteger(item?.artIndex)||item.artIndex<0||item.artIndex>15)throw failure();
   const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),dw=(Math.max(...xs)-Math.min(...xs))*w,dh=(Math.max(...ys)-Math.min(...ys))*h;
   if(dw<=0||dh<=0)throw failure();
   const frame=itemArtFrame(item.artIndex),[aw,ah]=dimensions(atlas);
   ctx.drawImage(atlas,frame.left*aw,frame.top*ah,frame.width*aw,frame.height*ah,x+center.x*w-dw/2,y+center.y*h-dh/2,dw,dh);
  }else if(showDart&&motion.dartVisible!==false){
   if(!finitePoint(overlay.dartTip))throw failure();
   const dx=x+overlay.dartTip.x*w,dy=y+overlay.dartTip.y*h;
   ctx.fillStyle='#168ddd';ctx.beginPath();ctx.roundRect(dx-13.65*scale,dy-7.5*scale,27.3*scale,15*scale,[2*scale,7.5*scale,7.5*scale,2*scale]);ctx.fill();
   ctx.fillStyle='#67ceff';ctx.fillRect(dx-11.65*scale,dy-5.5*scale,17*scale,3*scale);
  }
 }
 return {blob:await encode(output),width,height};
}
