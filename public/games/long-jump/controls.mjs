// Physical key positions stay stable across keyboard layouts. Array order: arms, then legs.
export const KEY_MAP=Object.freeze({KeyJ:0,KeyK:1,KeyA:2,KeyS:3});
export function createInput(){
 const keys=new Set(),pointers=new Map(),values=[false,false,false,false];
 function sync(){values.fill(false);for(const k of keys)values[k]=true;for(const k of pointers.values())values[k]=true;return values;}
 return {values,keys,pointers,key(code,held){const i=KEY_MAP[code];if(i===undefined)return false;held?keys.add(i):keys.delete(i);sync();return true;},pointer(id,limb){if(limb===null)pointers.delete(id);else pointers.set(id,limb);sync();},endPointer(id,kind){const interrupted=pointers.has(id)&&kind!=='pointerup';pointers.delete(id);sync();return interrupted;},clear(){keys.clear();pointers.clear();sync();}};
}
export function cancelPendingMotion(s){s.crouch=0;s.airCandidate=-1;s.airDwell=0;s.airLastPose=-1;s.airPrimed=-1;}
