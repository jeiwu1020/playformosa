import {OFFICE_SURFACES} from './office-palette.js';
import {stableWindow} from './office-features.js';
// Waist-high fixed office glazing, not an actor-dependent cutaway. Keep the
// original side-wall footprints and leave mail mouths open in both views.
export function buildOfficePartitions({T,office,box,C,stableWindows=true}){
 const meshes=[];
 for(const x of [-18.3,18.3])for(const[z,len]of[[6,52],[43,14]]){
  meshes.push(stableWindow(box(.6,.65,len,C.teal,office,x,.325,z),1,stableWindows));
  meshes.push(stableWindow(box(.7,.12,len,C.cream,office,x,.71,z),1,stableWindows));
 }
 for(const x of [-18.3,18.3])for(let z=-18;z<45;z+=12){
  meshes.push(stableWindow(box(.5,1.4,.6,C.cream,office,x,.7,z),1,stableWindows));
  const glass=box(.18,.9,z===30?4:9,OFFICE_SURFACES.glass,office,x,.85,z===30?38.3:z+5.8);
  glass.material=new T.MeshBasicMaterial({color:OFFICE_SURFACES.glass});meshes.push(stableWindow(glass,.28,stableWindows));
  for(const zz of [z+2,z+6,z+10].filter(v=>v<32||v>=36))meshes.push(stableWindow(box(.25,.95,.14,C.teal,office,x+(x>0?-.15:.15),.85,zz),1,stableWindows));
 }
 return meshes;
}
