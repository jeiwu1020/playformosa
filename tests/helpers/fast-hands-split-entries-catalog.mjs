import {readSplitEntriesBaseline} from './fast-hands-split-entries-provenance.mjs';
import {baseline,gitBlob,readBeforePunchlinePortal} from './punchline-portal-provenance.mjs';
import assert from 'node:assert/strict';
import {withProvenanceSession} from './provenance-session.mjs';

// The historical catalog's dynamic directory read must use the pinned parent
// inventory too, not today's catalog directory (which may contain new entries).
export const historicalEntryPaths=Object.freeze(baseline.files.map(f=>f.path).filter(p=>/^src\/catalog-entries\/[a-z0-9-]+\.json$/.test(p)).sort());
const entries=withProvenanceSession(()=>historicalEntryPaths.map(path=>{
 const url=new URL('../../'+path,import.meta.url),bytes=readBeforePunchlinePortal(url);
 assert.equal(gitBlob(bytes),baseline.files.find(f=>f.path===path).gitBlob,'exact parent catalog entry '+path);
 return JSON.parse(readSplitEntriesBaseline(url,'utf8'));
}).sort((a,b)=>(a.order||0)-(b.order||0)||a.id.localeCompare(b.id)));
const external={externalGames:entries.filter(e=>e.kind==='game'),platforms:entries.filter(e=>e.kind==='platform')};
// Preserve archived admission assertions against exact pinned parent bytes.
// Current catalog/security behavior continues using the real current modules.
async function loadParentModule(path){
 const url=new URL('../../'+path,import.meta.url);
 let source=readSplitEntriesBaseline(url,'utf8');
 if(path==='src/catalog.mjs'){
  const declaration="import {readExternalCatalog} from './external-catalog.mjs';";
  assert.equal(source.split(declaration).length,2,'exact historical catalog dependency');
  source=source.replace(declaration,`const readExternalCatalog=()=>(${JSON.stringify(external)});`);
 }
 source=source.replace(/from\s*(['"])(\.[^'"]+)\1/g,(_,quote,specifier)=>`from ${quote}${new URL(specifier,url).href}${quote}`);
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
export const {catalog:historicalCatalog}=await loadParentModule('src/catalog.mjs');
export const {renderPage:renderHistoricalPage}=await loadParentModule('src/render.mjs');
