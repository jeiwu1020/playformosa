import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import postcss from 'postcss';
import {mountLeaderboard} from '../../public/games/courtesy-contest/leaderboard.mjs';

for(const [width,height] of [[390,844],[844,390],[1366,768]])test(`departure clears both action shadows and replay restores them at ${width}×${height}`,t=>{
 const p=page(t,width,height),controls=p.document.getElementById('controls');
 const buttons=['offer','thanks'].map(id=>p.document.getElementById(id));
 for(let round=0;round<2;round++){
  controls.hidden=false;
  for(const button of buttons){
   button.disabled=false;
   assert.notEqual(p.style(button).boxShadow,'none','ready button keeps its tactile shadow');
   button.disabled=true;
   assert.equal(p.style(button).boxShadow,'none','disabled button leaves no colored shadow');
   assert.equal(p.style(button).transition,'none','shadow must not animate after hiding');
  }
  controls.hidden=true;
  assert.equal(p.style(controls).display,'none');
  for(const button of buttons){
   button.disabled=false; // Hiding must not depend on attribute-update ordering.
   assert.equal(p.style(button).boxShadow,'none','hidden container clears child shadow too');
   assert.equal(p.style(button).transition,'none');
  }
 }
});

const root=new URL('../../public/games/',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
function matchesMedia(query,width,height){
 return query.split(',').some(part=>[...part.matchAll(/\(([^)]+)\)/g)].every(([,condition])=>{
  const [name,value]=condition.split(':').map(v=>v.trim());
  if(name==='orientation')return value===(width>height?'landscape':'portrait');
  const size=name.match(/^(min|max)-(width|height)$/);
  if(!size)return false;
  const actual=size[2]==='width'?width:height;
  return size[1]==='min'?actual>=parseFloat(value):actual<=parseFloat(value);
 }));
}
function page(t,width,height){
 const dom=new JSDOM(read('courtesy-contest/index.html'),{url:'https://example.test/games/courtesy-contest/'}),{document}=dom.window;
 const result=document.getElementById('result');result.hidden=false;result.open=true;
 const board=mountLeaderboard({document,game:'courtesy-contest',result,resultActionContainer:document.getElementById('result-play'),resultUploadContainer:document.getElementById('result-upload'),enabled:true});
 board.setResult({phase:'done',seated:true,count:8,remaining:1.2});
 const app=document.getElementById('app');app.classList.remove('is-intro');
 document.getElementById('controls').hidden=false;
 const rules=[];
 for(const file of ['courtesy-contest/style.css','shared/game-ui.css','shared/entry-shell.css','shared/studio-brand.css','shared/leaderboard.css','courtesy-contest/platform.css']){
  const css=postcss.parse(read(file));
  css.walkAtRules('import',rule=>rule.remove());
  css.walkAtRules('media',rule=>{if(matchesMedia(rule.params,width,height))rule.replaceWith(...rule.nodes);else rule.remove();});
  css.walkRules(rule=>rules.push(rule));
  const style=document.createElement('style');style.textContent=css.toString();document.head.append(style);
 }
 t.after(()=>{board.destroy();dom.window.close();});
 const style=element=>dom.window.getComputedStyle(typeof element==='string'?document.querySelector(element):element);
 // JSDOM does not render pseudo-elements. Resolve the actual matching CSS
 // declarations for their appearance; browser geometry remains a separate QA step.
 const pseudo=(element,suffix)=>{
  const values={};
  for(const rule of rules)for(const selector of rule.selectors){
   if(!selector.endsWith(suffix)||!element.matches(selector.slice(0,-suffix.length)))continue;
   rule.walkDecls(decl=>values[decl.prop]=decl.value);
  }
  return values;
 };
 return {document,style,pseudo};
}

for(const [width,height] of [[1366,768],[1280,544],[844,390]])test(`upload disclosure at ${width}×${height} has a visible changing chevron and retains native toggling`,t=>{
 const p=page(t,width,height),summary=p.document.querySelector('#result-upload summary'),panel=summary.parentElement;
 const closed=p.pseudo(summary,'::after');
 assert.match(closed.content||'',/[›▸▶]/u,'the flex summary must supply a visible arrow');
 assert.equal(p.style(summary).cursor,'pointer');
 assert.equal(panel.open,false);summary.click();assert.equal(panel.open,true);
 assert.equal(p.pseudo(summary,'::after').transform,'rotate(90deg)');
 summary.click();assert.equal(panel.open,false);
});

test('ready image and copy actions show a hand cursor, but disabled actions do not',t=>{
 const p=page(t,1366,768);
 for(const id of ['share-image','share-copy']){
  const button=p.document.getElementById(id);button.disabled=false;
  assert.equal(p.style(button).cursor,'pointer',id+' is actionable');
  button.disabled=true;assert.notEqual(p.style(button).cursor,'pointer',id+' is disabled');
 }
});

for(const [width,height] of [[390,844],[375,667],[320,480]])test(`portrait ${width}×${height} centers the content without a fixed or clipped app height`,t=>{
 const p=page(t,width,height),app=p.style('#app');
 assert.equal(app.justifyContent,'center');
 assert.equal(app.height,'auto');
 assert.equal(app.minHeight,'100dvh');
 for(const element of ['html','body','#app']){
  assert.ok(!['hidden','clip'].includes(p.style(element).overflowY),element+' must allow short-screen scrolling');
 }
 assert.equal(p.style('.header-actions').gridRow,'1');
});

for(const [width,height] of [[844,390],[812,375],[667,375]])test(`landscape ${width}×${height} uses wider compact controls with an unbroken thanks label`,t=>{
 const p=page(t,width,height),app=p.style('#app');
 // The landscape width budget must no longer bottom out at the old 460px.
 const floor=app.maxWidth.match(/max\((\d+)px/);
 assert.ok(floor&&Number(floor[1])>=600,app.maxWidth);
 assert.equal(app.width,'100%');assert.equal(app.height,'auto');
 assert.equal(p.style('#thanks b').whiteSpace,'nowrap');
 assert.equal(p.style('#thanks .btn-icon').display,'none');
 assert.ok(parseFloat(p.style('#thanks').minHeight)>=44);
 assert.equal(p.style('.header-actions').gridRow,'1');
});

test('375px landscape reserves enough vertical space to keep button shadows on screen',t=>{
 const p=page(t,812,375),app=p.style('#app');
 // Browser measurement of the unchanged 600px scene, header and controls leaves
 // 24px for the app's top/bottom padding and its two inter-section gaps.
 const spacing=parseFloat(app.paddingTop)+parseFloat(app.paddingBottom)+2*parseFloat(app.gap);
 assert.ok(spacing<=24,`vertical app spacing uses ${spacing}px of its 24px budget`);
 assert.ok(parseFloat(p.style('#thanks').minHeight)>=44);
});


for(const [width,height] of [[390,844],[375,667],[320,480]])test(`portrait ${width}×${height} retains an inert controls spacer during departure and results`,t=>{
 const p=page(t,width,height),controls=p.document.getElementById('controls'),app=p.document.getElementById('app');
 controls.style.height='152px';controls.hidden=true;app.classList.add('is-departing');
 for(const result of [false,true]){
  app.classList.toggle('is-result',result);
  assert.equal(p.style(controls).display,'block');assert.equal(p.style(controls).height,'152px');assert.equal(p.style(controls).visibility,'hidden');assert.equal(p.style(controls).pointerEvents,'none');
 }
 app.classList.remove('is-departing');assert.equal(p.style(controls).display,'none','entry/non-departure hidden semantics remain unchanged');
});
