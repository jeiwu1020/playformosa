// Presentation-only helpers. Callers own the round clock, scoring, seat state,
// cancellation tokens and immediate interruption by Thanks or real threats.
const MOTIONS = [
  {level: 0, angle: 3, hop: 0, reach: .025},
  {level: 1, angle: 7, hop: 4, reach: .035},
  {level: 2, angle: 12, hop: 8, reach: .045},
  {level: 3, angle: 17, hop: 12, reach: .055}
];

function courtesyLevel(count) {
  const exchanges = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return exchanges >= 10 ? 3 : exchanges >= 7 ? 2 : exchanges >= 4 ? 1 : 0;
}

// angle: degrees; hop: unscaled sprite pixels; reach: fraction of scene width.
// No duration is returned: stronger motion must not lengthen input lockout.
export function courtesyMotion(count) {
  return {...MOTIONS[courtesyLevel(count)]};
}

// Count completed exchanges only. Initialize used and lastAt to zero each round.
// Check once after an exchange, not per frame; a skipped roll stays skipped.
export function canStartComicEvent(state) {
  if (!state) return false;
  const {count, remaining, busy, threat, used, lastAt} = state;
  return Number.isInteger(count) && count >= 3
    && Number.isFinite(remaining) && remaining >= 6
    && !busy && !threat
    && Number.isInteger(used) && used >= 0 && used < 2
    && Number.isInteger(lastAt) && lastAt >= 0 && count - lastAt >= 3;
}

// Caller supplies one [0,1) sample. Most eligible exchanges have no incident.
export function chooseComicEvent(random, last = null) {
  if (!Number.isFinite(random) || random < 0 || random >= .4) return null;
  const chosen = random < .2 ? 'fake-sit' : 'passenger-urge';
  if (chosen !== last) return chosen;
  return chosen === 'fake-sit' ? 'passenger-urge' : 'fake-sit';
}

const QUIPS = {
  courtesy: ['兩位都很有禮貌耶。', '這是讓座還是深蹲課？', '膝蓋也要講客氣？', '讓座讓出武林大會！'],
  'fake-sit': ['坐了？又沒坐！', '屁股也懂欲擒故縱？', '這招叫假坐真客氣！', '椅子：不要再晃點我！'],
  'passenger-urge': ['你們兩位，選一個坐啦！', '椅子都不好意思了！', '拜託，先讓膝蓋休息！', '這張椅子面子真大！']
};

export function passengerQuip(count, kind = 'courtesy') {
  const lines = Object.hasOwn(QUIPS, kind) ? QUIPS[kind] : QUIPS.courtesy;
  return lines[courtesyLevel(count)];
}
