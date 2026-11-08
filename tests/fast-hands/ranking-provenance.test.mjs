import {readLoadingLookBaseline} from '../helpers/loading-look-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from '../helpers/mobile-gestures-preview-provenance.mjs';
import {createHash} from 'node:crypto';
import {rankingLedger,reverseRanking,rankingRuntimeAdditions,readRankingBaseline,RANKING_MODIFIED,RANKING_ADDED} from '../helpers/fast-hands-ranking-provenance.mjs';
const root=new URL('../../',import.meta.url),read=p=>readLoadingLookBaseline(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('ranking byte reversal rejects changed bytes, invalid bounds and invented parent',()=>{
 const before=Buffer.from('手速\n'),after=Buffer.from('手速榜\n'),path=RANKING_MODIFIED[0];
 const f={path,sha256:hash(after),beforeSha256:hash(before),baseGitBlob:blob(before),reverseEdits:[{start:6,end:9,beforeBase64:''}]};
 assert.deepEqual(reverseRanking(path,after,{files:[f]}),before);
 assert.throws(()=>reverseRanking(path,Buffer.concat([after,Buffer.from('!')]),{files:[f]}));
 assert.throws(()=>reverseRanking(path,after,{files:[{...f,baseGitBlob:'0'.repeat(40)}]}));
 assert.throws(()=>reverseRanking(path,after,{files:[{...f,reverseEdits:[{start:-1,end:9,beforeBase64:''}]}]}));
 assert.deepEqual(reverseRanking('unlisted',after,{files:[f]}),after);
});
test('ranking delta is exactly scoped, pinned to the successful loading parent, and reversible',()=>{
 const l=rankingLedger();assert.equal(l.baseCommit,'4cb67f2f56be12e66c3f1669249ac2f33f40cc12');assert.equal(l.baseTree,'b8b0b35ac56eaa7713fb5161e4005937cdd42877');
 assert.deepEqual(l.files.map(f=>f.path),[...RANKING_MODIFIED,...RANKING_ADDED]);
 for(const f of l.files){const bytes=read(f.path);assert.equal(hash(bytes),f.sha256,f.path);const old=reverseRanking(f.path,bytes);assert.deepEqual(readRankingBaseline(new URL(f.path,root)),old);assert.equal(readRankingBaseline(new URL(f.path,root),'utf8'),old.toString());if(f.beforeSha256){assert.equal(hash(old),f.beforeSha256);assert.equal(blob(old),f.baseGitBlob);}else{assert.equal(f.baseGitBlob,null);assert.deepEqual(f.reverseEdits,[]);}assert.throws(()=>reverseRanking(f.path,Buffer.concat([bytes,Buffer.from('// drift')])));}
 assert.deepEqual(rankingRuntimeAdditions(),RANKING_ADDED);
});
test('ranking preserves all prior manifests and QA database configuration byte for byte',()=>{
 const l=rankingLedger();assert.ok(l.protected.length>=10);for(const f of l.protected)assert.equal(hash(read(f.path)),f.sha256,f.path);
 const config=JSON.parse(read('wrangler.jsonc').toString().replace(/^\/\/.*$/gm,''));assert.equal(config.previews.vars.LEADERBOARD_SCOPE,'qa');assert.equal(config.previews.d1_databases.length,1);assert.equal(config.previews.d1_databases[0].database_name,'playformosa-leaderboard-qa');assert.equal(config.d1_databases,undefined);assert.equal(config.vars,undefined);
});
