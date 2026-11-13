import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
const root=process.cwd(),own=relative(root,fileURLToPath(import.meta.url)),start=performance.now(),deadline=start+240000;
const args=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return i<0?[s,true]:[s.slice(0,i),s.slice(i+1)];}));
const fail=m=>{throw new Error('RELEASE HOLD: '+m);};
const hash=(a,b)=>createHash(a).update(b).digest('hex');
function run(cmd,argv,{capture=false}={}){
 const remaining=Math.floor(deadline-performance.now());if(remaining<=0)fail('four-minute gate budget exhausted');
 const r=spawnSync(cmd,argv,{cwd:root,encoding:capture?'utf8':undefined,stdio:capture?'pipe':'inherit',timeout:remaining,killSignal:'SIGKILL',detached:true,maxBuffer:32*1024*1024});
 if(r.pid){try{process.kill(-r.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}}
 if(r.error||r.status!==0)fail(`${cmd} failed or timed out (${r.error?.code||r.signal||r.status})`);return r.stdout;
}
function snapshot(tree){
 const head=run('git',['rev-parse','HEAD^{tree}'],{capture:true}).trim();if(head!==tree)fail('HEAD tree is not the explicitly reviewed release');
 const raw=run('git',['ls-tree','-rz',tree],{capture:true}),expected=new Map();
 for(const record of raw.split('\0').filter(Boolean)){const m=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(record);if(!m||m[3].split('/').some(p=>!p||p==='..'||p==='.'||['.git','node_modules','dist'].includes(p)))fail('unsupported source tree entry');expected.set(m[3],{mode:m[1],sha:m[2]});}
 const actual=[];function walk(dir=''){for(const entry of readdirSync(resolve(root,dir),{withFileTypes:true})){if(!dir&&['.git','node_modules','dist'].includes(entry.name))continue;const p=dir?dir+'/'+entry.name:entry.name;if(entry.isDirectory())walk(p);else{if(!entry.isFile())fail('source must be regular file: '+p);actual.push(p);}}}walk();
 if(actual.length!==expected.size||actual.some(p=>!expected.has(p)))fail('unknown or missing source files');
 for(const p of actual){const info=lstatSync(resolve(root,p));if(info.size>128*1024*1024)fail('oversized source: '+p);const bytes=readFileSync(resolve(root,p)),e=expected.get(p),blob=hash('sha1',Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]));if(blob!==e.sha||((info.mode&0o111)?'100755':'100644')!==e.mode)fail('source bytes/mode changed: '+p);}
 return actual.sort();
}
try{
 if(Object.keys(args).some(k=>!['--gate-sha256','--expect-tree','--verify-only'].includes(k)))fail('unknown gate argument');
 if(!/^[a-f0-9]{64}$/.test(args['--gate-sha256']||'')||hash('sha256',readFileSync(fileURLToPath(import.meta.url)))!==args['--gate-sha256'])fail('external gate SHA-256 pin missing or mismatched');
 if(!/^[a-f0-9]{40}$/.test(args['--expect-tree']||''))fail('explicit reviewed Git tree required');
 if(own!=='scripts/pinball-shadow-release-gate.mjs')fail('gate outside admitted location');
 const files=snapshot(args['--expect-tree']);
 if(args['--verify-only']){console.log(JSON.stringify({verified:true,tree:args['--expect-tree'],files:files.length}));process.exit(0);}
 const patterns=[/^tests\/pinball\/.*\.test\.mjs$/,/^tests\/pinball-.*\.test\.mjs$/,/^tests\/.*counts.*\.test\.mjs$/,/^tests\/leaderboard-.*\.test\.mjs$/,/^tests\/(narrow-hud-layout|word-lamp-visual|overtime-events|overtime-presentation|shadow-workers|shadow-worker-visual|boss-overtime-clock|preview-upload-isolation|catalog-release|fast-hands-cooldown-backend|preview-fast-gate-provenance|shadow-release-provenance)\.test\.mjs$/,/^tests\/fast-hands\/(duck.*|.*input.*|shuttle|records|replay|result-copy|leaderboard.*)\.test\.mjs$/];
 const tests=files.filter(p=>patterns.some(pattern=>pattern.test(p)));
 for(const required of ['tests/pinball/lottery-hud-css.test.mjs','tests/pinball/lottery-hud.test.mjs','tests/pinball/gate-hud.test.mjs','tests/pinball/launcher-rearm.test.mjs','tests/pinball/offer-station-visual.test.mjs','tests/pinball-lottery-provenance.test.mjs','tests/pinball/lr-offer.test.mjs','tests/pinball/lottery-integration.test.mjs','tests/pinball/lottery-events.test.mjs','tests/pinball/lottery-assists.test.mjs','tests/pinball/lottery-render.test.mjs','tests/pinball/lottery-position.test.mjs','tests/pinball-flow-provenance.test.mjs','tests/pinball-flow-scope.test.mjs','tests/pinball/flow-rules.test.mjs','tests/pinball/optional-interaction.test.mjs','tests/pinball/upper-assists.test.mjs','tests/pinball/interaction-offer-ui.test.mjs','tests/narrow-hud-layout.test.mjs','tests/pinball/word-lamps.test.mjs','tests/word-lamp-visual.test.mjs','tests/pinball/overtime-core.test.mjs','tests/pinball/interaction-clock.test.mjs','tests/overtime-events.test.mjs','tests/shadow-workers.test.mjs','tests/shadow-release-provenance.test.mjs'])if(!tests.includes(required))fail('required test absent: '+required);
 console.log(JSON.stringify({releaseTree:args['--expect-tree'],testFiles:tests.length,budgetSeconds:240}));
 run(process.execPath,['--test',...tests]);snapshot(args['--expect-tree']);
 run('npm',['run','build']);run(process.execPath,['scripts/verify.mjs']);run('npm',['run','check:release','--','--expect=preview']);snapshot(args['--expect-tree']);
 console.log(JSON.stringify({releaseGate:'passed',tree:args['--expect-tree'],elapsedSeconds:(performance.now()-start)/1000}));
}catch(e){console.error(e.message);process.exitCode=1;}
