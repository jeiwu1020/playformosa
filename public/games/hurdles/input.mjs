export const KEY_MAP=Object.freeze({KeyJ:0,KeyK:1,KeyA:2,KeyS:3});
export function createInput(){const keys=new Set(),pointers=new Map(),values=[false,false,false,false];const sync=()=>{values.fill(false);for(const i of keys)values[i]=true;for(const i of pointers.values())values[i]=true;};return{keys,pointers,values,key(code,held){const i=KEY_MAP[code];if(i===undefined)return false;held?keys.add(i):keys.delete(i);sync();return true;},pointer(id,limb){limb===null?pointers.delete(id):pointers.set(id,limb);sync();},endPointer(id,type){const interrupted=pointers.has(id)&&type!=='pointerup';pointers.delete(id);sync();return interrupted;},clear(){keys.clear();pointers.clear();sync();}};}
// Native button keyboard interaction and assistive synthetic clicks. Each source
// gets its own input token, so releasing it cannot clear a held key or finger.
export function bindAccessibleLimb(button,limb,input,{active,sync,now=()=>performance.now(),schedule=(fn,ms)=>setTimeout(fn,ms)}){let lastKeyboard=-Infinity,sequence=0;const keyToken='accessible-key-'+limb;
 button.addEventListener('keydown',e=>{if(!['Space','Enter'].includes(e.code)||!active())return;e.preventDefault();e.stopPropagation();if(e.repeat)return;lastKeyboard=now();input.pointer(keyToken,limb);sync();});
 button.addEventListener('keyup',e=>{if(!['Space','Enter'].includes(e.code))return;e.preventDefault();e.stopPropagation();lastKeyboard=now();input.pointer(keyToken,null);sync();});
 button.addEventListener('blur',()=>{input.pointer(keyToken,null);sync();});
 button.addEventListener('click',e=>{if(e.detail!==0||!active()||now()-lastKeyboard<300)return;const token='accessible-tap-'+limb+'-'+(++sequence);input.pointer(token,limb);sync();schedule(()=>{input.pointer(token,null);sync();},120);});
}
