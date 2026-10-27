// An invented cartoon itinerary, NOT geographic distances or a travel simulation.
export const WORLD_LENGTH=720,CHUNK_SIZE=48;
export const REGIONS=Object.freeze([
 {id:'taiwan',name:'台灣',start:0,end:36,sky:'#bfe6df',ground:'#d9b880',accent:'#e66f40',cue:'台灣出發 · 四肢自行協調',landmark:'lantern'},
 {id:'sea',name:'太平洋',start:36,end:72,sky:'#b8e8f1',ground:'#51b5c1',accent:'#fff0b4',cue:'飛越太平洋 · 泳圈沒帶',landmark:'island'},
 {id:'japan',name:'日本',start:72,end:210,sky:'#efcddd',ground:'#d6bb9e',accent:'#cc4e58',cue:'日本到了 · 拉麵還是熱的',landmark:'torii'},
 {id:'egypt',name:'埃及',start:210,end:360,sky:'#f7d9a3',ground:'#e1b86d',accent:'#be733e',cue:'埃及到了 · 沙坑豪華升級',landmark:'pyramid'},
 {id:'france',name:'法國',start:360,end:510,sky:'#cddcf0',ground:'#c4c4a6',accent:'#637da3',cue:'法國到了 · 姿勢請優雅',landmark:'tower'},
 {id:'usa',name:'美國',start:510,end:720,sky:'#c2d5e9',ground:'#bdc6a6',accent:'#e39b4e',cue:'美國到了 · 下一站回台灣',landmark:'city'}
]);
export function regionAt(distance){const d=Math.max(0,Number.isFinite(distance)?distance:0),loop=Math.floor(d/WORLD_LENGTH),offset=d-loop*WORLD_LENGTH;return{...REGIONS.find(r=>offset>=r.start&&offset<r.end),loop,offset};}
export function chunkWindow(distance){const center=Math.floor(distance/CHUNK_SIZE);return Array.from({length:7},(_,i)=>{const index=center+i-2,start=index*CHUNK_SIZE;return{index,start,region:regionAt(Math.max(0,start+CHUNK_SIZE/2))};});}
export function windAt(distance){const a=distance/55;return{push:Math.sin(a)*.85,lift:.85+.55*Math.sin(a*.73+.4),nextPush:Math.sin((distance+18)/55)*.85};}
export function journeyLabel(distance){const r=regionAt(distance);return '台灣 → '+r.name+(r.loop?' · 已繞地球 '+r.loop+' 圈':'');}
