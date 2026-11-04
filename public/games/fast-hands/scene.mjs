import {TRACK,newRun,arm,move,snapshot} from './shuttle.mjs';
export const SCENE=Object.freeze({width:720,height:400,activeShoulder:{x:210+338/1254*320,y:-3+1018/1254*320},restShoulder:{x:210+901/1254*320,y:-3+1018/1254*320},restHand:{x:492,y:325},duck:{x:558,y:320},note:{x:170,y:108}});
const clamp=x=>Math.max(0,Math.min(1,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
export function armJoints(shoulder,target,upper=150,lower=145,bend=-1){
 const dx=target.x-shoulder.x,dy=target.y-shoulder.y,raw=Math.hypot(dx,dy),d=Math.max(Math.abs(upper-lower)+.0001,Math.min(upper+lower-.0001,raw));
 const angle=Math.atan2(dy,dx),a=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))));
 const elbow={x:shoulder.x+upper*Math.cos(angle+bend*a),y:shoulder.y+upper*Math.sin(angle+bend*a)};
 return {shoulder:{...shoulder},elbow,wrist:raw===d?{...target}:{x:shoulder.x+Math.cos(angle)*d,y:shoulder.y+Math.sin(angle)*d}};
}
export function poseForRun(s,finishAge=1000){
 const bill={x:SCENE.note.x,y:SCENE.note.y+(s.dropPx||0)*(344-22-SCENE.note.y)/283};
 const q=clamp(((s.controlX??s.x)-TRACK.home)/(TRACK.far-TRACK.home));
 let hand={...bill},duck={...SCENE.duck},grip='note';
 if(['outbound','returning'].includes(s.phase)){hand=point(bill,SCENE.duck,q);grip=s.phase==='returning'?'duck':'open';if(grip==='duck')duck={x:hand.x,y:hand.y+7};}
 if(s.phase==='success'){hand={...bill};const flourish=finishAge<240?Math.sin(Math.max(0,finishAge)/240*Math.PI)*16:0;duck={x:bill.x+5,y:bill.y+7+flourish};grip=finishAge>=55&&finishAge<165?'open':'both';}
 if(['failed','cancelled'].includes(s.phase)){hand={x:213,y:325};grip='open';if(s.pickupAt!==null)duck={x:bill.x+5,y:320};}
 return {hand,duck,bill,grip,restHand:{...SCENE.restHand}};
}
export function demoSample(displayTime){
 const t=((displayTime%7000)+7000)%7000;let s=arm(newRun(),{x:.1,at:0,id:1});
 if(t>=1200){const v=Math.min(300,(t-1200)/6);if(v>30.375)s=move(s,{x:.181,at:30.375,id:1});s=move(s,{x:lerp(.1,.9,v/300),at:v,id:1});}
 if(t>=3000){const v=Math.min(600,300+(t-3000)/6);s=move(s,{x:lerp(.9,.1,(v-300)/300),at:v,id:1});}
 const v=Math.max(0,Math.min(600,(t-1200)/6)),state=snapshot(s,v),finishAge=Math.max(0,t-4620);
 return {state,pose:poseForRun(state,finishAge),finishAge,scoring:false,label:state.phase==='armed'?'按住左邊，準備出手':state.phase==='outbound'?'一路滑到右邊，抓起小鴨':state.phase==='returning'?'不用放開，立刻滑回左邊':'回到起點，兩樣一起接住'};
}

const COLORS={skin:'#eec19d',edge:'#a76e55',ink:'#2e5048',leaf:'#84a08b',duck:'#f3bf43'};
function rounded(ctx,x,y,w,h,r,fill,stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function ellipse(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function drawArm(ctx,shoulder,hand,upper,lower,bend){const r=armJoints(shoulder,hand,upper,lower,bend);ctx.lineCap='round';ctx.lineJoin='round';for(const [w,c] of [[31,COLORS.edge],[26,COLORS.skin]]){ctx.beginPath();ctx.moveTo(r.shoulder.x,r.shoulder.y);ctx.lineTo(r.elbow.x,r.elbow.y);ctx.lineTo(r.wrist.x,r.wrist.y);ctx.lineWidth=w;ctx.strokeStyle=c;ctx.stroke();}ellipse(ctx,r.elbow.x-2,r.elbow.y-2,9,5,'#f3d0b1');}
function drawHand(ctx,p,grip){ctx.save();ctx.translate(p.x,p.y);ellipse(ctx,0,3,18,13,COLORS.edge);ellipse(ctx,0,1,17,12,COLORS.skin);const open=grip==='open';for(let i=0;i<3;i++){rounded(ctx,-13+i*9,open?-18:-9,8,open?24:17,4,COLORS.skin,COLORS.edge);}ellipse(ctx,14,8,7,5,COLORS.skin);ctx.restore();}
function drawNote(ctx,p){ctx.save();ctx.translate(p.x,p.y);rounded(ctx,-48,-22,96,44,5,'#92ad7a','#4f775f');rounded(ctx,-42,-16,84,32,3,'#d5e1b7');ctx.strokeStyle='#87a173';ctx.lineWidth=1;ctx.strokeRect(-36,-10,72,20);ellipse(ctx,0,0,13,13,'#adc58d');ctx.fillStyle='#527753';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('100',0,4);ctx.fillRect(-32,-3,13,2);ctx.fillRect(20,4,13,2);ctx.restore();}
function drawDuck(ctx,p){ellipse(ctx,p.x,p.y+18,30,5,'#a9793320');ellipse(ctx,p.x,p.y,29,20,COLORS.duck);ellipse(ctx,p.x+14,p.y-19,17,17,'#f9cf5e');rounded(ctx,p.x+25,p.y-21,18,8,4,'#dd8053');ellipse(ctx,p.x+18,p.y-23,2.5,2.5,'#284c44');ctx.beginPath();ctx.ellipse(p.x-6,p.y+1,12,8,-.2,0,Math.PI*2);ctx.strokeStyle='#d5a030';ctx.lineWidth=2;ctx.stroke();}
function drawRoom(ctx){
 ctx.save();ctx.beginPath();ctx.roundRect(14,13,692,369,30);ctx.clip();
 const wall=ctx.createLinearGradient(0,13,0,300);wall.addColorStop(0,'#eee8dc');wall.addColorStop(1,'#c9c0b1');ctx.fillStyle=wall;ctx.fillRect(14,13,692,369);
 // Quiet masonry and cream cabinets echo the depth of the real tabletop
 // setting, drawn locally rather than embedding any reference-video pixels.
 const tones=['#d6cfc2','#dcd4c7','#d1c8ba'];
 for(let row=0;row<8;row++)for(let col=0;col<13;col++){ctx.fillStyle=tones[(row*3+col)%tones.length];ctx.fillRect(-20+col*62+(row%2)*31,24+row*27,59,24);}
 const depth=ctx.createLinearGradient(0,24,0,237);depth.addColorStop(0,'#fffaf31a');depth.addColorStop(1,'#65574414');ctx.fillStyle=depth;ctx.fillRect(14,13,692,224);
 rounded(ctx,219,44,282,151,3,'#c2b8a6');
 rounded(ctx,222,46,136,144,2,'#e8e0cf');rounded(ctx,361,46,137,144,2,'#e8e0cf');
 rounded(ctx,346,155,3,24,1,'#9a917f');rounded(ctx,370,155,3,24,1,'#9a917f');
 rounded(ctx,214,40,292,7,2,'#e9e1d2');
 ctx.fillStyle='#a99c87';ctx.fillRect(40,237,640,7);ctx.fillStyle='#d0c5b2';ctx.fillRect(40,244,640,53);
 ctx.fillStyle='#b5a995';ctx.fillRect(138,253,30,3);ctx.fillRect(553,253,30,3);
 // Small rear-counter objects stay well away from the arm/prop action.
 rounded(ctx,112,210,20,27,5,'#b4b9a9');rounded(ctx,110,207,24,5,2,'#a49780');
 rounded(ctx,141,218,15,19,4,'#e7dfce');
 rounded(ctx,603,216,24,22,5,'#af987b');
 for(const [x,y,rx,ry] of[[607,202,5,15],[620,200,5,16],[614,196,5,15]])ellipse(ctx,x,y,rx,ry,'#98a38a');
 // Preserve the established front-edge y=344 contact plane and all poses.
 ellipse(ctx,359,364,282,12,'#776c5730');
 const top=ctx.createLinearGradient(0,288,0,345);top.addColorStop(0,'#d5cbb9');top.addColorStop(1,'#e4dac8');
 ctx.beginPath();ctx.moveTo(112,290);ctx.lineTo(606,290);ctx.lineTo(656,344);ctx.lineTo(62,344);ctx.closePath();ctx.fillStyle=top;ctx.fill();
 ctx.save();ctx.clip();ctx.fillStyle='#a79a8026';for(let i=0;i<110;i++)ctx.fillRect(65+(i*71)%590,292+(i*19)%50,1+(i%2),1);ctx.restore();
 rounded(ctx,62,344,594,14,5,'#a19178');rounded(ctx,62,344,594,4,2,'#c2b39a');
 ctx.restore();
}
export function renderScene(canvas,model,torso,surface=null){
 const ctx=canvas.getContext('2d');const r=surface??canvas.getBoundingClientRect(),dpr=surface?1:Math.min(2,globalThis.devicePixelRatio||1),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);const scale=Math.min(w/720,h/400);ctx.setTransform(scale,0,0,scale,(w-720*scale)/2,(h-400*scale)/2);
 const p=model.pose;drawRoom(ctx);
 // The curve is a teaching hint only. It never participates in hit testing.
 if(model.demo){ctx.setLineDash([8,10]);ctx.lineWidth=3;ctx.strokeStyle='#b6c9ae';ctx.beginPath();ctx.moveTo(170,112);ctx.bezierCurveTo(90,280,380,363,558,320);ctx.stroke();ctx.setLineDash([]);}
 drawArm(ctx,SCENE.restShoulder,p.restHand,65,70,1);drawHand(ctx,p.restHand,'rest');
 if(torso?.complete&&torso.naturalWidth)ctx.drawImage(torso,210,-3,320,320);
 drawArm(ctx,SCENE.activeShoulder,p.hand,150,145,-1);
 if(model.state.phase==='success'){ctx.strokeStyle='#efc268';ctx.lineWidth=3;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.beginPath();ctx.moveTo(p.bill.x+Math.cos(a)*53,p.bill.y+Math.sin(a)*43);ctx.lineTo(p.bill.x+Math.cos(a)*62,p.bill.y+Math.sin(a)*50);ctx.stroke();}}
 drawNote(ctx,p.bill);drawDuck(ctx,p.duck);drawHand(ctx,p.hand,p.grip);
 ctx.font='600 14px system-ui';ctx.fillStyle='#688173';ctx.textAlign='center';ctx.fillText('鈔票',170,51);ctx.fillText('小鴨',570,270);
 if(model.state.phase==='returning'){ctx.font='bold 21px system-ui';ctx.fillStyle='#bd8051';ctx.fillText('嘎！',600,293);}
 if(model.demo){rounded(ctx,38,28,105,26,13,'#f8f3df');ctx.font='bold 12px system-ui';ctx.fillStyle='#6f8268';ctx.fillText('慢速示範 × ⅙',90,46);}
}
