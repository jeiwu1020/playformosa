/**
 * Offline CPU renders of the actual Fast Hands level scene geometry.
 * These are graceful no-WebGL pose fallbacks, not screenshots of a browser.
 * No alternate character artwork or stand-in models are used.
 * Run: node scripts/render-fast-hands-levels.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';

const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const toSrgb = n => Math.round(255 * (n <= .0031308 ? 12.92 * Math.max(0, n) : 1.055 * Math.pow(Math.max(0, n), 1 / 2.4) - .055));

/** A depth-buffered, smooth-lit triangle renderer for the source Three meshes. */
export function rasterizeScene(THREE, scene, camera, {width = 900, height = 620, supersample = 2} = {}) {
  const w = Math.round(width * supersample), h = Math.round(height * supersample);
  const canvas = createCanvas(w, h), ctx = canvas.getContext('2d');
  const image = ctx.createImageData(w, h), pixels = image.data;
  const depth = new Float32Array(w * h); depth.fill(Infinity);
  const background = scene.background?.isColor ? scene.background : new THREE.Color('#eae6d8');
  const bg = [toSrgb(background.r), toSrgb(background.g), toSrgb(background.b)];
  for (let i = 0; i < pixels.length; i += 4) { pixels[i] = bg[0]; pixels[i + 1] = bg[1]; pixels[i + 2] = bg[2]; pixels[i + 3] = 255; }
  scene.updateMatrixWorld(true); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const lights = [], hemispheres = [];
  scene.traverseVisible(o => {
    if (o.isDirectionalLight) {
      const direction = o.getWorldPosition(new THREE.Vector3()).sub(o.target.getWorldPosition(new THREE.Vector3())).normalize();
      lights.push({direction, color:o.color, intensity:o.intensity * .24});
    } else if (o.isHemisphereLight) hemispheres.push({sky:o.color, ground:o.groundColor, intensity:o.intensity * .21});
  });
  if (!lights.length) lights.push({direction:new THREE.Vector3(-.5, .8, 1).normalize(), color:new THREE.Color('#ffffff'), intensity:.65});
  const normalMatrix = new THREE.Matrix3(), pos = new THREE.Vector3(), normal = new THREE.Vector3();
  const opaque = [], translucent = [], stats = {meshes:0, triangles:0, rasterizedTriangles:0, width, height, supersample};
  scene.traverseVisible(mesh => {
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
    stats.meshes++;
    const geometry = mesh.geometry, positions = geometry.attributes.position;
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const normals = geometry.attributes.normal, colors = geometry.attributes.color;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const vertices = new Array(positions.count);
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < positions.count; i++) {
      pos.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(vp);
      normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
      vertices[i] = {x:(pos.x + 1) * w / 2, y:(1 - pos.y) * h / 2, z:pos.z, nx:normal.x, ny:normal.y, nz:normal.z,
        color:colors ? [colors.getX(i), colors.getY(i), colors.getZ(i)] : [1, 1, 1]};
    }
    const index = geometry.index, count = index?.count ?? positions.count;
    const start = geometry.drawRange.start ?? 0, end = Math.min(count, start + geometry.drawRange.count);
    const lit = (v, material) => {
      const base = material.color ?? new THREE.Color('#ffffff');
      let illumination = [1, 1, 1];
      if (!material.isMeshBasicMaterial) {
        illumination = [.24, .24, .24];
        for (const hemi of hemispheres) {
          const mix = clamp(v.ny * .5 + .5);
          for (let c = 0; c < 3; c++) { const k = ['r','g','b'][c]; illumination[c] += (hemi.ground[k] * (1 - mix) + hemi.sky[k] * mix) * hemi.intensity; }
        }
        for (const light of lights) {
          const ndl = Math.max(0, v.nx * light.direction.x + v.ny * light.direction.y + v.nz * light.direction.z);
          for (let c = 0; c < 3; c++) illumination[c] += light.color[['r','g','b'][c]] * ndl * light.intensity;
        }
      }
      return ['r','g','b'].map((k, c) => clamp(base[k] * (material.vertexColors ? v.color[c] : 1) * illumination[c] + (material.emissive?.[k] ?? 0) * (material.emissiveIntensity ?? 1)));
    };
    const colorCache = new Map();
    for (let i = start; i + 2 < end; i += 3) {
      const group = geometry.groups.find(g => i >= g.start && i < g.start + g.count);
      const material = materials[group?.materialIndex ?? 0] ?? materials[0];
      if (!material || material.visible === false || material.opacity <= 0) continue;
      const ids = [0, 1, 2].map(j => index ? index.getX(i + j) : i + j);
      const tri = ids.map(id => vertices[id]);
      if (tri.every(v => v.z < -1) || tri.every(v => v.z > 1)) continue;
      const denominator = (tri[1].y - tri[2].y) * (tri[0].x - tri[2].x) + (tri[2].x - tri[1].x) * (tri[0].y - tri[2].y);
      if (Math.abs(denominator) < 1e-7) continue;
      if (material.side === THREE.FrontSide && denominator >= 0) continue;
      if (material.side === THREE.BackSide && denominator <= 0) continue;
      const rgb = ids.map(id => { const key = `${material.uuid}:${id}`; if (!colorCache.has(key)) colorCache.set(key, lit(vertices[id], material)); return colorCache.get(key); });
      const alpha = material.transparent ? material.opacity : 1;
      const record = {tri, rgb, denominator, alpha, depthWrite:material.depthWrite, depthTest:material.depthTest};
      (alpha < 1 ? translucent : opaque).push(record); stats.triangles++;
    }
  });
  translucent.sort((a, b) => b.tri.reduce((n, v) => n + v.z, 0) - a.tri.reduce((n, v) => n + v.z, 0));
  for (const {tri:[a, b, c], rgb, denominator, alpha, depthWrite, depthTest} of [...opaque, ...translucent]) {
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), maxX = Math.min(w - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), maxY = Math.min(h - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
    if (maxX < minX || maxY < minY) continue;
    stats.rasterizedTriangles++;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const l1 = ((b.y - c.y) * (x + .5 - c.x) + (c.x - b.x) * (y + .5 - c.y)) / denominator;
      const l2 = ((c.y - a.y) * (x + .5 - c.x) + (a.x - c.x) * (y + .5 - c.y)) / denominator;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const z = l1 * a.z + l2 * b.z + l3 * c.z, offset = y * w + x;
      if (z < -1 || z > 1 || (depthTest !== false && z > depth[offset] + 1e-7)) continue;
      if (depthWrite !== false) depth[offset] = z;
      for (let channel = 0; channel < 3; channel++) {
        const color = toSrgb(l1 * rgb[0][channel] + l2 * rgb[1][channel] + l3 * rgb[2][channel]);
        pixels[offset * 4 + channel] = Math.round(color * alpha + pixels[offset * 4 + channel] * (1 - alpha));
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  if (supersample === 1) return {canvas, stats};
  const output = createCanvas(width, height), outputContext = output.getContext('2d');
  outputContext.imageSmoothingEnabled = true; outputContext.imageSmoothingQuality = 'high'; outputContext.drawImage(canvas, 0, 0, width, height);
  return {canvas:output, stats};
}

async function main() {
  const THREE = await import('../public/games/fast-hands/three3d/vendor/three.module.min.js');
  const {createLevelWorld} = await import('../public/games/fast-hands/levels-world.mjs');
  const out = path.resolve('public/games/fast-hands/assets'); fs.mkdirSync(out, {recursive:true});
  const width = 900, height = 620, aspect = width / height, viewHeight = Math.max(2.42, 3.06 / aspect);
  const camera = new THREE.OrthographicCamera(-viewHeight * aspect / 2, viewHeight * aspect / 2, viewHeight / 2, -viewHeight / 2, .1, 30);
  camera.position.set(0, 2.35, 6); camera.lookAt(0, 1.15, .15);
  const base = {items:[{artIndex:0}], results:[], liveAt:1000, targetAt:1400, flightMs:400, aiMs:180};
  const shots = [
    {name:'levels-catch-ready', mode:'catch', phase:'waiting', now:500},
    {name:'levels-catch-grab', mode:'catch', phase:'feedback', now:1700, result:{winner:'player', reason:'caught', offsetMs:0, round:1}},
    {name:'levels-duel-ready', mode:'duel', phase:'waiting', now:500},
    {name:'levels-duel-player', mode:'duel', phase:'feedback', now:1500, result:{winner:'player', reason:'player-first', playerMs:110, round:1}},
    {name:'levels-duel-ai', mode:'duel', phase:'feedback', now:1600, result:{winner:'ai', reason:'ai-first', playerMs:null, round:1}},
  ];
  const manifest = [];
  for (const shot of shots) {
    const world = createLevelWorld(THREE, {mode:shot.mode});
    const state = {...base, phase:shot.phase, results:shot.result ? [shot.result] : []};
    const startSample = world.update({state:{...base, phase:'live'}, now:base.liveAt});
    const sample = world.update({state, now:shot.now});
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    const project = point => { const p = new THREE.Vector3().fromArray(point).project(camera); return {x:(p.x + 1) / 2, y:(1 - p.y) / 2}; };
    const itemArt = world.objects.itemArt;
    const artCorner = (x,y) => project(itemArt.localToWorld(new THREE.Vector3(x,y,0)).toArray());
    const overlay = {
      prize:project(sample.contacts.item),
      prizeArtCenter:project(itemArt.getWorldPosition(new THREE.Vector3()).toArray()),
      prizeArtCorners:[artCorner(-.20,.20), artCorner(.20,.20), artCorner(.20,-.20), artCorner(-.20,-.20)],
      receivingHand:project(sample.contacts.kingPalm),
      playerHand:sample.contacts.athletePalm ? project(sample.contacts.athletePalm) : null,
      dartStart:shot.mode === 'catch' ? project(startSample.contacts.dartTip) : null,
      dartTip:shot.mode === 'catch' ? project(sample.contacts.dartTip) : null,
    };
    // The generated item atlas is composited by the DOM in fallback mode. Do
    // not bake the world's emergency gold core into the character pose image.
    world.objects.item.visible = false;
    const {canvas, stats} = rasterizeScene(THREE, world.scene, camera, {width, height});
    const filename = `${shot.name}.png`; fs.writeFileSync(path.join(out, filename), canvas.toBuffer('image/png'));
    manifest.push({filename, kind:'Offline source-mesh pose fallback, not a browser screenshot', ...shot, stats, source:world.diagnostics(), contacts:sample.contacts, overlay});
    console.log(filename, JSON.stringify(stats)); world.dispose();
  }
  fs.writeFileSync(path.join(out, 'levels-pose-provenance.json'), JSON.stringify(manifest, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
