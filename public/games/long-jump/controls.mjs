// Independent arms, legs and Space; physical positions remain stable.
import {cancelMotion} from './physics.mjs';
export const KEY_MAP=Object.freeze({KeyJ:0,KeyK:1,KeyA:2,KeyS:3,Space:4});
export function createInput(){
 const keys=new Set(),pointers=new Map(),values=[false,false,false,false,false];
 function sync(){values.fill(false);for(const k of keys)values[k]=true;for(const k of pointers.values())values[k]=true;return values;}
 return {values,keys,pointers,key(code,held){const i=KEY_MAP[code];if(i===undefined)return false;held?keys.add(i):keys.delete(i);sync();return true;},pointer(id,limb){if(limb===null)pointers.delete(id);else pointers.set(id,limb);sync();},endPointer(id,kind){const interrupted=pointers.has(id)&&kind!=='pointerup';pointers.delete(id);sync();return interrupted;},clear(){keys.clear();pointers.clear();sync();}};
}
// Repeats cannot create fresh presses after pause clears the held state.
export function handleGameKey(event,held,input,active){
 if(held&&!active)return false;
 if(held&&event.repeat){if(Object.hasOwn(KEY_MAP,event.code))event.preventDefault();return false;}
 const mapped=input.key(event.code,held);if(mapped&&active)event.preventDefault();return mapped;
}
export function cancelPendingMotion(s){cancelMotion(s);}
