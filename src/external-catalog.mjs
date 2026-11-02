import {readdirSync,readFileSync} from 'node:fs';
// Separate data files let an approved entry be promoted without merging unrelated games.
export function readExternalCatalog(directory=new URL('./catalog-entries/',import.meta.url)) {
 let files;
 try {files=readdirSync(directory).filter(name=>/^[a-z0-9-]+\.json$/.test(name));}
 catch(error){if(error.code==='ENOENT')return {externalGames:[],platforms:[]};throw error;}
 const entries=files.map(file=>JSON.parse(readFileSync(new URL(file,directory),'utf8'))).sort((a,b)=>(a.order||0)-(b.order||0)||a.id.localeCompare(b.id));
 const ids=new Set();
 for(const entry of entries){
  if(!/^[a-z0-9-]+$/.test(entry.id)||ids.has(entry.id))throw new Error('Invalid or duplicate external catalog id');
  ids.add(entry.id);
  if(!['game','platform'].includes(entry.kind))throw new Error('Invalid external catalog kind');
  if(!entry.release||typeof entry.release.preview!=='boolean'||typeof entry.release.production!=='boolean')throw new Error('External catalog release flags must be explicit booleans');
 }
 return {externalGames:entries.filter(entry=>entry.kind==='game'),platforms:entries.filter(entry=>entry.kind==='platform')};
}
