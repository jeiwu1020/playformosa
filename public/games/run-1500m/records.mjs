import{RULES}from'./race.mjs';
export const STORAGE_KEY='pf-1500m-prototype-'+RULES;
export function addRecord(records,value){if(value?.rules!==RULES||value.status!=='done'||!Number.isFinite(value.time)||value.time<=0)throw Error('Invalid versioned result');return[...records.filter(x=>x?.rules===RULES&&x.status==='done'&&Number.isFinite(x.time)&&x.time>0),{...value,date:new Date().toISOString()}].sort((a,b)=>a.time-b.time).slice(0,10)}
export function readRecords(){try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(a)?a.filter(x=>x?.rules===RULES&&x.status==='done'&&Number.isFinite(x.time)&&x.time>0).sort((a,b)=>a.time-b.time).slice(0,10):[]}catch{return[]}}
export function storeRecord(value){const records=addRecord(readRecords(),value);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(records));return{records,saved:true}}catch{return{records,saved:false}}}
