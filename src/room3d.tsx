import { useEffect, useRef, useState } from 'react';
import { GameArt } from './game-art';
import { BookOpen } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Game } from './games';
import './room3d.css';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomAppearance } from './room-appearance';
import { furniture, snapPlacement, surfaceArea, moveSupportedItems, placementError, surfaceNames, type Arrangement, type Surface } from './arrangement';
import { silhouette } from './silhouette';
import { loadArtwork, type Artwork } from './artwork';
import type { EditSession } from './room-editor';

export type RoomPreferences = { mood: 'warm'|'night'|'day'; wall: string; bedding: string; reduced: boolean };
type Props = {
  view: 'room'|'shelf'|'library'; ranked: Game[]; favorites: number[];
  prefs: RoomPreferences; equipped: string[]; arranged:Record<string,Arrangement>; editor:EditSession|null; blocked: boolean;
  onPick:(position:Arrangement|undefined)=>void;onSurface:(surface:Surface)=>void;
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

function spineTexture(game: Game, favorite: boolean,art?:Artwork) {
  const canvas = document.createElement('canvas'); canvas.width=192; canvas.height=1024;
  const c = canvas.getContext('2d')!;c.scale(2,2);c.imageSmoothingQuality='high';
  // A printed paper insert inside a dark plastic case, inspired by physical PC boxes.
  c.fillStyle='#25282b';c.fillRect(0,0,96,512);
  if(art){
    const aw='naturalWidth' in art?art.naturalWidth:art.width,ah='naturalHeight' in art?art.naturalHeight:art.height;
    const scale=Math.max(26/aw,416/ah),w=aw*scale,h=ah*scale;
    c.save();c.beginPath();c.rect(67,50,26,416);c.clip();c.drawImage(art,67+(26-w)/2,50+(416-h)/2,w,h);c.restore();
  }else{c.fillStyle=game.color;c.fillRect(78,50,15,416);}
  const edge=c.createLinearGradient(0,0,96,0);edge.addColorStop(0,'#0008');edge.addColorStop(.12,'#0001');edge.addColorStop(.8,'#fff1');edge.addColorStop(1,'#0008');c.fillStyle=edge;c.fillRect(0,0,96,512);
  c.fillStyle='#172d4f';c.fillRect(0,0,96,48);c.fillStyle='#f1f4f6';c.font='bold 22px sans-serif';c.textAlign='center';c.fillText('PC',48,32);
  c.save();c.translate(45,259);c.rotate(Math.PI/2);c.fillStyle='#f0eee6';c.font='bold 27px sans-serif';c.fillText(game.title.toLocaleUpperCase(),0,0,372);c.restore();
  c.fillStyle='#172d4f';c.fillRect(0,474,96,38);
  if(favorite){c.fillStyle='#e9c47b';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const r=i%2?5:10;const x=79+Math.cos(a)*r,y=23+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
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
  if(id==='plant'){
    body.color.set('#b68a6c');part(new THREE.CylinderGeometry(.19,.14,.32,20),[0,.16,0]);
    const green=new THREE.MeshStandardMaterial({color:'#6f8c53',roughness:.85});
    for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;const leaf=part(new THREE.SphereGeometry(.16,12,8),[Math.cos(angle)*.13,.5+(i%3)*.15,Math.sin(angle)*.13],green,[.55,1.8,.35]);leaf.rotation.z=Math.cos(angle)*.5;}
  }else if(id==='table'||id==='stool'){
    body.color.set('#b8976b');const w=id==='table'?.85:.5,d=id==='table'?.6:.5,h=id==='table'?.65:.46;
    part(new THREE.BoxGeometry(w,.08,d),[0,h,0]);
    for(const x of [-w*.36,w*.36])for(const z of [-d*.34,d*.34])part(new THREE.BoxGeometry(.055,h,.055),[x,h/2,z]);
  }else if(id==='crystal'){
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
  group.rotation.y=furniture[id]?0:-Math.PI/2;
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
  computerMeshes:THREE.Mesh[]=[];
  computerOutline=document.createElementNS('http://www.w3.org/2000/svg','image');
  computerMaskKey='';
  spineKey='';spineGeneration=0;spineCount=0;
  artTimer?:ReturnType<typeof setTimeout>;
  drag?:{pointerId:number;surface:Surface;draft:Arrangement;origin?:Arrangement};
  pendingDrag?:{clientX:number;clientY:number};
  suppressClick=false;
  editorGrid=document.createElementNS('http://www.w3.org/2000/svg','svg');
  hiddenArchitecture=new Map<THREE.Object3D,boolean>();
  highlightOverlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  highlightPath=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  highlightBounds?:THREE.Box3;
  hoverTargets:{hit:Hit;bounds:THREE.Box3}[]=[];
  pendingPointer?:{clientX:number;clientY:number};
  disposed=false; dirty=true; ready=false; frame=0; renderedFrames=0; transitionStart=0;
  startPosition=new THREE.Vector3();startQuaternion=new THREE.Quaternion();
  stateKey=''; decorationKey=''; currentView='';
  environment:THREE.Texture;
  appearance:RoomAppearance;
  composer?:EffectComposer;
  contactPass?:ContactOcclusion;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.25));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.AgXToneMapping;this.renderer.toneMappingExposure=1;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label','Habitación 3D interactiva');
    this.host.appendChild(this.renderer.domElement);
    this.highlightOverlay.classList.add('interaction-outline');this.highlightOverlay.setAttribute('aria-hidden','true');
    this.highlightOverlay.appendChild(this.highlightPath);this.highlightOverlay.appendChild(this.computerOutline);this.host.appendChild(this.highlightOverlay);
    this.editorGrid.classList.add('placement-grid');this.editorGrid.setAttribute('aria-hidden','true');this.host.appendChild(this.editorGrid);
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
    this.renderer.domElement.addEventListener('pointerdown',this.down);
    this.renderer.domElement.addEventListener('pointerup',this.up);
    this.renderer.domElement.addEventListener('pointercancel',this.cancelDrag);
    this.renderer.domElement.addEventListener('lostpointercapture',this.cancelDrag);
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
        this.contactPass=contact;this.composer.addPass(contact);
      }
      this.composer.addPass(new OutputPass());
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
      const spineKey=JSON.stringify([p.ranked.map(g=>g.id),p.favorites]);
      if(this.spineKey!==spineKey){
        this.spineKey=spineKey;const generation=++this.spineGeneration;this.spineCount=0;this.host.dataset.spineArt='0';
        for(let i=0;i<this.slots.length;i++){
          const slot=this.slots[i],game=p.ranked[i],favorite=p.favorites.includes(game.id);
          slot.plane.material.map?.dispose();slot.plane.material.map=spineTexture(game,favorite);slot.plane.material.needsUpdate=true;
          (slot.mesh.material as THREE.MeshStandardMaterial).color.set('#18283d');
          void loadArtwork(game).then(art=>{
            if(!art||this.disposed||generation!==this.spineGeneration)return;
            slot.plane.material.map?.dispose();slot.plane.material.map=spineTexture(game,favorite,art);slot.plane.material.needsUpdate=true;
            this.host.dataset.spineArt=String(++this.spineCount);
            this.scheduleArtPaint();
          });
        }
      }
      for(const m of this.walls)m.color.copy(p.prefs.wall==='original'?this.originalColors.get(m)!:new THREE.Color(p.prefs.wall));
      for(const m of this.bedding)m.color.copy(p.prefs.bedding==='original'?this.originalColors.get(m)!:new THREE.Color(p.prefs.bedding));
      this.appearance.mood(p.prefs.mood);
      this.host.dataset.wall=p.prefs.wall;this.host.dataset.bedding=p.prefs.bedding;this.host.dataset.mood=p.prefs.mood;
      this.dirty=true;
    }
    if(p.blocked)this.setHighlight();
    const decoKey=JSON.stringify([p.equipped,p.arranged,p.editor?.id,p.editor?.draft]);
    if(decoKey!==this.decorationKey){
      this.decorationKey=decoKey;
      for(const [id,object] of this.decorations){object.visible=p.equipped.includes(id)||Boolean(p.editor?.id===id&&p.editor.draft);this.placeObject(id,object);}
      for(const id of new Set([...p.equipped,...(p.editor?.draft?[p.editor.id]:[])])){
        if(this.decorations.has(id))continue;
        if(id==='duck'||id==='figure'){
          const placeholder=new THREE.Group();this.decorations.set(id,placeholder);
          this.loader.load(`./models/${id}.glb`,gltf=>{
            if(this.disposed){disposeTree(gltf.scene);return;}
            gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
            const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3());
            const pivot=new THREE.Group();gltf.scene.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));pivot.add(gltf.scene);
            this.placeObject(id,pivot);pivot.visible=this.read().equipped.includes(id)||this.read().editor?.id===id;
            this.scene.add(pivot);this.decorations.set(id,pivot);this.renderer.shadowMap.needsUpdate=true;this.dirty=true;
          },undefined,()=>{if(!this.disposed){this.decorations.delete(id);this.hover('No se pudo cargar el objeto. Retíralo y vuelve a colocarlo.');}});
        }else{
          const object=proceduralCollectible(id);object.userData.baseRotation=object.rotation.y;this.placeObject(id,object);this.scene.add(object);this.decorations.set(id,object);
        }
      }
      this.host.dataset.equipped=decoKey;this.renderer.shadowMap.needsUpdate=true;this.dirty=true;
    }
  }

  scheduleArtPaint(){
    if(this.artTimer||this.disposed)return;
    this.artTimer=setTimeout(()=>{this.artTimer=undefined;if(this.disposed)return;if(this.highlightKey.startsWith('game'))this.scheduleArtPaint();else this.dirty=true;},250);
  }
  placeObject(id:string,object:THREE.Group){
    const p=this.read(),draft=this.drag?.draft??p.editor?.draft;
    const positions=p.editor&&draft?moveSupportedItems(p.editor.id,draft,p.arranged):p.arranged;
    const position=positions[id];
    if(!position)return;
    object.position.set(position.x,position.y,position.z);object.rotation.y=(object.userData.baseRotation??0)+position.rotation*Math.PI/180;
  }
  cacheInteractionTargets(){
    // Cache world bounds once, rather than tracing the imported high-poly furniture on every move.
    const grouped=new Map<Kind,THREE.Box3>();
    this.scene.traverse(node=>{
      if(!(node instanceof THREE.Mesh)||!node.visible)return;
      let current:THREE.Object3D|null=node,hit:Hit|undefined;
      while(current){if(current.userData.hit)hit=current.userData.hit as Hit;current=current.parent;}
      if(!hit||hit.kind==='game')return;
      const box=new THREE.Box3().setFromObject(node);
      if(hit.kind==='computer')this.computerMeshes.push(node);
      if(hit.kind==='trophies')this.hoverTargets.push({hit,bounds:box});
      else {const bounds=grouped.get(hit.kind)??new THREE.Box3();bounds.union(box);grouped.set(hit.kind,bounds);}
    });
    for(const [kind,bounds] of grouped)this.hoverTargets.push({hit:{kind},bounds});
  }
  setHighlight(hit?:Hit){
    const kind=hit?.kind==='game'&&this.read().view==='room'?'shelf':hit?.kind;
    const key=kind?kind+(kind==='game'?hit?.slot:''):'';if(key===this.highlightKey)return;
    this.highlightKey=key;this.host.dataset.highlight=kind??'';
    // Every hover outline is a light 2D overlay; none of them redraw the room.
    this.highlightBounds=kind==='game'?this.slots[hit!.slot!]?.bounds:
      kind==='shelf'?(this.read().view==='shelf'?undefined:this.hoverTargets.find(t=>t.hit.kind==='shelf')?.bounds):
      kind?this.hoverTargets.filter(t=>t.hit.kind===kind).reduce((box,t)=>box.union(t.bounds),new THREE.Box3()):undefined;
    this.updateHighlightOverlay();
  }
  hoverGame(slot?:number){this.pendingPointer=undefined;this.setHighlight(slot===undefined?undefined:{kind:'game',slot});}
  updateHighlightOverlay(){
    const box=this.highlightBounds,computer=this.highlightKey==='computer';
    this.highlightPath.style.display=computer?'none':'block';this.computerOutline.style.display=computer?'block':'none';
    this.highlightOverlay.style.display=box?'block':'none';if(!box)return;
    if(computer){this.refreshComputerOutline();return;}
    const width=this.host.clientWidth,height=this.host.clientHeight;
    this.highlightOverlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const corners=[[box.min.x,box.min.y],[box.max.x,box.min.y],[box.max.x,box.max.y],[box.min.x,box.max.y]];
    this.highlightPath.setAttribute('points',corners.map(([x,y])=>{
      const v=new THREE.Vector3(x,y,box.max.z+.004).project(this.camera);
      return `${(v.x+1)*width/2},${(1-v.y)*height/2}`;
    }).join(' '));
  }
  refreshComputerOutline(){
    if(!this.ready||this.read().editor||this.read().view==='library'||this.host.dataset.motion!=='idle')return;
    const width=this.host.clientWidth,height=this.host.clientHeight;
    const key=[width,height,...this.camera.matrixWorld.elements,...this.camera.projectionMatrix.elements].join(',');
    if(this.computerMaskKey===key)return;
    this.scene.updateMatrixWorld(true);
    const url=silhouette(this.renderer,this.camera,this.computerMeshes,width,height);this.computerMaskKey=key;
    this.computerOutline.setAttribute('href',url);this.computerOutline.setAttribute('width',String(width));this.computerOutline.setAttribute('height',String(height));
    this.computerOutline.setAttribute('preserveAspectRatio','none');this.highlightOverlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
  }
  hoverHit(event:{clientX:number;clientY:number}):Hit|undefined{
    if(!this.ready||this.read().editor||this.read().blocked||this.read().view==='library')return;
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
  updateEditorArchitecture(editing:boolean){
    for(const [node,visible] of this.hiddenArchitecture)node.visible=visible;this.hiddenArchitecture.clear();
    if(editing)this.root?.traverse(node=>{
      if(!(node instanceof THREE.Mesh))return;
      const name=normalName(node.name);
      if(/techo|pared|cornisa|marco de entrada|cortina|ventana|plafon|tira led|rotulo|lamina|placa platinos/.test(name)){this.hiddenArchitecture.set(node,node.visible);node.visible=false;}
    });
    this.renderer.shadowMap.needsUpdate=true;
  }
  editorPosition(event:{clientX:number;clientY:number},selectSurface=true):Arrangement|undefined{
    const edit=this.read().editor;if(!edit)return;
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    const point=new THREE.Vector3(),side=edit.surface==='shelves';
    const height=surfaceArea(edit.surface,this.read().arranged)?.y??0;
    const plane=side?new THREE.Plane(new THREE.Vector3(1,0,0),-3.11):new THREE.Plane(new THREE.Vector3(0,1,0),-height);
    if(!this.raycaster.ray.intersectPlane(plane,point))return;
    if(side){point.x=3.11;point.y=Math.abs(point.y-2.46)<Math.abs(point.y-2.03)?2.46:2.03;}
    else point.y=height;
    if(selectSurface&&edit.surface==='floor'&&!furniture[edit.id]){
      for(const name of ['table','stool'] as const){const area=surfaceArea(name,this.read().arranged);if(area&&this.read().equipped.includes(name)&&Math.abs(point.x-area.x)<area.width/2&&Math.abs(point.z-area.z)<area.depth/2){this.read().onSurface(name);return;}}
      if(point.x>2.85&&point.z>-2.6&&point.z<-.8){this.read().onSurface('shelves');return;}
      if(point.x>-.85&&point.x<1.2&&point.z< -2.9){this.read().onSurface('cabinet');return;}
      if(point.x>2.05&&point.x<2.46&&point.z> -2.95&&point.z< -2.48){this.read().onSurface('desk');return;}
      if(point.x< -2.4&&point.z> -2.2&&point.z< -1.6){this.read().onSurface('nightstand');return;}
    }
    return snapPlacement(edit.surface,point.x,point.y,point.z,edit.rotation);
  }
  editorClick(event:MouseEvent){const position=this.editorPosition(event);if(position)this.read().onPick(position);}
  down=(event:PointerEvent)=>{
    if(event.button!==0||!this.read().editor||this.host.dataset.motion!=='idle')return;
    const position=this.editorPosition(event);if(!position)return;
    event.preventDefault();this.pendingPointer=undefined;const edit=this.read().editor!;
    this.drag={pointerId:event.pointerId,surface:edit.surface,draft:position,origin:edit.draft};
    this.renderer.domElement.setPointerCapture(event.pointerId);this.read().onPick(position);
    this.host.dataset.dragging='true';this.renderer.domElement.style.cursor='grabbing';
  };
  previewDrag(position:Arrangement){
    if(!this.drag)return;this.drag.draft=position;
    for(const [id,object] of this.decorations)this.placeObject(id,object);
    this.dirty=true;
  }
  up=(event:PointerEvent)=>{
    if(this.drag?.pointerId!==event.pointerId)return;
    const position=this.editorPosition(event,false)??this.drag.draft;
    this.previewDrag(position);this.drag=undefined;this.pendingDrag=undefined;
    this.read().onPick(position);this.suppressClick=true;this.host.dataset.dragging='false';
    if(this.renderer.domElement.hasPointerCapture(event.pointerId))this.renderer.domElement.releasePointerCapture(event.pointerId);
    this.renderer.domElement.style.cursor='grab';this.renderer.shadowMap.needsUpdate=true;this.dirty=true;
  };
  cancelDrag=(event:PointerEvent)=>{
    if(this.drag?.pointerId!==event.pointerId)return;
    const origin=this.drag.origin;this.drag=undefined;this.pendingDrag=undefined;
    this.host.dataset.dragging='false';this.read().onPick(origin);this.renderer.domElement.style.cursor='grab';this.dirty=true;
  };
  updateEditorGrid(){
    const edit=this.read().editor;this.editorGrid.replaceChildren();if(!edit)return;
    const width=this.host.clientWidth,height=this.host.clientHeight;this.editorGrid.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const project=(x:number,y:number,z:number)=>{const v=new THREE.Vector3(x,y,z).project(this.camera);return `${(v.x+1)*width/2},${(1-v.y)*height/2}`;};
    const line=(a:string,b:string)=>{const element=document.createElementNS('http://www.w3.org/2000/svg','polyline');element.setAttribute('points',`${a} ${b}`);element.setAttribute('class','grid-line');this.editorGrid.appendChild(element);};
    if(edit.surface==='shelves'){
      for(const y of [2.03,2.46]){
        line(project(3.08,y,-2.6),project(3.08,y,-.9));
        for(let z=-2.6;z<=-.9;z+=.05)line(project(3.08,y,z),project(3.08,y+.13,z));
      }
    }else{
      const area=surfaceArea(edit.surface,this.read().arranged);if(!area)return;
      const y=area.y+.01,step=edit.surface==='floor'?.2:.05,angle=area.rotation*Math.PI/180;
      const local=(x:number,z:number)=>project(area.x+x*Math.cos(angle)+z*Math.sin(angle),y,area.z-x*Math.sin(angle)+z*Math.cos(angle));
      for(let x=-area.width/2;x<=area.width/2+.001;x+=step)line(local(x,-area.depth/2),local(x,area.depth/2));
      for(let z=-area.depth/2;z<=area.depth/2+.001;z+=step)line(local(-area.width/2,z),local(area.width/2,z));
    }
    const draft=this.drag?.draft??edit.draft;
    if(draft){
      const p=draft,size=furniture[edit.id],w=size?.width??.24,d=size?.depth??.24;
      const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');polygon.setAttribute('class',placementError(edit.id,p,Object.fromEntries(this.read().equipped.map(id=>[id,this.read().arranged[id]])))?'cursor invalid':'cursor');
      polygon.setAttribute('points',(edit.surface==='shelves'?[[p.x-.02,p.y,p.z-w/2],[p.x-.02,p.y,p.z+w/2],[p.x-.02,p.y+.3,p.z+w/2],[p.x-.02,p.y+.3,p.z-w/2]]:[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]].map(([x,,z])=>{const angle=p.rotation*Math.PI/180;return [p.x+x*Math.cos(angle)+z*Math.sin(angle),p.y+.03,p.z-x*Math.sin(angle)+z*Math.cos(angle)];})).map(([x,y,z])=>project(x,y,z)).join(' '));this.editorGrid.appendChild(polygon);
    }
  }
  resize(){
    const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;
    this.renderer.setSize(width,height);this.composer?.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.dirty=true;
  }
  hit(event:PointerEvent|MouseEvent):Hit|undefined{
    if(!this.ready||this.read().editor||this.read().blocked||this.read().view==='library')return;
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
    if(this.suppressClick){this.suppressClick=false;return;}
    if(this.read().editor){this.editorClick(event);return;}
    const hit=this.hit(event);if(!hit)return;const p=this.read();
    if(hit.kind==='game'){if(p.view==='shelf')p.onGame(p.ranked[hit.slot!]);else p.onShelf();}
    else if(hit.kind==='shelf')p.onShelf();else if(hit.kind==='computer')p.onComputer();else p.onTrophies();
  };
  move=(event:PointerEvent)=>{if(this.drag?.pointerId===event.pointerId){this.pendingDrag={clientX:event.clientX,clientY:event.clientY};return;}this.pendingPointer={clientX:event.clientX,clientY:event.clientY};};
  leave=()=>{if(this.drag)return;this.pendingPointer=undefined;this.setHighlight();this.renderer.domElement.style.cursor='default';};
  contextLost=(event:Event)=>{event.preventDefault();this.ready=false;this.state('error');};

  project(element:HTMLElement,position:THREE.Vector3){
    const v=position.clone().project(this.camera);
    const w=this.host.clientWidth,h=this.host.clientHeight;
    element.style.left=`${(v.x+1)*w/2}px`;element.style.top=`${(1-v.y)*h/2}px`;
    element.style.visibility=v.z>1||v.z<0||Math.abs(v.x)>1||Math.abs(v.y)>1?'hidden':'visible';
  }
  anchors(){
    const anchors:[string,THREE.Vector3][]=[['shelf',new THREE.Vector3(.2,.1,-2.95)],['computer',new THREE.Vector3(2.7,.85,-1.85)],['trophies',new THREE.Vector3(.2,2.42,-3.2)],['library',new THREE.Vector3(.2,-.12,-2.9)],['edit-shelves',new THREE.Vector3(3,2.46,-1.7)],['edit-desk',new THREE.Vector3(2.26,.8,-2.71)],['edit-nightstand',new THREE.Vector3(-2.74,.685,-1.91)],['edit-cabinet',new THREE.Vector3(.2,2.34,-3.2)]];
    for(const id of ['table','stool'] as const){const area=surfaceArea(id,this.read().arranged);if(area)anchors.push([`edit-${id}`,new THREE.Vector3(area.x,area.y,area.z)]);}
    const shelf=this.hoverTargets.find(t=>t.hit.kind==='shelf')?.bounds;if(shelf){const library=anchors.find(([id])=>id==='library')!;library[1].set((shelf.min.x+shelf.max.x)/2,shelf.min.y-.12,shelf.max.z+.08);}
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
    const p=this.read(),view=p.editor?`edit-${p.editor.surface}`:p.view==='library'?'library':p.view==='shelf'?'shelf':'room';
    if(this.ready){
      if(this.drag&&(!p.editor||p.editor.surface!==this.drag.surface)){this.drag=undefined;this.pendingDrag=undefined;this.host.dataset.dragging='false';}
      if(this.pendingDrag&&this.drag){const position=this.editorPosition(this.pendingDrag,false);this.pendingDrag=undefined;if(position)this.previewDrag(position);}
      if(this.pendingPointer){
        const hoverStart=performance.now();
        const hit=this.hoverHit(this.pendingPointer);this.pendingPointer=undefined;
        this.setHighlight(hit);this.renderer.domElement.style.cursor=hit?'pointer':'default';
        this.host.dataset.hoverMs=String(performance.now()-hoverStart);
      }
      if(this.currentView!==view){
        this.setHighlight();this.pendingPointer=undefined;
        this.currentView=view;this.host.dataset.camera=view;this.startPosition.copy(this.camera.position);this.startQuaternion.copy(this.camera.quaternion);this.transitionStart=time;
        this.updateEditorArchitecture(Boolean(p.editor));
        if(p.editor){
          const surface=p.editor.surface;
          if(surface==='shelves'){this.targetPosition.set(.1,2.3,-1.7);const dummy=new THREE.PerspectiveCamera();dummy.position.copy(this.targetPosition);dummy.lookAt(3.11,2.2,-1.7);this.targetQuaternion.copy(dummy.quaternion);}
          else if(surface!=='floor'){
            const area=surfaceArea(surface,p.arranged);
            if(area){
              const dummy=new THREE.PerspectiveCamera();
              if(surface==='desk')dummy.position.set(area.x-1.1,area.y+1.1,area.z+1.25);
              else dummy.position.set(area.x,area.y+(surface==='cabinet'?.85:.7),area.z+(surface==='cabinet'?1.8:1.05));
              dummy.lookAt(area.x,area.y+.08,area.z);this.targetPosition.copy(dummy.position);this.targetQuaternion.copy(dummy.quaternion);
            }
          }else{this.targetPosition.set(0,10.5,.01);const dummy=new THREE.PerspectiveCamera();dummy.position.copy(this.targetPosition);dummy.up.set(0,0,-1);dummy.lookAt(0,0,0);this.targetQuaternion.copy(dummy.quaternion);}
        }else if(view==='library'){
          this.targetPosition.set(.2,1.8,1.1);const dummy=new THREE.PerspectiveCamera();dummy.position.copy(this.targetPosition);dummy.lookAt(1.1,1.3,-3.2);this.targetQuaternion.copy(dummy.quaternion);
        }else if(view==='shelf'){
          this.targetPosition.set(.2,1.45,0);const dummy=new THREE.PerspectiveCamera();dummy.position.copy(this.targetPosition);dummy.lookAt(.2,1.12,-3.2);this.targetQuaternion.copy(dummy.quaternion);
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
        if(this.contactPass)this.contactPass.enabled=this.host.dataset.motion==='idle';
        this.camera.updateMatrixWorld();if(this.composer&&!this.drag)this.composer.render();else this.renderer.render(this.scene,this.camera);this.anchors();this.refreshComputerOutline();this.updateHighlightOverlay();this.updateEditorGrid();this.dirty=false;
        this.host.dataset.rendered='true';this.host.dataset.slots=String(this.slots.length);this.host.dataset.frame=String(++this.renderedFrames);
        this.host.dataset.positions=JSON.stringify(Object.fromEntries([...this.decorations].filter(([,o])=>o.visible).map(([id,o])=>[id,o.position.toArray()])));
        this.host.dataset.placed=[...this.decorations.entries()].filter(([,o])=>o.visible&&o.children.length>0).map(([id])=>id).join('|');
      }
    }
    this.frame=requestAnimationFrame(this.tick);
  };
  dispose(){
    this.setHighlight();this.disposed=true;if(this.artTimer)clearTimeout(this.artTimer);cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();
    const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.down);c.removeEventListener('pointerup',this.up);c.removeEventListener('pointercancel',this.cancelDrag);c.removeEventListener('lostpointercapture',this.cancelDrag);c.removeEventListener('click',this.click);c.removeEventListener('pointermove',this.move);c.removeEventListener('pointerleave',this.leave);c.removeEventListener('webglcontextlost',this.contextLost);
    for(const pass of this.composer?.passes??[])pass.dispose();this.composer?.dispose();disposeTree(this.scene);this.appearance.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();c.remove();this.highlightOverlay.remove();this.editorGrid.remove();
  }
}

export function Room3D(props:Props){
  const host=useRef<HTMLDivElement>(null),engine=useRef<RoomEngine|null>(null),latest=useRef(props);latest.current=props;
  const [preview,setPreview]=useState<number|null>(null);
  const [status,setStatus]=useState('loading'),[hover,setHover]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    setStatus('loading');
    try{engine.current=new RoomEngine(host.current!,()=>latest.current,setStatus,setHover);}catch{engine.current?.dispose();engine.current=null;setStatus('error');}
    return ()=>{engine.current?.dispose();engine.current=null;};
  },[retry]);
  useEffect(()=>{engine.current?.anchors();},[status,props.view,props.editor?.surface]);
  useEffect(()=>{if(props.blocked)setHover('');},[props.blocked]);
  useEffect(()=>engine.current?.apply(),[props.ranked,props.favorites,props.prefs,props.equipped,props.arranged,props.editor,props.blocked]);
  return <div className="room-frame" inert={props.view==='library'} aria-hidden={props.view==='library'}>
    <div className="scene three-scene">
      <div ref={host} className="three-canvas" data-testid="room-3d" data-state={status}/>
      {status==='loading'&&<div className="room-load" role="status"><span className="load-orbit"/><strong>Preparando tu habitación</strong><p>Cargando los modelos 3D…</p></div>}
      {status==='error'&&<div className="room-load" role="alert"><strong>No se pudo abrir la habitación 3D</strong><p>Comprueba la aceleración gráfica del navegador y vuelve a intentarlo.</p><button className="primary-button" onClick={()=>setRetry(v=>v+1)}>Reintentar</button><button className="quiet-button" onClick={props.onLibrary}>Abrir biblioteca</button></div>}
      {status==='ready'&&!props.editor&&props.view==='room'&&<nav className="room-object-actions keyboard-object-actions" aria-label="Objetos de la habitación">
        <button data-anchor="shelf" aria-label="Acercarse a la estantería" onClick={props.onShelf}>Explorar estantería <span>↗</span></button>
        <button data-anchor="computer" aria-label="Abrir ajustes desde el ordenador" onClick={props.onComputer}>Mi ordenador <span>↗</span></button>
        <button data-anchor="trophies" aria-label="Ver estantería de platinos" onClick={props.onTrophies}>Mis platinos <span>↗</span></button>
      </nav>}
      {status==='ready'&&!props.editor&&props.view==='shelf'&&<nav className="three-game-actions" aria-label="Juegos de la estantería">{props.ranked.map((g,i)=><button key={i} className="case three-game-hit" data-slot={i} data-game-id={g.id} aria-label={`Ver ${g.title}`} title={g.title} onPointerEnter={()=>{engine.current?.hoverGame(i);setPreview(i);}} onPointerLeave={()=>{engine.current?.hoverGame();setPreview(null);}} onFocus={()=>setPreview(i)} onBlur={()=>setPreview(null)} onClick={()=>props.onGame(g)}><span className="sr-only">{g.title}</span></button>)}</nav>}

      {status==='ready'&&!props.editor&&props.view==='shelf'&&<button className="shelf-search-access" data-anchor="library" onClick={props.onLibrary} aria-label="Abrir biblioteca"><BookOpen size={15}/> Biblioteca</button>}
      {status==='ready'&&props.editor&&props.editor.surface==='floor'&&!furniture[props.editor.id]&&<nav className="editor-surfaces" aria-label="Elegir superficie">{(['shelves','desk','nightstand','cabinet',...(props.equipped.includes('table')?['table']:[]),...(props.equipped.includes('stool')?['stool']:[])] as Surface[]).map(surface=><button key={surface} data-anchor={`edit-${surface}`} onClick={()=>props.onSurface(surface)}>{surfaceNames[surface]}</button>)}</nav>}
      {props.view==='shelf'&&!props.editor&&!props.blocked&&preview!==null&&props.ranked[preview]&&<aside className="shelf-game-preview" aria-label="Carátula del juego señalado"><div className="preview-poster"><GameArt key={props.ranked[preview].id} game={props.ranked[preview]}/></div><strong>{props.ranked[preview].title}</strong><small>{props.ranked[preview].store} · {props.ranked[preview].installed?'Instalado':'Sin instalar'}</small></aside>}
      <div className="equipped-status sr-only" aria-label="Objetos colocados">{props.equipped.map(id=><span className={`placed-${id}`} key={id}>{id}</span>)}</div>
    </div>
  </div>;
}
