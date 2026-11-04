import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {createLevelWorld} from '../../public/games/fast-hands/levels-world.mjs';

const state = extra => ({phase:'live', liveAt:1000, targetAt:1400, flightMs:400, results:[], ...extra});
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);

test('toy dart is one continuous orange mesh without a swollen or contrasting head', () => {
  const world = createLevelWorld(THREE, {mode:'catch'}), meshes=[];
  world.objects.dart.traverse(o => {if(o.isMesh)meshes.push(o);});
  assert.equal(meshes.length, 1, 'the dart must be one continuous surface, not a body plus oversized head/ring');
  const dart=meshes[0];
  assert.equal(dart.geometry.type, 'LatheGeometry');
  assert.equal(Array.isArray(dart.material), false);
  assert.equal(dart.material.color.getHexString(), 'f47625');
  const profile=dart.geometry.parameters.points;
  assert.ok(profile.every(p=>p.x>=0&&p.x<=.036+1e-8), 'the rounded nose must never exceed the body radius');
  close(profile[0].y,-.225);close(profile.at(-1).y,.035);
  close(profile[0].x,0);close(profile.at(-1).x,0);
  const nose=profile.filter(p=>p.y>=-.001-1e-8);
  assert.ok(nose.length>=9, 'use a smooth arc, not a pointed or stepped tip');
  for(let i=1;i<nose.length;i++)assert.ok(nose[i].x<=nose[i-1].x+1e-8);
  world.dispose();
});

test('dart rest, flight and caught contact coordinates stay on the existing trajectory', () => {
  const world=createLevelWorld(THREE,{mode:'catch'});
  for(const [now, expected] of [[1000,[-.85,1.33,.35]],[1200,[-.4,1.385,.35]],[1400,[.05,1.33,.35]]]){
    const sample=world.update({state:state(),now});
    sample.contacts.dartTip.forEach((value,i)=>close(value,expected[i]));
  }
  const sample=world.update({state:state({phase:'feedback',results:[{winner:'player',reason:'caught',offsetMs:0,round:1}]}),now:1700});
  assert.equal(sample.dartAttached,true);
  sample.contacts.dartTip.forEach((value,i)=>close(value,sample.contacts.kingPalm[i]));
  assert.deepEqual(world.objects.dart.getObjectByName('foam-dart-contact').position.toArray(),[0,0,0]);
  world.dispose();
});

test('fallback dart has one orange rounded silhouette and no separately colored tip', () => {
  const css=postcss.parse(fs.readFileSync(new URL('../../public/games/fast-hands/levels.css',import.meta.url),'utf8'));
  const props=selector=>{const values={};css.walkRules(rule=>{if(rule.selector===selector)rule.walkDecls(d=>values[d.prop]=d.value);});return values;};
  const dart=props('.foam-dart'),tip=props('.foam-dart i');
  assert.equal(tip.display,'none','hide the old contrasting tip element');
  assert.equal(dart['border-radius'],'2px 999px 999px 2px');
  assert.equal(dart.background,'linear-gradient(#ffad54,#e8782b)');
  assert.equal(dart.left,'calc(25.803% + 25.62% * var(--flight))');
  assert.equal(dart.top,'44.374%');
});
