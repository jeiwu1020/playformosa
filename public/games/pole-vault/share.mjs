export const heightText=h=>h>=1e12?(h/1000).toExponential(2)+' km':h>=100000?(h/1000).toLocaleString('en-US',{maximumFractionDigits:2})+' km':Number(h).toFixed(2)+' m';
export const shareText=(s,url)=>`四肢各有想法｜撐竿跳\n我跳到 ${Number(s.maxHeight).toFixed(2)} 公尺！\n你能跳得比什麼還高？\nPlayFormosa 測試版\n${url}`;
export const cardLines=(s,v)=>({height:heightText(s.maxHeight),title:v.title,subtitle:v.subtitle,badge:v.badge,detail:v.detail});
export async function saveImage(file,{mobile=false,nav=globalThis.navigator,download}={}){if(!file)return'error';let supported=false;try{supported=mobile&&typeof nav?.share==='function'&&typeof nav?.canShare==='function'&&nav.canShare({files:[file]});}catch{}if(supported){try{await nav.share({files:[file]});return'shared';}catch(e){if(e?.name==='AbortError')return'cancelled';try{download(file);return'downloaded';}catch{return'error';}}}try{download(file);return'downloaded';}catch{return'error';}}
export function drawResult(source,s,v){
 const c=document.createElement('canvas');c.width=1080;c.height=1280;const x=c.getContext('2d'),a=cardLines(s,v);
 x.fillStyle='#f7f2e5';x.fillRect(0,0,1080,1280);
 function text(txt,px,y,color='#203d49',weight=700){x.font=`${weight} ${px}px system-ui,sans-serif`;x.fillStyle=color;while(x.measureText(txt).width>960&&px>22){px--;x.font=`${weight} ${px}px system-ui,sans-serif`;}x.fillText(txt,55,y);}
 text('PLAYFORMOSA  /  四肢各有想法｜撐竿跳',28,63,'#57756b');text('你能跳得比什麼還高？',52,140);text('本次最高高度 · 撐竿跳',26,199,'#57756b');text(a.height,112,316,'#234552',900);text(a.title,42,390);text(a.subtitle,27,439,'#57756b');
 x.save();x.beginPath();x.roundRect(40,482,1000,550,26);x.clip();x.drawImage(source,0,0,source.width,source.height,40,482,1000,550);x.restore();
 text(a.detail,28,1090);text('本場稱號 · '+a.badge,32,1150,'#3a766e');text('四肢各有想法 · 宇宙也管不著',26,1220,'#57756b');return c;
}
