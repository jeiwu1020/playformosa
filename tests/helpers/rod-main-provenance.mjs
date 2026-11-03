import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function readBeforeRod(file,encoding){
 const relative=path.relative(root,file instanceof URL?fileURLToPath(file):file).split(path.sep).join('/');
 const current=readFileSync(file),ledger=JSON.parse(readFileSync(new URL('../../docs/reaction-rod-main/SOURCE-MANIFEST.json',import.meta.url)));
 const f=ledger.files.find(f=>f.path===relative);let bytes=current;
 if(f?.beforeText!==undefined){assert.equal(createHash('sha256').update(current).digest('hex'),f.sha256,relative+' current promotion bytes');bytes=Buffer.from(f.beforeText);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.beforeSha256,relative+' original main bytes');}
 return encoding?bytes.toString(encoding):bytes;
}
