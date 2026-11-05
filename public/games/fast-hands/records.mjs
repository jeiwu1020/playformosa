import {RULES_VERSION} from './shuttle.mjs';
export const bestKey=mode=>`fast-hands:${RULES_VERSION}:${mode==='touch'?'touch':'mouse'}`;
export function readBest(storage,mode){try{const n=Number(storage.getItem(bestKey(mode)));return Number.isFinite(n)&&n>0?n:null;}catch{return null;}}
export function saveBest(storage,mode,ms){if(!Number.isFinite(ms)||ms<=0)return null;try{const old=readBest(storage,mode);if(old===null||ms<old)storage.setItem(bestKey(mode),String(ms));return readBest(storage,mode);}catch{return null;}}
