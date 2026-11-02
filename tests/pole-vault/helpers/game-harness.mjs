import {entryBoundary,controllerSource} from '../../helpers/entry-boundary.mjs';
import {syncPauseButton} from '../../../public/games/shared/game-ui.mjs';
import * as flightProfile from '../../../public/games/pole-vault/flight-profile.mjs';
import vm from 'node:vm';import {readFileSync} from 'node:fs';
import * as physics from '../../../public/games/pole-vault/physics.mjs';import * as input from '../../../public/games/pole-vault/input.mjs';import * as guard from '../../../public/games/pole-vault/result-guard.mjs';import * as share from '../../../public/games/pole-vault/share.mjs';import * as ui from '../../../public/games/pole-vault/ui-state.mjs';import * as milestones from '../../../public/games/pole-vault/milestones.mjs';import * as resultFrame from '../../../public/games/pole-vault/result-frame.mjs';
export const event=(type,props)=>Object.assign(new Event(type,{cancelable:true}),props);
class Element extends EventTarget{
 constructor(id,limb){super();this.id=id;this.dataset=limb===undefined?{}:{limb:String(limb)};this.children=[];this.style={setProperty(){}};this.classList={toggle(){}};this.attrs={};this.open=false;this.width=1000;this.height=550;}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
 set innerHTML(v){this.children=Array.from({length:(v.match(/<i /g)||[]).length},()=>new Element('mark'));}
 showModal(){this.open=true;}close(){this.open=false;}insertBefore(){}replaceChildren(){this.children=[];}append(x){this.children.push(x);}setPointerCapture(){}hasPointerCapture(){return false;}
}
// The production event handlers, frame loop, physics, frame selection,
// result guard and drawResult run unchanged. DOM/audio/image encoding are boundaries.
export function gameHarness({initial=physics.fresh(),autoStart=true}={}){
 const nodes=new Map(),buttons=[0,1,2,3].map(i=>new Element('limb'+i,i)),document=new EventTarget(),window=new EventTarget(),captures=[],cardSources=[];
 document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};document.querySelectorAll=()=>buttons;document.documentElement=new Element('html');document.createElement=tag=>{const e=new Element(tag);e.getContext=()=>new Proxy({measureText:s=>({width:s.length*12}),drawImage:source=>cardSources.push(source.sourceState)}, {get:(o,k)=>o[k]??(()=>{})});e.toBlob=cb=>cb(new Blob(['encoding boundary'],{type:'image/png'}));return e;};
 const sound={setPlaying(){},unlock(){},play(){},ready:false,decoded:0};let now=0,nextFrame;
 const entryUI=entryBoundary();const context={createGameEntry:entryUI.createGameEntry,syncPauseButton,...flightProfile,...physics,...input,...guard,...share,...ui,...milestones,...resultFrame,fresh:()=>structuredClone(initial),drawResult:(...args)=>{const old=globalThis.document;globalThis.document=document;try{return share.drawResult(...args);}finally{globalThis.document=old;}},document,window,structuredClone,File,innerWidth:900,innerHeight:700,visualViewport:null,localStorage:{getItem(){return null;},setItem(){}},performance:{now:()=>now},requestAnimationFrame:f=>nextFrame=f,matchMedia:()=>({matches:false}),navigator:{maxTouchPoints:0},createGameAudio:()=>sound,createWorld:()=>({software:false,resize(){},render(){},capture(s){captures.push(structuredClone(s));const e=new Element('captured');e.sourceState=structuredClone(s);return e;}})};
 vm.runInNewContext(controllerSource(readFileSync(new URL('../../../public/games/pole-vault/game.mjs',import.meta.url),'utf8'))+'\nglobalThis.readState=()=>s;globalThis.readInput=()=>input.values;',context);
 const advance=seconds=>{for(let i=0;i<Math.ceil(seconds*120);i++){now+=1000/120;nextFrame(now);}};
 const setKeys=values=>{for(const[i,code]of['KeyJ','KeyK','KeyA','KeyS'].entries())window.dispatchEvent(event(values[i]?'keydown':'keyup',{code,repeat:false}));};
 if(autoStart)entryUI.start();
 return{entryUI,startEntry:event=>entryUI.start(event),document,window,buttons,advance,setKeys,values:()=>Array.from(context.readInput()),state:()=>structuredClone(context.readState()),nodes,captures,cardSources};
}
