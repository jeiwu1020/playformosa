import{recordBest}from'./race.mjs';
export const RECORD_KEY='pf-sprint-record-v4',LEGACY_KEY='pf-sprint-record';
function parse(raw){try{const r=JSON.parse(raw);return Number.isFinite(r?.best)&&r.best>0?r:null}catch{return null}}
export function readRecords(storage){return{current:parse(storage.getItem(RECORD_KEY)),legacy:parse(storage.getItem(LEGACY_KEY))};}
export function saveRecord(storage,time){const record={...recordBest(storage.getItem(RECORD_KEY),time),version:4,course:'start-behind-line-100m'};storage.setItem(RECORD_KEY,JSON.stringify(record));return record;}
