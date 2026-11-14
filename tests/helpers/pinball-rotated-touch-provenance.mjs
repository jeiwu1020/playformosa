import {withProvenanceSession,manifestText} from './provenance-session.mjs';
// Exact additive boundary for the approved PinballRotatedTouch import. Live behavior tests
// continue reading node:fs and runtime modules, never this historical view.
import {readFileSync as actual,readdirSync as actualDirectory} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/pinball-rotated-touch/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'2a74eaa19b7d079608f58cf207c81ddb3c7401aef4e3ea33a78bd7d040d9ead8','immutable PinballRotatedTouch parent and admitted paths');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const baseline=freeze(JSON.parse(baselineBytes));
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
const currentReleaseParents=new Map([
 ['public/games/overtime-pinball/arcade-polish.css',{gitBlob:'5662e27328cc585e5c2bb14f9f3c0b97cf0017df',sha256:'2470b6d7a370adcfd0e61d6bf27760f72e365dc957b7d608c8ad6db5e593d801'}],
 ['public/games/overtime-pinball/lottery-events.js',{gitBlob:'8f78e7c5c642877607771ac8739436ee1fa527f9',sha256:'a51eb64f6f54f8522de91b27c82ad6df7ebbfdfc179fbbbe311790d56a9fbf6b'}],
 ['public/games/overtime-pinball/lottery-hud.js',{gitBlob:'7b875afad6dae5d81da9799646e8925bb69600e0',sha256:'024fb1f0d19eb73fa543b12ec00e70f97f2b9da418ab186c8ab0cc8f584f3c65'}],
 ['public/games/overtime-pinball/lottery-visual.js',{gitBlob:'431a52a052020dfeadd04b5f7342426f3cba6351',sha256:'3730b66bf1d94336f770c1a8630b24cef93659346f64db8a6410ddaa8f0e8dd6'}],
 ['public/games/overtime-pinball/main.js',{gitBlob:'6bf4f3913a20bfddefa851d53a367f3a439e59b2',sha256:'614fcf97b69de4b9590d9d7bfeaac5012bf9c9e93391d35b55f6bc9f23060293'}],
 ['public/games/overtime-pinball/mobile-ui.css',{gitBlob:'076b06f9d4af9d3163c9c53cc7694ff7aed034ec',sha256:'1020de3feccd4d9dce23d9e1c3b08238f0419b62b46912eb5ccb546d01888757'}],
 ['public/games/overtime-pinball/mobile-ui.js',{gitBlob:'76262e8b4d035dba311080c40879d5cb8f56d0f2',sha256:'d53108826dc1ea8044bdbbc03a8f98de63beebb68c607aece9cdcfcaf8ff7c87'}],
 ['public/games/overtime-pinball/office-routes.js',{gitBlob:'efa3adbdee5f6193f501dfc8636a70e46853a65b',sha256:'d3da1cd09f7d6f4c51a88057db2235620c34c2932256f2af0095bc63b95f0f3c'}],
 ['public/games/overtime-pinball/physics.js',{gitBlob:'0a4c832ee0665bfcff25b18fe418b15483040d02',sha256:'e1c45fbf19f1ff77194c00495f26ad3cb8172cc309ca9526d72838f75e9d57ad'}],
 ['public/games/overtime-pinball/play-polish.css',{gitBlob:'a43f008180132fe76787eff9f9b78cc203f73d49',sha256:'7b2115e8f35caf66718c69fe8f7877f8f78d415f27189bb32856836dce25baa2'}],
 ['public/games/overtime-pinball/raffle-machine.js',{gitBlob:'fb96b79b17bd44583027cdcb4e3ae74af5273b46',sha256:'d83a3eea765992ff4348e3d5c4d46241526f5471b4ddd7d1660fdfcd8e7d879a'}],
 ['public/games/overtime-pinball/round-rules.js',{gitBlob:'18c98b7f196b1e0cb0e29ed6e50d466e08143781',sha256:'f81c74d8743f2caecfc96d156ecc54753e84b255bfc8d165a24feb73701d5eec'}],
 ['scripts/build.mjs',{gitBlob:'fb367207f59944a647b614724dbaa6c012473444',sha256:'f53f38c9b48ebe9dd5e92a18d993ea349919a505a1daebbb4eba2d566bfdbf96'}],
 ['scripts/verify.mjs',{gitBlob:'1bac17bc7c22065dbea7754ec99bc8bf1b678a4e',sha256:'60d3f1b5b50b08e50316b7751aa94c22d9123727b37fe6105a28472d2ec17a57'}],
 ['src/render.mjs',{gitBlob:'f2c5734f2e74027098b44d423aa267ce8414bb85',sha256:'d31f759c7afedc610457a4bd4a199286a723bf9449f546b2f4bc3e190c5182d9'}],
 ['tests/app-icons-completion.test.mjs',{gitBlob:'483298fc1887250f95b29356f5c2462b1ff5369d',sha256:'651641d730fb038a82c9674d658bbecb12d628c86713681eeedfb49d2187aa7f'}],
 ['tests/courtesy-touch-inventory-chain.test.mjs',{gitBlob:'9759d046d6f1c3973736d5fb0d23c5e69ffda387',sha256:'f334a893f82bc1b961bdd8cc71f9aad81a73dc4add691a2886f58df2b4b67892'}],
 ['tests/fast-hands/name-refresh-ui.test.mjs',{gitBlob:'c4de5ad6b0789a7e0091174888087930c476a055',sha256:'ca33071d3335cf797c831fc230b64d42e514588c5d74357bb72c59c4310520b7'}],
 ['tests/fighter-entry-count.test.mjs',{gitBlob:'56bca326e358648d04f86e886bd51f3f14da59ae',sha256:'d2cedcbb391063fc8ebc227f8bd024017f521502f8366a795b4e1e46cde81a75'}],
 ['tests/homepage-portals.test.mjs',{gitBlob:'3f01940e7d4477cf61dcedc8bd61855dd09072cf',sha256:'3957621e5f4f060a6bab47a595052db857e95cf12f34dcb4df537be9992a5a78'}],
 ['tests/main-counts-fighter.test.mjs',{gitBlob:'8cbf20dc40b0651ea8b25c34b9700dae6e0f177a',sha256:'c887ef2b4b840463d6a8ad2540941aecba51ed778ec2b96d9615a43af0b9b51b'}],
 ['tests/main-courtesy-help-provenance.test.mjs',{gitBlob:'c912df364b06cbf5fde1c04fe0620c173570ef68',sha256:'f865558ef20be635c1db06092603638a8bcdfecd8acf9ece009f11d86aea892a'}],
 ['tests/main-fast-hands.test.mjs',{gitBlob:'733425e14d6121ef67ab8b76387136ad55325949',sha256:'bdfcd45be5e80f7c7f239ff0234b175c46b13041e57c0f323dc3b58660fc022a'}],
 ['tests/main-nav-diagnostic.test.mjs',{gitBlob:'b595dbccb81d9e615a3510bcc0ee1ff9f53b501c',sha256:'53027afe748e9746cefa8eb154b23b303c8d5d2ec1efbef1445b281589f76bbc'}],
 ['tests/mobile-gesture-page-provenance.test.mjs',{gitBlob:'e6118d5c837fcbaf231239246f31a79c2c931e30',sha256:'eb9718db991e63fccb9e6e16ae79c6162d69c6bbbb8eb6feb434b46905244007'}],
 ['tests/pinball-nav-order.test.mjs',{gitBlob:'611ca58d3b836aabf1b43775603c51e01bbf5e4e',sha256:'c57b04f6d5743c957feee5271e1d91f62e31198644786c9ad71d41617723b34d'}],
 ['tests/pinball/lottery-assists.test.mjs',{gitBlob:'6ec1c9e0ac5742ba5ff8f5ebdcc8f3f09e442c3b',sha256:'d432621432e9ecfd22502ada65c05ad2646bbc6b19921318309763e7688ea8e4'}],
 ['tests/pinball/lottery-events.test.mjs',{gitBlob:'312ec501cfa411d29c4375d1f9592de4a58cb2e5',sha256:'96aeee29aed8f731e54ed3f82ec29e5b65d1ee470511535ab2dff130dec2cb7b'}],
 ['tests/pinball/lottery-integration.test.mjs',{gitBlob:'45a9b75385021c0f9888c5257b6af7937bb7fcd8',sha256:'8f99feb6bd3befdf2b8a3d2d5f159fabfd8bea7ced6ffb675c672bc80e47cf2f'}],
 ['tests/pinball/lottery-hud.test.mjs',{gitBlob:'310e6e989f07c453ae89f7439a932da0b751f65e',sha256:'8fdca16dea21cd0266b3e70b2f0ebc998e3f51334ddb2c1b594424459bc7e60d'}],
 ['tests/pinball/lottery-render.test.mjs',{gitBlob:'b5dbaa41e4aee1e84a34e25161a228cbdb6514ba',sha256:'6d142228595ec6d226818708048d00ace558966475f9a226fd34f8e20d894c4d'}],
 ['tests/pinball/office-routes.test.mjs',{gitBlob:'95a0dfd9dde9e58ae1f50fcec8b05e6a53bab965',sha256:'460fed7ecaf7597341a6c5655f04278b8da720e070300a64bfe9ae327c94d144'}],
 ['tests/pinball/proportions.test.mjs',{gitBlob:'d4645c651ad8ef405f8b5d969d7b684596f44ef9',sha256:'37dc300365a1272e72b429d405f2b7bcc265c4a9e04d726b5cbb22d3d836277d'}],
 ['tests/pinball/raffle-machine.test.mjs',{gitBlob:'6d92ac17978cf8a2faea35a550188f1b46c6daf4',sha256:'a2f015825f1527063c6573b024eb0c0daf7211f57d73341ec376395dc6b8f2bd'}],
 ['tests/pinball/render-budget.test.mjs',{gitBlob:'7e52c39c61bc4f1b1e65d239c6d1a2f36317adf2',sha256:'4c789004d6f5b96ab6389981a16d5a289bca04306f93661ef2867b8930e0e89a'}],
 ['tests/play-counts-repository.test.mjs',{gitBlob:'6f24ba1e8d26f456c19c8cc9e4797f90e0943472',sha256:'6fc35e3afafa8bd7efeceff66348a3adea9c0d74a31c9ace9a214702bfedf29e'}],
 ['tests/punchline-main-portal.test.mjs',{gitBlob:'607492509c8af48bdcf793806cb27b729533bf20',sha256:'645184de27c4a11e660acc2cda67f55deb25aa95a1125255a44b93d0e8238f52'}],
 ['tests/reaction-rod-main.test.mjs',{gitBlob:'692e52b52593c88f81482a7501b35c62766056aa',sha256:'69d27f6be771e362d3e8f72e33bdb945a6e452c4fecc29e2ddc43971012ca42d'}],
 ['worker/play-counts/entries.mjs',{gitBlob:'1dcf49dd7b8515f8e3157da69d935430d2bcd1ac',sha256:'e9b23caad6abe2b62bd4853353cc941d3486f920c65b739bd301946bd4010c30'}],
 ['worker/play-counts/repository.mjs',{gitBlob:'93fc6d6cb71fee0f4a9c01dd842a2cb0f86857d2',sha256:'2f103fff2e8007077f41657bd34425eb91cdbf608bcc5aef124deb9a566004b9'}],
]);
export function verifyBase(b){
 assert.equal(b.baseCommit,'52e58101c4b16592645a304dfbcb4e011c3301fd');assert.equal(b.baseTree,'7b39eb93d30dd465913a98386373974cca5b7a91');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let d=tree;for(const name of parts.slice(0,-1))d=d[name]??={};assert.ok(!d[parts.at(-1)],'duplicate parent path');d[parts.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/pinball-rotated-touch/MANIFEST.json';
let cachedText,cached;const validated=new WeakSet();
function uncached_manifest(){const url=new URL('../../'+manifestPath,import.meta.url),text=manifestText(url,()=>actual(url,'utf8'));if(text!==cachedText){const parsed=freeze(JSON.parse(text));cachedText=text;cached=parsed;}return cached;}

export function validate(m){
 if(m===cached&&validated.has(m))return m;
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 assert.deepEqual(m.releaseFiles.map(f=>f.path).sort(),[...currentReleaseParents.keys()].sort());
 for(const f of m.releaseFiles){const b=Buffer.from(f.beforeText),parent=currentReleaseParents.get(f.path);assert.equal(f.beforeGitBlob,parent.gitBlob,f.path+' immediate pinball release parent blob');assert.equal(f.beforeSha256,parent.sha256,f.path+' immediate pinball release parent SHA256');assert.equal(gitBlob(b),f.beforeGitBlob,f.path+' immediate pinball release parent bytes');assert.equal(sha256(b),f.beforeSha256,f.path+' immediate pinball release parent bytes SHA256');assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.files){const b=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(b),f.beforeGitBlob);assert.equal(sha256(b),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.addedFiles){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 if(m===cached)validated.add(m);return m;
}
function uncached_pinballRotatedTouchParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=uncached_pinballCurrentReleaseParentBytes(path,bytes,m);const f=m.files.find(f=>f.path===path);if(!f)return bytes;
 const before=Buffer.from(f.beforeText);if(before.equals(bytes))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' pinballRotatedTouch live drift');assert.equal(sha256(bytes),f.sha256,path+' pinballRotatedTouch live SHA256 drift');return before;
}
function uncached_pinballCurrentReleaseParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=Buffer.from(bytes);const f=m.releaseFiles.find(f=>f.path===path);if(!f)return bytes;
 const before=Buffer.from(f.beforeText);if(before.equals(bytes)||gitBlob(bytes)===previous.get(path))return bytes;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' current pinball release live drift');assert.equal(sha256(bytes),f.sha256,path+' current pinball release live SHA256 drift');return before;
}
function uncached_readBeforePinballRotatedTouch(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)||manifest().releaseFiles.some(f=>f.path===path)?pinballRotatedTouchParentBytes(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
function uncached_inventoryBeforePinballRotatedTouch(paths,{read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate pinballRotatedTouch inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 const runtime=p=>/^(public|worker|src|config)\//.test(p),onlyRuntime=runtimeOnly||paths.every(runtime);
 const additions=m.addedPaths.filter(p=>!onlyRuntime||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' pinballRotatedTouch addition must appear once');
 for(const f of m.releaseFiles.filter(f=>!onlyRuntime||runtime(f.path))){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' current pinball release inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' current pinball release inventory SHA256 drift');}
 for(const f of [...m.files,...m.addedFiles].filter(f=>!onlyRuntime||runtime(f.path))){const bytes=pinballCurrentReleaseParentBytes(f.path,read(f.path),m);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' pinballRotatedTouch inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' pinballRotatedTouch inventory SHA256 drift');}
 return paths.filter(p=>!additions.includes(p));
}
function uncached_assertCompleteInventory(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 assert.deepEqual([...paths].sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'complete pinballRotatedTouch inventory');
 assert.deepEqual(inventoryBeforePinballRotatedTouch(paths,{read}).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(gitBlob(pinballRotatedTouchParentBytes(f.path,read(f.path))),f.gitBlob,f.path+' exact immutable parent');
 return true;
}

export const manifest=(...args)=>withProvenanceSession(()=>uncached_manifest(...args));
export const pinballCurrentReleaseParentBytes=(...args)=>withProvenanceSession(()=>uncached_pinballCurrentReleaseParentBytes(...args));
export const pinballRotatedTouchParentBytes=(...args)=>withProvenanceSession(()=>uncached_pinballRotatedTouchParentBytes(...args));
export const readBeforePinballRotatedTouch=(...args)=>withProvenanceSession(()=>uncached_readBeforePinballRotatedTouch(...args));
export const inventoryBeforePinballRotatedTouch=(...args)=>withProvenanceSession(()=>uncached_inventoryBeforePinballRotatedTouch(...args));
export const assertCompleteInventory=(...args)=>withProvenanceSession(()=>uncached_assertCompleteInventory(...args));

// Existing directories stay visible; unknown descendants are never filtered out.
export function entriesBeforePinballRotatedTouch(directory,entries,{read=p=>actual(new URL('../../'+p,import.meta.url)),list=p=>actualDirectory(new URL('../../'+p+'/',import.meta.url),{withFileTypes:true})}={}){
 const absolute=directory instanceof URL?fileURLToPath(directory):resolve(String(directory)),path=relative(root,absolute).split(sep).join('/');
 if(path!=='public'&&!path.startsWith('public/'))return entries;
 const m=validate(manifest()),prefix=path+'/',name=e=>typeof e==='string'?e:Buffer.isBuffer(e)?e.toString():e.name,names=entries.map(name);
 assert.equal(new Set(names).size,names.length,'duplicate pinballRotatedTouch directory entry');
 const additions=m.addedFiles.filter(f=>f.path.startsWith(prefix)),omit=new Set();
 function verify(f){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' pinballRotatedTouch directory drift');assert.equal(sha256(bytes),f.sha256,f.path+' pinballRotatedTouch directory SHA256 drift');}
 for(const child of new Set(additions.map(f=>f.path.slice(prefix.length).split('/')[0]))){
  const target=prefix+child,existing=baseline.files.some(f=>f.path===target||f.path.startsWith(target+'/'));
  if(existing)continue;
  assert.equal(names.filter(n=>n===child).length,1,target+' pinballRotatedTouch directory addition must exist');
  const files=additions.filter(f=>f.path===target||f.path.startsWith(target+'/'));
  if(files.some(f=>f.path===target)){assert.equal(files.length,1);verify(files[0]);}
  else{const found=[];function walk(p){for(const e of list(p)){const q=p+'/'+e.name;if(e.isDirectory())walk(q);else{assert.ok(e.isFile(),q+' regular pinballRotatedTouch file');found.push(q);}}}walk(target);assert.deepEqual(found.sort(),files.map(f=>f.path).sort(),target+' exact pinballRotatedTouch subtree');files.forEach(verify);}
  omit.add(child);
 }
 return entries.filter(e=>!omit.has(name(e)));
}
export function readdirBeforePinballRotatedTouch(directory,options){return entriesBeforePinballRotatedTouch(directory,actualDirectory(directory,options));}
