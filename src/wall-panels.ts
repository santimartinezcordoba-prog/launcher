import * as THREE from 'three';
const wallTexture='./textures/plaster-wall.webp';
/** One copy of the supplied panel fills each wall. */
export function wallPanelMaterial(){
 const texture=new THREE.TextureLoader().load(wallTexture);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.anisotropy=8;
 return new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.018,color:'#ffffff',roughness:.95});
}
/** Preserve the bedroom's existing wall geometry and window opening. */
export function applyBedroomWallPanels(root:THREE.Object3D,texture:THREE.Texture){
 root.updateWorldMatrix(true,true);texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const name=object.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/_/g,' ').toLowerCase();if(!name.startsWith('pared '))return;
  const geometry=object.geometry.clone(),positions=geometry.getAttribute('position');if(!positions)return;
  const side=name.includes('izquierda')||name.includes('derecha'),point=new THREE.Vector3(),uvs=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);uvs[i*2]=side?(point.z+3.6)/7.2:(point.x+3.45)/6.9;uvs[i*2+1]=Math.max(0,Math.min(1,point.y/3.05));}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));object.geometry=geometry;
  for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof THREE.MeshStandardMaterial){material.map=texture;material.bumpMap=texture;material.bumpScale=.018;material.color.set('#ffffff');material.roughness=.95;material.needsUpdate=true;}
 });
}

/** Raised timber around each wall gives the single panel physical depth. */
export function addWallRelief(scene:THREE.Scene,room:'bedroom'|'library'){
 const bedroom=room==='bedroom';
 const halfWidth=bedroom?3.3:5.15,front=bedroom?-3.54:-4.42,back=bedroom?3.48:5.82;
 const middleZ=(front+back)/2,depth=back-front,height=bedroom?3.0:4.8;
 const wood=new THREE.MeshStandardMaterial({color:'#683719',roughness:.78});
 const rail=(x:number,y:number,z:number,w:number,h:number,d:number)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wood);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='Moldura de pared';scene.add(mesh);};
 const top=height-.15;
 // Continuous upper cornice and small projecting lip create visible shadows.
 for(const z of bedroom?[front]:[front,back]){rail(0,top,z,halfWidth*2,.22,.13);rail(0,top-.12,z+.035,halfWidth*2,.035,.15);}
 for(const x of [-halfWidth,halfWidth]){rail(x,top,middleZ,.13,.22,depth);rail(x+(x<0?.035:-.035),top-.12,middleZ,.15,.035,depth);}
 // Divide the base rail around the connecting door.
 for(const side of [-1,1]){const from=side<0?-halfWidth:.86,to=side<0?-.56:halfWidth;rail((from+to)/2,.11,front,to-from,.20,.13);}
 if(!bedroom)for(const side of [-1,1]){const from=side<0?-halfWidth:.84,to=side<0?-.84:halfWidth;rail((from+to)/2,.11,back,to-from,.20,.13);}
 for(const x of [-halfWidth,halfWidth]){rail(x,.11,middleZ,.13,.20,depth);for(const z of [front+.08,back-.08])rail(x,height/2,z,.13,height-.22,.13);}
}
