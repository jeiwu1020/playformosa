import test from 'node:test';import assert from 'node:assert/strict';
import{createInput,KEY_MAP}from'../../public/games/hurdles/input.mjs';
test('multitouch plus keyboard stays independent until each source releases',()=>{const i=createInput();i.pointer(1,2);i.pointer(2,3);i.key('KeyA',true);assert.deepEqual(i.values,[false,false,true,true]);i.pointer(1,null);assert.equal(i.values[2],true);i.key('KeyA',false);assert.equal(i.values[2],false);assert.equal(i.values[3],true);});
test('cancel and clear never retain held limbs',()=>{const i=createInput();i.pointer(4,0);assert.equal(i.endPointer(4,'pointercancel'),true);assert.deepEqual(i.values,[false,false,false,false]);i.key('KeyS',true);i.clear();assert.deepEqual(i.values,[false,false,false,false]);});
test('unmapped keys do not control runner',()=>{const i=createInput();assert.equal(i.key('Space',true),false);assert.deepEqual(i.values,[false,false,false,false]);});
