// Result-card and sharing helpers. No simulation, input or score mutation.
export function wrapLines(ctx,text,width,maxLines){
 const chars=Array.from(String(text).replace(/\s+/g,' ').trim()),lines=[];let line='';
 for(let i=0;i<chars.length;i++){const candidate=line+chars[i];if(ctx.measureText(candidate).width>width&&line){if(/[，。！？、；：）》」』】]/u.test(chars[i])&&Array.from(line).length>1){const tail=Array.from(line).pop();lines.push(Array.from(line).slice(0,-1).join(''));line=tail+chars[i];}else{lines.push(line);line=chars[i];}if(lines.length===maxLines){let last=lines.pop();while(last&&ctx.measureText(last+'…').width>width)last=Array.from(last).slice(0,-1).join('');lines.push(last+'…');return lines;}}else line=candidate;}
 if(line)lines.push(line);return lines;
}
export function drawResultCard(canvas,snapshot,r){
 canvas.width=1600;canvas.height=1200;const ctx=canvas.getContext('2d');if(!ctx)throw Error('無法建立成績圖');ctx.textBaseline='top';ctx.fillStyle='#fff7e6';ctx.fillRect(0,0,1600,1200);
 // A dedicated 900×1120 portrait camera supplies the photo, not the ultrawide live canvas.
 ctx.fillStyle='#e8f1da';ctx.fillRect(40,40,900,1120);if(snapshot)ctx.drawImage(snapshot,40,40,900,1120);
 const x=1000,width=540;ctx.textAlign='left';ctx.fillStyle='#526b54';ctx.font='700 26px sans-serif';ctx.fillText('PlayFormosa · 小遊戲',x,90);
 ctx.fillStyle='#293735';ctx.font='900 70px sans-serif';ctx.fillText('接棒啦！',x,151);
 ctx.fillStyle='#e66e44';ctx.font='900 138px sans-serif';ctx.fillText(`${r.caught}`,x,300);ctx.font='700 48px sans-serif';ctx.fillText(`/ ${r.total} 根`,x+190,374);
 ctx.fillStyle='#293735';ctx.font='800 44px sans-serif';wrapLines(ctx,r.title,width,2).forEach((s,i)=>ctx.fillText(s,x,530+i*57));
 ctx.fillStyle='#65715b';ctx.font='500 34px sans-serif';wrapLines(ctx,r.comment,width,4).forEach((s,i)=>ctx.fillText(s,x,700+i*46));
 ctx.font='600 30px sans-serif';ctx.fillText(`遊戲評分 ${r.rating.toFixed(1)} / 10`,x,970);ctx.fillText(`坐倒 ${r.falls} 次`,x,1020);
 ctx.font='500 25px sans-serif';wrapLines(ctx,'手掌有接到，今天就算有運動。',width,2).forEach((s,i)=>ctx.fillText(s,x,1100+i*33));return canvas;
}
export function shareText(r,url){return `接棒啦！我接住 ${r.caught} / ${r.total} 根！\n${r.title}：${r.comment}\nPlayFormosa 小遊戲・測試版\n${url}`;}
export function threadsURL(text){return 'https://www.threads.net/intent/post?text='+encodeURIComponent(text);}
export async function shareResult({navigator,mobile,file}){
 if(!mobile||!file||!navigator?.share||!navigator?.canShare)return 'fallback';
 try{if(!navigator.canShare({files:[file]}))return 'fallback';await navigator.share({files:[file]});return 'shared';}catch(e){return e?.name==='AbortError'?'cancelled':'fallback';}
}
