import * as outdoor from './outdoor-engine.mjs';
import{INDOOR_RULES,createIndoor,advanceIndoor,pauseIndoor,indoorAction,indoorBeat,indoorVerdict}from'./indoor-engine.mjs';
export const RULES=Object.freeze({indoor:INDOOR_RULES,outdoor:outdoor.RULES.outdoor});
export const createState=(mode='indoor',now=0)=>mode==='outdoor'?outdoor.createState(mode,now):createIndoor(now);
export const advance=(s,now)=>s.mode==='indoor'?advanceIndoor(s,now):outdoor.advance(s,now);
export const action=(s,type,now)=>s.mode==='indoor'?indoorAction(s,type,now):outdoor.action(s,type,now);
export const setPaused=(s,value,now)=>s.mode==='indoor'?pauseIndoor(s,value,now):outdoor.setPaused(s,value,now);
export const beat=s=>s.mode==='indoor'?indoorBeat(s):outdoor.beat(s);
export const verdict=s=>s.mode==='indoor'?indoorVerdict(s):outdoor.verdict(s);
