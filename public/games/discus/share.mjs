import{landingComment,landingPlace,landingReason,landingPerformance}from'./landscape.mjs';
import {verdict,comparison} from './engine.mjs';
export function createShareState(){let generation=0,value=null,pending=false;return{get generation(){return generation;},get value(){return value;},get pending(){return pending;},current(token){return token===generation;},reset(){generation++;value=null;pending=false;},async prepare(encode){if(pending)return false;const token=generation;pending=true;try{const next=await encode();if(token!==generation)return false;value=next;return true;}finally{if(token===generation)pending=false;}}};}
export function resultText(s){return `四肢各有想法｜鐵餅\n我${s.foul?'擲出界外 '+s.distance.toFixed(1)+' 公尺':`擲出 ${s.score.toFixed(1)} 公尺`}！\n${landingComment(s)}\n${s.events?.map(e=>e.name).join(' → ')||'純粹靠自己的這一擲'}\n卡通距離，非正式運動紀錄。\n遊戲網址：${globalThis.location?.origin||''}/games/discus/`;}
export function freezeScene(canvas){const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;out.getContext('2d').drawImage(canvas,0,0);return out;}
export function freezeCard(canvas,s){
 const out=document.createElement('canvas');out.width=1080;out.height=1180;const c=out.getContext('2d');c.fillStyle='#f4f1e9';c.fillRect(0,0,1080,1180);
 cardText(c,'PLAYFORMOSA STUDIO',27,44,30,992,1,'#607461');cardText(c,'四肢各有想法｜鐵餅',48,44,80,992);
 const bottom=cardScore(c,s.foul?'界外 '+s.distance.toFixed(1)+' m':s.reason==='timeout'?'忘記放手！':s.score.toFixed(1)+' m',100,44,160,992),verdictY=Math.max(292,bottom+16),sceneY=Math.max(400,verdictY+82);
 cardText(c,s.foul?'這次不計有效成績':landingComment(s),32,44,verdictY,992,2,'#536954');cardScene(c,canvas,44,sceneY,992,920-sceneY);
 cardText(c,landingPlace(s)+' · '+landingReason(s),26,44,950,992,2,'#536954');cardText(c,landingPerformance(s),25,44,1040,992);
 cardText(c,'卡通距離 · 非正式運動紀錄',24,44,1110,992,1,'#607461');return out;
}
export function bindShare({imageButton,threads,copyButton,status,resultImage,fallback,fallbackImage,fallbackText}){const state=createShareState();let card=null,file=null,url=null,sceneUrl=null,scene=null,scenePending=false,sceneFailed=false,text='',busy=false;const mobile=()=>matchMedia('(pointer:coarse)').matches;imageButton.textContent=mobile()?'分享成績圖片':'下載成績圖片';function note(t){status.textContent=t;}function showFallback(){fallbackText.value=text;fallbackImage.hidden=!url;if(url)fallbackImage.src=url;if(!fallback.open)fallback.showModal();fallbackText.focus({preventScroll:true});}function reset(){state.reset();card=null;file=null;scene=null;scenePending=false;sceneFailed=false;busy=false;if(url)URL.revokeObjectURL(url);if(sceneUrl)URL.revokeObjectURL(sceneUrl);url=sceneUrl=null;resultImage.removeAttribute('src');resultImage.hidden=true;fallbackImage.removeAttribute('src');if(fallback.open)fallback.close();imageButton.disabled=true;note('');}
async function encode(){const token=state.generation;imageButton.disabled=true;note('正在準備本次成績圖片…');try{const ok=await state.prepare(()=>new Promise((resolve,reject)=>card.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding failed')),'image/png')));if(!ok||!state.current(token))return;file=new File([state.value],'playformosa-discus.png',{type:'image/png'});url=URL.createObjectURL(state.value);imageButton.disabled=false;note(sceneFailed?'場景預覽未完成；按成績圖片可重試，下載不受影響。':'成績圖片已準備好。');}catch{if(state.current(token)){imageButton.disabled=false;note('圖片製作失敗，按成績圖片可重試。');}}}
function encodeScene(){if(!scene||scenePending||sceneUrl)return;const token=state.generation;scenePending=true;sceneFailed=false;function fail(){if(!state.current(token))return;scenePending=false;sceneFailed=true;note('場景預覽未完成；按成績圖片可重試，下載不受影響。');}try{scene.toBlob(blob=>{if(!state.current(token))return;if(!blob){fail();return;}try{sceneUrl=URL.createObjectURL(blob);resultImage.src=sceneUrl;resultImage.hidden=false;scenePending=false;sceneFailed=false;}catch{fail();}},'image/png');}catch{fail();}}
function prepare(canvas,s){reset();text=resultText(s);resultImage.alt=s.limitReached?'本次加速落地後實際場景':s.reason==='timeout'?'本次擲鐵餅挑戰畫面（逾時未出手）':'本次擲鐵餅實際落地場景';threads.href='https://www.threads.net/intent/post?text='+encodeURIComponent(text);scene=freezeScene(canvas);encodeScene();card=freezeCard(scene,s);void encode();}
imageButton.addEventListener('click',()=>{if(busy)return;if(sceneFailed)encodeScene();if(!file){if(card&&!state.pending)void encode();return;}const token=state.generation;if(mobile()&&navigator.canShare?.({files:[file]})&&navigator.share){busy=true;let promise;try{promise=navigator.share({files:[file],title:'四肢各有想法｜鐵餅',text});}catch{busy=false;showFallback();return;}Promise.resolve(promise).then(()=>{if(state.current(token))note('已交給系統分享。');},error=>{if(!state.current(token))return;if(error?.name==='AbortError')note('已取消分享，可以再試一次。');else{note('系統分享未完成，可長按圖片儲存。');showFallback();}}).finally(()=>{if(state.current(token))busy=false;});}else if(mobile()){note('這個瀏覽器不支援圖片分享，可長按儲存。');showFallback();}else{const a=document.createElement('a');a.href=url;a.download='playformosa-discus.png';a.click();note('已啟動 PNG 下載。');}});
copyButton.addEventListener('click',()=>{if(busy)return;busy=true;const token=state.generation;let p;try{p=navigator.clipboard?.writeText(text);if(!p)throw Error('Clipboard unavailable');}catch{busy=false;showFallback();note('請手動複製文字。');return;}Promise.resolve(p).then(()=>{if(state.current(token))note('已複製成績與遊戲網址。');},()=>{if(state.current(token)){showFallback();note('無法自動複製，請手動選取文字。');}}).finally(()=>{if(state.current(token))busy=false;});});threads.addEventListener('click',()=>note('Threads 圖片需手動附加。'));return{prepare,reset};}

// Fixed readable type; wrap long copy rather than shrinking it to fine print.
function cardText(ctx,value,size,x,y,width,maxLines=1,color='#172c3b'){
 ctx.font=`700 ${size}px system-ui,sans-serif`;ctx.fillStyle=color;ctx.textBaseline='top';
 const measure=t=>ctx.measureText?.(t).width??Array.from(t).length*size;
 const lines=[];let line='';for(const char of String(value??'')){if(line&&measure(line+char)>width){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
 if(lines.length>maxLines){lines.length=maxLines;let last=lines[maxLines-1];while(last&&measure(last+'…')>width)last=last.slice(0,-1);lines[maxLines-1]=last+'…';}
 lines.forEach((text,i)=>ctx.fillText(text,x,y+i*(size+9)));
}
function cardScene(ctx,source,x,y,w,h){const scale=Math.min(w/source.width,h/source.height),dw=source.width*scale,dh=source.height*scale;ctx.fillStyle='#beded1';ctx.fillRect(x,y,w,h);ctx.drawImage(source,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}

// Scores are data, not prose: never truncate or shrink their digits. Put the unit
// on a second readable line when the full numeric value fills the score band.
function cardScore(ctx,value,size,x,y,width){
 const text=String(value),unit=text.match(/\s(m|km|秒)$/)?.[1],main=unit?text.slice(0,-unit.length-1):text;
 ctx.font=`700 ${size}px system-ui,sans-serif`;ctx.fillStyle='#172c3b';ctx.textBaseline='top';
 const measure=t=>ctx.measureText?.(t).width??Array.from(t).length*size;
 if(measure(text)<=width){ctx.fillText(text,x,y);return y+size;}
 let line='',top=y;for(const char of main){if(line&&measure(line+char)>width){ctx.fillText(line,x,top);top+=size+9;line=char;}else line+=char;}if(line){ctx.fillText(line,x,top);top+=size;}
 if(unit){ctx.font='700 32px system-ui,sans-serif';ctx.fillText(unit,x,top+10);top+=42;}
 return top;
}
