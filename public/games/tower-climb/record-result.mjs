// Completion times and timeout distances are different records, never mixed scores.
export function improveIndoorRecord(record,state){const next={bestTime:record.bestTime??null,bestSteps:record.bestSteps??0};if(state.finished)next.bestTime=next.bestTime===null?state.time:Math.min(next.bestTime,state.time);else next.bestSteps=Math.max(next.bestSteps,state.progress);return next;}
