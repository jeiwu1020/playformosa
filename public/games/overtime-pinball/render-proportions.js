// Render-only chair placement. Physics/dock coordinates and character scale stay unchanged.
// Character pelvis bottom is rootY - (.47 + .08 * 1.035), including its outline.
export function chairRenderPose(visualScale=1,stage='work',elapsed=0,dockDuration=.85,launchElapsed=0){
 const clamp=t=>Math.max(0,Math.min(1,t));
 const t=stage==='docking'?clamp(elapsed/Math.max(.001,dockDuration)):stage==='launch'?1-clamp(launchElapsed/.55):1;
 const weight=t*t*(3-2*t),seatTop=(1.1+.14/2)*1.6*visualScale;
 return {y:1.34+(seatTop+.5528-1.34)*weight,forward:.90*weight};
}
// Mount/dismount visuals converge to the unchanged standing root at both ends.
function contactHeight(target,stage,elapsed,dockDuration,launchElapsed){const clamp=t=>Math.max(0,Math.min(1,t)),t=stage==='docking'?clamp(elapsed/Math.max(.001,dockDuration)):stage==='launch'?1-clamp(launchElapsed/.55):1;return 1.34+(target-1.34)*t*t*(3-2*t);}
export function busyRenderHeight(visualScale=1,stage='work',elapsed=0,dockDuration=.85,launchElapsed=0){return contactHeight((1.82+.15/2)*visualScale+.5528,stage,elapsed,dockDuration,launchElapsed);}
// Measured visible shoe/sole minimum in the existing launcher pose (outline included).
export function launcherRenderHeight(elapsed=0,stage='work',dockDuration=.35,launchElapsed=0){return contactHeight(.49+Math.max(0,Math.min(1,elapsed/.35))*1.2+1.3676517959131398,stage,elapsed,dockDuration,launchElapsed);}
// Four small visible droplets join the real nozzle to the real upright cup rim.
// Reuse meshes/vectors; never place a water stream in unrelated hardcoded world coordinates.
export function updateWaterJet(jet,tap,cup){if(!jet||!tap||!cup)return;const points=jet.userData.waterContact||(jet.userData.waterContact={from:tap.position.clone(),to:cup.position.clone()});tap.updateWorldMatrix(true,false);cup.updateWorldMatrix(true,false);tap.localToWorld(points.from.set(0,0,-tap.geometry.parameters.depth/2));cup.localToWorld(points.to.set(0,.14,0));jet.scale.set(1,1,1);jet.updateWorldMatrix(true,false);for(let n=0;n<jet.children.length;n++){const drop=jet.children[n];drop.visible=n<4;if(n<4){drop.position.copy(points.from).lerp(points.to,n/3);jet.worldToLocal(drop.position);drop.scale.setScalar(.45);}}}
export function coffeeRenderHeight(stage='work',elapsed=0,dockDuration=.85,launchElapsed=0){return contactHeight(1.23,stage,elapsed,dockDuration,launchElapsed);}
// Flight foot animation can dip below its idle minimum. Clamp the rendered
// worker only when its shoe projection overlaps the actual raised surface.
// Paper stack is .9 x .65; the surrounding circular platform is lower.
export function keepLauncherFeetAboveSurface(person,platformRoot,lift=0){
 person.updateWorldMatrix(true,true);platformRoot.updateWorldMatrix(true,false);let correction=0;
 for(const side of ['left','right']){const shoe=person.getObjectByName(side+'Shoe');if(!shoe)continue;if(!shoe.geometry.boundingBox)shoe.geometry.computeBoundingBox();const b=shoe.geometry.boundingBox,v=shoe.position.clone();let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,minY=Infinity;
  for(const x of [b.min.x*1.035,b.max.x*1.035])for(const y of [b.min.y*1.035,b.max.y*1.035])for(const z of [b.min.z*1.035,b.max.z*1.035]){v.set(x,y,z).applyMatrix4(shoe.matrixWorld);platformRoot.worldToLocal(v);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minZ=Math.min(minZ,v.z);maxZ=Math.max(maxZ,v.z);minY=Math.min(minY,v.y);}
  const paper=minX<=.45&&maxX>=-.45&&minZ<=.325&&maxZ>=-.325,nearX=Math.max(minX,Math.min(0,maxX)),nearZ=Math.max(minZ,Math.min(0,maxZ)),disc=Math.hypot(nearX,nearZ)<=2.3;
  if(paper||disc)correction=Math.max(correction,(paper?.49:.22)+lift-minY);
 }
 // Platform and worker are both children of the same office, with unit Y scale.
 if(correction>0)person.position.y+=correction;return Math.max(0,correction);
}
// Coffee's work squat is grounded separately. Its mount/release use flight limbs,
// whose animated soles can dip below the table even at the normal standing root.
export function keepCoffeeFeetAboveFloor(person){person.updateWorldMatrix(true,true);let minY=0;for(const side of ['left','right']){const shoe=person.getObjectByName(side+'Shoe');if(!shoe)continue;if(!shoe.geometry.boundingBox)shoe.geometry.computeBoundingBox();const b=shoe.geometry.boundingBox,v=shoe.position.clone();for(const x of[b.min.x*1.035,b.max.x*1.035])for(const y of[b.min.y*1.035,b.max.y*1.035])for(const z of[b.min.z*1.035,b.max.z*1.035]){v.set(x,y,z).applyMatrix4(shoe.matrixWorld);person.parent?.worldToLocal(v);minY=Math.min(minY,v.y);}}if(minY<0)person.position.y-=minY;return -minY;}

export function busyRenderForward(stage='work',elapsed=0,dockDuration=.85,launchElapsed=0){return contactHeight(1.66,stage,elapsed,dockDuration,launchElapsed)-1.34;}
