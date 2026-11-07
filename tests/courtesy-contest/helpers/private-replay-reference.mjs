// Test-only historical pure-rule oracle. Not shipped or connected to private data.
import {createEscalatingThreatPlan,isEscalatingThreatPlan,createPressureThreatPlan,isPressureThreatPlan,threatEligible,threatTimingAt} from '../../../public/games/courtesy-contest/threat-plan.js';

/** Server-side replay of bounded action traces. This is validation, not proof of human input. */
export const ROUND_MS = 30_000;
export const RUN_TTL_MS = 2 * 60 * 60 * 1000;
export const MAX_EVENTS = 256;
const OFFER_MS = 970;
const SEAT_MS = 300;
const TYPES = new Set(['offer', 'complete', 'thanks', 'seated', 'repel', 'pause', 'resume']);

export class LeaderboardError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const invalid = () => { throw new LeaderboardError('invalid_run'); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, max = RUN_TTL_MS) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const keysExactly = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function validateFinishBody(body) {
  if (!keysExactly(body, ['runId', 'events', 'finishedAtMs', 'wallElapsedMs', 'reason']) ||
      typeof body.runId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.runId) ||
      !integer(body.finishedAtMs) || !integer(body.wallElapsedMs) ||
      !['thanks', 'timer'].includes(body.reason) || !Array.isArray(body.events) ||
      body.events.length === 0 || body.events.length > MAX_EVENTS) invalid();
  for (const event of body.events) {
    if (!plain(event) || !TYPES.has(event.type) || !integer(event.atMs, ROUND_MS - 1) ||
        !integer(event.wallMs) || !keysExactly(event, event.type === 'complete'
          ? ['type', 'atMs', 'wallMs', 'seated'] : ['type', 'atMs', 'wallMs']) ||
        (event.type === 'complete' && typeof event.seated !== 'boolean')) invalid();
  }
  return body;
}

function randomInt(max) {
  // Rejection sampling keeps each role/side draw unbiased.
  const ceiling = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= ceiling);
  return value[0] % max;
}
function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createRunPlan(rulesVersion = 11) {
  if (rulesVersion === 11) return createPressureThreatPlan(() => randomInt(0x100000000) / 0x100000000);
  if (rulesVersion === 10) return createEscalatingThreatPlan(() => randomInt(0x100000000) / 0x100000000);
  if (rulesVersion !== 9) invalid();
  const speeds = shuffled([1000, 2000, 3000]), roles = shuffled([0, 1, 2]);
  return [4, 10, 18].map((afterCount, i) => ({afterCount, type: roles[i], travelMs: speeds[i], side: randomInt(2) ? 1 : -1}));
}
function validatePlan(plan) {
  // Existing signed-in v9 rounds and upload retries keep their original rules.
  if (isEscalatingThreatPlan(plan) || isPressureThreatPlan(plan)) {
    if (!plan.every(item => keysExactly(item, ['afterCount', 'type', 'travelMs', 'side']))) invalid();
    return;
  }
  if (!Array.isArray(plan) || plan.length !== 3) invalid();
  for (let i = 0; i < 3; i++) {
    const item = plan[i];
    if (!keysExactly(item, ['afterCount', 'type', 'travelMs', 'side']) ||
        item.afterCount !== [4, 10, 18][i] || ![0, 1, 2].includes(item.type) ||
        ![1000, 2000, 3000].includes(item.travelMs) || ![-1, 1].includes(item.side)) invalid();
  }
  if (new Set(plan.map(item => item.type)).size !== 3 || new Set(plan.map(item => item.travelMs)).size !== 3) invalid();
}

export function replayRun(body, plan) {
  validateFinishBody(body);
  validatePlan(plan);
  const pressureThreats = isPressureThreatPlan(plan);
  const persistentThreats = pressureThreats || isEscalatingThreatPlan(plan);
  let completedCount = 0;
  let pendingOffer = null;
  let thanksAt = null;
  let seatSettledAtMs = null;
  let threatExpires = null;
  let planIndex = 0;
  let previousAt = 0;
  let previousWall = 0;
  let paused = false;
  let pauseCount = 0;
  let done = false;

  for (const event of body.events) {
    const activeDelta = event.atMs - previousAt;
    const wallDelta = event.wallMs - previousWall;
    if (activeDelta < 0 || wallDelta < 0 || done) invalid();
    if (paused ? activeDelta !== 0 : Math.abs(activeDelta - wallDelta) > 2) invalid();
    // Threats keep their full active-time warning/travel duration across pauses.
    if (threatExpires !== null && event.atMs >= threatExpires) {
      if (persistentThreats && seatSettledAtMs !== null && pendingOffer === null) threatExpires = null;
      else invalid();
    }
    if (paused && event.type !== 'resume') invalid();
    previousAt = event.atMs;
    previousWall = event.wallMs;
    if (event.type === 'pause') {
      if (paused || ++pauseCount > 32) invalid();
      paused = true;
      continue;
    }
    if (event.type === 'resume') {
      if (!paused) invalid();
      paused = false;
      continue;
    }
    if (thanksAt !== null && event.type !== 'seated') invalid();
    switch (event.type) {
      case 'offer': {
        if (pendingOffer !== null) invalid();
        pendingOffer = event.atMs;
        seatSettledAtMs = null;
        // A plan item is consumed only when eligible; at most one threat per offer.
        while (threatExpires === null && planIndex < plan.length && threatEligible(plan[planIndex], completedCount, event.atMs, pressureThreats)) {
          const next = plan[planIndex++];
          const timing = threatTimingAt(next, event.atMs, pressureThreats);
          if (ROUND_MS - event.atMs >= timing.windupMs + timing.travelMs + 500) {
            threatExpires = event.atMs + timing.windupMs + timing.travelMs;
          }
        }
        break;
      }
      case 'complete':
        if (pendingOffer === null || event.atMs - pendingOffer < OFFER_MS) invalid();
        pendingOffer = null;
        completedCount++;
        if (completedCount >= 8 && event.seated) {
          seatSettledAtMs = event.atMs;
          if (!persistentThreats) threatExpires = null;
        }
        break;
      case 'repel':
        if (threatExpires === null) invalid();
        threatExpires = null;
        break;
      case 'thanks':
        thanksAt = event.atMs;
        pendingOffer = null;
        seatSettledAtMs = null;
        threatExpires = null;
        break;
      case 'seated':
        if (thanksAt === null || event.atMs - thanksAt < SEAT_MS) invalid();
        seatSettledAtMs = event.atMs;
        done = true;
        break;
      default: invalid();
    }
  }
  if (persistentThreats && threatExpires !== null && body.finishedAtMs >= threatExpires &&
      seatSettledAtMs !== null && pendingOffer === null) threatExpires = null;
  const finishDelta = body.finishedAtMs - previousAt;
  const finishWallDelta = body.wallElapsedMs - previousWall;
  const badFinishClock = body.reason === 'timer'
    ? finishWallDelta < finishDelta - 2
    : Math.abs(finishDelta - finishWallDelta) > 2;
  if (paused || finishDelta < 0 || finishWallDelta < 0 || badFinishClock ||
      seatSettledAtMs === null || pendingOffer !== null || threatExpires !== null) invalid();
  if (body.reason === 'thanks') {
    if (!done || thanksAt === null || body.finishedAtMs >= ROUND_MS || finishDelta > 2) invalid();
  } else if (thanksAt !== null || completedCount < 8 || body.finishedAtMs !== ROUND_MS) invalid();
  return {
    completedCount,
    remainingCs: Math.ceil((ROUND_MS - seatSettledAtMs) / 10),
    seatSettledAtMs,
  };
}
