import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../../public/games/overtime-pinball/vendor/three.module.min.js';
import {buildCompanySign,COMPANY_POINTS} from '../../public/games/overtime-pinball/company-design.js';
import {StableRig,SLOPE} from '../../public/games/overtime-pinball/camera.js';
test('compact company sign retains exact name and original palette on two larger faces',()=>{const office=new T.Group(),labels=[],box=(w,h,d,c,g,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color:c}));m.position.set(x,y,z);g.add(m);return m;},cylinder=(r,h,c,g,x,y,z)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,h),new T.MeshBasicMaterial({color:c}));m.position.set(x,y,z);g.add(m);},label=(text,w,h,fg,bg)=>{labels.push({text,w,h,fg,bg});return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial());};const sign=buildCompanySign({T,office,box,cylinder,label});assert.equal(sign.position.z,-23.2);assert.equal(labels.length,2);for(const l of labels){assert.equal(l.text,'不准加班公司');assert.equal(l.w,20);assert.equal(l.h,2.65);assert.equal(l.fg,'#ffebad');assert.equal(l.bg,'#254c60');}});

// Space A intentionally removes this decoration from gameplay in both views.
// Geometry/name above remains covered for the opening cinematic.
