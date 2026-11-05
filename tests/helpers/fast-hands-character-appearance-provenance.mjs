import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {CHARACTER_APPEARANCE_PARENT as parent} from './fast-hands-character-appearance-pins.mjs';

const root=new URL('../../',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
// These reviewed output pins are separate from the immutable published parent pins.
// BEGIN SEALED CHARACTER APPEARANCE CURRENT
const CURRENT=freeze({
  "public/games/fast-hands/assets/front-demo-poster.png": "c0104163dc5ab7714b0ff9304ccd918bbf2d2ff7682a8f46e58f424e90bde526",
  "public/games/fast-hands/assets/front-demo.mp4": "3685b4b61fcd5bc9ef157d8c14f0492be82c3316e9d22c162330a0c67aeece8e",
  "public/games/fast-hands/assets/levels-catch-empty-mid.png": "6dd016f5ca7d9bf85d2e3f1b8f030294f4194b984babe6886f02d60592af26a6",
  "public/games/fast-hands/assets/levels-catch-grab.png": "4c05569a2779eece80709d3e4ad700966b0e0f0572c2a4b32de754168186bf18",
  "public/games/fast-hands/assets/levels-catch-guns.png": "71521c7727d0076a1c8f3ef68e55f8cd4f10cbbe3cc8af6911de4b531934c99e",
  "public/games/fast-hands/assets/levels-catch-place.png": "b605b4a94b2e81f724d929646567a64b20c788c8265459117c67370997ae787f",
  "public/games/fast-hands/assets/levels-catch-reach.png": "c6f971b732aaeb471479302ed57c564c47ff007a4ca8ac2b20a1cc1b16e9a084",
  "public/games/fast-hands/assets/levels-catch-ready.png": "77e3df3afb5c39315541cfc462118ad8a6be9f8b2baaaed0951752667a870874",
  "public/games/fast-hands/assets/levels-catch-return-mid.png": "4d143c7d3a518e0bd7a1c898344ca5572255706ce21d7c084ba8079bd2c81cf8",
  "public/games/fast-hands/assets/levels-catch-return.png": "84aa9497df8d79e0265a5b27178e731087b5fdbee639257d45916e000bf239be",
  "public/games/fast-hands/assets/levels-duel-ai-grab.png": "fbfbcb66da2051294ce63fa3d9ad30a8c7aad93dc9b31c7b1ad8208705fe1d41",
  "public/games/fast-hands/assets/levels-duel-ai-guns.png": "6d884b953eb67a0ab1414fa5c579fc18ddce0d05c08d500ac761f4cb60e2e450",
  "public/games/fast-hands/assets/levels-duel-ai-place.png": "a1c7848fd3cd72bc33ec38783cf956fb60cf67be87dd4bb62a7f6cb6ae5f4bae",
  "public/games/fast-hands/assets/levels-duel-ai-reach.png": "faaef734348022e3f98b6d50bd648e1a744f5017bfddb59dbcba1e21dce07dee",
  "public/games/fast-hands/assets/levels-duel-ai-return-mid.png": "6346651a289500c3927adf513727188f45000a5f8726baf9e5572877bb735566",
  "public/games/fast-hands/assets/levels-duel-ai.png": "14699fbcd8555f1705fda30112bf3f16d0ab1b346059a11f9342383577299adb",
  "public/games/fast-hands/assets/levels-duel-neutral.png": "e7b05d43d5ef1e70c7f75f864a1b207675ae9192d81414959888d489efcf9b33",
  "public/games/fast-hands/assets/levels-duel-player-grab.png": "fbf6db998cb0afdcc7531060400b642a327a7b9c15de94053f98bee7a974d7c8",
  "public/games/fast-hands/assets/levels-duel-player-guns.png": "9526d951548a9b00e81d6706c1beffe344d4c5de477d8b4de64021ce2a348bca",
  "public/games/fast-hands/assets/levels-duel-player-place.png": "6931f94f9a10dc9cad9888ef4ccdd40be5ae15c2c3d6b68f8bae2dd6e003d752",
  "public/games/fast-hands/assets/levels-duel-player-reach.png": "2320ba92803d212a6bfbe51571fcb2d68123c18b251e03ee9ad4e461d0addfc9",
  "public/games/fast-hands/assets/levels-duel-player-return-mid.png": "d3c02c261daae07eb1c15ba3515055da611d9069be9fd8ee7b521b4569a39cda",
  "public/games/fast-hands/assets/levels-duel-player.png": "62c67b8276fa1d06bb43b5e3f987132b299c5b1f418a038d16d1b684f0ec153d",
  "public/games/fast-hands/assets/levels-duel-ready.png": "70a3d1af359b5bd512a6f62f074fc8db4932181761c592ac5160a7d8030f6793",
  "public/games/fast-hands/assets/levels-pose-provenance.json": "a5d791c2a10252f56486e07399784f4222f541dc06a24149009120064f24a68a",
  "public/games/fast-hands/levels-world.mjs": "9c82434b96e262fb408b3afab992c27eb93098041481185f226e5cb036a18202",
  "public/games/fast-hands/three3d/rig.mjs": "a6af9981af6b8e96bdc02e3cadaf0328bd5f57dbec27d577046d3432642ead97",
  "public/games/fast-hands/three3d/world.mjs": "68100484adca41bd76e87dc20c203dd92a440e7e22098d80daf41e9515db9aa5",
  "tests/fast-hands/eyes-3d.test.mjs": "f7857776349baa0849016e23d8efbf7571450143fe5e3b6d6aa641bba0b08143",
  "tests/fast-hands/platform-integration.test.mjs": "73797306e931762219fe18327516618112a2281fbf00e64ee4629d41a5e6ccf8"
});
// END SEALED CHARACTER APPEARANCE CURRENT
export const CHARACTER_APPEARANCE_PATHS=Object.freeze(Object.keys(parent.files));
export const CHARACTER_APPEARANCE_TEST_ADAPTERS=Object.freeze(Object.keys(parent.testAdapters));
const rows=pins=>Object.entries(pins).map(([path,pin])=>({path,baseGitBlob:pin.gitBlob,beforeSha256:pin.sha256,beforeAsset:'docs/fast-hands/baselines/character-appearance/'+path,sha256:CURRENT[path]}));
const EXPECTED=freeze({schemaVersion:1,baseCommit:parent.baseCommit,baseTree:parent.baseTree,files:rows(parent.files),testAdapters:rows(parent.testAdapters),preserved:Object.entries(parent.preserved).map(([path,pin])=>({path,gitBlob:pin.gitBlob})),history:Object.entries(parent.history).map(([path,pin])=>({path,gitBlob:pin.gitBlob}))});

export function validateCharacterAppearanceLedger(ledger){
 assert.deepEqual(ledger,EXPECTED,'Pinned character appearance manifest, inventory, preimages and digests');
 return ledger;
}
export const characterAppearanceLedger=()=>validateCharacterAppearanceLedger(JSON.parse(readFileSync(new URL('docs/fast-hands/CHARACTER-APPEARANCE-MANIFEST.json',root),'utf8')));
function rowFor(path,ledger){return [...ledger.files,...ledger.testAdapters].find(row=>row.path===path)}
function validateParent(row,bytes){
 assert.equal(sha(bytes),row.beforeSha256,'Restored character appearance bytes '+row.path);
 assert.equal(blob(bytes),row.baseGitBlob,'Restored character appearance parent Git blob '+row.path);
 return Buffer.from(bytes);
}

/** Strict current gate: only the exact reviewed final files may claim this revision. */
export function assertCharacterAppearanceCurrent(path,bytes,ledger=characterAppearanceLedger()){
 validateCharacterAppearanceLedger(ledger);
 const row=rowFor(path,ledger);assert.ok(row,'Unapproved character appearance path '+path);
 const current=Buffer.from(bytes);
 assert.equal(sha(current),row.sha256,'Character appearance current bytes '+path);
 validateParent(row,readFileSync(new URL(row.beforeAsset,root)));
 return current;
}

/** Historical gate: accept exact reviewed current bytes or exact published parent bytes. */
export function reverseCharacterAppearance(path,bytes,ledger=characterAppearanceLedger()){
 validateCharacterAppearanceLedger(ledger);
 const row=rowFor(path,ledger),current=reverseDuelCoverFingers(path,bytes);
 if(!row)return current;
 if(sha(current)===row.beforeSha256)return validateParent(row,current);
 assertCharacterAppearanceCurrent(path,current,ledger);
 return validateParent(row,readFileSync(new URL(row.beforeAsset,root)));
}

// The later cover-only repair is reversed before historical character gates.
// Existing character pins and manifests remain immutable published history.
const DUEL_COVER_PATH='public/games/fast-hands/assets/intro-duel-generated.webp';
const DUEL_COVER_BEFORE='8b5c6b7d62d35d4f4b7f9bc9e9c14299a53ff32885c011b0f0a0ff1da4581979';
const DUEL_COVER_CURRENT='c3d7a570dbecf10b6d99a40f4d98a823a1a86f32727c5c39a98cbe938c15765d';
function duelCoverPreimage(){
 const before=readFileSync(new URL('docs/fast-hands/baselines/duel-cover-fingers/'+DUEL_COVER_PATH,root));
 assert.equal(sha(before),DUEL_COVER_BEFORE,'Restored duel cover fingers bytes');
 assert.equal(blob(before),'2e84ea583b5e758264fece8729d461bdcf4cda0c','Restored duel cover fingers Git blob');
 return Buffer.from(before);
}
export function assertDuelCoverFingersCurrent(path,bytes){
 assert.equal(path,DUEL_COVER_PATH,'Unapproved duel cover path');
 const current=Buffer.from(bytes);
 assert.equal(sha(current),DUEL_COVER_CURRENT,'Duel cover fingers current bytes '+path);
 duelCoverPreimage();return current;
}
export function reverseDuelCoverFingers(path,bytes){
 const current=Buffer.from(bytes);
 if(path!==DUEL_COVER_PATH)return current;
 if(sha(current)===DUEL_COVER_BEFORE)return duelCoverPreimage();
 assertDuelCoverFingersCurrent(path,current);return duelCoverPreimage();
}
