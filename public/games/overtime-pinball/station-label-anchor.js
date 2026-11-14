// These coordinates belong to the equipment, never to a UI layout or camera mode.
export function stationAnchor(station){return{x:-station.x,y:4.2*(station.visualScale||1),z:station.z};}
export function projectedAnchor(ndc,frame,height){return{x:frame.x+(ndc.x+1)*frame.w/2,y:height-frame.y-(ndc.y+1)*frame.h/2,inDepth:Number.isFinite(ndc.x)&&Number.isFinite(ndc.y)&&Number.isFinite(ndc.z)&&ndc.z>=-1&&ndc.z<=1};}
