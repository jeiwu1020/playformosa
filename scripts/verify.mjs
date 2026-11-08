import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(item=>item.isDirectory()?files(path.join(dir,item.name)):path.join(dir,item.name)))).flat();}
const paths=await files(root);
let checked=0;
for(const file of paths){
  if(!/\.(html|mjs|css)$/.test(file))continue;
  const source=await readFile(file,'utf8');
  const refs=file.endsWith('.html')?[...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]):file.endsWith('.mjs')?[...source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)].map(m=>m[1]):[...source.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m=>m[1]);
  for(const ref of refs){
    if(/^(?:https?:|data:|blob:|mailto:)/.test(ref))continue;
    // This fixed server-side navigation route is checked by fighter-entry-count.test.mjs.
    if(ref==='/api/play-counts/entries/taiwanfighter'&&path.relative(root,file)==='index.html'){checked++;continue;}
    if(ref==='#'){checked++;continue;}
    if(ref.startsWith('#')){assert.ok(new RegExp(`id=["']${ref.slice(1)}["']`).test(source),`Missing anchor ${ref} in ${file}`);checked++;continue;}
    let target=ref.startsWith('/')?path.join(root,ref):path.resolve(path.dirname(file),ref);
    target=target.split(/[?#]/)[0];
    let info;try{info=await stat(target);}catch{throw new Error(`Missing local reference ${ref} from ${path.relative(root,file)}`);}
    if(info.isDirectory())await stat(path.join(target,'index.html'));
    checked++;
  }
}
console.log(`Verified ${checked} local references across ${paths.length} output files. Browser visual/touch QA not performed.`);
