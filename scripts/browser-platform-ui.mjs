// Opt-in local smoke check. No production debug hooks, altered clocks or game-state injection.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:8920';
const output=new URL('../evidence/platform-ui/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const report={checks:[],errors:[]};
try{
 for(const game of ['long-jump','hurdles','reaction-rod','beer-slide']){
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>report.errors.push({game,error:e.message}));await page.goto(`${base}/games/${game}/`);await page.waitForTimeout(800);
  for(const [w,h] of [[390,844],[844,390],[1366,768],[320,568],[683,384]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(250);
   const info=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return {home:rect(document.querySelector('.pf-home')),text:document.querySelector('.pf-home').textContent,toolbar:[...document.querySelectorAll('[data-game-action]')].map(e=>({action:e.dataset.gameAction,...rect(e)})),stage:rect(document.querySelector('.arena,#stage')),pageWidth:document.documentElement.scrollWidth,visibleWidth:innerWidth};});
   assert.equal(info.text,'← 遊戲首頁');assert.ok(info.home.x>=0&&info.home.right<=w);assert.equal(info.pageWidth,info.visibleWidth);for(const b of info.toolbar)assert.ok(b.width>=44&&b.height>=44&&b.right<=w&&b.bottom<=h,`${game} ${w} toolbar fit`);assert.ok(info.stage.width>0&&info.stage.height>0);report.checks.push({game,viewport:[w,h],...info});await page.screenshot({path:new URL(`${game}-${w}x${h}.png`,output).pathname});
  }
  if(game==='beer-slide'){
   await page.setViewportSize({width:390,height:844});await page.locator('#stage').focus();await page.keyboard.down('Space');await page.waitForTimeout(1100);await page.keyboard.up('Space');await page.waitForTimeout(300);
   await page.locator('#pause').click();const before=await page.locator('#stage').getAttribute('data-position');await page.waitForTimeout(500);assert.equal(await page.locator('#stage').getAttribute('data-position'),before);await page.locator('#resume').click();
   await page.locator('#result').waitFor({state:'visible',timeout:30000});await page.waitForFunction(()=>!document.getElementById('platformShare').disabled);
   let image=null;
   for(const [w,h] of [[390,844],[844,390],[320,568],[1366,768]]){
    await page.setViewportSize({width:w,height:h});await page.waitForTimeout(250);
    const data=await page.evaluate(()=>{const d=document.getElementById('result'),r=d.getBoundingClientRect(),photo=document.getElementById('resultPhoto');d.scrollTop=d.scrollHeight;return {rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,source:photo.src,imageWidth:photo.naturalWidth,score:document.getElementById('score').textContent,modal:d.matches(':modal')};});
    assert.ok(data.modal&&data.rect.x>=0&&data.rect.y>=0&&data.rect.right<=w&&data.rect.bottom<=h);assert.ok(data.imageWidth>1);image??=data.source;assert.equal(data.source,image,'rotation preserves this round image');report.checks.push({game,flow:'result',viewport:[w,h],...data,source:data.source.slice(0,40)});await page.screenshot({path:new URL(`beer-result-${w}x${h}.png`,output).pathname});
   }
   await page.locator('#retry').click();assert.ok(await page.locator('#result').isHidden());assert.equal(await page.locator('#stage').getAttribute('data-phase'),'ready');
  }
  await page.close();
 }
 assert.deepEqual(report.errors,[]);
}finally{await browser.close();await writeFile(new URL('browser-report.json',output),JSON.stringify(report,null,2));}
console.log(`${report.checks.length} local viewport checks passed. This is not native iOS/share-sheet acceptance.`);
