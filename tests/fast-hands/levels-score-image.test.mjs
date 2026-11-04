import test from 'node:test';
import assert from 'node:assert/strict';
const mod=await import('../../public/games/fast-hands/levels-score-image.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return{};});
const catchState=(wins=3)=>({mode:'catch',phase:'done',practice:false,results:[...Array.from({length:wins},(_,i)=>({round:i+1,winner:'player',reason:'caught',flightMs:384-i*20})),{round:wins+1,winner:'none',reason:'miss',flightMs:302.4}]});
const duelState=()=>({mode:'duel',phase:'done',practice:false,results:Array.from({length:10},(_,i)=>({round:i+1,winner:i<6?'player':i<9?'ai':'draw',reason:i===7?'early':'tie'}))});
const png=()=>({blob:new Blob(['frozen actual scene'],{type:'image/png'}),width:900,height:620});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function renderer({decodeFailure=false,encodeFailure=false,nullBlob=false,dimensions=[900,620],fontFailure=false}={}){
 const calls=[],closed=[],decoded=[];let encode;
 const image={width:dimensions[0],height:dimensions[1],close:()=>closed.push(true)};
 const ctx={measureText:t=>({width:Array.from(t).length*20}),beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},fillRect(...a){calls.push(['fillRect',...a]);},fillText(...a){calls.push(['fillText',...a]);},drawImage(...a){calls.push(['drawImage',...a]);}};
 const canvas={width:0,height:0,getContext:()=>ctx,toBlob(cb,type){assert.equal(type,'image/png');if(encodeFailure)throw Error('taint');encode=()=>cb(nullBlob?null:new Blob(['complete score PNG'],{type:'image/png'}));}};
 const doc={fonts:{ready:fontFailure?Promise.reject(Error('font')):Promise.resolve()},defaultView:{createImageBitmap:async blob=>{decoded.push(blob);if(decodeFailure)throw Error('decode');return image;}},createElement:tag=>{assert.equal(tag,'canvas');return canvas;}};
 return{doc,canvas,calls,closed,decoded,image,finish:()=>{assert.ok(encode);encode();}};
}
test('level scores freeze counts from settled gameplay without changing or inventing speed',()=>{
 assert.equal(typeof mod.describeLevelScore,'function');
 const state=catchState(),copy=JSON.stringify(state),result=mod.describeLevelScore(state,'catch');
 assert.equal(JSON.stringify(state),copy);assert.ok(Object.isFrozen(result));assert.equal(result.mode,'catch');assert.equal(result.modeText,'玩具彈接接樂');assert.equal(result.scoreText,'3 關通過');assert.equal(result.title,'闖到第 4 關');assert.match(result.note,/302 ms/);state.results[0].winner='none';assert.equal(result.scoreText,'3 關通過');
 const duel=mod.describeLevelScore(duelState(),'duel');assert.equal(duel.scoreText,'6 : 3');assert.equal(duel.title,'你贏了快手王！');assert.match(duel.note,/搶跑 1 次/);assert.match(duel.note,/平手 1 次/);
 for(const invalid of [{...catchState(),practice:true},{...catchState(),phase:'feedback'},{...duelState(),results:[]},{...duelState(),results:[{winner:'player'}]}])assert.throws(()=>mod.describeLevelScore(invalid,invalid.mode),/成績|完成/);
});
test('deterministic PNG filenames identify mode and actual scores without page/user text',()=>{
 assert.equal(typeof mod.levelScoreImageFilename,'function');
 assert.equal(mod.levelScoreImageFilename(mod.describeLevelScore(catchState(),'catch')),'fast-hands-catch-3-stages.png');
 assert.equal(mod.levelScoreImageFilename(mod.describeLevelScore(duelState(),'duel')),'fast-hands-duel-6-3.png');
});
test('full scorecard renders the exact frozen 900 × 620 frame, mode, score and studio brand',async()=>{
 assert.equal(typeof mod.createLevelScoreImage,'function');
 for(const state of [catchState(),duelState()]){
  const r=renderer(),frame=png(),result=mod.describeLevelScore(state,state.mode);let completed=false;
  const pending=mod.createLevelScoreImage({result,frame:Promise.resolve(frame),document:r.doc}).then(out=>{completed=true;return out;});
  await flush();assert.equal(completed,false);assert.equal(r.canvas.width,1080);assert.equal(r.canvas.height,1350);
  assert.deepEqual(r.decoded,[frame.blob]);assert.deepEqual(r.calls.filter(c=>c[0]==='drawImage'),[['drawImage',r.image,90,208,900,620]]);
  const text=r.calls.filter(c=>c[0]==='fillText').map(c=>c[1]).join('\n');
  for(const expected of ['快手王',result.modeText,result.scoreText,result.title,'PLAYFORMOSA STUDIO'])assert.ok(text.includes(expected),expected);
  assert.doesNotMatch(text,/NaN|Infinity/);for(const [,text,x,y,width] of r.calls.filter(c=>c[0]==='fillText')){assert.ok(x>=0&&y>=0&&x<1080&&y<1350);if(width)assert.ok(x+width<=1080);}
  r.finish();const out=await pending;assert.equal(out.blob.type,'image/png');assert.match(out.filename,/^fast-hands-(catch|duel)-.*\.png$/);assert.deepEqual(r.closed,[true]);
 }
});
test('frame failure, wrong dimensions, decode failure and encode failure fail honestly',async()=>{
 assert.equal(typeof mod.createLevelScoreImage,'function');const result=mod.describeLevelScore(catchState(),'catch');
 for(const frame of [Promise.reject(Error('frame capture')),Promise.resolve({blob:new Blob([],{type:'image/png'}),width:900,height:620}),Promise.resolve({...png(),width:901})]){
  await assert.rejects(mod.createLevelScoreImage({result,frame,document:renderer().doc}));
 }
 for(const opts of [{decodeFailure:true},{dimensions:[1,1]},{encodeFailure:true}]){const r=renderer(opts);await assert.rejects(mod.createLevelScoreImage({result,frame:png(),document:r.doc}));if(!opts.decodeFailure)assert.deepEqual(r.closed,[true]);}
 const r=renderer({nullBlob:true}),pending=mod.createLevelScoreImage({result,frame:png(),document:r.doc});await flush();r.finish();await assert.rejects(pending);assert.deepEqual(r.closed,[true]);
});
test('font failure does not prevent an actual-scene score image',async()=>{
 assert.equal(typeof mod.createLevelScoreImage,'function');const r=renderer({fontFailure:true}),pending=mod.createLevelScoreImage({result:mod.describeLevelScore(catchState(),'catch'),frame:png(),document:r.doc});await flush();r.finish();assert.equal((await pending).blob.type,'image/png');
});

test('browser image-element decode fallback cleans up its private URL on success and failure',async()=>{
 for(const broken of [false,true]){
  const r=renderer(),created=[],revoked=[],removed=[];let image;
  r.doc.defaultView={URL:{createObjectURL:blob=>{created.push(blob);return 'blob:frozen-frame';},revokeObjectURL:url=>revoked.push(url)}};
  const create=r.doc.createElement;
  r.doc.createElement=tag=>tag==='canvas'?create(tag):(image={complete:false,naturalWidth:0,naturalHeight:0,addEventListener(type,fn){this[type]=fn;},removeEventListener(type){delete this[type];},removeAttribute(key){removed.push(key);},set src(value){assert.equal(value,'blob:frozen-frame');queueMicrotask(()=>{if(broken)this.error?.();else{this.complete=true;this.naturalWidth=900;this.naturalHeight=620;this.load?.();}});}});
  const frame=png(),pending=mod.createLevelScoreImage({result:mod.describeLevelScore(catchState(),'catch'),frame,document:r.doc});
  if(broken)await assert.rejects(pending);else{await flush();assert.equal(r.calls.find(c=>c[0]==='drawImage')[1],image);r.finish();await pending;}
  assert.deepEqual(created,[frame.blob]);assert.deepEqual(revoked,['blob:frozen-frame']);assert.deepEqual(removed,['src']);assert.equal(image.load,undefined);assert.equal(image.error,undefined);
 }
});

test('encoded scorecard retains every captured scene pixel at full size without crop or resampling',async()=>{
 const {createCanvas,loadImage}=await import('@napi-rs/canvas');
 const frame=createCanvas(900,620),ctx=frame.getContext('2d');
 for(const [color,x,y,w,h] of [['#f28e2b',0,0,450,310],['#2b8cf2',450,0,450,310],['#218941',0,310,450,310],['#f0cf28',450,310,450,310]]){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
 ctx.fillStyle='#0f172a';ctx.fillRect(0,0,900,7);ctx.fillRect(0,613,900,7);ctx.fillRect(0,0,7,620);ctx.fillRect(893,0,7,620);
 const blob=new Blob([frame.toBuffer('image/png')],{type:'image/png'});
 const doc={defaultView:{createImageBitmap:async input=>loadImage(Buffer.from(await input.arrayBuffer()))},createElement(tag){assert.equal(tag,'canvas');const canvas=createCanvas(1,1);canvas.toBlob=fn=>fn(new Blob([canvas.toBuffer('image/png')],{type:'image/png'}));return canvas;}};
 const out=await mod.createLevelScoreImage({result:mod.describeLevelScore(duelState(),'duel'),frame:{blob,width:900,height:620},document:doc});
 const image=await loadImage(Buffer.from(await out.blob.arrayBuffer()));assert.equal(image.width,1080);assert.equal(image.height,1350);
 const decoded=createCanvas(1080,1350),outCtx=decoded.getContext('2d');outCtx.drawImage(image,0,0);
 assert.deepEqual(outCtx.getImageData(90,208,900,620).data,ctx.getImageData(0,0,900,620).data);
 assert.ok(out.blob.size>20000,'branded text and surrounding card should be present');
 const bottom=outCtx.getImageData(0,1330,1080,20).data;for(let i=0;i<bottom.length;i+=4)assert.deepEqual([...bottom.slice(i,i+4)],[255,249,233,255],'all text must remain inside the scorecard');
});
