// A finite seeded stage. Randomness places scenery; it never chooses collision outcomes.
export const AIR_DT=1/120,BALL_RADIUS=.18,MAX_OBJECTS=16;
// Keep the original 12 seeded carriers and long-distance chain. Four additions
// fill descending-path gaps; no aiming at the ball or collision-time RNG.
export function createRoute(seed=1){let n=(seed>>>0)||1;const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const route=Array.from({length:12},(_,i)=>({id:i,x:[8,42,76,116,163,218,300,360,510,640,730,855][i]+(rnd()-.5)*(i?12:2),y:[1.5,30,42,28,10,24,2,2,2,2,2,2][i]+(rnd()-.5)*(i>=6?1:i?12:1),half:i?(i>=6?10:7)+rnd()*3:3,angle:i>=6?-.05-rnd()*.12:-.25-rnd()*.3,amp:i?.35+rnd()*.3:0,frequency:.45+rnd()*.25,phase:rnd()*Math.PI*2,kind:['awning','mattress','wok'][i%3],restitution:[.6,.72,.8][i%3],energy:[45,145,100][i%3]+rnd()*30,name:i===0?'斜坡彈跳墊':['阿嬤的遮雨棚','搬家飛行床墊','夜市翻炒巨鍋'][i%3]}));
 for(let j=0;j<4;j++){const id=12+j,k=j%3;route.push({id,x:[101,133,161,270][j]+(rnd()-.5)*8,y:[14,13,2,3][j]+(rnd()-.5)*(j<2?4:1),half:11+rnd()*2,angle:-.10-rnd()*.12,amp:.35+rnd()*.3,frequency:.45+rnd()*.25,phase:rnd()*Math.PI*2,kind:['awning','mattress','wok'][k],restitution:[.6,.72,.8][k],energy:[45,145,100][k]+rnd()*30,name:['阿嬤的遮雨棚','搬家飛行床墊','夜市翻炒巨鍋'][k]});}return route;
}
export function surfaceAt(o,t){return{x:o.x,y:o.y+o.amp*Math.sin(o.frequency*t+o.phase),angle:o.angle};}
export function sweepSurface(a,b,o,t,dt){const p=surfaceAt(o,t),q=surfaceAt(o,t+dt),ca=Math.cos(o.angle),sa=Math.sin(o.angle),normal={x:-sa,y:ca},velocity={x:0,y:(q.y-p.y)/dt};const ax=a.x-p.x,ay=a.y-p.y,dx=(b.x-a.x)-(q.x-p.x),dy=(b.y-a.y)-(q.y-p.y),d0=ax*normal.x+ay*normal.y,dv=dx*normal.x+dy*normal.y;let best=null;const take=(u,n)=>{if(u>=0&&u<=1&&(!best||u<best.u))best={u,normal:n,velocity};};const u=(BALL_RADIUS+.12-d0)/dv;if(dv<-1e-10&&d0>=BALL_RADIUS+.12-1e-8&&u>=0&&u<=1&&Math.abs((ax+dx*u)*ca+(ay+dy*u)*sa)<=o.half)take(u,normal);
 // Round capsule tips use a quadratic sweep, so fast glancing contacts do not tunnel.
 for(const side of[-1,1]){const ex=ax-side*o.half*ca,ey=ay-side*o.half*sa,r=BALL_RADIUS+.12,A=dx*dx+dy*dy,B=2*(ex*dx+ey*dy),C=ex*ex+ey*ey-r*r,D=B*B-4*A*C;if(A<1e-16||D<0||C<0)continue;const v=(-B-Math.sqrt(D))/(2*A);if(v<0||v>1)continue;const nx=(ex+dx*v)/r,ny=(ey+dy*v)/r;if(side*(nx*ca+ny*sa)<-1e-10||nx*normal.x+ny*normal.y<0||dx*nx+dy*ny>=0)continue;take(v,{x:nx,y:ny});}return best;}
export function bounce(v,h,o){const n=h.normal,t={x:n.y,y:-n.x},rx=v.vx-h.velocity.x,ry=v.vy-h.velocity.y,vn=rx*n.x+ry*n.y,vt=rx*t.x+ry*t.y;if(vn>=0)return{...v};const I=.4*BALL_RADIUS**2,j=-.08*(vt-v.spin*BALL_RADIUS)/(1+BALL_RADIUS**2/I),out=Math.sqrt((o.restitution??.72)**2*vn*vn+2*o.energy),tangent=vt+j;return{vx:h.velocity.x+n.x*out+t.x*tangent,vy:h.velocity.y+n.y*out+t.y*tangent,spin:v.spin-j*BALL_RADIUS/I};}
export function resetFlight(s){s.airAccumulator=0;s.flight=0;s.x=0;s.y=s.releaseHeight;s.vx=s.launchVelocity.x;s.vy=s.launchVelocity.y;s.ballSpin=s.launchVelocity.spin;s.spent=[];s.hits=[];s.maxX=0;s.routeEvent='';}
function flightStep(s,dt){let left=dt,used=0;for(let loop=0;loop<MAX_OBJECTS+2&&left>1e-10;loop++){const a={x:s.launchX+s.x,y:s.y+BALL_RADIUS},b={x:a.x+s.vx*left,y:a.y+s.vy*left-4.905*left*left};let best=null;for(const o of s.route){if(s.spent.includes(o.id))continue;const h=sweepSurface(a,b,o,s.flight,left);if(h&&(!best||h.u<best.u))best={...h,o};}const ground=b.y<=BALL_RADIUS?(a.y-BALL_RADIUS)/(a.y-b.y):Infinity;
 const u=Math.min(1,ground,best?.u??Infinity),elapsed=left*u;s.x+=(b.x-a.x)*u;s.y=Math.max(0,a.y+(b.y-a.y)*u-BALL_RADIUS);s.vy-=9.81*elapsed;s.flight+=elapsed;used+=elapsed;left-=elapsed;s.maxX=Math.max(s.maxX,s.x);
 if(ground<=1&&ground<=(best?.u??Infinity)){s.distance=s.x;s.y=0;return{used,landed:true};}
 if(best&&best.u<=1){const incoming={vx:s.vx,vy:s.vy,spin:s.ballSpin},out=bounce(incoming,best,best.o);s.vx=out.vx;s.vy=out.vy;s.ballSpin=out.spin;s.spent.push(best.o.id);s.hits.push({id:best.o.id,t:s.flight,x:s.launchX+s.x,y:s.y+.18,incoming,outgoing:{...out},normal:best.normal});s.routeEvent=best.o.name+'接到了！';s.x+=best.normal.x*1e-6;s.y+=best.normal.y*1e-6;}else break;
 }return{used:dt,landed:false};}
export function advanceFlight(s,dt){s.airAccumulator+=dt;while(s.airAccumulator+1e-10>=AIR_DT){s.airAccumulator-=AIR_DT;const hit=flightStep(s,AIR_DT);if(hit.landed){const left=Math.max(0,s.airAccumulator+AIR_DT-hit.used);s.airAccumulator=0;return{landed:true,left};}}return{landed:false,left:0};}
export function routeChapter(x){return x<120?{name:'城市屋頂 · 街機尺度',art:'clouds',sky:'#c1ded9'}:x<350?{name:'巨物夜市 · 街機尺度',art:'nightmarket',sky:'#f0dec5'}:x<600?{name:'衛星轉運 · 街機尺度',art:'space',sky:'#99b6dd'}:x<900?{name:'月球拋接 · 街機尺度',art:'moon',sky:'#172543'}:{name:'宇宙洗衣 · 街機尺度',art:'cosmic_laundry',sky:'#252441'};}

export function seedFromSearch(search=''){const raw=new URLSearchParams(search).get('route');return raw!==null&&/^\d+$/.test(raw)&&Number(raw)<=4294967295?Number(raw):466;}

// Sample the unconsumed fraction for presentation only. Use the same swept contact
// solver (not a straight extrapolation through a platform); authoritative scoring,
// contact history and fixed-step replay remain untouched.
export function sampleFlight(s){
 if(s.phase!=='air'||!(s.airAccumulator>1e-10))return s;
 const view={...s,spent:[...s.spent],hits:[...s.hits]};
 const hit=flightStep(view,s.airAccumulator);
 if(hit.landed){view.phase='impact';view.impact=0;}
 view.airAccumulator=0;
 return view;
}
