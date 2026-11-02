import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {LEADERBOARD_ENABLED} from '../public/games/shared/leaderboard-config.mjs';import {handleRequest} from '../worker/leaderboard/index.mjs';
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8').replace(/^\s*\/\/.*$/gm,''));
test('approved QA binding and client gate cannot provision or choose production data',()=>{
 assert.equal(config.name,'playformosa');assert.equal(config.main,'worker/leaderboard/index.mjs');assert.equal(config.d1_databases,undefined);assert.equal(config.vars,undefined);assert.equal(config.previews.d1_databases.length,1);assert.deepEqual(config.previews.d1_databases[0],{binding:'DB',database_name:'playformosa-leaderboard-qa',database_id:'75be2ba1-d2b8-455d-82c2-e5392ead01d4'});
 assert.equal(config.previews.vars.LEADERBOARD_SCOPE,'qa');assert.equal(config.previews.vars.LEADERBOARD_ORIGIN,'https://preview-hurdles-playformosa.playformosa.workers.dev');assert.equal(config.previews.vars.LEADERBOARD_ENABLED,'true');assert.equal(LEADERBOARD_ENABLED,true);
 assert.deepEqual(config.assets.run_worker_first,['/api/leaderboard*','/api/play-counts*']);assert.equal(config.assets.not_found_handling,'404-page');assert.equal(config.assets.binding,'ASSETS');
});
test('another inherited preview origin is denied before touching the QA database',async()=>{let touched=false;const env={...config.previews.vars,DB:{prepare(){touched=true;throw Error('must not read')}}};const response=await handleRequest(new Request('https://another-playformosa.playformosa.workers.dev/api/leaderboard?game=hurdles'),env);assert.equal(response.status,503);assert.equal(touched,false);});
