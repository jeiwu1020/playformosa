import {entryBoundary,controllerSource} from '../helpers/entry-boundary.mjs';
import {syncPauseButton} from '../../public/games/shared/game-ui.mjs';
import * as flightProfile from '../../public/games/pole-vault/flight-profile.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as resultFrame from '../../public/games/pole-vault/result-frame.mjs';
import * as physics from '../../public/games/pole-vault/physics.mjs';
import * as input from '../../public/games/pole-vault/input.mjs';
import * as guard from '../../public/games/pole-vault/result-guard.mjs';
import * as share from '../../public/games/pole-vault/share.mjs';
import * as ui from '../../public/games/pole-vault/ui-state.mjs';
import * as milestones from '../../public/games/pole-vault/milestones.mjs';
// DOM/audio/draw are the external boundary; execute the unmodified production
// game event handlers, frame loop, input sources, and physics.
class Element extends EventTarget {
 constructor(id,limb){super();this.id=id;this.dataset=limb===undefined?{}:{limb:String(limb)};this.children=[];this.style={setProperty(){}};this.classList={toggle(){}};this.attrs={};this.open=false;}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
 set innerHTML(v){this.children=Array.from({length:(v.match(/<i /g)||[]).length},()=>new Element('mark'));}
 showModal(){this.open=true;}close(){this.open=false;}insertBefore(){}replaceChildren(){}append(){}setPointerCapture(){}hasPointerCapture(){return false;}
}
const event=(type,props)=>Object.assign(new Event(type,{cancelable:true}),props);
function game(){
 const nodes=new Map(),buttons=[0,1,2,3].map(i=>new Element('limb'+i,i)),document=new EventTarget(),window=new EventTarget();
 document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};document.querySelectorAll=()=>buttons;document.documentElement=new Element('html');
 const sound={setPlaying(){},unlock(){},play(){},ready:false,decoded:0};let now=0,nextFrame,last;
 const entryUI=entryBoundary();const context={createGameEntry:entryUI.createGameEntry,...entryUI.helpers,syncPauseButton,...flightProfile,...resultFrame,...physics,...input,...guard,...share,...ui,...milestones,document,window,structuredClone,innerWidth:900,innerHeight:700,visualViewport:null,localStorage:{getItem(){return null;}},performance:{now:()=>now},requestAnimationFrame:f=>nextFrame=f,createGameAudio:()=>sound,createWorld:()=>({software:false,resize(){},render(s){last=structuredClone(s);}})};
 vm.runInNewContext(controllerSource(readFileSync(new URL('../../public/games/pole-vault/game.mjs',import.meta.url),'utf8')),context);
 const advance=seconds=>{for(let i=0;i<Math.ceil(seconds*120);i++){now+=1000/120;nextFrame(now);}};
 entryUI.start();advance(.05);assert.ok(Number(nodes.get('scene').dataset.time)>0,'first frame is immediately active');
 return{window,buttons,advance,state:()=>last,nodes};
}
const rel=(s,i)=>{const p=physics.pose(s),h=p['hand'+i];return{x:h.x-p.shoulder.x,y:h.y-p.shoulder.y};};
// Would fail if production keyboard/pointer listeners stopped forwarding hands,
// or if attached-arm IK again discarded those hand channels.
test('production keyboard and pointer events reach the visibly attached carry rig',()=>{
 for(const mode of['keyboard','pointer']){
  const g=game(),initial=g.state(),send=(i,on)=>mode==='keyboard'?g.window.dispatchEvent(event(on?'keydown':'keyup',{code:i===0?'KeyJ':'KeyK',repeat:false})):g.buttons[i].dispatchEvent(event(on?'pointerdown':'pointerup',{pointerId:i+10}));
  send(0,true);g.advance(.35);const a=rel(initial,0),b=rel(g.state(),0);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>.18,mode+' moves J arm');
  send(1,true);g.advance(.35);const raised=physics.poleRig(g.state()).tip.y;assert.ok(raised>2.5,mode+' raises both-held shaft');
  send(0,false);g.advance(.35);assert.ok(physics.poleRig(g.state()).tip.y<raised-.5,mode+' releases J independently');
  send(1,false);g.advance(.5);assert.ok(physics.poleRig(g.state()).tip.y<raised-1.5,mode+' releases both');
 }
});
