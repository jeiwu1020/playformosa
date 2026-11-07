"""Regenerate courtesy's reversible boundary after authorized candidate edits.
Usage: python scripts/generate-courtesy-provenance.py BASELINE_DIR REMOTE_TREE_JSON
No runtime files or older manifests are changed. Missing parent files stay in the
full remote baseline, never in a deletion list. Reject unapproved changed scope.
"""
import hashlib,json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
old=Path(sys.argv[1]).resolve();remote=json.loads(Path(sys.argv[2]).read_text())
commit='883498a7eb27c9670b87ed49764b57d87b9fd118';tree='e844add2dbd272efc4a174b6118ec470602712a0'
assert remote['sha']==tree and remote.get('truncated') is False
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
sha=lambda b:hashlib.sha256(b).hexdigest()
base={'baseCommit':commit,'baseTree':tree,'files':[{'path':f['path'],'mode':f['mode'],'gitBlob':f['sha']} for f in remote['tree'] if f['type']=='blob']}
base['files'].sort(key=lambda f:f['path']);tracked={f['path']:f['gitBlob'] for f in base['files']}
folder=root/'docs/courtesy-contest';folder.mkdir(parents=True,exist_ok=True)
basepath=folder/'INTEGRATION-BASELINE.json';basepath.write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n')
allowed=set('tests/helpers/dialog-layout-provenance.mjs tests/helpers/dialog-layout-repair-provenance.mjs tests/high-jump/provenance.test.mjs tests/high-jump/result-preview-provenance.test.mjs tests/dialog-layout-provenance.test.mjs tests/game-scrollbars.test.mjs package.json public/games/shared/play-counts.mjs public/index.html src/catalog.mjs src/render.mjs worker/play-counts/index.mjs worker/play-counts/repository.mjs tests/helpers/high-jump-compact-entry-provenance.mjs tests/high-jump/compact-entry-provenance.test.mjs tests/fast-hands/art-polish-provenance.test.mjs tests/fast-hands/result-upload-provenance.test.mjs tests/fast-hands/split-entries-provenance.test.mjs tests/nine-play-counts.test.mjs tests/play-counts-repository.test.mjs tests/play-counts-home.test.mjs'.split())
changed=[]
for path,expected in tracked.items():
 current=root/path
 if not current.exists():continue
 if blob(current.read_bytes())==expected:continue
 assert path in allowed,('unapproved existing change',path)
 pre=(old/path).read_bytes();assert blob(pre)==expected,('baseline mismatch',path)
 changed.append(path)
added=[]
for prefix in ['public/games/courtesy-contest','tests/courtesy-contest','docs/courtesy-contest']:
 added += [str(p.relative_to(root)) for p in (root/prefix).rglob('*') if p.is_file() and str(p.relative_to(root)) not in tracked]
added += [str(p.relative_to(root)) for p in (root/'tests').glob('courtesy*.test.mjs') if str(p.relative_to(root)) not in tracked]
added += ['tests/browser/courtesy-platform.html','public/assets/courtesy-contest-card.jpg','tests/helpers/courtesy-integration-provenance.mjs','scripts/generate-courtesy-provenance.py']
manifestPath='docs/courtesy-contest/INTEGRATION-MANIFEST.json'
added=sorted(set(added+[manifestPath]));changed.sort()
helper=root/'tests/helpers/courtesy-integration-provenance.mjs';s=helper.read_text()
s=re.sub(r"export const COURTESY_INTEGRATION_BASE_COMMIT='[^']+'",f"export const COURTESY_INTEGRATION_BASE_COMMIT='{commit}'",s)
s=re.sub(r"export const COURTESY_INTEGRATION_BASE_TREE='[^']+'",f"export const COURTESY_INTEGRATION_BASE_TREE='{tree}'",s)
s=re.sub(r'export const COURTESY_INTEGRATION_CHANGED=Object.freeze\(\[.*?\]\);','export const COURTESY_INTEGRATION_CHANGED=Object.freeze('+json.dumps(changed)+');',s)
s=re.sub(r'export const COURTESY_INTEGRATION_ADDED=Object.freeze\(\[.*?\]\);','export const COURTESY_INTEGRATION_ADDED=Object.freeze('+json.dumps(added)+');',s)
s=re.sub(r"assert.equal\(sha256\(baselineBytes\),'[^']+'",f"assert.equal(sha256(baselineBytes),'{sha(basepath.read_bytes())}'",s);helper.write_text(s)
def hashes(path):
 b=(root/path).read_bytes();return {'path':path,'sha256':sha(b),'gitBlob':blob(b)}
m={'baseCommit':commit,'baseTree':tree,'files':[],'addedPaths':added,'addedFiles':[hashes(p) for p in added if p!=manifestPath]}
for path in changed:
 b=(old/path).read_bytes();m['files'].append({**hashes(path),'beforeText':b.decode(),'beforeSha256':sha(b),'beforeGitBlob':blob(b)})
(root/manifestPath).write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print(f'{len(base["files"])} pinned parent blobs; {len(changed)} changed; {len(added)} additions; missing parents retained: '+str(sum(not (root/p).exists() for p in tracked)))
