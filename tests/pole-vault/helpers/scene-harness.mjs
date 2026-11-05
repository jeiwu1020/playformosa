// Test-only Canvas/DOM boundary. Supply a native createCanvas for actual CPU PNGs;
// without one this still runs the real scene, projection and geometry pipeline.
export function sceneHost(width=900,height=600,nativeCanvas=null){
 const old={document:globalThis.document,ResizeObserver:globalThis.ResizeObserver,getComputedStyle:globalThis.getComputedStyle,devicePixelRatio:globalThis.devicePixelRatio};
 const create=(tag="canvas")=>{if(tag!=="canvas")return{style:{},dataset:{},children:[],setAttribute(){},appendChild(c){this.children.push(c);}};const canvas=nativeCanvas?nativeCanvas(1,1):{width:1,height:1,getContext:()=>new Proxy({measureText:s=>({width:s.length*8})},{get:(o,k)=>o[k]??(()=>{})})};canvas.texts=[];if(!nativeCanvas)canvas.getContext=()=>new Proxy({measureText:s=>({width:s.length*8}),clearRect:()=>canvas.texts.splice(0),fillText:text=>canvas.texts.push(text)},{get:(o,k)=>o[k]??(()=>{})});canvas.style={};canvas.setAttribute=()=>{};const get=canvas.getContext.bind(canvas);canvas.getContext=(kind,...args)=>kind==='webgl2'?null:get(kind,...args);return canvas;};
 globalThis.document={createElement:create};globalThis.ResizeObserver=class{observe(){}};globalThis.getComputedStyle=()=>({position:'relative'});globalThis.devicePixelRatio=1;
 const host={style:{},children:[],appendChild(c){this.children.push(c);},getBoundingClientRect(){return{width,height};}};
 return{host,resize(w,h){width=w;height=h;},restore(){Object.assign(globalThis,old);}};
}
