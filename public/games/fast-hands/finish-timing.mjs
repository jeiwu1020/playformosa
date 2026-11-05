// Presentation only. Never used by the scoring reducer or event clock.
export const FINISH_MOTION_MS=700;
export const FINISH_RESULT_DELAY_MS=900;
export function finishTimelineAge(age){
 const ms=Number.isFinite(age)?Math.max(0,age):0;
 return Math.min(1650,ms*1650/FINISH_MOTION_MS);
}
