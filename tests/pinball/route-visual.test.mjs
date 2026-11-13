import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../public/games/overtime-pinball/vendor/three.module.min.js';
import {createRouteVisuals} from '../../public/games/overtime-pinball/route-visual.js';
import {routeCue} from '../../public/games/overtime-pinball/route-hud.js';
import {SHORT_PATH,MAIL_BRANCHES} from '../../public/games/overtime-pinball/office-routes.js';
test('route paint exactly follows physical paths, stays low, and owns no physics',()=>{
 const office=new T.Group(),v=createRouteVisuals(T,{office});assert.equal(v.tracks.length,3);
 [SHORT_PATH,MAIL_BRANCHES.left.path,MAIL_BRANCHES.right.path].forEach((p,i)=>{const a=v.tracks[i].line.geometry.attributes.position;assert.equal(a.count,(p.length-1)*2);assert.ok(Math.abs(a.getX(0)+p[0].x)<1e-5);assert.ok(Math.abs(a.getZ(0)-p[0].z)<1e-5);assert.ok(a.getY(0)<.4);});
 const g={mailRun:{choiceOpen:true,choice:null},shortRun:null},before=JSON.stringify(g);v.update(g,2);assert.equal(JSON.stringify(g),before);v.dispose();v.dispose();assert.equal(office.children.length,0);
});
test('selection lights physical chosen path only and clears after run',()=>{
 const v=createRouteVisuals(T,{office:new T.Group()});v.update({mailRun:{choice:'left'},shortRun:null},1);assert.equal(v.tracks[1].line.material.color.getHex(),0xa1e5dc);assert.equal(v.tracks[2].line.material.color.getHex(),0x80968c);v.update({},0);assert.equal(v.tracks[1].line.material.color.getHex(),0x80968c);v.dispose();
});
test('HUD maps physical left/right to same screen controls as engine',()=>{
 const game={mailRun:{choiceOpen:true,choiceRemaining:.6,choiceDefault:'right'}};assert.match(routeCue(game,'reverse').detail,/左/);assert.match(routeCue(game,'original').detail,/右/);assert.equal(routeCue(game).remaining,.6);
 game.mailRun.choice='left';game.mailRun.chosenByPlayer=true;assert.match(routeCue(game,'reverse').title,/右/);assert.equal(routeCue(game).open,false);assert.match(routeCue(game,'original').title,/左/);assert.equal(routeCue({}),null);
});

test('all floor route geometry stays above floor and below word pedestal',()=>{
 const v=createRouteVisuals(T,{office:new T.Group()}),matrix=new T.Matrix4();
 for(const track of v.tracks){
  const a=track.line.geometry.attributes.position;for(let i=0;i<a.count;i++){assert.ok(a.getY(i)>.04);assert.ok(a.getY(i)<.15);}
  track.lamps.geometry.computeBoundingBox();const bounds=track.lamps.geometry.boundingBox;
  for(let i=0;i<track.count;i++){track.lamps.getMatrixAt(i,matrix);const y=matrix.elements[13];assert.ok(y+bounds.min.y>.04);assert.ok(y+bounds.max.y<.15);}
  track.arrow.geometry.computeBoundingBox();assert.ok(track.arrow.position.y>.04);assert.ok(track.arrow.position.y+track.arrow.geometry.boundingBox.max.y<.15);
 }v.dispose();
});
test('idle and unchanged chase frame do not re-upload instanced light colors',()=>{const v=createRouteVisuals(T,{office:new T.Group()});v.update({},0);const before=v.tracks.map(t=>t.lamps.instanceColor.version);for(let n=1;n<60;n++)v.update({},n/60);assert.deepEqual(v.tracks.map(t=>t.lamps.instanceColor.version),before);v.update({shortRun:{}},1);const live=v.tracks[0].lamps.instanceColor.version;v.update({shortRun:{}},1.01);assert.equal(v.tracks[0].lamps.instanceColor.version,live);v.update({shortRun:{}},1.09);assert.ok(v.tracks[0].lamps.instanceColor.version>live);v.dispose();});
