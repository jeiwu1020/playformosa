// Snapshot pixels are copied in the same turn as render, before a resize can clear WebGL.
export function freezeResultFrame({render,source,createCanvas=()=>document.createElement('canvas')}){
 if(source.width<2||source.height<2)throw Error('No visible result frame');
 render();const frozen=createCanvas();frozen.width=source.width;frozen.height=source.height;
 const ctx=frozen.getContext('2d');if(!ctx)throw Error('Snapshot canvas unavailable');ctx.drawImage(source,0,0);return frozen;
}
function lines(ctx,text,width){let line='',out=[];for(const c of String(text)){if(line&&ctx.measureText(line+c).width>width){out.push(line);line=c;}else line+=c;}if(line)out.push(line);return out;}
export function drawBeerResultCard(canvas,snapshot,{score,verdict,distance,spill}){
 if(!snapshot||snapshot.width<2||snapshot.height<2)throw Error('No round snapshot');
 canvas.width=1200;canvas.height=1200;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Card canvas unavailable');
 ctx.fillStyle='#f4f1e9';ctx.fillRect(0,0,1200,1200);ctx.textBaseline='top';ctx.fillStyle='#607461';ctx.font='700 27px sans-serif';ctx.fillText('PLAYFORMOSA STUDIO',48,30);
 ctx.fillStyle='#172c3b';ctx.font='700 52px sans-serif';ctx.fillText('別灑啊！',48,80);ctx.font='800 108px sans-serif';ctx.fillText(`${score} / 10.0`,48,165);
 ctx.fillStyle='#536954';ctx.font='700 32px sans-serif';lines(ctx,verdict,1104).slice(0,2).forEach((line,i)=>ctx.fillText(line,48,300+i*42));
 ctx.fillStyle='#20372b';ctx.fillRect(40,410,1120,590);
 const scale=Math.min(1120/snapshot.width,590/snapshot.height),w=snapshot.width*scale,h=snapshot.height*scale;
 // Square variant keeps the complete actual stop/fall scene, never a synthetic cup.
 ctx.drawImage(snapshot,40+(1120-w)/2,410+(590-h)/2,w,h);
 ctx.fillStyle='#536954';ctx.font='500 30px sans-serif';ctx.fillText(`離靶心 ${distance} · 灑出 ${spill}`,48,1040);
 ctx.font='500 24px sans-serif';ctx.fillText('本局實際停杯／掉落定格 · 島遊無界 PLAYFORMOSA',48,1120);return canvas;
}
