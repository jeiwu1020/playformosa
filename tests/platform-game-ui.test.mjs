import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const game of ['long-jump','hurdles','reaction-rod','beer-slide'])test(`${game} uses platform home/title and ordered real toolbar`,()=>{
 const html=read(`public/games/${game}/index.html`),header=html.match(/<header[\s\S]*?<\/header>/)?.[0]||'';
 assert.match(header,/<a[^>]*class="pf-home"[^>]*href="\/"[^>]*>首頁<\/a>/);
 assert.match(header,/class="pf-header"/);assert.match(header,/<h1/);assert.match(html,/\.\.\/shared\/game-ui.css/);
 assert.ok(header.indexOf('data-game-action="music"')<header.indexOf('data-game-action="restart"'));
 assert.ok(header.indexOf('data-game-action="restart"')<header.indexOf('data-game-action="pause"'));
 assert.match(header,/data-game-action="pause"/);assert.doesNotMatch(header,/#minigames/);
 const result=html.match(/class="[^"]*pf-share-actions[^"]*"[\s\S]*?<\/div>/)?.[0]||'';
 assert.ok(result.indexOf('data-share="threads"')<result.indexOf('data-share="image"'));
 assert.ok(result.indexOf('data-share="image"')<result.indexOf('data-share="copy"'));
});
test('shared controls use 44px targets and do not scale or crop the canvas',()=>{const path=new URL('../public/games/shared/game-ui.css',import.meta.url);assert.ok(existsSync(path),'shared stylesheet exists');const css=readFileSync(path,'utf8');assert.match(css,/min-height:\s*44px/);assert.match(css,/min-width:\s*44px/);assert.doesNotMatch(css,/canvas\s*\{[^}]*transform/);});
test('Beer result is outside stage and is a labeled viewport dialog',()=>{const html=read('public/games/beer-slide/index.html'),stage=html.slice(html.indexOf('<section id="stage"'),html.indexOf('</section>'));assert.doesNotMatch(stage,/id="result"/);assert.match(html,/<dialog id="result"[^>]*aria-labelledby="verdict"/);});
test('shared Rod header explicitly defeats legacy absolute floating-header and noninteractive HUD CSS',()=>{const css=read('public/games/shared/game-ui.css');assert.match(css,/\.pf-game \.pf-header\{[^}]*position:relative/);assert.match(css,/\.pf-game \.game-card \.topline\{[^}]*position:relative/);assert.match(css,/\.pf-game \.game-card \.topline\{[^}]*pointer-events:auto/);assert.match(css,/\.pf-game \.game-card\{[^}]*height:auto/);});
test('Long Jump audio live status participates in header layout instead of covering its mobile title',()=>{const html=read('public/games/long-jump/index.html'),header=html.match(/<header[\s\S]*?<\/header>/)?.[0]||'';assert.match(header,/id="sound-status"[^>]*pf-audio-status/);const css=read('public/games/shared/game-ui.css');assert.match(css,/\.pf-game \.pf-header \.pf-audio-status\{[^}]*position:static/);assert.match(css,/\.pf-game \.pf-header \.pf-audio-status\{[^}]*grid-column:1\/-1/);});
test('fallback dialogs are named and share viewport and 44px rules',()=>{for(const game of ['beer-slide','reaction-rod']){const html=read(`public/games/${game}/index.html`),ids=game==='beer-slide'?['platformCopyDialog','platformImageDialog']:['imageFallback','copyFallback'];for(const id of ids){const dialog=html.match(new RegExp('<dialog id="'+id+'"[^>]*>'))?.[0]||'';assert.match(dialog,/pf-result-dialog/);assert.match(dialog,/aria-labelledby="[^"]+"/);}}});
test('result dialogs keep safe horizontal insets in base and short-landscape rules',()=>{const css=read('public/games/shared/game-ui.css');const widths=[...css.matchAll(/\.pf-game \.pf-result-dialog\{([^}]+)/g)].map(m=>m[1]);assert.ok(widths.some(rule=>/inset:calc\(12px \+ env\(safe-area-inset-top\)\)/.test(rule)));for(const rule of widths)if(rule.includes('width:min')){assert.match(rule,/safe-area-inset-left/);assert.match(rule,/safe-area-inset-right/);}});
