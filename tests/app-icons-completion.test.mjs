import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {loadImage,createCanvas} from '@napi-rs/canvas';
const root=new URL('../',import.meta.url),apps=[["sprint-100m", "四肢各有想法｜100公尺", "100公尺", "sprint-100m/index.html", "sprint-100m/manifest.webmanifest", "/games/sprint-100m/", "./", "apple-touch-icon-v2.png"], ["javelin", "四肢各有想法｜標槍", "標槍", "javelin/index.html", "javelin/manifest.webmanifest", "/games/javelin/", "./", "apple-touch-icon-v2.png"], ["courtesy-contest", "客氣大賽", "客氣大賽", "courtesy-contest/index.html", "courtesy-contest/manifest.webmanifest", "/games/courtesy-contest/", "./", "apple-touch-icon.png"], ["fast-hands", "快手王｜鴨沒漏補", "鴨沒漏補", "fast-hands/index.html", "fast-hands/manifest.webmanifest", "/games/fast-hands/", "./?intro=1", "apple-touch-icon.png"], ["fast-hands-catch", "快手王｜彈無虛接", "彈無虛接", "fast-hands/catch.html", "fast-hands/catch.webmanifest", "/games/fast-hands/catch.html", "./catch.html?intro=1", "apple-touch-icon.png"], ["fast-hands-duel", "快手王｜快手對決", "快手對決", "fast-hands/duel.html", "fast-hands/duel.webmanifest", "/games/fast-hands/duel.html", "./duel.html?intro=1", "apple-touch-icon.png"]];
const read=p=>readFileSync(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const origins=['https://preview-hurdles-playformosa.playformosa.workers.dev','https://playformosa.example'];
const families=a=>[['favicon-32.png',32],['favicon-48.png',48],[a[7],180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]];
let boundary;try{boundary=await import('./helpers/app-icons-completion-provenance.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
for(const a of apps){const [slug,name,short,page,manifest,id,start,apple]=a;
 test(`${slug}: missing installation metadata is completed exactly once`,()=>{
  const html=read('public/games/'+page).toString(),d=new JSDOM(html).window.document;
  assert.equal(d.querySelectorAll('link[rel="manifest"]').length,1);
  assert.equal(d.querySelector('link[rel="manifest"]').getAttribute('href'),'./'+manifest.split('/').at(-1));
  assert.equal((html.match(/<!-- app-icons-completion:start -->/g)||[]).length,1);
  assert.equal((html.match(/<!-- app-icons-completion:end -->/g)||[]).length,1);
  assert.match(html,/<!-- app-icons-completion:end -->\n<\/head>/);
  assert.equal(d.querySelectorAll('link[rel="icon"]').length,2);
  for(const size of [32,48]){const links=d.querySelectorAll(`link[rel="icon"][sizes="${size}x${size}"]`);assert.equal(links.length,1);assert.equal(links[0].type,'image/png');assert.equal(links[0].getAttribute('href'),`../../assets/app-icons/${slug}/favicon-${size}.png`);}
  const links=d.querySelectorAll('link[rel="apple-touch-icon"]');assert.equal(links.length,1);assert.equal(links[0].getAttribute('sizes'),'180x180');assert.equal(links[0].getAttribute('href'),`../../assets/app-icons/${slug}/${apple}`);
  for(const [key,value] of [['apple-mobile-web-app-title',short],['application-name',name],['apple-mobile-web-app-capable','yes']]){const tags=d.querySelectorAll(`meta[name="${key}"]`);assert.equal(tags.length,1);assert.equal(tags[0].content,value);}
 });
 test(`${slug}: independent manifest resolves on either deployment origin`,()=>{
  const path='public/games/'+manifest;assert.ok(existsSync(new URL(path,root)),'dedicated manifest exists');const m=JSON.parse(read(path));
  assert.equal(m.name,name);assert.equal(m.short_name,short);assert.equal(m.id,id);assert.equal(m.start_url,start);assert.equal(m.scope,'./');assert.equal(m.lang,'zh-Hant');assert.equal(m.display,'standalone');assert.doesNotMatch(JSON.stringify(m),/https?:\/\//);
  assert.deepEqual(m.icons.map(x=>[x.sizes,x.purpose]),[['192x192','any'],['512x512','any'],['512x512','maskable']]);
  for(const origin of origins){const url=new URL('/games/'+manifest,origin);assert.equal(new URL(m.id,url).href,origin+id);assert.equal(new URL(m.start_url,url).href,new URL(start,new URL('./',url)).href);assert.equal(new URL(m.scope,url).href,new URL('./',url).href);for(const icon of m.icons){assert.equal(icon.type,'image/png');assert.equal(new URL(icon.src,url).pathname,`/assets/app-icons/${slug}/`+(icon.purpose==='maskable'?'icon-maskable-512.png':`icon-${icon.sizes.split('x')[0]}.png`));}}
 });
 test(`${slug}: every raster decodes with correct dimensions and opaque pixels`,async()=>{
  for(const [file,size] of families(a)){const path=`public/assets/app-icons/${slug}/${file}`;assert.ok(existsSync(new URL(path,root)),path+' exists');const bytes=read(path);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const image=await loadImage(bytes);assert.equal(image.width,size);assert.equal(image.height,size);const ctx=createCanvas(size,size).getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,size,size).data;for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255);}
 });
}
test('completed apps have distinct IDs, launch URLs and decoded raster identities',async()=>{
 const ids=[],starts=[],pixels=[];
 for(const a of apps){const m=JSON.parse(read('public/games/'+a[4]));const url=new URL('/games/'+a[4],origins[0]);ids.push(new URL(m.id,url).href);starts.push(new URL(m.start_url,url).href);const im=await loadImage(read(`public/assets/app-icons/${a[0]}/icon-512.png`)),ctx=createCanvas(512,512).getContext('2d');ctx.drawImage(im,0,0);pixels.push(sha(ctx.getImageData(0,0,512,512).data));}
 assert.equal(new Set(ids).size,apps.length);assert.equal(new Set(starts).size,apps.length);assert.equal(new Set(pixels).size,apps.length);
});
function inventory(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else result.push(p);}}walk();return result;}
test('the icon boundary reconstructs the complete independently pinned parent tree',()=>{
 assert.ok(boundary,'reversible icon provenance boundary exists');const m=boundary.validate(boundary.manifest()),paths=inventory();
 assert.deepEqual(boundary.inventoryBeforeIcons(paths).sort(),boundary.baseline.files.map(f=>f.path).sort());
 for(const f of boundary.baseline.files)assert.equal(boundary.gitBlob(boundary.readBeforeIcons(new URL(f.path,root))),f.gitBlob,f.path);
 for(const a of apps){const p='public/games/'+a[3],f=m.files.find(f=>f.path===p),live=read(p);assert.equal(sha(live.toString().split('</head>')[1]),f.bodySha256);assert.equal(sha(boundary.iconsParentBytes(p,live)),f.beforeSha256);assert.throws(()=>boundary.iconsParentBytes(p,Buffer.from(live.toString().replace('app-icons-completion:end','app-icons-completion:wrong'))));assert.throws(()=>boundary.iconsParentBytes(p,Buffer.concat([live,Buffer.from('body drift')])));assert.throws(()=>boundary.iconsParentBytes(p,Buffer.from(live.toString().replace('favicon-32.png','wrong.png'))));}
});
test('icon provenance rejects forged history, missing assets, duplicates and live drift',()=>{
 assert.ok(boundary);const m=boundary.manifest(),paths=inventory();
 for(const change of [x=>x.baseCommit='0'.repeat(40),x=>x.baseTree='0'.repeat(40),x=>x.files.pop(),x=>x.files[0].beforeText+='tamper',x=>x.files[0].beforeGitBlob='0'.repeat(40),x=>x.addedPaths.pop(),x=>x.addedFiles.pop()]){const bad=structuredClone(m);change(bad);assert.throws(()=>boundary.validate(bad));}
 for(const p of m.addedPaths)assert.throws(()=>boundary.inventoryBeforeIcons(paths.filter(x=>x!==p)));
 for(const f of [...m.files,...m.addedFiles])assert.throws(()=>boundary.inventoryBeforeIcons(paths,{read:p=>p===f.path?Buffer.from('drift'):read(p)}));
 assert.throws(()=>boundary.inventoryBeforeIcons([...paths,paths[0]]));assert.deepEqual(boundary.inventoryBeforeIcons(['public/unrelated.mjs']),['public/unrelated.mjs']);
});

test('historical directory adapter excludes only three verified manifests and rejects tampering',()=>{
 assert.ok(boundary);const directory=new URL('public/games/fast-hands/',root),entries=readdirSync(directory);
 const view=boundary.entriesBeforeIcons(directory,entries);assert.deepEqual(entries.filter(p=>!view.includes(p)).sort(),['catch.webmanifest','duel.webmanifest','manifest.webmanifest']);
 assert.ok(boundary.entriesBeforeIcons(directory,[...entries,'unreviewed.file']).includes('unreviewed.file'));
 for(const name of ['catch.webmanifest','duel.webmanifest','manifest.webmanifest']){assert.throws(()=>boundary.entriesBeforeIcons(directory,entries.filter(p=>p!==name)));assert.throws(()=>boundary.entriesBeforeIcons(directory,entries,{read:p=>p.endsWith('/'+name)?Buffer.from('drift'):read(p)}));}
 assert.throws(()=>boundary.entriesBeforeIcons(directory,[...entries,entries[0]]));
 assert.deepEqual(boundary.entriesBeforeIcons(new URL('public/games/long-jump/',root),['manifest.webmanifest','unknown']),['manifest.webmanifest','unknown']);
});
