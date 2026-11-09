import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const url=new URL('../../../public/games/pole-vault/physics.mjs',import.meta.url);
export const currentSource=readFileSync(url,'utf8');
export function restoreBalanceParent(source=currentSource){
 return source.replace('  if(s.balanceEdges)s.balanceEdges.length=0;\n','')
  .replace(/\/\/ Match opposite hand\/foot edges[\s\S]*?function airWork\(s,velocity,dt,prior\)\{/,'function airWork(s,velocity,dt){')
  .replace('airWork(s,velocity,dt,prior);','airWork(s,velocity,dt);')
  .replace(' const imbalance=s.airTime>=.32?airCoordination(s,prior):0;\n','')
  .replace('s.lean*(.08+balance*(.16+4*imbalance))','s.lean*(.08+.08*balance)');
}
export const parentSource=restoreBalanceParent();
assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(parentSource)}\0`).update(parentSource).digest('hex'),'f79dfecf3b68b67f5aa8132938506d1de7589b19','only the reviewed air-balance patch may differ from preview commit 17024918');
const source=parentSource.replace(/from (['"])(\.[^'"]+)\1/g,(_,q,path)=>`from ${q}${new URL(path,url).href}${q}`);
export const before=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
