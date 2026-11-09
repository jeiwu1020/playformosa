import {readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const releasedGameIds=['long-jump','hurdles','reaction-rod','fast-hands','fast-hands-catch','fast-hands-duel','high-jump','courtesy-contest'];
const releasedHtml=['long-jump/index.html','hurdles/index.html','reaction-rod/index.html','fast-hands/index.html','fast-hands/catch.html','fast-hands/duel.html','high-jump/index.html','courtesy-contest/index.html'];
// Production artifact admission, not merely homepage visibility.
export async function assertReleasedGames(root){
  root=root instanceof URL?fileURLToPath(root):root;
  const dir=path.join(root,'games');
  for(const e of await readdir(dir,{withFileTypes:true})){
    if(!e.isDirectory()||!['long-jump','hurdles','reaction-rod','fast-hands','shared','javelin','high-jump','courtesy-contest'].includes(e.name))throw Error('Unapproved game directory: '+e.name);
  }
  for(const entry of releasedHtml)await stat(path.join(dir,entry));
  const walk=async p=>{for(const e of await readdir(p,{withFileTypes:true})){
    const full=path.join(p,e.name),relative=path.relative(dir,full).split(path.sep).join('/');
    if(relative.startsWith('javelin/')&&relative!=='javelin/character3d.mjs')throw Error('Unapproved character dependency: '+relative);
    if(e.isDirectory())await walk(full);
    else if(e.name.endsWith('.html')&&!releasedHtml.includes(relative)&&relative!=='shared/sports-credits.html')throw Error('Unapproved game HTML: '+relative);
  }};
  await walk(dir);
  return releasedGameIds;
}

export async function assertProductionInventory(root,allowedPaths){root=root instanceof URL?fileURLToPath(root):root;const seen=[];async function walk(p){for(const e of await readdir(p,{withFileTypes:true})){const full=path.join(p,e.name);if(e.isDirectory())await walk(full);else seen.push(path.relative(root,full).split(path.sep).join('/'));}}await walk(root);const allowed=new Set(allowedPaths);for(const p of seen)if(!allowed.has(p))throw Error('Unapproved production file: '+p);for(const p of allowed)if(!seen.includes(p))throw Error('Missing production file: '+p);return seen;}
