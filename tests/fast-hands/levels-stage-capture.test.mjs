import test from 'node:test';import assert from 'node:assert/strict';import {createLevelStage} from '../../public/games/fast-hands/levels-stage.mjs';
test('capture forces a synchronous fresh render even at an already painted timestamp',()=>{
 let frames=0;const canvas={getBoundingClientRect:()=>({width:900,height:620}),addEventListener(){},removeEventListener(){}};
 const stage=createLevelStage(canvas,{mode:'catch',loadTextures:false,rendererFactory:()=>({setPixelRatio(){},setSize(){},render(){frames++;},dispose(){},shadowMap:{},info:{render:{}}})});
 const state={mode:'catch',phase:'idle',results:[],items:[]};assert.equal(stage.render(state,100),true);assert.equal(stage.render(state,100),false);assert.equal(stage.render(state,100,{force:true}),true);assert.equal(frames,2);stage.dispose();assert.equal(stage.render(state,100,{force:true}),false);
});
