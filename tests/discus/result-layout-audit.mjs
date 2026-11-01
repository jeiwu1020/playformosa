// Source-based CSS + font geometry audit, NOT a browser layout engine or screenshot.
// Uses the real linked stylesheet order. JSDOM only supplies DOM/selector/focus APIs.
import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const dependencyRoot=process.env.PF_QA_DEPENDENCIES || new URL('../package.json',import.meta.url);
const require=createRequire(dependencyRoot);
const postcss=require('postcss'), {JSDOM}=require('jsdom'), {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
if(existsSync(font))GlobalFonts.registerFromPath(font,'Result QA');
const boldFont='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';
if(existsSync(boldFont))GlobalFonts.registerFromPath(boldFont,'Result QA');
const context=createCanvas(1,1).getContext('2d');
const dist=new URL('../../public/games/discus/',import.meta.url);
export const html=readFileSync(new URL('index.html',dist),'utf8');
export const dom=new JSDOM(html), doc=dom.window.document;
export const styles=[...doc.querySelectorAll('link[rel="stylesheet"]')].map(link=>({file:link.getAttribute('href'),css:readFileSync(new URL(link.getAttribute('href'),dist),'utf8')}));
export function split(value,separator=','){
 let depth=0,last=0,parts=[];
 for(let i=0;i<value.length;i++){if(value[i]==='(')depth++;if(value[i]===')')depth--;if(value[i]===separator&&!depth){parts.push(value.slice(last,i));last=i+1;}}
 return [...parts,value.slice(last)].map(part=>part.trim()).filter(Boolean);
}
const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
export function specificity(selector){
 let counts=[0,0,0],s=selector;
 for(const name of ['is','not','has','where']){
  let start;
  while((start=s.indexOf(':'+name+'('))>=0){let end=start+name.length+2,depth=1;while(depth&&end<s.length){if(s[end]==='(')depth++;if(s[end]===')')depth--;end++;}
   const inner=split(s.slice(start+name.length+2,end-1)).map(specificity).sort(compare).at(-1)||[0,0,0];
   if(name!=='where')counts=counts.map((count,i)=>count+inner[i]);
   s=s.slice(0,start)+s.slice(end);
  }
 }
 counts[0]+=(s.match(/#[\w-]+/g)||[]).length;
 counts[1]+=(s.match(/\.[\w-]+|\[[^\]]+\]|(?<!:):(?!:)[\w-]+(?:\([^)]*\))?/g)||[]).length;
 const types=s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|(?<!:):(?!:)[\w-]+(?:\([^)]*\))?/g,'').match(/[a-zA-Z][\w-]*/g)||[];
 counts[2]+=types.length;return counts;
}
export function mediaMatches(query,w,h){
 return split(query).some(part=>[...part.matchAll(/\(([^:]+):\s*([^)]*)\)/g)].every(([,property,value])=>{
  property=property.trim();value=value.trim();const size=/^([\d.]+)(px|rem|em)$/.exec(value),n=size?+size[1]*(size[2]==='px'?1:16):NaN;
  if(property==='orientation')return value===(w>h?'landscape':'portrait');
  if(property==='max-width')return w<=n;if(property==='min-width')return w>=n;
  if(property==='max-height')return h<=n;if(property==='min-height')return h>=n;
  throw Error('Unsupported media query in source audit: '+property);
 }));
}
function expand(property,value){
 const out=[[property,value]];
 if(['margin','padding','inset','border-width'].includes(property)){
  const p=split(value,' '),sides=[p[0],p[1]??p[0],p[2]??p[0],p[3]??p[1]??p[0]];
  ['top','right','bottom','left'].forEach((side,i)=>out.push([property==='inset'?side:property==='border-width'?`border-${side}-width`:`${property}-${side}`,sides[i]]));
 }
 if(property==='border'&&/^\d/.test(value))out.push(...expand('border-width',value.split(' ')[0]));
 return out;
}
export function winners(element,w,h,sheets=styles){
 const win={};let order=0;
 for(const {file,css} of sheets)postcss.parse(css).walkRules(rule=>{
  for(let parent=rule.parent;parent;parent=parent.parent)if(parent.type==='atrule'&&parent.name==='media'&&!mediaMatches(parent.params,w,h))return;
  for(const selector of split(rule.selector)){
   if(selector.includes('::')||!element.matches(selector))continue;
   const sp=specificity(selector);
   for(const declaration of rule.nodes.filter(node=>node.type==='decl')){
    // Boolean conversion is intentional: Number(undefined) would poison every rank with NaN.
    const rank=[Number(Boolean(declaration.important)),...sp,++order];
    for(const [property,value] of expand(declaration.prop,declaration.value))if(!win[property]||compare(rank,win[property].rank)>=0)win[property]={value,selector,file,rank};
   }
  }
 });
 return win;
}
export function cascade(fragment,selector,sheets,w=1280,h=720){return winners(new JSDOM(fragment).window.document.querySelector(selector),w,h,sheets);}
export function length(value,{w,h,rem=16,safe={},percent=0,em=rem}){
 if(value===undefined||value==='none'||value==='auto')throw Error('Missing/unbounded geometry length '+value);
 const normalized=value.replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,(_,side)=>String(safe[side]||0))
  .replace(/([\d.]+)(rem|em|dvh|svh|vh|vw|px|%)/g,(_,n,unit)=>String(+n*({rem,em,dvh:h/100,svh:h/100,vh:h/100,vw:w/100,px:1,'%':percent/100}[unit])))
  .replace(/\bcalc\(/g,'(').replace(/\bmin\(/g,'Math.min(').replace(/\bmax\(/g,'Math.max(').replace(/\bclamp\(/g,'clamp(');
 if(!/^[\d\s.+*/(),A-Za-z-]+$/.test(normalized))throw Error('Unsupported length: '+value);
 const n=Function('clamp','return '+normalized)((min,value,max)=>Math.max(min,Math.min(value,max)));
 if(!Number.isFinite(n))throw Error('Non-finite length: '+value);return n;
}
// This installed canvas parser misreads CSS weight 750 as a font size. Round up
// to a supported 100-step weight; browsers still use the unchanged real CSS 750.
const metric=({fontSize,weight=400})=>{const supportedWeight=Math.max(100,Math.min(900,Math.ceil(weight/100)*100));context.font=`${supportedWeight} ${fontSize}px "Result QA", "Noto Sans CJK TC", sans-serif`;};
export function textLines(text,width,fontSize,weight=400){
 metric({fontSize,weight});let lines=1,line='';
 // Character wrapping is appropriate for the Chinese copy; a small safety multiplier
 // allows font substitution/word boundaries. This is still an estimate, not browser proof.
 for(const char of text){if(char==='\n'){lines++;line='';continue;}if(line&&context.measureText(line+char).width*1.15>width){lines++;line=char;}else line+=char;}
 return text?lines:0;
}
export const isShot=Boolean(doc.getElementById('resultScore'));
export const ids=isShot?{title:'resultTitle',score:'resultScore',image:'resultImage',status:'shareStatus',details:'comparison',fallback:'manual'}:{title:'result-title',score:'result-score',image:'result-image',status:'share-status',details:'details',fallback:'fallback'};
export const viewports=[[1280,720],[1366,768],[1440,900],[1024,768],[390,844],[320,568],[844,390],[683,384]];
export function audit(w,h,{rem=16,safe={},detailsOpen=false,sceneAspect=16/9}={}){
 const env={w,h,rem,safe},result=doc.getElementById('result'),get=selector=>typeof selector==='string'?doc.querySelector(selector):selector;
 const all=new Map();const css=selector=>{const el=get(selector);if(!all.has(el))all.set(el,winners(el,w,h));return all.get(el);};
 const val=(el,key,fallback)=>css(el)[key]?.value??fallback;
 const px=(el,key,fallback)=>length(val(el,key,fallback),{...env,em:length(val(el,'font-size','1rem'),env)});
 const box=(el,axis)=>['padding','border'].reduce((sum,kind)=>sum+(axis==='x'?['left','right']:['top','bottom']).reduce((n,side)=>n+px(el,kind==='padding'?`padding-${side}`:`border-${side}-width`,'0px'),0),0);
 const dialogWidth=px(result,'width'),inner=dialogWidth-box(result,'x');
 const layout=doc.querySelector('.throw-result__layout');if(!layout)throw Error('Missing desktop result layout');
 const columns=val(layout,'grid-template-columns'),twoColumns=columns==='minmax(0,1.08fr) minmax(0,1fr)',gap=px(layout,'gap');
 const reportWidth=twoColumns?(inner-gap)/2.08:inner,photoWidth=twoColumns?(inner-gap)*1.08/2.08:inner;
 const report=doc.querySelector('.throw-result__report'),reportGap=px(report,'gap');
 const fontSize=el=>px(el,'font-size','1rem');
 const lineHeight=el=>{const value=val(el,'line-height','1.5');return /^[\d.]+$/.test(value)?+value*fontSize(el):length(value,{...env,em:fontSize(el)});};
 const height=(el,text,width=reportWidth)=>textLines(text,width-box(el,'x'),fontSize(el),Number(val(el,'font-weight','400'))||400)*lineHeight(el)+box(el,'y');
 const fixture=isShot?{
  title:'地板按摩師',score:'120.00 m',verdict:'腳：你先走，我們還沒上班。',status:'本次落地畫面已固定；旋轉螢幕與重播不會換圖。',details:'支撐腳與出手未同步，力氣多半送給地板。 實際落點 120.00 m · 約 10.0 輛公車長'
 }:{title:'餅走後門，人留原地。',score:'界外 · 999.9 m',verdict:'鐵餅回頭找你：晚放手，後門取餐！',status:'Threads 圖片需手動附加；不含私人原型網址。',details:'風力滑翔 · 有效蹬地 12 次 · 約 99.9 條百米跑道 · 冷氣順風車 → 熱氣流電梯 → 路面打水漂 → 飛碟認親現場 · 氣流散場，快轉看落地 · 腳掌已踩出投擲圈，不計正式分數'};
 const title=get('#'+ids.title),score=get('#'+ids.score),verdict=get('#verdict'),details=get('.throw-result__details'),summary=details?.querySelector('summary');
 const summaryHeight=summary?Math.max(px(summary,'min-height'),height(summary,summary.textContent,reportWidth-20)):0;
 const detailHeight=details?summaryHeight+(detailsOpen?height(get('#'+ids.details),fixture.details):0)+box(details,'y'):0;
 function buttons(selector){
  const group=get(selector),columns=Number((val(group,'grid-template-columns').match(/repeat\((\d+)/)||[])[1]||1),gap=px(group,'gap'),width=(reportWidth-gap*(columns-1))/columns;
  const heights=[...group.children].map(el=>Math.max(px(el,'min-height','44px'),height(el,el.textContent,width)));
  const rows=[];for(let i=0;i<heights.length;i+=columns)rows.push(Math.max(...heights.slice(i,i+columns)));
  return {width,height:rows.reduce((a,b)=>a+b,0)+gap*(rows.length-1),heights,columns,rows,gap};
 }
 const play=buttons('.throw-result__play'),share=buttons('.pf-share-actions');
 const status=get('#'+ids.status),note=get('.throw-result__note');
 const pieces=[height(title,fixture.title),height(score,fixture.score),height(verdict,fixture.verdict),...(details?[detailHeight]:[]),play.height,share.height,Math.max(px(status,'min-height','0px'),height(status,fixture.status)),height(note,note.textContent)];
 const reportHeight=pieces.reduce((a,b)=>a+b,0)+reportGap*(pieces.length-1);
 const photo=get('.throw-result__photo'),img=get('#'+ids.image),caption=photo.querySelector('figcaption');
 const imageWidth=photoWidth-box(photo,'x'),imageHeight=Math.min(imageWidth*(isShot?1150/1080:1/sceneAspect),px(img,'max-height'));
 const photoHeight=imageHeight+(caption?height(caption,caption.textContent,imageWidth)+px(caption,'margin-top','0px'):0)+box(photo,'y');
 const top=get('.throw-result__top'),topChildren=[...top.children],topLabelWidth=96,topHeight=Math.max(height(topChildren[0],topChildren[0].textContent,inner-topLabelWidth-12),height(topChildren[1],topChildren[1].textContent,topLabelWidth))+px(top,'margin-bottom','0px');
 const estimatedHeight=box(result,'y')+topHeight+(twoColumns?Math.max(reportHeight,photoHeight):reportHeight+gap+photoHeight);
 const maxHeight=px(result,'max-height');
 return {viewport:[w,h],rem,safe,twoColumns,dialogWidth,inner,reportWidth,photoWidth,imageHeight,reportHeight,photoHeight,estimatedHeight,maxHeight,estimatedScroll:estimatedHeight>maxHeight,play,share,pieces,winners:Object.fromEntries(['width','max-height','padding','overflow'].map(key=>[key,css(result)[key]]))};
}
if(process.argv[1]?.endsWith('result-layout-audit.mjs'))console.log(JSON.stringify({evidence:'SOURCE/FONT ESTIMATE ONLY — no browser rendering',results:viewports.map(([w,h])=>audit(w,h))},null,2));
