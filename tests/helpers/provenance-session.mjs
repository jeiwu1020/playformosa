// Synchronous operation-local manifest snapshots only. Runtime/custom reads are never cached.
import {readFileSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';
let session=null;
const stamp=path=>{const s=statSync(path,{bigint:true});return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');};
function unchanged(record){assert.equal(stamp(record.url),record.stamp,'manifest changed during provenance operation');}
export function manifestText(url,load){
 if(!session)return load();
 const key=url.href,known=session.get(key);
 if(known){unchanged(known);return known.value;}
 const record={url,stamp:stamp(url),bytes:readFileSync(url)};
 const value=load();unchanged(record);
 assert.ok(record.bytes.equals(readFileSync(url)),'manifest changed while loading provenance snapshot');
 record.value=value;session.set(key,record);return value;
}
export function withProvenanceSession(run){
 if(session)return run();
 const active=new Map();session=active;
 try{
  const result=run();assert.ok(!result||typeof result.then!=='function','provenance sessions must be synchronous');
  for(const record of active.values()){unchanged(record);assert.ok(record.bytes.equals(readFileSync(record.url)),'manifest bytes changed during provenance operation');}
  return result;
 }finally{session=null;active.clear();}
}
