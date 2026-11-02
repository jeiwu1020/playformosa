import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubmission,BOARDS,handleRequest} from '../worker/leaderboard/index.mjs';
const base={game:'long-jump',rules:'journey-km-v1',unit:'km',status:'valid',score:123.25,nickname:'小島玩家',deviceId:'22222222-2222-4222-8222-222222222222',submissionId:'11111111-1111-4111-8111-111111111111'};
test('strict server board and score validation, no client environment',()=>{
 assert.equal(validateSubmission(base).score,123.25);
 for(const changes of [{score:NaN},{score:Infinity},{score:-1},{score:0},{game:'shot-put'},{rules:'old'},{unit:'metres'},{status:'foul'},{environment:'production'},{nickname:'<script>x</script>'},{nickname:'x\nY'}]) assert.throws(()=>validateSubmission({...base,...changes}));
 assert.equal(validateSubmission({...base,game:'hurdles',rules:'110m-8h-v1',unit:'s',status:'done',score:16.7}).score,16.7);
 assert.throws(()=>validateSubmission({...base,game:'hurdles',rules:'110m-8h-v1',unit:'s',status:'done',score:181}));
 assert.equal(BOARDS['long-jump'].direction,'desc');assert.equal(BOARDS.hurdles.direction,'asc');
});
test('disabled or unbound server refuses without touching DB; client cannot enable',async()=>{
 let touched=0; const env={DB:{prepare(){touched++;throw Error('no');}}};
 const r=await handleRequest(new Request('https://qa.example/api/leaderboard?game=hurdles'),env);assert.equal(r.status,503);assert.equal(touched,0);
 const r2=await handleRequest(new Request('https://qa.example/api/leaderboard?game=hurdles'),{LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'qa'});assert.equal(r2.status,503);
});
test('unbounded legal journey preserves finite large values; prototype names rejected',()=>{
 assert.equal(validateSubmission({...base,score:1e100}).score,1e100);
 assert.throws(()=>validateSubmission({...base,game:'constructor'}));
});
test('Worker platform execution context is not used as submission clock',async()=>{
 const worker=(await import('../worker/leaderboard/index.mjs')).default;
 const response=await worker.fetch(new Request('https://qa.example/api/leaderboard?game=hurdles'),{}, {waitUntil(){}});assert.equal(response.status,503);
 assert.match(worker.fetch.toString(),/handleRequest\(request,env\)/);
});
test('IDs and board keys require strings, canonical payload independent of JSON key order',()=>{
 assert.throws(()=>validateSubmission({...base,deviceId:[base.deviceId]}));assert.throws(()=>validateSubmission({...base,game:['long-jump']}));
 assert.equal(JSON.stringify(validateSubmission(base)),JSON.stringify(validateSubmission(Object.fromEntries(Object.entries(base).reverse()))));
});
