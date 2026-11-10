import * as THREE from 'three';
const wallTexture='./textures/plaster-wall.webp';
/** The supplied wall panel rendered once and repeated across the wall. */
export function wallPanelMaterial(width:number){
 const texture=new THREE.TextureLoader().load(wallTexture);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.repeat.set(width/1.55,1);texture.anisotropy=8;
 return new THREE.MeshStandardMaterial({map:texture,color:'#ffffff',roughness:.95});
}
/** Preserve the bedroom's existing wall geometry and window opening. */
export function applyBedroomWallPanels(root:THREE.Object3D,texture:THREE.Texture){
 root.updateWorldMatrix(true,true);texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const name=object.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/_/g,' ').toLowerCase();if(!name.startsWith('pared '))return;
  const geometry=object.geometry.clone(),positions=geometry.getAttribute('position');if(!positions)return;
  const side=name.includes('izquierda')||name.includes('derecha'),point=new THREE.Vector3(),uvs=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);uvs[i*2]=(side?point.z:point.x)/1.55;uvs[i*2+1]=Math.max(0,Math.min(1,point.y/3.05));}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));object.geometry=geometry;
  for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof THREE.MeshStandardMaterial){material.map=texture;material.color.set('#ffffff');material.roughness=.95;material.needsUpdate=true;}
 });
}
