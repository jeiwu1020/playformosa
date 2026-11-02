import {readFile} from 'node:fs/promises';
import {catalog} from '../src/catalog.mjs';
import {resolveCatalogChannel,validateReleaseOutput} from '../src/release.mjs';
const args=process.argv.slice(2);
if(args.length!==1||!/^--expect=(production|preview)$/.test(args[0]))throw new Error('Usage: npm run check:release -- --expect=production|preview');
const expected=args[0].split('=')[1],root=new URL('../',import.meta.url);
let config;
try{config=JSON.parse(await readFile(new URL('config/catalog-channel.json',root),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(resolveCatalogChannel(config)!==expected)throw new Error(`Catalog channel mismatch: expected ${expected}. Never promote the preview-only channel config to main.`);
for(const file of ['public/index.html','dist/index.html']){
 const html=await readFile(new URL(file,root),'utf8');validateReleaseOutput(html,catalog,expected);
}
console.log(`Release preflight passed: ${expected}; config and generated catalog entries match. This does not authorize publication.`);
