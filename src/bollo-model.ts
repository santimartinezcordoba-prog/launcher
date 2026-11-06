import * as THREE from 'three';
import type {AvatarLook} from './avatar';
export function makeBollo(look:AvatarLook){
 const root=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:look.body,flatShading:true,roughness:.85}),cloth=new THREE.MeshStandardMaterial({color:look.outfit,flatShading:true,roughness:.95}),hand=new THREE.MeshStandardMaterial({color:look.hands,flatShading:true}),shoe=new THREE.MeshStandardMaterial({color:look.shoes,flatShading:true}),white=new THREE.MeshStandardMaterial({color:'#fff1d1'}),dark=new THREE.MeshStandardMaterial({color:'#34271e'}),gold=new THREE.MeshStandardMaterial({color:'#dec16f',metalness:.4});
 const part=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,scale:[number,number,number]=[1,1,1])=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;root.add(mesh);return mesh;};
 part(new THREE.SphereGeometry(.72,12,9),body,0,.94,0,[1.05,1.12,.87]);part(new THREE.SphereGeometry(.66,12,8),cloth,0,.63,.03,[1.1,.78,1]);
 for(const side of [-1,1]){part(new THREE.BoxGeometry(.14,.7,.07),cloth,side*.43,1,.55);part(new THREE.BoxGeometry(.17,.13,.05),gold,side*.43,1,.60);part(new THREE.SphereGeometry(.22,8,6),body,side*.73,.9,0,[1,1.35,1]);part(new THREE.SphereGeometry(.25,8,6),hand,side*.89,.68,.16,[1,.95,.85]);part(new THREE.SphereGeometry(.13,8,6),hand,side*.72,.75,.33);part(new THREE.BoxGeometry(.35,.22,.48),shoe,side*.29,.12,.11);}
 part(new THREE.BoxGeometry(.48,.32,.06),cloth,0,.58,.66);
 for(const [i,side] of [-1,1].entries()){const y=1.38+(look.eyes==='wonky'?side*.1:side*.025);part(new THREE.SphereGeometry(.24,12,9),white,side*.245,y,.56);part(new THREE.SphereGeometry(.078,10,8),dark,side*.245+(look.eyes==='wonky'?side*.06:-.025),y-.01,.787);if(look.glasses){const ring=part(new THREE.TorusGeometry(.25,.025,6,22),dark,side*.245,y,.79);ring.rotation.z=i*.1;}}
 if(look.glasses)part(new THREE.BoxGeometry(.12,.025,.025),dark,0,1.38,.8);
 const mouth=part(new THREE.SphereGeometry(.09,10,8),dark,0,1.07,.63,[look.mouth==='smile'?1.8:1,look.mouth==='smile'?.65:1.3,.4]);if(look.mouth==='smile')part(new THREE.BoxGeometry(.14,.045,.025),white,0,1.09,.665);mouth.name='Boca';
 if(look.hat==='bucket'){part(new THREE.CylinderGeometry(.45,.57,.27,12),cloth,0,1.78,0);part(new THREE.CylinderGeometry(.72,.72,.045,14),cloth,0,1.65,0);}
 if(look.hat==='crown'){part(new THREE.CylinderGeometry(.51,.51,.16,12,1,true),gold,0,1.76,0);for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;part(new THREE.ConeGeometry(.12,.27,4),gold,Math.sin(angle)*.47,1.92,Math.cos(angle)*.47);}}
 if(look.style==='fideo'||look.style==='pepino'){root.scale.set(.68,1.45,.7);for(const child of root.children)if(child.position.y>1.25)child.position.y+=.14;}
 if(look.style==='cabezon'){const head=part(new THREE.BoxGeometry(1.5,.88,.95),body,0,1.35,0);head.rotation.z=-.13;root.scale.set(.85,.9,.85);for(const child of root.children)if(child!==head&&child.position.y>1.25)child.position.z+=.1;}
 root.name=look.style;return root;
}
export function makeBolloHands(look:AvatarLook){
 const root=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:look.hands,flatShading:true}),cloth=new THREE.MeshStandardMaterial({color:look.outfit,flatShading:true});
 for(const side of [-1,1]){const arm=new THREE.Group();arm.name=side===1?'right':'left';arm.position.set(side*.24,-.32,-.58);const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.10,.13,.42,8),cloth);sleeve.position.set(0,-.23,.09);sleeve.rotation.x=-.35;arm.add(sleeve);const palm=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),skin);palm.scale.set(1,.95,.75);arm.add(palm);const thumb=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),skin);thumb.position.set(-side*.1,.025,-.02);arm.add(thumb);root.add(arm);}
 return root;
}
export function disposeBollo(root:THREE.Object3D){const materials=new Set<THREE.Material>();root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});materials.forEach(m=>m.dispose());}
