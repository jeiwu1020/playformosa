import{FREE_RULES,createFree,advanceFree,pauseFree,actionFree,freeVerdict}from'./free-climb.mjs';
export const RULES=Object.freeze({indoor:FREE_RULES});
export const createState=(_mode='indoor',now=0)=>createFree(now);
export const advance=advanceFree;export const action=actionFree;export const setPaused=pauseFree;export const verdict=freeVerdict;
