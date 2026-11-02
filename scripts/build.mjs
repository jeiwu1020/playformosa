import {cp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
import {resolveCatalogChannel,validateReleaseOutput} from '../src/release.mjs';
const root = new URL('../',import.meta.url);
let config;
try {config=JSON.parse(await readFile(new URL('config/catalog-channel.json',root),'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;}
const channel=resolveCatalogChannel(config);
const html=renderPage(catalog,{channel});
validateReleaseOutput(html,catalog,channel);
await writeFile(new URL('public/index.html',root),html);
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/',root),{recursive:true});
await cp(new URL('public/',root),new URL('dist/',root),{recursive:true});
console.log(`Built static Playformosa to dist/ (catalog channel: ${channel})`);
