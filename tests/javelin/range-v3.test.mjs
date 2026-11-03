import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,press,release,step} from '../../public/games/javelin/physics.mjs';

// This driver uses only the real controls and clock. No position, energy, score,
// stability, draw or brace state is injected to manufacture a long throw.
function attempt({delay=.27,cadence=.32,braceAt=-5.8,drawAt=-15,jEvery=1,brace=true,brake=true}={}){
 const s=createState();let next=0,strides=0;
 const tap=key=>{press(s,key);release(s,key);};tap('s');
 for(let frame=0;frame<7200&&s.phase!=='result';frame++){
  if(s.phase==='run'&&s.braceTime===null){
   if(brace&&s.x>braceAt)press(s,'a');
   else if(s.time>=next){tap(strides++%2?'a':'s');if(jEvery&&strides%jEvery===0)tap('j');next=s.time+cadence;}
   if(s.x>drawAt&&!s.held.k)press(s,'k');
   if(!brace&&s.x>braceAt&&s.draw>=.32)release(s,'k');
  }
  if(s.phase==='run'&&s.braceTime!==null&&s.time-s.braceTime>=delay&&s.draw>=.32)release(s,'k');
  if(s.phase==='flight'&&brake){press(s,'a');press(s,'s');}
  step(s,1/120);
 }
 return s;
}
function valid(s){assert.equal(s.phase,'result');assert.equal(s.foul,false);assert.ok(s.projectile.landed);assert.ok(s.stopped);assert.ok(s.x<0);}

test('legal controls provide 70, 90 and 100 metre skill progression',()=>{
 const learning=attempt({delay:.14}),skilled=attempt({delay:.20}),expert=attempt();
 for(const s of[learning,skilled,expert])valid(s);
 assert.ok(learning.distance>=70&&learning.distance<85);assert.equal(learning.grade,'A');
 assert.ok(skilled.distance>=90&&skilled.distance<98.48);assert.equal(skilled.grade,'S');
 assert.ok(expert.distance>=105&&expert.distance<=112);assert.equal(expert.grade,'S');
 assert.ok(expert.distance>skilled.distance+10&&skilled.distance>learning.distance+10);
});
test('extra throw energy requires run speed, balance, draw and timely brace together',()=>{
 const expert=attempt(),noJ=attempt({jEvery:0}),slow=attempt({cadence:.8}),shortDraw=attempt({drawAt:-7.5}),early=attempt({delay:.12}),unbraced=attempt({brace:false});
 for(const s of[expert,noJ,slow,shortDraw,early,unbraced])valid(s);
 assert.ok(expert.launch.chainBonus>6);
 assert.equal(noJ.launch.chainBonus,0);assert.equal(slow.launch.chainBonus,0);assert.equal(unbraced.launch.chainBonus,0);
 assert.ok(shortDraw.launch.chainBonus<expert.launch.chainBonus*.7);
 assert.ok(early.launch.chainBonus<expert.launch.chainBonus*.5);
 assert.ok(noJ.distance<50&&shortDraw.distance<85&&slow.distance<60);
});
test('longer K hold cannot farm unlimited launch power',()=>{
 const normal=attempt(),long=attempt({drawAt:-22});valid(normal);valid(long);
 assert.ok(long.launch.draw>normal.launch.draw+.5);assert.ok(long.distance<=normal.distance+1.5);
 assert.ok(long.launch.speed<=32.6&&long.launch.chainBonus<=6.7);
});
test('record-distance game challenge appears only for a valid qualifying throw',()=>{
 const expert=attempt(),below=attempt({delay:.20}),foul=attempt({brake:false});valid(expert);valid(below);assert.equal(foul.foul,true);
 assert.ok(expert.feedback.some(line=>/98\.48/.test(line)&&/遊戲挑戰/.test(line)&&/非真實世界紀錄/.test(line)));
 assert.ok(!below.feedback.some(line=>/遊戲挑戰達成/.test(line)));
 assert.ok(!foul.feedback.some(line=>/遊戲挑戰達成/.test(line)));assert.equal(foul.grade,'犯規');
});
test('legal control sweep keeps high-skill launch energy and distance bounded',()=>{
 let best=0,validThrows=0;
 for(const cadence of[.16,.24,.32,.4,.6,.8])for(const delay of[.08,.14,.2,.24,.27,.3,.4,.55])for(const braceAt of[-6.8,-5.8,-4.8]){
  const s=attempt({cadence,delay,braceAt});assert.equal(s.phase,'result');
  if(s.launch){assert.ok(s.launch.runSpeed<=8.4);assert.ok(s.launch.speed<=32.6);assert.ok(s.launch.chain>=0&&s.launch.chain<=1);assert.ok(s.launch.chainBonus<=6.7);}
  if(!s.foul){validThrows++;best=Math.max(best,s.distance);assert.ok(s.distance<=112);}
 }
 assert.ok(validThrows>50);assert.ok(best>=105);
});
test('expert control sequence is exactly reproducible without randomness',()=>assert.deepEqual(attempt(),attempt()));
