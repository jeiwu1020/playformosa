import {KEYS,setLimb,cancelMotion} from './physics.mjs';
// A source belongs to one limb; its final intentional release may queue takeoff.
export function createActionInputs(getState,sync=()=>true,changed=()=>{}){
 const held=Object.fromEntries(KEYS.map(k=>[k,new Set()]));
 return{isHeld:k=>Boolean(held[k]?.size),down(key,source){if(sync()===false)return false;const s=getState(),owners=held[key];if(!owners||s.paused||s.phase!=='run'&&s.phase!=='air'&&s.phase!=='countdown'||owners.has(source))return false;owners.add(source);setLimb(s,key,true);changed();return true;},up(key,source,{cancel=false}={}){const valid=sync()!==false,owners=held[key];if(!owners?.has(source))return false;owners.delete(source);if(!owners.size)setLimb(getState(),key,false,{cancel:cancel||!valid});changed();return true;},release(){for(const owners of Object.values(held))owners.clear();cancelMotion(getState());changed();}};
}
