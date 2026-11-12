export const LEGAL=.65,CIRCLE_RADIUS=2;
// The visible landing sector and adjudication share the fixed throwing-circle origin.
export function outsideLandingSector(p){return !Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x<0||Math.abs(Math.atan2(p.z,p.x))>LEGAL;}
