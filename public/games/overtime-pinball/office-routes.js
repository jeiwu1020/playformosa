// Shared visible track geometry, physics entry and decision state. World x is
// mirrored by the renderer; left/right here always mean physical world sides.
export const SHORT_LOOP=Object.freeze({entry:{x:0,z:17,halfWidth:1.5,minSpeed:18},points:240,speed:32,exit:{x:0,z:17,vx:23,vz:-30}});
export const SHORT_PATH=Array.from({length:97},(_,n)=>{const a=n/96*Math.PI*2;return{x:Math.sin(a)*4,z:12+Math.cos(a)*5};});
SHORT_PATH[SHORT_PATH.length-1]={...SHORT_PATH[0]};
function lengths(path){const d=[0];for(let n=1;n<path.length;n++)d.push(d.at(-1)+Math.hypot(path[n].x-path[n-1].x,path[n].z-path[n-1].z));return d;}
const shortLengths=lengths(SHORT_PATH);export const SHORT_LENGTH=shortLengths.at(-1);
function sample(path,ds,d){d=Math.max(0,Math.min(ds.at(-1),d));let n=1;while(n<ds.length-1&&ds[n]<d)n++;const a=path[n-1],b=path[n],span=ds[n]-ds[n-1],t=(d-ds[n-1])/span;return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/span,dz:(b.z-a.z)/span};}
export const shortPoint=d=>sample(SHORT_PATH,shortLengths,d);
export function shortEntry(from,to){const e=SHORT_LOOP.entry;if(from.z<e.z||to.z>=e.z||to.vz>=-e.minSpeed)return null;const t=(e.z-from.z)/(to.z-from.z),x=from.x+(to.x-from.x)*t;return Math.abs(x-e.x)<=e.halfWidth?{x,z:e.z,t}:null;}
export const MAIL_CHOICE_SECONDS=1.2;
export const freshMailChoice=direction=>({choice:null,choiceOpen:false,choiceRemaining:MAIL_CHOICE_SECONDS,choiceDefault:direction===1?'right':'left',branch:null,chosenByPlayer:false});
export function advanceMailChoice(state,dt,pressed={}){if(state.choice)return;state.choiceOpen=true;state.choiceRemaining=Math.max(0,state.choiceRemaining-dt);if(!!pressed.left!==!!pressed.right){state.choice=pressed.left?'left':'right';state.chosenByPlayer=true;state.choiceOpen=false;}else if(!state.choiceRemaining){state.choice=state.choiceDefault;state.choiceOpen=false;}}
const branchControls=[[0,-26],[18,-24],[22,-17],[17,-14],[12,-13],[6,-10]];
function smooth(points){return Array.from({length:101},(_,n)=>{const f=n/100*(points.length-1),i=Math.min(points.length-2,Math.floor(f)),u=f-i,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)],cat=k=>.5*(2*b[k]+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u*u+(-a[k]+3*b[k]-3*c[k]+d[k])*u*u*u);return{x:cat(0),z:cat(1)};});}
export const MAIL_BRANCHES=Object.fromEntries(['left','right'].map(side=>{const sign=side==='left'?-1:1,path=smooth(branchControls.map(([x,z])=>[x*sign,z])),ds=lengths(path);return[side,{path,length:ds.at(-1),lengths:ds,exit:{x:6*sign,z:-10,vx:18*sign,vz:27}}];}));
export const branchPoint=(side,d)=>{const b=MAIL_BRANCHES[side];return sample(b.path,b.lengths,d);};
