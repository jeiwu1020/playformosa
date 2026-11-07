import {readFile,readdir,stat} from 'node:fs/promises';
import{assertReleasedGames,assertProductionInventory}from'./release-policy.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(item=>item.isDirectory()?files(path.join(dir,item.name)):path.join(dir,item.name)))).flat();}
await assertReleasedGames(root);
const release=JSON.parse(await readFile(new URL('../docs/hurdles-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));const rod=JSON.parse(await readFile(new URL('../docs/reaction-rod-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));const studio=JSON.parse(await readFile(new URL('../docs/studio-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));const jump=JSON.parse(await readFile(new URL('../docs/long-jump-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));const fastHands=JSON.parse(await readFile(new URL('../docs/fast-hands-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));const polish=JSON.parse(await readFile(new URL('../docs/fast-hands-polish/SOURCE-MANIFEST.json',import.meta.url),'utf8'));const gestures=JSON.parse(await readFile(new URL('../docs/mobile-gestures/SOURCE-MANIFEST.json',import.meta.url),'utf8'));await assertProductionInventory(root,[...release.allowedPublicPaths,...rod.addedPublicPaths,...studio.addedPublicPaths,...jump.addedPublicPaths,...fastHands.addedPublicPaths,...polish.addedPublicPaths,...gestures.addedPublicPaths]);
const paths=await files(root);
let checked=0;
for(const file of paths){
  if(!/\.(html|mjs|css)$/.test(file))continue;
  const source=await readFile(file,'utf8');
  const refs=file.endsWith('.html')?[...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]):file.endsWith('.mjs')?[...source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)].map(m=>m[1]):[...source.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m=>m[1]);
  for(const ref of refs){
    if(/^(?:https?:|data:|blob:|mailto:)/.test(ref))continue;
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
