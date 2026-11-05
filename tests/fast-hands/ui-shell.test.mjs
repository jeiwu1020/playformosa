import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

// UI element IDs are the boundary consumed by app.mjs. These tests catch
// detached dialog labels/actions, ambiguous IDs and missing interaction hooks.
const html = readFileSync(new URL('../../public/games/fast-hands/index.html', import.meta.url), 'utf8');
const tags = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)].map(([, name, source]) => {
  const attrs = Object.fromEntries([...source.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, key, value]) => [key, value ?? '']));
  return {name, ...attrs};
});
const byId = id => tags.find(tag => tag.id === id);

test('entry and result dialogs expose uniquely labelled, usable actions to the app', () => {
  const ids = tags.filter(tag => tag.id).map(tag => tag.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate IDs would detach app handlers');
  for (const id of ['entryDialog', 'resultDialog', 'info', 'rankingDialog']) {
    const dialog = byId(id);
    assert.equal(dialog?.name, 'dialog', `${id} must be a native modal dialog`);
    assert.ok(byId(dialog['aria-labelledby']), `${id} must have an accessible title`);
  }
  for (const id of ['entryStart', 'entryClose', 'resultAgain', 'resultDemo', 'resultDownload', 'resultUpload', 'resultClose', 'openMenu', 'viewResult', 'entryRanking', 'resultRanking', 'headerRanking', 'headerSettings', 'rankingClose', 'rankingReturn', 'rankingSubmit', 'rankingMouse', 'rankingTouch']) {
    assert.equal(byId(id)?.name, 'button', `${id} action must be keyboard-operable`);
    assert.equal(byId(id).type, 'button', `${id} must not submit a surrounding form`);
  }
  for (const id of ['resultTitle', 'resultTime', 'resultUnit', 'resultComment', 'resultBest', 'resultDelta', 'resultMode', 'currentMode']) {
    assert.ok(byId(id), `${id} is needed to expose current results`);
  }
  assert.ok('hidden' in byId('viewResult'), 'a result must not be offered before any result exists');
});

test('auto is the initial input setting while manual pointer modes remain available', () => {
  const mode = html.match(/<select\b[^>]*id="mode"[^>]*>([\s\S]*?)<\/select>/)?.[1];
  assert.ok(mode, 'settings must retain the input-mode select');
  const options = [...mode.matchAll(/<option\b[^>]*value="([^"]+)"[^>]*>/g)];
  assert.deepEqual(options.map(option => option[1]), ['auto', 'mouse', 'touch']);
  assert.match(options[0][0], /\bselected\b/, 'auto is the explicit initial selection');
});

test('the continuous gesture surface retains both labelled gates and local illustrated props', () => {
  assert.equal(byId('pad')?.role, 'application');
  for (const id of ['homeLabel', 'homeHint', 'farLabel', 'farHint', 'controlArrow', 'instruction', 'gestureHint', 'thumb']) assert.ok(byId(id), `${id} is needed for phase feedback`);
  for (const id of ['homeLabel', 'farLabel']) assert.notEqual(byId(id).name, 'button', 'targets are gates, never individual buttons');
  const props = tags.filter(tag => tag.name === 'img' && /control-(bill|duck)\.svg$/.test(tag.src ?? ''));
  assert.ok(props.length >= 2, 'both objects must be represented in the interaction surface');
  for (const prop of props) assert.ok(existsSync(new URL(`../../public/games/fast-hands/${prop.src}`, import.meta.url)), `${prop.src} must load locally`);
});

test('the UI retains original WebGL, offline-video and playable 2D renderer boundaries', () => {
  assert.equal(byId('scene3d')?.name, 'canvas');
  assert.equal(byId('scene')?.name, 'canvas');
  assert.equal(byId('demo3d')?.name, 'video');
  assert.equal(byId('demoSource')?.src, 'assets/front-demo.mp4');
  assert.ok(tags.some(tag => tag.class?.split(' ').includes('fallback-badge')), 'fallback mode must remain visibly labelled');
});


test('results reserve a current-round image without a stock portrait and announce download status', () => {
  const portrait = byId('resultPortrait');
  assert.equal(portrait?.name, 'img', 'the result card needs a real image element');
  assert.equal(portrait.src, undefined, 'do not show a stock image before the actual-round capture');
  assert.ok('hidden' in portrait, 'the placeholder is hidden until capture succeeds');
  assert.ok(portrait.alt?.trim(), 'the portrait must describe the character pose accessibly');
  assert.equal(byId('downloadStatus')?.['aria-live'], 'polite', 'download failures must be announced without a modal');
});

test('leaderboard upload starts disabled until a genuine success, with an accessible explanation', () => {
  const upload = byId('resultUpload');
  assert.ok(upload && 'disabled' in upload, 'a result must be captured before upload becomes available');
  const status = byId(upload['aria-describedby']);
  assert.equal(status?.id, 'leaderboardStatus', 'the unavailable upload action must identify its explanation');
  assert.ok(!('hidden' in status), 'the unavailable reason must be visible before interaction');
});

test('leaderboard has bounded scroll and explicit separate-mode accessible controls',()=>{
  assert.equal(byId('rankingMouse')?.['aria-pressed'],'true');
  assert.equal(byId('rankingTouch')?.['aria-pressed'],'false');
  assert.equal(byId('rankingConsent')?.type,'checkbox');
  assert.ok(tags.some(tag=>tag.role==='region'&&tag.class==='ranking-scroll'&&tag['aria-label']));
  assert.match(html,/暱稱與本次成績會公開顯示在測試榜/);
});
