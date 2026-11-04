import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Game } from './games';
import './room3d.css';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomAppearance } from './room-appearance';
import { placementSpots } from './placement';

export type RoomPreferences = { mood: 'warm'|'night'|'day'; wall: string; bedding: string; reduced: boolean };
type Props = {
  view: 'room'|'shelf'|'library'; ranked: Game[]; favorites: number[];
  prefs: RoomPreferences; equipped: string[]; placements:Record<string,string>; rotations:Record<string,number>; blocked: boolean;
  onShelf: () => void; onComputer: () => void; onTrophies: () => void;
  onGame: (game: Game) => void; onLibrary: () => void;
};
type Kind = 'shelf'|'computer'|'trophies'|'game';
type Hit = { kind: Kind; slot?: number };
type Slot = { mesh: THREE.Mesh; plane: THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>; bounds: THREE.Box3 };
const normalName = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/_/g,' ').toLowerCase();

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      materials.add(m);
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
}

function spineTexture(game: Game, favorite: boolean) {
  const canvas = document.createElement('canvas'); canvas.width=96; canvas.height=512;
  const c = canvas.getContext('2d')!;
  c.fillStyle=game.color; c.fillRect(0,0,96,512);
  const gradient=c.createLinearGradient(0,0,96,0);
  gradient.addColorStop(0,'#0009'); gradient.addColorStop(.25,'#ffffff15'); gradient.addColorStop(1,'#0006');
  c.fillStyle=gradient;c.fillRect(0,0,96,512);
  c.fillStyle='#152439';c.fillRect(0,0,96,48);c.fillStyle='#ddd';c.font='bold 23px sans-serif';c.textAlign='center';c.fillText('PC',48,33);
  c.save();c.translate(53,270);c.rotate(Math.PI/2);c.fillStyle='#fff2df';c.font='bold 25px sans-serif';c.fillText(game.title,0,0,380);c.restore();
  if(favorite){c.fillStyle='#f9d788';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const r=i%2?10:23;const x=48+Math.cos(a)*r,y=78+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();}
  c.fillStyle=game.installed?'#a5cfa4':'#676963';c.beginPath();c.arc(48,480,6,0,Math.PI*2);c.fill();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

// Small independent 3D inventory objects. No image layers are used in the room.
function proceduralCollectible(id: string) {
  const group=new THREE.Group();
  const body=new THREE.MeshStandardMaterial({color:id==='cat'?'#bd8154':id==='robot'?'#a4c5c3':'#9875cc',roughness:.65});
  const dark=new THREE.MeshStandardMaterial({color:'#17272d',roughness:.4});
  const part=(geometry:THREE.BufferGeometry,position:[number,number,number],material=body,scale?:[number,number,number])=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);if(scale)mesh.scale.set(...scale);mesh.castShadow=true;group.add(mesh);return mesh;
  };
  if(id==='crystal'){
    const gem=part(new THREE.OctahedronGeometry(.11),[0,.13,0]);gem.scale.set(.7,1.4,.7);body.metalness=.3;body.roughness=.22;
  }else if(id==='cat'){
    part(new THREE.SphereGeometry(.09,20,14),[0,.09,0],body,[1,1.05,.75]);
    part(new THREE.SphereGeometry(.085,20,14),[0,.22,0],body,[1,.8,.8]);
    for(const x of [-.055,.055])part(new THREE.ConeGeometry(.032,.075,12),[x,.295,0]);
    for(const x of [-.03,.03])part(new THREE.SphereGeometry(.007,10,8),[x,.23,.063],dark);
  }else{
    part(new THREE.BoxGeometry(.13,.12,.09),[0,.12,0]);part(new THREE.BoxGeometry(.17,.12,.11),[0,.25,0]);
    part(new THREE.BoxGeometry(.13,.045,.01),[0,.26,.06],dark);
    for(const x of [-.04,.04])part(new THREE.BoxGeometry(.045,.04,.075),[x,.03,.01],dark);
  }
  group.rotation.y=-Math.PI/2;
  return group;
}

class ContactOcclusion extends GTAOPass {
  setSize(width:number,height:number){super.setSize(Math.max(1,Math.floor(width*.6)),Math.max(1,Math.floor(height*.6)));}
}

class RoomEngine {
  scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer;
  camera = new THREE.PerspectiveCamera(53,1,.05,100);
  loader = new GLTFLoader();
  root?: THREE.Group;
  slots: Slot[]=[];
  walls: THREE.MeshStandardMaterial[]=[];
  bedding: THREE.MeshStandardMaterial[]=[];
  originalColors=new Map<THREE.Material,THREE.Color>();
  decorations = new Map<string,THREE.Group>();
  highlightKey='';
  outline?:OutlinePass;
  highlightOverlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  highlightPath=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  highlightBounds?:THREE.Box3;
  hoverTargets:{hit:Hit;bounds:THREE.Box3}[]=[];
  outlineTargets=new Map<Kind,THREE.Mesh[]>();
  pendingPointer?:{clientX:number;clientY:number};
  disposed=false; dirty=true; ready=false; frame=0; renderedFrames=0; transitionStart=0;
  startPosition=new THREE.Vector3();startQuaternion=new THREE.Quaternion();
  stateKey=''; decorationKey=''; currentView='';
  environment:THREE.Texture;
  appearance:RoomAppearance;
  composer?:EffectComposer;
  hemisphere=new THREE.HemisphereLight('#e5e4f2','#8a6848',1.15);
  sun=new THREE.DirectionalLight('#ffe0b7',2);
  raycaster=new THREE.Raycaster();
  pointer=new THREE.Vector2();
  roomPosition=new THREE.Vector3();roomQuaternion=new THREE.Quaternion();
  targetPosition=new THREE.Vector3();targetQuaternion=new THREE.Quaternion();
  resizeObserver:ResizeObserver;

  constructor(private host:HTMLDivElement,private read:()=>Props,private state:(value:string)=>void,private hover:(label:string)=>void) {
    for(const name of ['rendered','frame','slots','placed','motion'])delete this.host.dataset[name];
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.AgXToneMapping;this.renderer.toneMappingExposure=1;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label','Habitación 3D interactiva');
    this.host.appendChild(this.renderer.domElement);
    this.highlightOverlay.classList.add('interaction-outline');this.highlightOverlay.setAttribute('aria-hidden','true');
    this.highlightOverlay.appendChild(this.highlightPath);this.host.appendChild(this.highlightOverlay);
    this.scene.background=new THREE.Color('#191d21');
    const generator=new THREE.PMREMGenerator(this.renderer);const studio=new RoomEnvironment();
    this.environment=generator.fromScene(studio,.04).texture;this.scene.environment=this.environment;studio.dispose();generator.dispose();
    this.scene.add(this.hemisphere);this.sun.position.set(-2,5,3);this.sun.target.position.set(0,0,-1);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:15});
    this.sun.shadow.normalBias=.035;this.scene.add(this.sun,this.sun.target);
    this.appearance=new RoomAppearance(this.scene,this.renderer,this.hemisphere,this.sun);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.renderer.domElement.addEventListener('click',this.click);
    this.renderer.domElement.addEventListener('pointermove',this.move);
    this.renderer.domElement.addEventListener('pointerleave',this.leave);
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    this.loader.load('./models/room.glb',async gltf=>{
      if(this.disposed){disposeTree(gltf.scene);return;}
      this.root=gltf.scene;this.scene.add(this.root);this.root.traverse(o=>{const name=normalName(o.name);if(name.includes('lampara')||name.startsWith('pantalla lino')){o.position.x-=.10;o.position.z-=.11;}});this.root.updateMatrixWorld(true);
      const source=gltf.cameras[0] as THREE.PerspectiveCamera|undefined;
      if(!source){this.state('error');return;}
      source.getWorldPosition(this.roomPosition);source.getWorldQuaternion(this.roomQuaternion);
      this.roomPosition.set(-.45,1.68,4.6);const entrance=new THREE.PerspectiveCamera();entrance.position.copy(this.roomPosition);entrance.lookAt(.15,1.24,-1.6);this.roomQuaternion.copy(entrance.quaternion);
      this.camera.fov=source.fov;this.camera.position.copy(this.roomPosition);this.camera.quaternion.copy(this.roomQuaternion);this.camera.updateProjectionMatrix();
      const cases:THREE.Mesh[]=[];
      this.root.traverse(node=>{
        // glTF stores extras on a parent Group when a model has several materials.
        const asset=String(node.userData.source_asset??'').toLowerCase();
        if(asset==='trophy.fbx')node.userData.hit={kind:'trophies'};
        else if(asset.includes('gaming setup'))node.userData.hit={kind:'computer'};
        else if(asset==='cupboard_01.blend')node.userData.hit={kind:'shelf'};
        if(node instanceof THREE.Light) {node.intensity=0;node.castShadow=false;return;}
        if(!(node instanceof THREE.Mesh))return;
        const name=normalName(node.name);
        node.castShadow=!name.startsWith('lama de parquet');node.receiveShadow=true;
        if(name.startsWith('titulo /')||name.startsWith('titulo   ')||name.startsWith('titulo ')){node.visible=false;return;}
        const source=String(node.userData.source_asset??'').toLowerCase();
        if(typeof node.userData.game_id==='number'){node.userData.hit={kind:'game',slot:node.userData.game_id};cases.push(node);}
        else if(source==='trophy.fbx')node.userData.hit={kind:'trophies'};
        else if(source.includes('gaming setup'))node.userData.hit={kind:'computer'};
        else if(source==='cupboard_01.blend')node.userData.hit={kind:'shelf'};
        for(const material of Array.isArray(node.material)?node.material:[node.material]){
          if(!(material instanceof THREE.MeshStandardMaterial))continue;
          if(material.name.includes('Verde salvia')){if(!this.walls.includes(material))this.walls.push(material);}
          if(material.name.includes('Lino verde oliva')){if(!this.bedding.includes(material))this.bedding.push(material);}
          this.originalColors.set(material,material.color.clone());
          material.envMapIntensity=.5;
        }
      });
      await this.appearance.materials(this.root);
      if(this.disposed)return;
      cases.sort((a,b)=>a.userData.game_id-b.userData.game_id);
      for(const mesh of cases){
        const bounds=new THREE.Box3().setFromObject(mesh);const size=bounds.getSize(new THREE.Vector3());const center=bounds.getCenter(new THREE.Vector3());
        const material=new THREE.MeshStandardMaterial({roughness:.6});
        const plane=new THREE.Mesh(new THREE.PlaneGeometry(size.x*.94,size.y*.98),material);
        plane.position.set(center.x,center.y,bounds.max.z+.003);plane.userData.hit=mesh.userData.hit;this.scene.add(plane);
        this.slots.push({mesh,plane,bounds});
      }
      if(this.slots.length!==50){this.state('error');return;}
      this.root.traverse(node=>{
        if(!(node instanceof THREE.Mesh)||!normalName(node.name).startsWith('banda pc'))return;
        const center=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
        let best=0,distance=Infinity;
        this.slots.forEach((slot,i)=>{const d=slot.bounds.getCenter(new THREE.Vector3()).distanceToSquared(center);if(d<distance){distance=d;best=i;}});
        node.userData.hit={kind:'game',slot:best};
      });
      this.cacheInteractionTargets();
      this.mergeFloor();
      const floatingPoint=this.renderer.extensions.has('EXT_color_buffer_float');
      const target=new THREE.WebGLRenderTarget(1,1,{type:floatingPoint?THREE.HalfFloatType:THREE.UnsignedByteType});
      target.samples=2;
      this.composer=new EffectComposer(this.renderer,target);
      this.composer.addPass(new RenderPass(this.scene,this.camera));
      if(floatingPoint){
        const contact=new ContactOcclusion(this.scene,this.camera);contact.blendIntensity=.55;
        contact.updateGtaoMaterial({radius:.22,thickness:.25,samples:8,scale:1});contact.updatePdMaterial({samples:8,radius:4});
        this.composer.addPass(contact);
      }
      this.outline=new OutlinePass(new THREE.Vector2(this.host.clientWidth,this.host.clientHeight),this.scene,this.camera);
      this.outline.visibleEdgeColor.set('#ffe1a1');this.outline.hiddenEdgeColor.set('#000000');
      this.outline.edgeStrength=4;this.outline.edgeGlow=.5;this.outline.edgeThickness=1.5;
      this.outline.pulsePeriod=0;this.outline.enabled=false;
      this.composer.addPass(this.outline);this.composer.addPass(new OutputPass());
      this.composer.setSize(this.host.clientWidth,this.host.clientHeight);
      this.ready=true;this.apply();this.state('ready');this.dirty=true;
    },undefined,()=>{if(!this.disposed)this.state('error');});
    this.frame=requestAnimationFrame(this.tick);
  }

  mergeFloor(){
    const groups=new Map<string,THREE.Mesh[]>();
    this.root!.traverse(o=>{
      if(!(o instanceof THREE.Mesh)||!normalName(o.name).startsWith('lama de parquet'))return;
      const m=o.material as THREE.MeshStandardMaterial;
      const key=`${m.color.getHexString()}/${m.roughness}/${m.metalness}`;
      const list=groups.get(key)??[];list.push(o);groups.set(key,list);
    });
    const originals=[...groups.values()].flat();
    if(!originals.length)return;
    const sample=originals[0].material as THREE.MeshStandardMaterial;
    const grain=sample.map?.clone();if(grain){grain.repeat.set(1,.18);grain.needsUpdate=true;}
    const batches:THREE.BufferGeometry[][]=[[],[],[],[]];
    // Narrow boards with staggered joints, rather than a grid of square tiles.
    for(let row=0;row<48;row++){
      const offset=row%3*.37;
      for(let column=-1;column<7;column++){
        const left=Math.max(-3.3,-3.3+column*1.1+offset),right=Math.min(3.3,-3.3+(column+1)*1.1+offset);
        if(right-left<.01)continue;
        const geometry=new THREE.BoxGeometry(right-left-.002,.02,.148);
        geometry.translate((left+right)/2,-.0095,-3.6+(row+.5)*.15);
        batches[(row*7+column+5)%4].push(geometry);
      }
    }
    batches.forEach((parts,index)=>{
      const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)return;
      const material=sample.clone();material.map=grain??null;material.bumpMap=grain??null;material.color.multiplyScalar(.91+index*.045);
      const floor=new THREE.Mesh(geometry,material);floor.receiveShadow=true;floor.name='Parquet optimizado';this.scene.add(floor);
    });
    originals.forEach(o=>o.visible=false);
  }

  apply(){
    if(!this.ready)return;
    const p=this.read();
    const key=JSON.stringify([p.ranked.map(g=>g.id),p.favorites,p.prefs]);
    if(key!==this.stateKey){
      this.stateKey=key;
      for(let i=0;i<this.slots.length;i++){
        const slot=this.slots[i],game=p.ranked[i];
        slot.plane.material.map?.dispose();slot.plane.material.map=spineTexture(game,p.favorites.includes(game.id));slot.plane.material.needsUpdate=true;
        const material=slot.mesh.material as THREE.MeshStandardMaterial;material.color.set(game.color);
      }
      for(const m of this.walls)m.color.copy(p.prefs.wall==='original'?this.originalColors.get(m)!:new THREE.Color(p.prefs.wall));
      for(const m of this.bedding)m.color.copy(p.prefs.bedding==='original'?this.originalColors.get(m)!:new THREE.Color(p.prefs.bedding));
      this.appearance.mood(p.prefs.mood);
      this.host.dataset.wall=p.prefs.wall;this.host.dataset.bedding=p.prefs.bedding;this.host.dataset.mood=p.prefs.mood;
      this.dirty=true;
    }
    if(p.blocked)this.setHighlight();
    const decoKey=JSON.stringify([p.equipped,p.placements,p.rotations]);
    if(decoKey!==this.decorationKey){
      this.decorationKey=decoKey;
      for(const [id,object] of this.decorations){object.visible=p.equipped.includes(id);this.placeObject(id,object);}
      for(const [index,id] of ['cat','crystal','robot','duck','figure'].entries()){
        if(!p.equipped.includes(id)||this.decorations.has(id))continue;
        if(id==='duck'||id==='figure'){
          const placeholder=new THREE.Group();this.decorations.set(id,placeholder);
          this.loader.load(`./models/${id}.glb`,gltf=>{
            if(this.disposed){disposeTree(gltf.scene);return;}
            gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
            const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3());
            const pivot=new THREE.Group();gltf.scene.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));pivot.add(gltf.scene);
            this.placeObject(id,pivot);pivot.visible=this.read().equipped.includes(id);
            this.scene.add(pivot);this.decorations.set(id,pivot);this.renderer.shadowMap.needsUpdate=true;this.dirty=true;
          },undefined,()=>{if(!this.disposed){this.decorations.delete(id);this.hover('No se pudo cargar el objeto. Retíralo y vuelve a colocarlo.');}});
        }else{
          const object=proceduralCollectible(id);object.userData.baseRotation=object.rotation.y;this.placeObject(id,object);this.scene.add(object);this.decorations.set(id,object);
        }
      }
      this.host.dataset.equipped=decoKey;this.renderer.shadowMap.needsUpdate=true;this.dirty=true;
    }
  }

  placeObject(id:string,object:THREE.Group){
    const p=this.read();const index=p.equipped.indexOf(id);
    const spot=placementSpots.find(s=>s.id===p.placements[id])??placementSpots[Math.max(0,index)];
    object.position.set(...spot.position);object.rotation.y=(object.userData.baseRotation??0)+(p.rotations[id]??0)*Math.PI/180;
  }
  cacheInteractionTargets(){
    // Cache world bounds once, rather than tracing the imported high-poly furniture on every move.
    const grouped=new Map<Kind,THREE.Box3>();
    this.scene.traverse(node=>{
      if(!(node instanceof THREE.Mesh)||!node.visible)return;
      let current:THREE.Object3D|null=node,hit:Hit|undefined;
      while(current){if(current.userData.hit)hit=current.userData.hit as Hit;current=current.parent;}
      if(!hit||hit.kind==='game')return;
      const meshes=this.outlineTargets.get(hit.kind)??[];meshes.push(node);this.outlineTargets.set(hit.kind,meshes);
      const box=new THREE.Box3().setFromObject(node);
      if(hit.kind==='trophies')this.hoverTargets.push({hit,bounds:box});
      else {const bounds=grouped.get(hit.kind)??new THREE.Box3();bounds.union(box);grouped.set(hit.kind,bounds);}
    });
    for(const [kind,bounds] of grouped)this.hoverTargets.push({hit:{kind},bounds});
  }
  setHighlight(hit?:Hit){
    const kind=hit?.kind==='game'&&this.read().view==='room'?'shelf':hit?.kind;
    const key=kind?kind+(kind==='game'?hit?.slot:''):'';if(key===this.highlightKey)return;
    this.highlightKey=key;this.host.dataset.highlight=kind??'';
    this.highlightBounds=kind==='shelf'?this.hoverTargets.find(t=>t.hit.kind==='shelf')?.bounds:
      kind==='game'?this.slots[hit!.slot!]?.bounds:undefined;
    // A projected, straight-edged outline needs no scene render, lighting pass or mesh traversal.
    this.updateHighlightOverlay();
    if(this.outline){
      const selected=kind==='computer'||kind==='trophies'?this.outlineTargets.get(kind)??[]:[];
      const wasEnabled=this.outline.enabled;
      this.outline.selectedObjects=selected;this.outline.enabled=selected.length>0;
      if(wasEnabled||this.outline.enabled)this.dirty=true;
    }
  }
  hoverGame(slot?:number){this.pendingPointer=undefined;this.setHighlight(slot===undefined?undefined:{kind:'game',slot});}
  updateHighlightOverlay(){
    const box=this.highlightBounds;
    this.highlightOverlay.style.display=box?'block':'none';if(!box)return;
    const width=this.host.clientWidth,height=this.host.clientHeight;
    this.highlightOverlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const corners=[[box.min.x,box.min.y],[box.max.x,box.min.y],[box.max.x,box.max.y],[box.min.x,box.max.y]];
    this.highlightPath.setAttribute('points',corners.map(([x,y])=>{
      const v=new THREE.Vector3(x,y,box.max.z+.004).project(this.camera);
      return `${(v.x+1)*width/2},${(1-v.y)*height/2}`;
    }).join(' '));
  }
  hoverHit(event:{clientX:number;clientY:number}):Hit|undefined{
    if(!this.ready||this.read().blocked||this.read().view==='library')return;
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const point=new THREE.Vector3();let nearest=Infinity,result:Hit|undefined;
    if(this.read().view==='shelf'){
      for(let i=0;i<this.slots.length;i++){
        if(this.raycaster.ray.intersectBox(this.slots[i].bounds,point)){
          const d=point.distanceToSquared(this.raycaster.ray.origin);
          if(d<nearest){nearest=d;result={kind:'game',slot:i};}
        }
      }
      if(result)return result;
    }
    for(const target of this.hoverTargets){
      if(this.raycaster.ray.intersectBox(target.bounds,point)){
        const d=point.distanceToSquared(this.raycaster.ray.origin);
        // Cups sit inside the shelf's broad volume: their smaller bounds take priority.
        if(target.hit.kind==='trophies')return target.hit;
        if(d<nearest){nearest=d;result=target.hit;}
      }
    }
    return result;
  }
  resize(){
    const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;
    this.renderer.setSize(width,height);this.composer?.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.dirty=true;
  }
  hit(event:PointerEvent|MouseEvent):Hit|undefined{
    if(!this.ready||this.read().blocked||this.read().view==='library')return;
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const intersections=this.raycaster.intersectObjects(this.scene.children,true);
    for(const intersection of intersections){
      if(!(intersection.object instanceof THREE.Mesh))continue;
      let current:THREE.Object3D|null=intersection.object,visible=true,hit:Hit|undefined;
      while(current){if(!current.visible){visible=false;break;}if(current.userData.hit)hit=current.userData.hit as Hit;current=current.parent;}
      if(!visible)continue;
      if(hit)return hit;
      // Opaque geometry in front of an interactive object must block the click.
      return;
    }
  }
  click=(event:MouseEvent)=>{
    const hit=this.hit(event);if(!hit)return;const p=this.read();
    if(hit.kind==='game'){if(p.view==='shelf')p.onGame(p.ranked[hit.slot!]);else p.onShelf();}
    else if(hit.kind==='shelf')p.onShelf();else if(hit.kind==='computer')p.onComputer();else p.onTrophies();
  };
  move=(event:PointerEvent)=>{this.pendingPointer={clientX:event.clientX,clientY:event.clientY};};
  leave=()=>{this.pendingPointer=undefined;this.setHighlight();this.renderer.domElement.style.cursor='default';};
  contextLost=(event:Event)=>{event.preventDefault();this.ready=false;this.state('error');};

  project(element:HTMLElement,position:THREE.Vector3){
    const v=position.clone().project(this.camera);
    const w=this.host.clientWidth,h=this.host.clientHeight;
    element.style.left=`${(v.x+1)*w/2}px`;element.style.top=`${(1-v.y)*h/2}px`;
    element.style.visibility=v.z>1||v.z<0||Math.abs(v.x)>1||Math.abs(v.y)>1?'hidden':'visible';
  }
  anchors(){
    const anchors:[string,THREE.Vector3][]=[['shelf',new THREE.Vector3(.2,.1,-2.95)],['computer',new THREE.Vector3(2.7,.85,-1.85)],['trophies',new THREE.Vector3(.2,2.42,-3.2)]];
    for(const [id,point] of anchors){const el=this.host.parentElement?.querySelector<HTMLElement>(`[data-anchor="${id}"]`);if(el)this.project(el,point);}
    for(let i=0;i<this.slots.length;i++){
      const el=this.host.parentElement?.querySelector<HTMLElement>(`[data-slot="${i}"]`);if(!el)continue;
      const box=this.slots[i].bounds,center=box.getCenter(new THREE.Vector3());
      const a=box.min.clone().project(this.camera),b=box.max.clone().project(this.camera);
      this.project(el,center);el.style.width=`${Math.max(5,Math.abs(b.x-a.x)*this.host.clientWidth/2)}px`;
      el.style.height=`${Math.max(10,Math.abs(b.y-a.y)*this.host.clientHeight/2)}px`;
    }
  }
  tick=(time:number)=>{
    if(this.disposed)return;
    const p=this.read(),view=p.view==='shelf'?'shelf':'room';
    if(this.ready){
      if(this.pendingPointer){
        const hoverStart=performance.now();
        const hit=this.hoverHit(this.pendingPointer);this.pendingPointer=undefined;
        this.setHighlight(hit);this.renderer.domElement.style.cursor=hit?'pointer':'default';
        this.host.dataset.hoverMs=String(performance.now()-hoverStart);
      }
      if(this.currentView!==view){
        this.setHighlight();this.pendingPointer=undefined;
        this.currentView=view;this.startPosition.copy(this.camera.position);this.startQuaternion.copy(this.camera.quaternion);this.transitionStart=time;
        if(view==='shelf'){
          this.targetPosition.set(.2,1.42,-.55);const dummy=new THREE.PerspectiveCamera();dummy.position.copy(this.targetPosition);dummy.lookAt(.2,1.26,-3.2);this.targetQuaternion.copy(dummy.quaternion);
        }else{this.targetPosition.copy(this.roomPosition);this.targetQuaternion.copy(this.roomQuaternion);}
        this.dirty=true;
      }
      const moving=this.camera.position.distanceToSquared(this.targetPosition)>1e-6||this.camera.quaternion.angleTo(this.targetQuaternion)>.001;
      if(moving){
        const reduced=p.prefs.reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const progress=reduced?1:Math.min((time-this.transitionStart)/750,1),factor=1-Math.pow(1-progress,3);
        this.camera.position.lerpVectors(this.startPosition,this.targetPosition,factor);this.camera.quaternion.copy(this.startQuaternion).slerp(this.targetQuaternion,factor);this.dirty=true;
      }
      this.host.dataset.motion=this.camera.position.distanceToSquared(this.targetPosition)>1e-6||this.camera.quaternion.angleTo(this.targetQuaternion)>.001?'moving':'idle';
      if(this.dirty&&!document.hidden){
        this.camera.updateMatrixWorld();if(this.composer)this.composer.render();else this.renderer.render(this.scene,this.camera);this.anchors();this.updateHighlightOverlay();this.dirty=false;
        this.host.dataset.rendered='true';this.host.dataset.slots=String(this.slots.length);this.host.dataset.frame=String(++this.renderedFrames);
        this.host.dataset.positions=JSON.stringify(Object.fromEntries([...this.decorations].filter(([,o])=>o.visible).map(([id,o])=>[id,o.position.toArray()])));
        this.host.dataset.placed=[...this.decorations.entries()].filter(([,o])=>o.visible&&o.children.length>0).map(([id])=>id).join('|');
      }
    }
    this.frame=requestAnimationFrame(this.tick);
  };
  dispose(){
    this.setHighlight();this.disposed=true;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();
    const c=this.renderer.domElement;c.removeEventListener('click',this.click);c.removeEventListener('pointermove',this.move);c.removeEventListener('pointerleave',this.leave);c.removeEventListener('webglcontextlost',this.contextLost);
    for(const pass of this.composer?.passes??[])pass.dispose();this.composer?.dispose();disposeTree(this.scene);this.appearance.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();c.remove();this.highlightOverlay.remove();
  }
}

export function Room3D(props:Props){
  const host=useRef<HTMLDivElement>(null),engine=useRef<RoomEngine|null>(null),latest=useRef(props);latest.current=props;
  const [status,setStatus]=useState('loading'),[hover,setHover]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    setStatus('loading');
    try{engine.current=new RoomEngine(host.current!,()=>latest.current,setStatus,setHover);}catch{engine.current?.dispose();engine.current=null;setStatus('error');}
    return ()=>{engine.current?.dispose();engine.current=null;};
  },[retry]);
  useEffect(()=>{if(engine.current)engine.current.dirty=true;},[status,props.view]);
  useEffect(()=>{if(props.blocked)setHover('');},[props.blocked]);
  useEffect(()=>engine.current?.apply(),[props.ranked,props.favorites,props.prefs,props.equipped,props.placements,props.rotations,props.blocked]);
  return <div className="room-frame" inert={props.view==='library'} aria-hidden={props.view==='library'}>
    <div className="scene three-scene">
      <div ref={host} className="three-canvas" data-testid="room-3d" data-state={status}/>
      {status==='loading'&&<div className="room-load" role="status"><span className="load-orbit"/><strong>Preparando tu habitación</strong><p>Cargando los modelos 3D…</p></div>}
      {status==='error'&&<div className="room-load" role="alert"><strong>No se pudo abrir la habitación 3D</strong><p>Comprueba la aceleración gráfica del navegador y vuelve a intentarlo.</p><button className="primary-button" onClick={()=>setRetry(v=>v+1)}>Reintentar</button><button className="quiet-button" onClick={props.onLibrary}>Abrir biblioteca</button></div>}
      {status==='ready'&&props.view==='room'&&<nav className="room-object-actions keyboard-object-actions" aria-label="Objetos de la habitación">
        <button data-anchor="shelf" aria-label="Acercarse a la estantería" onClick={props.onShelf}>Explorar estantería <span>↗</span></button>
        <button data-anchor="computer" aria-label="Abrir ajustes desde el ordenador" onClick={props.onComputer}>Mi ordenador <span>↗</span></button>
        <button data-anchor="trophies" aria-label="Ver estantería de platinos" onClick={props.onTrophies}>Mis platinos <span>↗</span></button>
      </nav>}
      {status==='ready'&&props.view==='shelf'&&<nav className="three-game-actions" aria-label="Juegos de la estantería">{props.ranked.map((g,i)=><button key={i} className="case three-game-hit" data-slot={i} data-game-id={g.id} aria-label={`Ver ${g.title}`} title={g.title} onPointerEnter={()=>engine.current?.hoverGame(i)} onPointerLeave={()=>engine.current?.hoverGame()} onClick={()=>props.onGame(g)}><span className="sr-only">{g.title}</span></button>)}</nav>}

      <div className="equipped-status sr-only" aria-label="Objetos colocados">{props.equipped.map(id=><span className={`placed-${id}`} key={id}>{id}</span>)}</div>
    </div>
  </div>;
}
