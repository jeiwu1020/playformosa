export function createEpoch(){let n=0;return{current:()=>n,next:()=>++n,valid:t=>t===n};}
export function shareText(r,url){return `四肢各有想法｜鉛球\n空中接力\n我推出 ${r.distance.toFixed(2)} m！稱號：${r.badge}\n${r.cause||''}\n路線 ${r.seed} · ${r.contacts||0} 次接力\nPlayFormosa\n${url}`;}
export async function shareFile(file,nav,mobile){let supported=false;try{supported=mobile&&nav.canShare?.({files:[file]});}catch{}if(!supported)return mobile?'fallback':'download';try{await nav.share({files:[file]});return'shared';}catch(e){return e?.name==='AbortError'?'cancelled':'fallback';}}
export function makeCard(source,r){
 const c=document.createElement('canvas');c.width=1080;c.height=1180;const x=c.getContext('2d');x.fillStyle='#f4f1e9';x.fillRect(0,0,1080,1180);
 cardText(x,'PLAYFORMOSA STUDIO',27,44,30,992,1,'#607461');cardText(x,'四肢各有想法｜鉛球',48,44,80,992);
 const bottom=cardScore(x,r.distance.toFixed(2)+' m',108,44,160,992),verdictY=Math.max(292,bottom+16),sceneY=Math.max(400,verdictY+82);cardText(x,r.verdict||r.badge,32,44,verdictY,992,2,'#536954');
 cardScene(x,source,44,sceneY,992,920-sceneY);cardText(x,r.cause||r.comparison||`出手 ${r.angle.toFixed(1)}°`,26,44,950,992,2,'#536954');
 cardText(x,r.badge,25,44,1040,992);cardText(x,'誇張運動 · 非正式運動紀錄',24,44,1110,992,1,'#607461');return c;
}

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
