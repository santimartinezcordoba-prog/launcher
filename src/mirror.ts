import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
export function makeMirror(){
 const root=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:'#795c40',roughness:.8});
 const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wood);m.position.set(x,y,z);root.add(m);};
 const mirror=new Reflector(new THREE.PlaneGeometry(.9,1.8),{textureWidth:512,textureHeight:768,color:0xd7e2e0,clipBias:.003});mirror.name='FunctionalMirror';mirror.position.set(0,1.15,.03);root.add(mirror);
 for(const x of [-.5,.5])box(x,1.15,0,.1,2,.1);for(const y of [.2,2.1])box(0,y,0,1.1,.1,.1);box(0,.075,0,1.1,.15,.35);
 root.userData.dispose=()=>mirror.getRenderTarget().dispose();
 return root;
}
