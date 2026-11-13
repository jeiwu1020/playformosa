import {normalizeLimit} from './round-rules.js';
const normalizeOrientation=value=>['portrait','landscape'].includes(value)?value:'auto';
export function orientationDecision(value,w,h,mode){const orientation=normalizeOrientation(value),blocked=orientation!=='auto'&&(w>h?'landscape':'portrait')!==orientation;return {blocked,pause:blocked&&['playing','cinematic'].includes(mode),canStart:!blocked,canResume:!blocked&&mode==='paused'};}
export class RoundOptions{
 constructor(storage){this.storage=storage;this.records=new Map();this.unsaved=new Set();this.limit=60;this.orientation='auto';this.sideways=false;try{const p=JSON.parse(storage?.getItem('overtime-pinball-round-options-v1')||'null');this.limit=[0,60,180].includes(p?.limit)?p.limit:60;this.orientation=normalizeOrientation(p?.orientation);this.sideways=typeof p?.sideways==='boolean'?p.sideways:this.orientation==='landscape';}catch{}}
 set(p){if('sideways'in p)this.sideways=Boolean(p.sideways);if('limit'in p)this.limit=normalizeLimit(p.limit);if('orientation'in p)this.orientation=normalizeOrientation(p.orientation);try{this.storage?.setItem('overtime-pinball-round-options-v1',JSON.stringify({limit:this.limit,orientation:this.orientation,sideways:this.sideways}));}catch{}}
 best(limit=this.limit){const key=this.key(limit);let best=this.records.get(key)||0;try{if(!this.storage)throw Error('storage unavailable');const value=Number(this.storage.getItem(key));if(Number.isFinite(value)&&value>0)best=Math.max(best,value);}catch{this.unsaved.add(key);}this.records.set(key,best);return best;}
 sessionOnly(limit=this.limit){return !this.storage||this.unsaved.has(this.key(limit));}
 key(limit){return normalizeLimit(limit)?'overtime-pinball-best-timed-'+normalizeLimit(limit)+'-v1':'overtime-pinball-best-v5';}
 record(score,limit=this.limit){const key=this.key(limit),before=this.best(limit),best=Number.isFinite(score)?Math.max(before,Math.floor(score)):before;this.records.set(key,best);try{if(!this.storage)throw Error('storage unavailable');this.storage.setItem(key,String(best));this.unsaved.delete(key);}catch{this.unsaved.add(key);}return best;}
}

