// Explicit local-only pinning. Never reads or writes Git refs, remotes, SQL, or deployment configuration.
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {PACE_BASE_COMMIT,PACE_BASE_TREE,PACE_CHANGED,PACE_ADDED,paceBaseline,paceHash,paceBlob,verifyPaceRemoteBase,verifyPaceInventory,KNOWN_TRANSFER_OMISSIONS} from '../tests/helpers/vault-pace-provenance.mjs';
const root=resolve(new URL('../',import.meta.url).pathname),base=resolve(process.argv[2]||'');
assert.ok(process.argv[2],'usage: node scripts/pin-vault-pace.mjs /absolute/verified/baseline');
assert.notEqual(base,root,'preimages must come from separate verified baseline');
verifyPaceRemoteBase(paceBaseline);
const historical=new Map(paceBaseline.files.map(f=>[f.path,f.gitBlob]));
const read=p=>readFileSync(resolve(root,p));
const paths=[];function walk(dir=''){for(const e of readdirSync(resolve(root,dir),{withFileTypes:true})){if(!dir&&['.git','node_modules','dist'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else{assert.ok(e.isFile(),p+' must be regular');paths.push(p);}}}walk();
const manifestPath='docs/pole-vault/PACE-MANIFEST.json';if(!paths.includes(manifestPath))paths.push(manifestPath);
const omissions=paceBaseline.files.filter(f=>!existsSync(resolve(root,f.path))).map(f=>f.path);
for(const p of omissions)assert.ok(KNOWN_TRANSFER_OMISSIONS.includes(p),p+' unexpected missing source');
const m={baseCommit:PACE_BASE_COMMIT,baseTree:PACE_BASE_TREE,files:PACE_CHANGED.map(path=>{const before=readFileSync(resolve(base,path)),current=read(path);assert.equal(paceBlob(before),historical.get(path),path+' baseline differs from remote');assert.ok(before.equals(Buffer.from(before.toString('utf8'))),path+' non-text preimage');return {path,beforeText:before.toString('utf8'),beforeSha256:paceHash(before),beforeGitBlob:paceBlob(before),sha256:paceHash(current),gitBlob:paceBlob(current)};}),addedPaths:[...PACE_ADDED],addedFiles:PACE_ADDED.filter(p=>p!==manifestPath).map(path=>{assert.ok(!historical.has(path),path+' is not new');const bytes=read(path);return {path,sha256:paceHash(bytes),gitBlob:paceBlob(bytes)};})};
verifyPaceInventory(paths,{manifest:m,read,omitted:omissions});
writeFileSync(resolve(root,manifestPath),JSON.stringify(m,null,2)+'\n');
console.log(JSON.stringify({changed:m.files.length,added:m.addedPaths.length,verifiedMaterialized:paths.length,unmaterializedRemote:omissions,baseTree:PACE_BASE_TREE},null,2));
