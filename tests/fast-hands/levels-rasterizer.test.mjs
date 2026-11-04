import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';

import {rasterizeScene} from '../../scripts/render-fast-hands-levels.mjs';
const makeCamera = () => { const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10); camera.position.set(0, 0, 3); camera.lookAt(0, 0, 0); return camera; };

test('offline level renderer uses depth, not scene traversal order', () => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#ffffff');
  const near = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color:'#e00000'})); near.position.z = .5; scene.add(near);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({color:'#0000e0'})); scene.add(far);
  const {canvas, stats} = rasterizeScene(THREE, scene, makeCamera(), {width:40, height:40, supersample:1});
  const p = canvas.getContext('2d').getImageData(20, 20, 1, 1).data;
  assert.ok(p[0] > 180 && p[2] < 20, `near red mesh must cover blue mesh: ${p}`);
  assert.equal(stats.meshes, 2);
});

test('offline level renderer respects invisible ancestors and scene background', () => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#21a65a');
  const parent = new THREE.Group(); parent.visible = false; scene.add(parent);
  parent.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({color:'#e00000'})));
  const {canvas, stats} = rasterizeScene(THREE, scene, makeCamera(), {width:40, height:40, supersample:1});
  const p = canvas.getContext('2d').getImageData(20, 20, 1, 1).data;
  assert.ok(p[1] > 150 && p[0] < 50, `scene background remains visible: ${p}`);
  assert.equal(stats.meshes, 0);
});

test('fallback rendering supplies same-model reach, grasp, return, and empty-hand keyframes',async()=>{
 const {LEVEL_FALLBACK_SHOTS:shots}=await import('../../scripts/render-fast-hands-levels.mjs');
 assert.ok(Array.isArray(shots),'the render script must export the exact fallback keyframe list');
 const names=new Set(shots.map(shot=>shot.name));
 for(const name of ['levels-catch-ready','levels-catch-reach','levels-catch-grab','levels-catch-return-mid','levels-catch-return','levels-catch-empty-mid','levels-duel-ready','levels-duel-player-reach','levels-duel-player-grab','levels-duel-player-return-mid','levels-duel-player','levels-duel-ai-reach','levels-duel-ai-grab','levels-duel-ai-return-mid','levels-duel-ai'])assert.ok(names.has(name),name);
 assert.equal(shots.length,15,'keep the complete pose set under two dozen images');
});
