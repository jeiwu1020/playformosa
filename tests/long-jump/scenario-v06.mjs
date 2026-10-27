// Compatibility adapter for shared model tests. Policies feed four real keys only.
import{trial,rhythm as fourRhythm}from'./v8-scenarios.mjs';
export const rhythm=fourRhythm;
export function simulate({air='coord',onStep=()=>{},...options}={}){return trial({...options,air:air==='coord'?'pilot':air,flightSeconds:16,maxSeconds:35,onStep});}
