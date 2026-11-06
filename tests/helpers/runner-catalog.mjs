import{readBeforeRunners}from'./runner-integration-provenance.mjs';
const url=new URL('../../src/catalog.mjs',import.meta.url),source=readBeforeRunners(url,'utf8').replace(/from\s*(['"])(\.[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL(p,url).href}${q}`);
export const {catalog:preRunnerCatalog}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
