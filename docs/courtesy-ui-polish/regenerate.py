from pathlib import Path
import argparse, hashlib, json
parser=argparse.ArgumentParser(description='Seal an explicit UI polish boundary against the complete pinned preview tree.')
parser.add_argument('--parent',required=True,type=Path)
parser.add_argument('--tree',required=True,type=Path)
parser.add_argument('--allow-changed',action='append',default=[])
parser.add_argument('--allow-added',action='append',default=[])
a=parser.parse_args();root=Path(__file__).resolve().parents[2];parent=a.parent.resolve()
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
t=json.loads(a.tree.read_text());assert t['sha']=='fe2bc3ff9450db95cd3814aba880f154f82c5b70';assert not t.get('truncated')
tracked={f['path']:f for f in t['tree'] if f['type']=='blob'};assert len(tracked)==1547
missing='docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png'
assert tracked[missing]['sha']=='5491d5280c2a2faeac41e9a19028698e9af015f8'
# Reconstruct the full parent tree, including every tracked historical evidence file.
def treehash(rows):
 tree={}
 for path,f in rows.items():
  parts=path.split('/');directory=tree
  for name in parts[:-1]:directory=directory.setdefault(name,{})
  assert parts[-1] not in directory,path+' duplicate remote path'
  directory[parts[-1]]={'file':f}
 def digest(directory):
  entries=[]
  for name,node in sorted(directory.items(),key=lambda item:(item[0]+('' if 'file' in item[1] else '/')).encode()):
   f=node.get('file');mode=f['mode'] if f else '40000';identity=f['sha'] if f else digest(node)
   entries.append(mode.encode()+b' '+name.encode()+b'\0'+bytes.fromhex(identity))
  body=b''.join(entries);return hashlib.sha1(b'tree '+str(len(body)).encode()+b'\0'+body).hexdigest()
 return digest(tree)
assert treehash(tracked)==t['sha'],'complete parent tree reconstruction'
# Verify every available parent byte and retain the unavailable historical binary by its original remote blob.
for p,f in tracked.items():
 if not (parent/p).exists():assert p==missing;continue
 assert blob((parent/p).read_bytes())==f['sha'],p+' parent drift'
folder=root/'docs/courtesy-ui-polish'
baseline={'baseCommit':'bc8d0332c4df286f12b246895782ca733ce5e8ad','baseTree':t['sha'],'files':[{'path':p,'mode':f['mode'],'gitBlob':f['sha']} for p,f in sorted(tracked.items())]}
bb=(json.dumps(baseline,ensure_ascii=False,indent=2)+'\n').encode();(folder/'BASELINE.json').write_bytes(bb)
added=sorted(set(a.allow_added+['docs/courtesy-ui-polish/'+p for p in ['BASELINE.json','MANIFEST.json','README.md','regenerate.py']]+['tests/helpers/courtesy-ui-polish-provenance.mjs','tests/courtesy-ui-polish-provenance.test.mjs']))
changed=sorted(set(a.allow_changed+['tests/helpers/courtesy-result-mobile-provenance.mjs']))
assert not set(added)&set(tracked)
assert set(changed)<=set(tracked)
template="// Exact reversible boundary for the approved courtesy pointer, help, mobile layout and score-card polish.\nimport {readFileSync as actual} from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\nimport {relative,resolve,sep,isAbsolute} from 'node:path';\nimport assert from 'node:assert/strict';\nconst root=fileURLToPath(new URL('../../',import.meta.url));\nexport const sha256=b=>createHash('sha256').update(b).digest('hex');\nexport const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\\0`).update(b).digest('hex');\nexport const COURTESY_UI_POLISH_CHANGED=Object.freeze(__CHANGED__);\nexport const COURTESY_UI_POLISH_ADDED=Object.freeze(__ADDED__);\nconst baselineBytes=actual(new URL('../../docs/courtesy-ui-polish/BASELINE.json',import.meta.url));\nassert.equal(sha256(baselineBytes),'__BASEHASH__','independently pinned complete upgrade parent');\nexport const courtesyUiPolishBaseline=JSON.parse(baselineBytes);\nconst previous=new Map(courtesyUiPolishBaseline.files.map(f=>[f.path,f.gitBlob]));\nexport function verifyCourtesyUiPolishBase(base){\n assert.equal(base.baseCommit,'bc8d0332c4df286f12b246895782ca733ce5e8ad');assert.equal(base.baseTree,'fe2bc3ff9450db95cd3814aba880f154f82c5b70');assert.deepEqual(base,courtesyUiPolishBaseline);\n const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}\n function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\\0`).update(body).digest('hex');}\n assert.equal(digest(tree),base.baseTree);return true;\n}\nverifyCourtesyUiPolishBase(courtesyUiPolishBaseline);\nlet cachedText,cachedManifest;const validated=new WeakMap();\nconst freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};\nexport const courtesyUiPolishManifest=()=>{const text=actual(new URL('../../docs/courtesy-ui-polish/MANIFEST.json',import.meta.url),'utf8');if(text!==cachedText){cachedText=text;cachedManifest=freeze(JSON.parse(text));}return cachedManifest;};\nfunction beforeBytes(f){assert.equal(typeof f.beforeText,'string');return Buffer.from(f.beforeText);}\nexport function validateCourtesyUiPolishManifest(m){\n const signature=m===cachedManifest?true:null;if(signature!==null&&validated.get(m)===signature)return m;\n assert.equal(m.baseCommit,courtesyUiPolishBaseline.baseCommit);assert.equal(m.baseTree,courtesyUiPolishBaseline.baseTree);\n assert.deepEqual(m.files.map(f=>f.path).sort(),[...COURTESY_UI_POLISH_CHANGED].sort());assert.deepEqual([...m.addedPaths].sort(),[...COURTESY_UI_POLISH_ADDED].sort());\n assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),COURTESY_UI_POLISH_ADDED.filter(p=>p!=='docs/courtesy-ui-polish/MANIFEST.json').sort());\n for(const f of m.files){const before=beforeBytes(f);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified remote preimage');assert.equal(gitBlob(before),f.beforeGitBlob);assert.equal(sha256(before),f.beforeSha256);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}\n if(signature!==null)validated.set(m,signature);return m;\n}\nexport function reverseCourtesyUiPolish(path,bytes,m=courtesyUiPolishManifest()){\n validateCourtesyUiPolishManifest(m);assert.ok(!COURTESY_UI_POLISH_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);\n assert.equal(sha256(bytes),f.sha256,path+' current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' current Git blob');return beforeBytes(f);\n}\nexport function courtesyUiPolishParentBytes(path,bytes,m=courtesyUiPolishManifest()){\n validateCourtesyUiPolishManifest(m);assert.ok(!COURTESY_UI_POLISH_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);\n const parent=beforeBytes(f);if(Buffer.from(bytes).equals(parent))return parent;return reverseCourtesyUiPolish(path,bytes,m);\n}\nexport function readBeforeCourtesyUiPolish(file,options){\n const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');\n if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);\n const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);\n const before=COURTESY_UI_POLISH_CHANGED.includes(path)?reverseCourtesyUiPolish(path,bytes):bytes;return encoding?before.toString(encoding):before;\n}\nexport function inventoryBeforeCourtesyUiPolish(paths,{manifest=courtesyUiPolishManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){\n assert.equal(new Set(paths).size,paths.length,'duplicate upgrade inventory');validateCourtesyUiPolishManifest(manifest);\n if(!paths.some(p=>COURTESY_UI_POLISH_ADDED.includes(p)))return paths;\n const additions=COURTESY_UI_POLISH_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\\//.test(p));\n for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');\n for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' addition SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' addition Git blob');}\n return paths.filter(p=>!additions.includes(p));\n}\n"
(root/'tests/helpers/courtesy-ui-polish-provenance.mjs').write_text(template.replace('__CHANGED__',json.dumps(changed)).replace('__ADDED__',json.dumps(added)).replace('__BASEHASH__',sha(bb)))
actual_changed=[]
for p,f in tracked.items():
 if not (root/p).exists():assert p==missing;continue
 if blob((root/p).read_bytes())!=f['sha']:actual_changed.append(p)
assert sorted(actual_changed)==changed,{'actual':actual_changed,'allowed':changed}
# Build output and local screenshot evidence are not source additions.
actual_added=[]
for f in root.rglob('*'):
 if not f.is_file() or f.is_symlink():continue
 p=f.relative_to(root).as_posix()
 if p.split('/')[0] in ['node_modules','dist','.git','.openai']:continue
 if p not in tracked:actual_added.append(p)
assert set(actual_added)|{'docs/courtesy-ui-polish/MANIFEST.json'}==set(added),{'actual':actual_added,'allowed':added}
files=[]
for p in changed:
 b=(root/p).read_bytes();before=(parent/p).read_bytes()
 files.append({'path':p,'sha256':sha(b),'gitBlob':blob(b),'beforeText':before.decode(),'beforeSha256':sha(before),'beforeGitBlob':blob(before)})
m={'baseCommit':baseline['baseCommit'],'baseTree':baseline['baseTree'],'files':files,'addedPaths':added,'addedFiles':[{'path':p,'sha256':sha((root/p).read_bytes()),'gitBlob':blob((root/p).read_bytes())} for p in added if p!='docs/courtesy-ui-polish/MANIFEST.json']}
(folder/'MANIFEST.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'changed':changed,'added':added,'preservedRemoteBlob':tracked[missing]['sha']},indent=2))
