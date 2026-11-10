import * as THREE from 'three';
/** Terracotta texture rendered from the supplied 3×3 model, repeated in real-world scale. */
export function tileFloor(width:number,depth:number,onLoad?:()=>void){
 const texture=new THREE.TextureLoader().load('./textures/terracotta-floor.webp',()=>onLoad?.());
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(width/1.2,depth/1.2);texture.anisotropy=8;
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:.88,metalness:0});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),material);floor.rotation.x=-Math.PI/2;floor.position.y=.008;floor.receiveShadow=true;floor.name='Suelo de baldosas';return floor;
}
