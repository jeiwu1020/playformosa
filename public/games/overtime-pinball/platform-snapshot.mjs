import {PINBALL_RULESETS} from './ruleset.mjs';
// Current settled round only. No historical record/storage reads.
export const PINBALL_MODES=Object.freeze({60:'overtime-pinball-60s',180:'overtime-pinball-180s',0:'overtime-pinball-unlimited'});
export const PINBALL_RULES=PINBALL_RULESETS;
export function settledSnapshot(game){
 const r=game?.round,score=game?.score;
 if(game?.state!=='over'||!r||!Object.hasOwn(PINBALL_MODES,r.limit)||typeof r.limit!=='number'||r.reason!==(r.limit===0?'drain':'time')||!Number.isSafeInteger(score)||score<0||score>=Number.MAX_SAFE_INTEGER)return null;
 return Object.freeze({phase:'done',game:PINBALL_MODES[r.limit],ruleset:PINBALL_RULES[r.limit],limit:r.limit,reason:r.reason,score,status:'done'});
}
export function createSettlementLatch(){let settled=false;return {settle(game){if(settled)return null;const snapshot=settledSnapshot(game);if(snapshot)settled=true;return snapshot},reset(){settled=false}}}
