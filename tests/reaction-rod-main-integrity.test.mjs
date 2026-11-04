import {readBeforeLoading} from './helpers/loading-main-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readBeforeLoading(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const m=JSON.parse(read('docs/reaction-rod-main/SOURCE-MANIFEST.json'));
test('Rod promotion ledger protects every existing game, shared module, original schema and production binding byte',()=>{
 assert.equal(m.baseCommit,'af138c1631b553b65531016f24888266c3ef2bbe');assert.equal(m.previewSource,'52c60d195e494146f95bc702763cbe6d7bcc742a');
 for(const f of m.protectedFiles)assert.equal(hash(read(f.path)),f.sha256,f.path);
 for(const prefix of ['public/games/long-jump/','public/games/hurdles/','public/games/shared/']){assert.ok(m.protectedFiles.some(f=>f.path.startsWith(prefix)));assert.equal(m.files.filter(f=>f.path.startsWith(prefix)).length,0);}
 for(const path of ['wrangler.jsonc','worker/leaderboard/repository.mjs','worker/leaderboard/0001.sql','worker/play-counts/002.sql','src/catalog-entries/taiwanfighter.json','docs/hurdles-main/SOURCE-MANIFEST.json'])assert.ok(m.protectedFiles.some(f=>f.path===path),path);
});
test('all new production files belong only to Rod and public inventory excludes unapproved games',()=>{
 const added=m.addedPublicPaths;assert.equal(new Set(added).size,added.length);
 for(const p of added)assert.match(p,/^(games\/reaction-rod\/|assets\/app-icons\/reaction-rod\/|assets\/reaction-rod-card\.png$)/);
 assert.deepEqual(readdirSync(new URL('public/games/',root)).sort(),['hurdles','long-jump','reaction-rod','shared']);
 assert.equal(hash(read('public/games/reaction-rod/physics.mjs')),'129771df49eff9a8c3cdf9a32515ff982187339f813d6eac4cf88ed6d9c1282f');
 for(const f of m.files){assert.equal(hash(read(f.path)),f.sha256,f.path);if(f.beforeText!==undefined)assert.equal(hash(Buffer.from(f.beforeText)),f.beforeSha256,f.path+' historical baseline');}
});
