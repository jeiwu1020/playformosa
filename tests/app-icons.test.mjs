import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';

const root=new URL('../',import.meta.url);
const apps=[
 ['platform','島遊無界','島遊無界','/'],
 ['long-jump','四肢各有想法｜跳遠','跳遠','/games/long-jump/'],
 ['hurdles','四肢各有想法｜110公尺跨欄','110公尺跨欄','/games/hurdles/'],
 ['high-jump','四肢各有想法｜跳高','跳高','/games/high-jump/'],
 ['pole-vault','四肢各有想法｜撐竿跳','撐竿跳','/games/pole-vault/'],
 ['shot-put','四肢各有想法｜鉛球','鉛球','/games/shot-put/'],
 ['discus','四肢各有想法｜鐵餅','鐵餅','/games/discus/'],
 ['reaction-rod','接棒啦！','接棒啦！','/games/reaction-rod/'],
 ['beer-slide','別灑啊！','別灑啊！','/games/beer-slide/'],
 ['tower-climb','上樓不容易','上樓不容易','/games/tower-climb/'],
];
const origins=['https://preview-hurdles-playformosa.playformosa.workers.dev','https://playformosa.example'];
const read=p=>readFileSync(new URL(p,root),'utf8');
const bytes=p=>readFileSync(new URL(p,root));
const digest=b=>createHash('sha256').update(b).digest('hex');
const assertHomepageIconHead=(html,expected)=>assert.equal(digest(html.split('</head>')[0]),expected,'published platform installation head must remain unchanged');
const pathOf=route=>`public${route}index.html`;
const manifestOf=route=>JSON.parse(read(`public${route}manifest.webmanifest`));
const png=p=>{const b=bytes(p);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b[24],8);assert.equal(b[25],2,'opaque RGB PNG');return [b.readUInt32BE(16),b.readUInt32BE(20)];};

for(const [slug,name,short,route] of apps){
 test(`${slug}: own names, stable ID and preview-relative launch/scope`,()=>{
  const m=manifestOf(route);
  assert.equal(m.name,name);assert.equal(m.short_name,short);assert.equal(m.id,route);
  assert.equal(m.start_url,'./');assert.equal(m.scope,'./');assert.equal(m.display,'standalone');assert.equal(m.lang,'zh-Hant');
  assert.equal(m.background_color,'#102b36');assert.equal(m.theme_color,'#102b36');
  assert.doesNotMatch(JSON.stringify(m),/https?:\/\//,'no hard-coded destination host');
  for(const origin of origins){const manifestURL=new URL(`${route}manifest.webmanifest`,origin);const start=new URL(m.start_url,manifestURL);assert.equal(start.href,origin+route);assert.equal(new URL(m.scope,manifestURL).href,origin+route);assert.equal(new URL(m.id,start.origin).href,origin+route);}
 });
 test(`${slug}: dedicated browser and Apple icons plus exactly one manifest link`,()=>{
  const d=new JSDOM(read(pathOf(route))).window.document;
  assert.equal(d.querySelectorAll('link[rel="manifest"]').length,1);
  assert.equal(d.querySelector('link[rel="manifest"]').getAttribute('href'),'./manifest.webmanifest');
  const icons=[...d.querySelectorAll('link[rel="icon"]')];assert.equal(icons.length,2);
  for(const size of [32,48]){const icon=icons.find(x=>x.getAttribute('sizes')===`${size}x${size}`);assert.ok(icon);assert.equal(icon.type,'image/png');const href=icon.getAttribute('href');assert.ok(!href.startsWith('/')&&!href.includes('://'));assert.equal(new URL(href,new URL(route,origins[0])).pathname,`/assets/app-icons/${slug}/favicon-${size}.png`);}
  const apple=d.querySelector('link[rel="apple-touch-icon"]');assert.ok(apple);assert.equal(apple.getAttribute('sizes'),'180x180');assert.equal(new URL(apple.getAttribute('href'),new URL(route,origins[0])).pathname,`/assets/app-icons/${slug}/apple-touch-icon.png`);
  assert.equal(d.querySelector('meta[name="apple-mobile-web-app-title"]').content,short);
  assert.equal(d.querySelector('meta[name="application-name"]').content,name);
  assert.equal(d.querySelector('meta[name="apple-mobile-web-app-capable"]').content,'yes');
 });
 test(`${slug}: all six opaque PNG dimensions and separate maskable purpose`,()=>{
  for(const [file,size] of [['favicon-32.png',32],['favicon-48.png',48],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]])assert.deepEqual(png(`public/assets/app-icons/${slug}/${file}`),[size,size]);
  const m=manifestOf(route);assert.equal(m.icons.length,3);
  for(const [file,size,purpose] of [['icon-192.png',192,'any'],['icon-512.png',512,'any'],['icon-maskable-512.png',512,'maskable']]){const i=m.icons.find(x=>x.src.endsWith('/'+file));assert.ok(i);assert.equal(i.sizes,`${size}x${size}`);assert.equal(i.type,'image/png');assert.equal(i.purpose,purpose);assert.ok(!i.src.startsWith('/')&&!i.src.includes('://'));assert.equal(new URL(i.src,new URL(`${route}manifest.webmanifest`,origins[0])).pathname,`/assets/app-icons/${slug}/${file}`);}
 });
}

test('all ten installation IDs and raster identities are distinct after URL resolution',()=>{
 for(const origin of origins){const ids=apps.map(([, , ,route])=>{const m=manifestOf(route);return new URL(m.id,new URL(m.start_url,new URL(`${route}manifest.webmanifest`,origin)).origin).href;});assert.equal(new Set(ids).size,10);}
 assert.equal(new Set(apps.map(([slug])=>digest(bytes(`public/assets/app-icons/${slug}/icon-512.png`)))).size,10);
});
test('homepage build keeps its own metadata in both catalog channels',()=>{
 for(const channel of ['preview','production']){const d=new JSDOM(renderPage(catalog,{channel})).window.document;assert.equal(d.querySelector('link[rel="manifest"]').getAttribute('href'),'./manifest.webmanifest');assert.equal(d.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'),'./assets/app-icons/platform/apple-touch-icon.png');}
});
test('icon integration preserves installation head boundary and nine game-page provenance',()=>{
 const ledger=JSON.parse(read('docs/app-icons/INTEGRATION-MANIFEST.json'));assert.equal(ledger.baselineCommit,'c787bd58c3043fa255b9f52809848408b76bef87');assert.equal(ledger.baselineTree,'5a4cc33aae3502af2464bbc9005a9d762ce4b04e');
 const paths=apps.map(([, , ,route])=>pathOf(route));
 assert.deepEqual(ledger.pages.map(x=>x.path).sort(),paths.sort());
 for(const entry of ledger.pages){
  assert.match(entry.beforeSha256,/^[0-9a-f]{64}$/);
  if(entry.path==='public/index.html'){
   assert.equal(ledger.homepageHeadBoundary.referenceCommit,'f722b6b8cfce180a863464275826d5af78861828');
   assertHomepageIconHead(read(entry.path),ledger.homepageHeadBoundary.sha256);
  }else{
   const help=ledger.helpUnification?.pages.find(x=>x.path===entry.path);if(help){assert.equal(ledger.helpUnification.baseCommit,'f1a8ce126dafd975b4c7b2bcab56170162dcbd9d');assert.equal(help.beforeSha256,entry.afterSha256);assert.equal(digest(read(entry.path).split('</head>')[0]),help.headSha256,'game installation head unchanged');}
   assert.equal(digest(bytes(entry.path)),help?.afterSha256||entry.afterSha256);
   assert.equal(digest(read(entry.path).split('</head>')[1]),help?.bodySha256||entry.bodySha256);
  }
 }
 for(const [, , ,route] of apps)assert.doesNotMatch(read(pathOf(route)),/serviceWorker\.register|navigator\.serviceWorker|localStorage\.(?:clear|removeItem)/);
});

test('the homepage installation-head boundary rejects icon removal or replacement',()=>{
 const ledger=JSON.parse(read('docs/app-icons/INTEGRATION-MANIFEST.json'));
 const html=read('public/index.html'),expected=ledger.homepageHeadBoundary.sha256;
 assertHomepageIconHead(html,expected);
 for(const changed of [html.replace('apple-touch-icon.png','removed-icon.png'),html.replace('<link rel="manifest" href="./manifest.webmanifest">','')]){
  assert.notEqual(changed,html);
  assert.throws(()=>assertHomepageIconHead(changed,expected),/installation head must remain unchanged/);
 }
});

test('help body revision cannot silently alter any game installation head',()=>{const ledger=JSON.parse(read('docs/app-icons/INTEGRATION-MANIFEST.json'));for(const p of ledger.helpUnification.pages){const head=read(p.path).split('</head>')[0];assert.equal(digest(head),p.headSha256);assert.notEqual(digest(head.replace('apple-touch-icon.png','wrong.png')),p.headSha256);}});
