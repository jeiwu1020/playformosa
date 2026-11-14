// Same 1080 x 1180 cream score-card hierarchy used by the platform's sports games.
// Copy the settled pixels synchronously; never read a later frame or crop the office.
export function paintPinballScoreCard(source,result,createCanvas=()=>document.createElement('canvas')){
 if(!source.width||!source.height)throw Error('empty frame');
 const card=createCanvas();card.width=1080;card.height=1180;
 const ctx=card.getContext('2d');if(!ctx)throw Error('2D unavailable');
 ctx.fillStyle='#f4f1e9';ctx.fillRect(0,0,1080,1180);
 const line=(text,y,size,color='#243d38',weight='bold')=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px sans-serif`;ctx.fillText(text,44,y);};
 line('PLAYFORMOSA STUDIO',58,27,'#607461');
 line('不准加班公司',130,52);
 line(result.limit?`${result.limit/60} 分鐘模式`:'不限時模式',180,24,'#607461');
 const score=Number(result.score).toLocaleString('en-US');
 ctx.font='900 126px sans-serif';const scoreWidth=ctx.measureText?.(score).width??score.length*76;
 line(score,320,Math.min(126,126*992/Math.max(1,scoreWidth)),'#243d38','900');
 line('本次得分 · 下班結算',371,29);
 const box={x:44,y:401,w:992,h:588},scale=Math.min(box.w/source.width,box.h/source.height),w=source.width*scale,h=source.height*scale;
 ctx.fillStyle='#beded1';ctx.fillRect(box.x,box.y,box.w,box.h);
 ctx.drawImage(source,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);
 line('島遊無界 · PLAYFORMOSA',1070,29);
 line('不准加班公司',1115,22,'#607461');
 return card;
}
