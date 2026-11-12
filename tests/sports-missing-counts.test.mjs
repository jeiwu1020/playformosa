import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/games/',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const cases=[['sprint-100m','sprint-100m/app.mjs','reset','resume'],['javelin','javelin/app.mjs','fresh','resumeGame'],['run-400m','shared/runner-platform.mjs','restart','resume'],['run-1500m','shared/runner-platform.mjs','restart','resume']];
// Execute the exact production lifecycle functions with rendering/audio stubbed.
// Their callbacks are separately pinned below; no duplicate reimplementation of count logic.
function lifecycle(source,name){const line=source.split('\n').find(l=>l.trimStart().startsWith(`function ${name}(`));assert.ok(line,`missing ${name}`);return line.trim();}
function harness(id,path){
 const source=read(path),calls=[],noop=()=>{},node={hidden:false,close:noop,focus:noop},controller={close:noop,reset:noop,resume:noop,unlock:noop,adapter:{unlock:noop}};
 let ready=true;
 const context={window:{},win:{performance:{now:()=>1}},performance:{now:()=>1},recordPlayStart:(win,game)=>{calls.push(game);return Promise.resolve();},entry:controller,share:controller,soundscape:controller,audio:controller,board:controller,resultUI:controller,modal:controller,canvas:node,world:node,$:()=>node,document:{body:{classList:{remove:noop}}},a:{gameId:id,ready:()=>ready,create:()=>({}),start:noop},leaveReplay:noop,createRace:()=>({}),createState:()=>({}),createPresentation:()=>({}),createRunout:()=>({}),createRecorder:()=>({}),createFinishRecorder:()=>({}),clear:noop,inputsClear:noop,sync:noop,syncPauseButton:noop,setPaused:noop,close:noop,showResult:noop,saved:null,race:{}};
 return{source,calls,ready:value=>{ready=value;},run(name){vm.runInNewContext(`(${lifecycle(source,name)})()`,context);}};
}
for(const[id,path,start,resume]of cases)test(`${id}: each actual start/restart counts once; resume does not count`,()=>{
 const h=harness(id,path);assert.equal((h.source.match(/\brecordPlayStart\(/g)||[]).length,1,'exactly one lifecycle count hook');
 h.run(start);assert.deepEqual(h.calls,[id]);h.run(resume);assert.deepEqual(h.calls,[id]);h.run(start);assert.deepEqual(h.calls,[id,id]);h.run(resume);assert.deepEqual(h.calls,[id,id]);
 if(id.startsWith('run-')){h.ready(false);h.run(start);assert.deepEqual(h.calls,[id,id],'not-ready restart must not count');}
});
test('all entry/retry controls converge on the single lifecycle hook, never resume/replay',()=>{
 const sprint=read('sprint-100m/app.mjs'),javelin=read('javelin/app.mjs'),runner=read('shared/runner-platform.mjs');
 for(const text of ['onStart:reset','onRestart:reset',"$('again').onclick=reset","$('restart').onclick=reset"])assert.ok(sprint.includes(text),text);
 assert.match(javelin,/onStart:\(\)=>\{audio\.unlock\(\);fresh\(\)\}/);assert.match(javelin,/onRestart:\(\)=>\{audio\.unlock\(\);fresh\(\)\}/);
 assert.match(javelin,/const retry=.*fresh\(\)/);for(const text of ["$('begin').onclick=()=>{audio.unlock();fresh()}","$('restart').onclick=()=>{audio.unlock();fresh()}"])assert.ok(javelin.includes(text));
 for(const text of ['onStart:restart','onRestart:restart',"$('again').onclick=restart","$('restart').onclick=restart"])assert.ok(runner.includes(text));
 for(const[source,names]of [[sprint,['resume','startReplay']],[javelin,['resumeGame','startReplay']],[runner,['resume','startReplay']]])for(const name of names)assert.doesNotMatch(lifecycle(source,name),/recordPlayStart/);
});
test('shared runner platform has only the two intended consumers',()=>{
 const consumers=[];for(const dir of readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()))for(const f of readdirSync(new URL(dir.name+'/',root)))if(f.endsWith('.mjs')&&read(dir.name+'/'+f).includes("from'../shared/runner-platform.mjs'"))consumers.push(dir.name+'/'+f);
 assert.deepEqual(consumers.sort(),['run-1500m/app.mjs','run-400m/app.mjs']);
});
