import test from 'node:test';
import assert from 'node:assert/strict';
import {ComicSounds,getAudioContext} from '../../public/games/courtesy-contest/sfx.js';

test('Music and sound-effect callers reuse one context, including interrupted recovery',async t=>{
 const original=globalThis.window,contexts=[];t.after(()=>{globalThis.window=original;contexts.forEach(c=>c.state='closed');});
 globalThis.window={AudioContext:class{constructor(){this.state='suspended';this.resumes=0;contexts.push(this);}resume(){this.resumes++;this.state='running';return Promise.resolve();}}};
 const sound=new ComicSounds(),musicContext=getAudioContext();sound.unlock();
 assert.equal(sound.context,musicContext);assert.equal(contexts.length,1);assert.equal(musicContext.resumes,1);
 musicContext.state='interrupted';sound.unlock();assert.equal(musicContext.resumes,2);assert.equal(contexts.length,1);
});

test('Rejected context resume is handled and can be tried on the next user gesture',async t=>{
 const original=globalThis.window,contexts=[];t.after(()=>{globalThis.window=original;contexts.forEach(c=>c.state='closed');});
 globalThis.window={AudioContext:class{constructor(){this.state='suspended';this.resumes=0;contexts.push(this);}resume(){this.resumes++;return Promise.reject(new Error('NotAllowedError'));}}};
 const sound=new ComicSounds();sound.unlock();await new Promise(resolve=>setImmediate(resolve));sound.unlock();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(contexts.length,1);assert.equal(sound.context.resumes,2);
});
