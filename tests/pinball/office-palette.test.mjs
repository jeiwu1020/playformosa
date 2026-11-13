import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
const root=new URL('../../public/games/overtime-pinball/',import.meta.url);
test('bright office A has one shared cream, turquoise and coral material palette',async()=>{
 assert.ok(existsSync(new URL('office-palette.js',root)),'shared bright office palette is absent');
 const {OFFICE_PALETTE:C,OFFICE_SURFACES:S}=await import(new URL('office-palette.js',root));
 assert.equal(C.cream,0xfff2d5);assert.equal(C.teal,0x079fa5);assert.equal(C.orange,0xff8154);assert.equal(C.yellow,0xffd044);
 assert.ok(Object.isFrozen(C));assert.ok(Object.isFrozen(S));
 const {DOOR}=await import(new URL('company-design.js',root));assert.equal(DOOR.navy,C.teal);assert.equal(DOOR.brass,C.yellow);
});
test('floor uses broad cream/mint bands and restrained grid without extra scene geometry',async()=>{
 assert.ok(existsSync(new URL('office-palette.js',root)),'shared bright office palette is absent');
 const {paintOfficeFloor}=await import(new URL('office-palette.js',root));
 const canvas=createCanvas(1024,1024),ctx=canvas.getContext('2d');paintOfficeFloor(ctx,1024,1024);
 const rgba=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
 assert.deepEqual(rgba(50,400),[255,242,213,255]);assert.deepEqual(rgba(50,100),[205,237,220,255]);assert.deepEqual(rgba(50,700),[205,237,220,255]);
 const main=readFileSync(new URL('main.js',root),'utf8');assert.match(main,/paintOfficeFloor\(ctx,tile.width,tile.height\)/);assert.match(main,/tex.repeat.set\(1,1\)/);assert.match(main,/OFFICE_PALETTE as C/);
});
test('main material presentation no longer contains the muddy old floor and surround',()=>{
 const main=readFileSync(new URL('main.js',root),'utf8');
 for(const old of ['#c8d0b7','#bfc9ae','0x577b78','0x92b4b0'])assert.ok(!main.includes(old),`old material remains: ${old}`);
});
