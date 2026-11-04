import {readSplitEntriesBaseline} from './fast-hands-split-entries-provenance.mjs';

// Preserve archived admission assertions against the exact pinned parent bytes.
// Current catalog/security behavior is tested against the real current modules.
async function loadParentModule(path){
 const url=new URL('../../'+path,import.meta.url);
 const source=readSplitEntriesBaseline(url,'utf8').replace(/from\s*(['"])(\.[^'"]+)\1/g,(_,quote,specifier)=>`from ${quote}${new URL(specifier,url).href}${quote}`);
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
export const {catalog:historicalCatalog}=await loadParentModule('src/catalog.mjs');
export const {renderPage:renderHistoricalPage}=await loadParentModule('src/render.mjs');
