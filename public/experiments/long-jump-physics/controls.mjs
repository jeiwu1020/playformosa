export const KEY_MAP=Object.freeze({KeyJ:0,KeyK:1,KeyA:2,KeyS:3,Space:4});
export function createInput(){
 const keys=new Set(),pointers=new Map(),values=[false,false,false,false,false];
 const sync=()=>{values.fill(false);for(const i of keys)values[i]=true;for(const i of pointers.values())values[i]=true;};
 return{values,key(code,held){const i=KEY_MAP[code];if(i===undefined)return false;held?keys.add(i):keys.delete(i);sync();return true;},pointer(id,i){pointers.set(id,i);sync();},endPointer(id,type){const interrupted=pointers.has(id)&&type!=='pointerup';pointers.delete(id);sync();return interrupted;},clear(){keys.clear();pointers.clear();sync();}};
}
export function handleKey(event,held,input,active){
 if(held&&!active)return false;
 if(held&&event.repeat){if(Object.hasOwn(KEY_MAP,event.code))event.preventDefault();return false;}
 const mapped=input.key(event.code,held);if(mapped&&active)event.preventDefault();return mapped;
}
export function interruptInputs(input,state,cancelMotion){input.clear();cancelMotion(state);}
