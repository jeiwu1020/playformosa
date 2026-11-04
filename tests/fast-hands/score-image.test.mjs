import test from 'node:test';
import assert from 'node:assert/strict';
import {describeResult} from '../../public/games/fast-hands/result-copy.mjs';
import {createScoreImage, normalizeScoreResult, scoreImageFilename, wrapScoreText} from '../../public/games/fast-hands/score-image.mjs';

const success = {title:'挑戰成功！',timeText:'0.532',bestText:'0.500 秒',deltaText:'比本機最佳慢 0.032 秒',comment:'一手包辦，鈔鴨雙收。',modeText:'滑鼠',success:true};
const measure = text => ({width:[...text].length * 10});

test('normalization never turns missing, nonfinite, or unsuccessful time into a completion',()=>{
  assert.equal(normalizeScoreResult(success).timeText,'0.532');
  for(const timeText of [NaN,Infinity,'NaN','Infinity','-1','',null,undefined]){
    const actual=normalizeScoreResult({...success,timeText});
    assert.equal(actual.success,false,String(timeText));
    assert.equal(actual.timeText,'未完成');
    assert.doesNotMatch(actual.title,/成功/);
  }
  assert.equal(normalizeScoreResult({...success,success:false}).timeText,'未完成');
  assert.equal(normalizeScoreResult({...success,bestText:'NaN 秒'}).bestText,'尚無紀錄');
  assert.equal(normalizeScoreResult({...success,bestText:Infinity}).bestText,'尚無紀錄');
  assert.equal(normalizeScoreResult({...success,deltaText:'快 Infinity 秒'}).deltaText,'本機紀錄暫無比較');
});

test('normalization preserves describeResult fields without deriving a faster score',()=>{
  const result=normalizeScoreResult(success,'touch');
  assert.equal(result.modeText,'觸控');
  assert.equal(result.timeText,'0.532');
  assert.equal(result.bestText,'0.500 秒');
  assert.equal(result.deltaText,'比本機最佳慢 0.032 秒');
  assert.equal(result.comment,'一手包辦，鈔鴨雙收。');
  assert.equal(normalizeScoreResult({success:false,title:'鈔票先下班了',comment:'鴨還沒抓到'}).title,'鈔票先下班了');
});

test('filenames are deterministic and ignore path-like and untrusted labels',()=>{
  assert.equal(scoreImageFilename(success,'mouse'),'fast-hands-mouse-0p532s.png');
  assert.equal(scoreImageFilename({...success,title:'../../oops'},'touch'),'fast-hands-touch-0p532s.png');
  assert.equal(scoreImageFilename({...success,success:false},'../../'), 'fast-hands-mouse-incomplete.png');
});

test('Chinese and long Latin words wrap within measured line width and respect explicit newlines',()=>{
  const ctx={measureText:measure};
  assert.deepEqual(wrapScoreText(ctx,'雙手完成挑戰',30),['雙手完','成挑戰']);
  assert.deepEqual(wrapScoreText(ctx,'ABCD\n手快',30),['ABC','D','手快']);
  assert.deepEqual(wrapScoreText(ctx,'雙手完成挑戰再來一輪',30,{maxLines:2}),['雙手完','成挑…']);
  assert.deepEqual(wrapScoreText(ctx,'😀😀😀',20),['😀😀','😀']);
  assert.throws(()=>wrapScoreText(ctx,'test',NaN),/width/);
});

// Node has no browser Canvas. This records the real renderer's drawing boundary,
// while PNG decoding/visual/download verification is performed in a real browser.
function drawingDocument({fontReject=false,blob=null,blobNull=false,canvasError=null,imageError=false}={}){
  const calls=[];let callback;
  const ctx={measureText:measure,save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},arc(){},rect(){},clip(){},setLineDash(){},fillRect(...a){calls.push(['fillRect',...a]);},fillText(...a){calls.push(['fillText',...a]);},drawImage(...a){calls.push(['drawImage',...a]);}};
  const canvas={width:0,height:0,getContext:()=>ctx,toBlob(fn,type){assert.equal(type,'image/png');if(canvasError)throw canvasError;callback=()=>fn(blobNull?null:blob||new Blob(['png'],{type:'image/png'}));}};
  const doc={baseURI:'https://example.test/game/',fonts:{ready:fontReject?Promise.reject(new Error('font failed')):Promise.resolve()},createElement(tag){if(tag==='canvas')return canvas;if(tag==='img'){const im={naturalWidth:0,naturalHeight:0,complete:false,addEventListener(name,fn){this[name]=fn;},removeEventListener(){},set src(value){this._src=value;queueMicrotask(()=>{if(imageError)this.error?.();else{this.complete=true;this.naturalWidth=512;this.naturalHeight=640;this.load?.();}});},get src(){return this._src;}};return im;}throw Error(tag);}};
  return {doc,canvas,calls,flush:()=>{assert.ok(callback,'toBlob callback should be pending');callback();}};
}
const portrait={complete:true,naturalWidth:512,naturalHeight:640};

test('Canvas output waits for toBlob, draws actual portrait, and includes score, record, mode and comment',async()=>{
  const fixture=drawingDocument();let settled=false;
  const promise=createScoreImage({result:success,mode:'touch',portrait,document:fixture.doc}).then(x=>{settled=true;return x;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(settled,false,'must await asynchronous PNG encoding');
  assert.equal(fixture.canvas.width,1080);assert.equal(fixture.canvas.height,1350);
  assert.equal(fixture.calls.filter(c=>c[0]==='drawImage').length,1);
  assert.equal(fixture.calls.find(c=>c[0]==='drawImage')[1],portrait);
  const drawn=fixture.calls.filter(c=>c[0]==='fillText').map(c=>c[1]).join('\n');
  for(const text of ['0.532','0.500 秒','觸控','一手包辦，鈔鴨雙收。','比本機最佳慢 0.032 秒'])assert.ok(drawn.includes(text),text);
  fixture.flush();const output=await promise;
  assert.equal(output.blob.type,'image/png');assert.equal(output.filename,'fast-hands-touch-0p532s.png');
});

test('font failure uses fallback and incomplete rounds do not print a completion time',async()=>{
  const fixture=drawingDocument({fontReject:true});
  const promise=createScoreImage({result:{...success,success:false},portrait,document:fixture.doc});
  await new Promise(resolve=>setImmediate(resolve));fixture.flush();await promise;
  const drawn=fixture.calls.filter(c=>c[0]==='fillText').map(c=>c[1]);
  assert.ok(drawn.includes('未完成'));assert.ok(!drawn.includes('0.532'));
});

test('image failure and canvas failure reject cleanly instead of creating a blank success',async()=>{
  const fixture=drawingDocument({imageError:true});
  await assert.rejects(createScoreImage({result:success,document:fixture.doc}),/人物/);
  await assert.rejects(createScoreImage({result:success,portrait:{...portrait,naturalWidth:0,decode:async()=>{throw Error('bad image');}},document:fixture.doc}),/人物/);
  const taint=drawingDocument({canvasError:new Error('SecurityError')});
  await assert.rejects(createScoreImage({result:success,portrait,document:taint.doc}),/圖片/);
  const nil=drawingDocument({blobNull:true});
  const promise=createScoreImage({result:success,portrait,document:nil.doc});
  await new Promise(resolve=>setImmediate(resolve));nil.flush();await assert.rejects(promise,/圖片/);
});

test('very long Chinese result copy remains bounded inside the exported card',async()=>{
  const fixture=drawingDocument();
  const long='這是一段很長的中文成績說明'.repeat(60);
  const promise=createScoreImage({result:{...success,title:long,comment:long,deltaText:long,bestText:long},portrait,document:fixture.doc});
  await new Promise(resolve=>setImmediate(resolve));fixture.flush();await promise;
  const drawn=fixture.calls.filter(c=>c[0]==='fillText');
  assert.ok(drawn.some(c=>c[1].endsWith('…')),'long paragraphs should show truncation');
  for(const [,text,x,y,width] of drawn){
    assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(x>=0 && x<1080 && y>=0 && y<1350);
    if(width!==undefined)assert.ok(Number.isFinite(width)&&width>0&&x+width<=1080);
    assert.doesNotMatch(text,/NaN|Infinity/);
  }
});


test('a valid positive elapsed time rounded to 0.000 keeps the real result presentation',()=>{
  const result=describeResult({phase:'success',elapsedMs:0.1},{best:0.1,mode:'mouse'});
  assert.equal(result.success,true);
  assert.equal(result.timeText,'0.000');
  assert.equal(normalizeScoreResult(result).success,true);
  assert.equal(normalizeScoreResult(result).timeText,'0.000');
  assert.equal(scoreImageFilename(result,'mouse'),'fast-hands-mouse-0p000s.png');
  const zeroRaw=describeResult({phase:'success',elapsedMs:0},{best:null});
  assert.equal(zeroRaw.success,false);
  assert.equal(normalizeScoreResult(zeroRaw).timeText,'未完成');
});
