import {KEYS} from './physics.mjs';
export function bindControls({buttons,global,input,available=()=>true,changed=()=>{}}){
 const pointers=new Map(),native=new Map(),physical=new Map();
 const nativeCode=c=>['Space','Enter','NumpadEnter'].includes(c),editable=e=>/^(INPUT|SELECT|TEXTAREA)$/.test(e?.tagName);
 const down=(k,owner)=>{if(available()){input.down(k,owner);changed();}};
 const up=(k,owner,cancel=false)=>{input.up(k,owner,{cancel});changed();};
 for(const k of KEYS){const b=buttons[k];b.addEventListener('pointerdown',e=>{if(b.disabled||!available())return;e.preventDefault();const owner='pointer:'+e.pointerId;pointers.set(e.pointerId,{k,b,owner});b.setPointerCapture(e.pointerId);down(k,owner)});
 for(const type of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);up(p.k,p.owner,type!=='pointerup');try{p.b.releasePointerCapture(e.pointerId)}catch{}});
 b.addEventListener('keydown',e=>{if(!nativeCode(e.code)||e.repeat||b.disabled||!available())return;e.preventDefault();const owner=`button:${k}:${e.code}`;if(native.has(owner))return;native.set(owner,{k,code:e.code});down(k,owner)});
 b.addEventListener('focusout',()=>{for(const[owner,v]of native)if(v.k===k){native.delete(owner);up(k,owner,true)}});
 }
 global.addEventListener('keydown',e=>{if(editable(e.target)||e.repeat||!available()||!/^Key[ASJK]$/.test(e.code))return;e.preventDefault();const k=e.code.slice(-1),owner='physical:'+e.code;physical.set(e.code,k);down(k,owner)});
 global.addEventListener('keyup',e=>{if(physical.has(e.code)){const k=physical.get(e.code);physical.delete(e.code);up(k,'physical:'+e.code)}if(nativeCode(e.code))for(const[owner,v]of native)if(v.code===e.code){native.delete(owner);up(v.k,owner)}});
 return{release(){input.release();const old=[...pointers];pointers.clear();native.clear();physical.clear();for(const[id,p]of old)try{p.b.releasePointerCapture(id)}catch{}changed();}};
}
