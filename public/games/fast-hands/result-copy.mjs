import {NOTE_FLOOR_MS} from './challenge.mjs';

const validTime = value => Number.isFinite(value) && value > 0;
const seconds = ms => (ms / 1000).toFixed(3);

/** Pure presentation. The caller supplies both bests for the selected input mode. */
export function describeResult(state, {previousBest = null, best = null, mode = 'mouse', saveFailed = false} = {}) {
  const success = state?.phase === 'success' && validTime(state.elapsedMs);
  const currentBest = validTime(best) ? best : null;
  const oldBest = validTime(previousBest) ? previousBest : null;
  const elapsedMs = state?.elapsedMs;
  const newRecord = success && !saveFailed && currentBest === elapsedMs && (oldBest === null || elapsedMs < oldBest);
  let title = '這輪未完成';
  let comment = 'Round incomplete. Please try again.';
  let deltaText = '本輪不列入紀錄';

  if (success) {
    title = newRecord ? '刷新本機最佳！' : '挑戰成功！';
    // This threshold describes the game's falling-note deadline, not human ability.
    comment = newRecord ? '鴨還沒反應過來，你已經回來了。'
      : elapsedMs > NOTE_FLOOR_MS * .8 ? '壓線救援！鈔票差點先下班。'
      : '一手包辦，鈔鴨雙收。';

    if (saveFailed || currentBest === null) deltaText = '本輪完成，這次未能儲存本機紀錄。';
    else if (newRecord && oldBest === null) deltaText = '第一筆本機紀錄，下輪挑戰自己！';
    else if (newRecord) deltaText = `比上次最佳快 ${seconds(oldBest - elapsedMs)} 秒`;
    else if (elapsedMs > currentBest) deltaText = `比本機最佳慢 ${seconds(elapsedMs - currentBest)} 秒`;
    else if (elapsedMs === currentBest) deltaText = '追平本機最佳！';
    else deltaText = '本輪完成，本機最佳尚未更新。';
  } else if (state?.reason === 'note-floor') {
    title = '鈔票先下班了';
    comment = Number.isFinite(state.pickupAt)
      ? 'Time up. Return to bill zone not detected.'
      : 'Time up. No duck-zone entry detected.';
  } else if (state?.reason === 'released') {
    comment = Number.isFinite(state.pickupAt)
      ? 'Duck zone detected. Return to bill zone not detected.'
      : 'No duck-zone entry detected before release.';
  } else if (['pointercancel', 'lost-capture', 'lostpointercapture'].includes(state?.reason)) {
    comment = 'Input interrupted. Please try again.';
  } else if (['blur', 'hidden'].includes(state?.reason)) {
    comment = 'Game window inactive. Round interrupted.';
  } else if (state?.reason === 'resize') {
    comment = 'Screen size changed. Round interrupted.';
  } else if (['help', 'ranking', 'intro', 'settings', 'mode-change'].includes(state?.reason)) {
    comment = 'Menu opened or mode changed. Round interrupted.';
  }

  return {
    title,
    comment,
    timeText: success ? seconds(elapsedMs) : '未完成',
    bestText: currentBest === null ? '尚無紀錄' : `${seconds(currentBest)} 秒`,
    deltaText,
    modeText: mode === 'touch' ? '觸控' : '滑鼠',
    success,
    newRecord,
  };
}
