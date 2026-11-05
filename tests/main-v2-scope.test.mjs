import {readBeforeRod} from './helpers/rod-main-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../src/catalog.mjs';
import {eligibleResult} from '../public/games/shared/leaderboard.mjs';
const root=new URL('../',import.meta.url),read=p=>readBeforeRod(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const manifest=JSON.parse(read('docs/hurdles-main/SOURCE-MANIFEST.json')),v2=manifest.v2Promotion;
test('V2 promotion exact bytes retain auditable historical production chain',()=>{
 assert.equal(v2.baseCommit,'2091d1927ba7378119da7b78be7f936366a41bf2');assert.equal(v2.previewSource,'772d85e2cb063c4dbab38b7adf26956e13c22d57');assert.deepEqual(v2.scope,['long-jump','hurdles']);assert.ok(v2.files.length>0);
 const paths=v2.files.map(f=>f.path);assert.equal(new Set(paths).size,paths.length);
 for(const f of v2.files){assert.match(f.path,/^(public\/games\/(long-jump|hurdles|shared)\/|tests\/)/);const current=read(f.path);assert.equal(hash(current),f.sha256,f.path);assert.equal(blob(current),f.gitBlob,f.path);assert.equal(current.length,f.bytes);if(f.beforeText!==undefined){const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,f.path+' old sha256');assert.equal(blob(before),f.beforeGitBlob,f.path+' old git blob');}}
});
test('production backend, D1 config, scoring physics and catalog stay byte-identical',()=>{
 assert.ok(v2.protectedFiles.some(f=>f.path==='wrangler.jsonc'));assert.ok(v2.protectedFiles.some(f=>f.path==='worker/leaderboard/0001.sql'));assert.ok(v2.protectedFiles.some(f=>f.path==='worker/play-counts/002.sql'));
 for(const f of v2.protectedFiles)assert.equal(hash(read(f.path)),f.sha256,f.path);
 assert.deepEqual(catalog.games.map(g=>g.id),['long-jump','hurdles']);assert.deepEqual(readdirSync(new URL('public/games/',root)).sort(),['fast-hands','hurdles','javelin','long-jump','reaction-rod','shared']);assert.deepEqual(readdirSync(new URL('public/assets/app-icons/',root)).sort(),['hurdles','long-jump','platform','reaction-rod']);
 assert.doesNotMatch(read('public/games/long-jump/game.mjs').toString(),/createLandingReplay|mountControlsFrame/);
 assert.equal(read('public/games/shared/leaderboard-config.mjs').toString().includes('LEADERBOARD_ENABLED = true'),true);
});
test('two-game leaderboard accepts only original legal final-round metrics',()=>{
 assert.deepEqual(eligibleResult('long-jump',{phase:'done',valid:true,legalAdventureKm:12.5,adventureKm:999}),{score:12.5,status:'valid'});
 assert.equal(eligibleResult('long-jump',{phase:'done',valid:false,legalAdventureKm:12.5}),null);
 assert.deepEqual(eligibleResult('hurdles',{phase:'done',t:20}),{score:20,status:'done'});
 assert.equal(eligibleResult('hurdles',{phase:'done',t:181}),null);
 for(const game of ['long-jump','hurdles'])assert.equal(eligibleResult(game,{phase:'run',valid:true,legalAdventureKm:1,t:20}),null);
 for(const game of ['high-jump','pole-vault','shot-put','discus','reaction-rod','beer-slide','tower-climb'])assert.equal(eligibleResult(game,{phase:'done',valid:true,legalAdventureKm:1,t:20}),null);
});
