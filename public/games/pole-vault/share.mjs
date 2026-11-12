export const heightText=h=>h>=1e12?(h/1000).toExponential(2)+' km':h>=100000?(h/1000).toLocaleString('en-US',{maximumFractionDigits:2})+' km':Number(h).toFixed(2)+' m';
export const shareText=(s,url)=>`四肢各有想法｜撐竿跳\n我跳到 ${Number(s.maxHeight).toFixed(2)} 公尺！\n你能跳得比什麼還高？\nPlayFormosa\n${url}`;
export const cardLines=(s,v)=>({height:heightText(s.maxHeight),title:v.title,subtitle:v.subtitle,badge:v.badge,detail:v.detail});
export async function saveImage(file,{mobile=false,nav=globalThis.navigator,download}={}){if(!file)return'error';let supported=false;try{supported=mobile&&typeof nav?.share==='function'&&typeof nav?.canShare==='function'&&nav.canShare({files:[file]});}catch{}if(supported){try{await nav.share({files:[file]});return'shared';}catch(e){if(e?.name==='AbortError')return'cancelled';try{download(file);return'downloaded';}catch{return'error';}}}try{download(file);return'downloaded';}catch{return'error';}}
export function drawResult(source,s,v){
 const c=document.createElement('canvas');c.width=1080;c.height=1180;const x=c.getContext('2d'),a=cardLines(s,v);x.fillStyle='#f4f1e9';x.fillRect(0,0,1080,1180);
 cardText(x,'PLAYFORMOSA STUDIO',27,44,30,992,1,'#607461');cardText(x,'四肢各有想法｜撐竿跳',48,44,80,992);
 const bottom=cardScore(x,a.height,108,44,160,992),verdictY=Math.max(292,bottom+16),sceneY=Math.max(400,verdictY+82);cardText(x,a.title,32,44,verdictY,992,2,'#536954');
 cardScene(x,source,44,sceneY,992,920-sceneY);cardText(x,a.detail,26,44,950,992,2,'#536954');
 cardText(x,'本場稱號 · '+a.badge,25,44,1040,992);cardText(x,'島遊無界 · PLAYFORMOSA',24,44,1110,992,1,'#607461');return c;
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
