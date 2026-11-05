import {useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import type {Game} from './games';
import {GameArt} from './game-art';
import './collection-room.css';
import {collectionShelves,shelfCapacity,shelfWidth,shelfPosition,type CollectionFilter} from './collection-layout';
// Project a rectangular DOM cover onto its actual 3D face, including the side walls.
function quad(points:THREE.Vector3[],width:number,height:number){
 const input=[[0,0],[180,0],[180,270],[0,270]],rows:number[][]=[];
 points.forEach((p,i)=>{const x=(p.x+1)*width/2,y=(1-p.y)*height/2,[u,v]=input[i];rows.push([u,v,1,0,0,0,-u*x,-v*x,x],[0,0,0,u,v,1,-u*y,-v*y,y]);});
 for(let k=0;k<8;k++){let best=k;for(let j=k+1;j<8;j++)if(Math.abs(rows[j][k])>Math.abs(rows[best][k]))best=j;[rows[k],rows[best]]=[rows[best],rows[k]];const d=rows[k][k];if(Math.abs(d)<1e-8)return '';for(let j=k;j<9;j++)rows[k][j]/=d;for(let i=0;i<8;i++)if(i!==k){const n=rows[i][k];for(let j=k;j<9;j++)rows[i][j]-=n*rows[k][j];}}
 const [a,b,c,d,e,f,g,h]=rows.map(r=>r[8]);return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
}

type RoomView='general'|'center'|'back'|'left'|'right';
const roomViews:Record<RoomView,{title:string;eye:[number,number,number];look:[number,number,number]}>={general:{title:'Vista general',eye:[0,7,15.8],look:[0,1,0]},center:{title:'Centro',eye:[0,2.5,11.5],look:[0,1.3,5]},back:{title:'Fondo',eye:[0,2.6,-.9],look:[0,1.3,-9.7]},left:{title:'Izquierda',eye:[.5,2.5,-.5],look:[-9.45,1.3,-.5]},right:{title:'Derecha',eye:[-.5,2.5,-.5],look:[9.45,1.3,-.5]}};

type Props={favorites:number[];onBack:()=>void;onLibrary:(genre?:string,collection?:CollectionFilter)=>void;onGame:(game:Game)=>void;blocked:boolean;reduced:boolean};
export function CollectionRoom({favorites,onBack,onLibrary,onGame,blocked,reduced}:Props){
 const groups=useMemo(()=>collectionShelves(favorites),[favorites]);
 const groupsRef=useRef(groups);groupsRef.current=groups;
 const host=useRef<HTMLDivElement>(null),viewportRef=useRef<HTMLDivElement>(null);
 const [layout,setLayout]=useState<'room'|'shelves'>('room'),layoutRef=useRef(layout);layoutRef.current=layout;
 const [roomView,setRoomView]=useState<RoomView>('general'),[cameraRevision,setCameraRevision]=useState(0);
 const viewRef=useRef({roomView,cameraRevision});viewRef.current={roomView,cameraRevision};
 function chooseRoomView(value:RoomView){setLayout('room');chooseFocus(null);setRoomView(value);setCameraRevision(n=>n+1);}
 const [focus,setFocus]=useState<number|null>(null),[error,setError]=useState(false),overviewScroll=useRef(0);
 function chooseFocus(value:number|null){if(focus===null&&value!==null)overviewScroll.current=viewportRef.current?.scrollTop??0;setFocus(value);}
 const focusRef=useRef(focus);focusRef.current=focus;
 const [preloaded,setPreloaded]=useState<Set<number>>(()=>new Set());
 const preloadedRef=useRef(new Set<number>());
 useEffect(()=>{
  const container=host.current!,viewport=viewportRef.current!;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor('#15221b');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  container.prepend(renderer.domElement);
  let dirty=true,disposed=false,frame=0,renderCount=0,current:number|null|undefined;
  let width=0,height=0,columns=1,tileWidth=0,tileHeight=0,previewHeight=0;
  let currentGroups=groupsRef.current,currentLayout=layoutRef.current,currentRevision=-1,geometryDirty=true;
  let yaw=0,pitch=0,zoom=1,drag: {x:number;y:number;yaw:number;pitch:number;pointer:number}|undefined;
  const roomCamera=new THREE.PerspectiveCamera(55,1,.1,80);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#eee3cd','#647568',2.4),new THREE.AmbientLight('#eee7db',1));
  const sun=new THREE.DirectionalLight('#ffe0b1',3);sun.position.set(-3,7,6);sun.castShadow=true;sun.shadow.bias=-.001;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,far:50});scene.add(sun);
  const timber=new THREE.TextureLoader().load('./textures/wood.jpg',()=>{if(!disposed)dirty=true;});timber.colorSpace=THREE.SRGBColorSpace;timber.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const wood=new THREE.MeshStandardMaterial({color:'#d0baa0',roughness:.75,map:timber}),edge=new THREE.MeshStandardMaterial({color:'#dcc4a5',roughness:.6,map:timber}),wall=new THREE.MeshStandardMaterial({color:'#35493f',roughness:.95}),plastic=new THREE.MeshStandardMaterial({color:'#152326',roughness:.5});
  function box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const room=new THREE.Group();scene.add(room);
  box(room,0,-.1,0,19.6,.2,21,wood);
  function roomBox(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){return box(room,x,y,z,w,h,d,material);}
  roomBox(0,1.8,-10,19.6,3.6,.15,wall);roomBox(-9.8,1.8,0,.15,3.6,20,wall);roomBox(9.8,1.8,0,.15,3.6,20,wall);const roof=roomBox(0,3.65,0,19.6,.1,20,wall);roof.castShadow=false;
  const rug=new THREE.MeshStandardMaterial({color:'#b5a98b',roughness:1});box(room,0,.014,7.8,9,.02,3.1,rug);
  const lampMaterial=new THREE.MeshStandardMaterial({color:'#f1d9b2',emissive:'#e1b66f',emissiveIntensity:.4,roughness:.6});
  for(const [x,z] of [[0,5],[-5,-4],[5,-4]]){const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.14,24),lampMaterial);lamp.position.set(x,3.43,z);room.add(lamp);const light=new THREE.PointLight('#ffe5b9',25,14,2);light.position.set(x,3.25,z);scene.add(light);}
  room.traverse(object=>object.layers.set(30));
  const racks=currentGroups.map((_,i)=>{
   const root=new THREE.Group(),[x,y,z,rotation]=shelfPosition(i);root.position.set(x,y,z);root.rotation.y=rotation;scene.add(root);
   box(root,0,1.2,-.02,4.12,2.45,.1,wood);
   for(const side of [-2.08,2.08])box(root,side,1.2,.16,.1,2.55,.5,edge);
   for(const level of [.1,1.22,2.48])box(root,0,level,.17,shelfWidth,.08,.56,edge);
   const cases=Array.from({length:shelfCapacity},()=>box(root,0,0,0,.64,.96,.1,plastic));
   root.traverse(object=>object.layers.set(i+1));
   return {root,cases,camera:new THREE.OrthographicCamera()};
  });
  scene.updateMatrixWorld(true);
  function tilePosition(index:number){
   const centralRows=Math.ceil(2/columns);
   if(index>=12){const slot=index-12;return {left:(columns===1?0:(columns-2)/2+slot)*tileWidth,top:Math.floor(slot/columns)*tileHeight};}
   return {left:index%columns*tileWidth,top:(centralRows+Math.floor(index/columns))*tileHeight};
  }
  function preloadVisible(){
   if(focusRef.current===null&&layoutRef.current==='room')return;
   const next=focusRef.current===null?racks.map((_,i)=>i).filter(i=>{const {top}=tilePosition(i);return top+tileHeight>viewport.scrollTop&&top<viewport.scrollTop+viewport.clientHeight;}):[focusRef.current];
   let changed=false;for(const i of next)if(i!==null&&!preloadedRef.current.has(i)){preloadedRef.current.add(i);changed=true;}
   if(changed)setPreloaded(new Set(preloadedRef.current));
  }
  function resize(){
   width=viewport.clientWidth;
   if(!width||!viewport.clientHeight)return;
   columns=Math.max(1,Math.min(4,Math.floor(width/340)));
   tileWidth=width/columns;previewHeight=Math.round(tileWidth*3/4.9);tileHeight=previewHeight+94;
   height=focusRef.current===null&&layoutRef.current==='shelves'?(Math.ceil(2/columns)+Math.ceil(12/columns))*tileHeight:viewport.clientHeight;
   container.style.height=`${height}px`;
   // Posters stay at native DOM resolution; cap only the background canvas memory.
   const ratio=Math.min(devicePixelRatio,1.25,Math.sqrt(4_000_000/(width*height)));
   if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
   renderer.setSize(width,height);dirty=true;preloadVisible();
  }
  const observer=new ResizeObserver(resize);observer.observe(viewport);
  const scroll=()=>preloadVisible();viewport.addEventListener('scroll',scroll,{passive:true});resize();
  function renderRack(index:number,selected:boolean){
   const rack=racks[index],group=groupsRef.current[index],article=container.querySelector<HTMLElement>(`[data-shelf-index="${index}"]`)!;
   const tile=tilePosition(index),left=selected?0:tile.left,top=selected?0:tile.top;
   const w=selected?width:tileWidth,h=selected?height:previewHeight,offset=selected?0:48;
   Object.assign(article.style,{left:`${left}px`,top:`${top}px`,width:`${w}px`,height:`${selected?height:tileHeight}px`,visibility:'visible'});
   article.hidden=false;
   const plaque=article.querySelector<HTMLElement>('.genre-plaque')!;Object.assign(plaque.style,{left:'',top:'',visibility:'',zIndex:''});
   const camera=rack.camera,worldHeight=selected?Math.max(3.2,4.9*h/w):3;
   camera.left=-worldHeight*w/h/2;camera.right=-camera.left;camera.top=worldHeight/2;camera.bottom=-camera.top;camera.near=.1;camera.far=50;
   camera.position.copy(rack.root.localToWorld(new THREE.Vector3(0,1.33,6)));camera.lookAt(rack.root.localToWorld(new THREE.Vector3(0,1.33,.3)));camera.updateProjectionMatrix();camera.updateMatrixWorld();
   camera.layers.set(0);camera.layers.enable(index+1);
   if(selected){camera.layers.enable(30);for(let i=0;i<racks.length;i++)camera.layers.enable(i+1);}
   rack.cases.forEach((mesh,j)=>{
    const visible=j<group.games.length&&(selected||j<2);
    mesh.visible=visible;
    const rowCapacity=group.games.length<=4?2:4,rowCount=Math.min(rowCapacity,group.games.length-Math.floor(j/rowCapacity)*rowCapacity);
    const x=selected?(j%rowCapacity-(rowCount-1)/2)*.91:group.games.length===1?0:(j===0?-.98:.98),y=selected?(j<rowCapacity?1.74:.62):1.1,z=selected?.26:.55,scale=selected?1:2;
    mesh.position.set(x,y,z);mesh.scale.set(scale,scale,1);
    const button=article.querySelector<HTMLElement>(`[data-shelf-slot="${j}"]`);
    if(button){
     button.style.zIndex='';button.style.visibility=visible?'visible':'hidden';
     if(visible){const points=[[-.3,.45],[.3,.45],[.3,-.45],[-.3,-.45]].map(([dx,dy])=>rack.root.localToWorld(new THREE.Vector3(x+dx*scale,y+dy*scale,z+.062)).project(camera));button.style.transform=quad(points,w,h);}
    }
   });
   renderer.setViewport(left,height-top-offset-h,w,h);renderer.setScissor(left,height-top-offset-h,w,h);
   renderer.render(scene,camera);
  }
  function renderRoom(){
   const view=roomViews[viewRef.current.roomView];
   roomCamera.aspect=width/height;roomCamera.fov=55/zoom;roomCamera.position.fromArray(view.eye);
   const direction=new THREE.Vector3().fromArray(view.look).sub(roomCamera.position).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
   roomCamera.lookAt(roomCamera.position.clone().add(direction));roomCamera.updateProjectionMatrix();roomCamera.updateMatrixWorld();
   roomCamera.layers.enableAll();roof.visible=viewRef.current.roomView!=='general';
   racks.forEach((rack,i)=>rack.cases.forEach((mesh,j)=>{const count=groupsRef.current[i].games.length;mesh.visible=j<Math.min(2,count);mesh.position.set(count===1?0:j===0?-.98:.98,1.1,.55);mesh.scale.set(2,2,1);}));
   scene.updateMatrixWorld(true);
   const bounds=racks.map(rack=>new THREE.Box3().setFromObject(rack.root)),ray=new THREE.Ray(),hit=new THREE.Vector3(),labels:DOMRect[]=[];
   const order=racks.map((rack,i)=>({i,distance:roomCamera.position.distanceToSquared(rack.root.position)})).sort((a,b)=>a.distance-b.distance);
   let newPreloads=false;
   for(const {i,distance} of order){
    const rack=racks[i],group=groupsRef.current[i],article=container.querySelector<HTMLElement>(`[data-shelf-index="${i}"]`)!;
    article.hidden=false;Object.assign(article.style,{left:'0px',top:'0px',width:`${width}px`,height:`${height}px`,visibility:'visible'});
    const normal=new THREE.Vector3(0,0,1).transformDirection(rack.root.matrixWorld),front=normal.dot(roomCamera.position.clone().sub(rack.root.position))>0;
    const plaque=article.querySelector<HTMLElement>('.genre-plaque')!,labelPoint=rack.root.localToWorld(new THREE.Vector3(0,2.8,.3)).project(roomCamera);
    Object.assign(plaque.style,{left:`${(labelPoint.x+1)*width/2}px`,top:`${(1-labelPoint.y)*height/2}px`,visibility:front&&labelPoint.z>0&&labelPoint.z<1&&Math.abs(labelPoint.x)<.94&&Math.abs(labelPoint.y)<.9?'visible':'hidden',zIndex:'20000'});
    if(plaque.style.visibility==='visible'){const b=plaque.getBoundingClientRect();if(labels.some(a=>b.left<a.right+4&&b.right>a.left-4&&b.top<a.bottom+4&&b.bottom>a.top-4))plaque.style.visibility='hidden';else labels.push(b);}
    rack.cases.forEach((mesh,j)=>{
     const button=article.querySelector<HTMLElement>(`[data-shelf-slot="${j}"]`);if(!button)return;
     const center=rack.root.localToWorld(mesh.position.clone().add(new THREE.Vector3(0,0,.062)));
     const points=[[-.6,.9],[.6,.9],[.6,-.9],[-.6,-.9]].map(([dx,dy])=>rack.root.localToWorld(new THREE.Vector3(mesh.position.x+dx,mesh.position.y+dy,.612)).project(roomCamera));
     ray.set(roomCamera.position,center.clone().sub(roomCamera.position).normalize());const length=center.distanceTo(roomCamera.position);
     const blocked=mesh.visible&&bounds.some((box,k)=>k!==i&&Boolean(ray.intersectBox(box,hit))&&hit.distanceTo(roomCamera.position)<length-.1);
     const visible=mesh.visible&&front&&!blocked&&points.every(p=>p.z>0&&p.z<1)&&points.some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1);
     button.style.visibility=visible?'visible':'hidden';button.style.zIndex=String(Math.round(10000-Math.sqrt(distance)*100));button.style.transform=visible?quad(points,width,height):'';
     if(visible&&!preloadedRef.current.has(i)){preloadedRef.current.add(i);newPreloads=true;}
    });
   }
   if(newPreloads)setPreloaded(new Set(preloadedRef.current));
   renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(scene,roomCamera);
  }
  const spatial=()=>focusRef.current===null&&layoutRef.current==='room';
  const down=(event:PointerEvent)=>{if(!spatial()||(event.target as Element).closest('button'))return;drag={x:event.clientX,y:event.clientY,yaw,pitch,pointer:event.pointerId};viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');};
  const move=(event:PointerEvent)=>{if(!drag)return;yaw=drag.yaw-(event.clientX-drag.x)/width*2;pitch=THREE.MathUtils.clamp(drag.pitch-(event.clientY-drag.y)/height*1.2,-.5,.5);dirty=true;};
  const up=()=>{drag=undefined;viewport.classList.remove('is-dragging');};
  const wheel=(event:WheelEvent)=>{if(!spatial())return;event.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(-event.deltaY*.001),.75,1.65);dirty=true;};
  viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',up);viewport.addEventListener('lostpointercapture',up);viewport.addEventListener('wheel',wheel,{passive:false});
  function tick(){
   if(disposed)return;
   const selected=focusRef.current;
   if(current!==selected){
    current=selected;geometryDirty=true;resize();viewport.scrollTop=selected===null?overviewScroll.current:0;dirty=true;
   }
   if(currentLayout!==layoutRef.current){currentLayout=layoutRef.current;geometryDirty=true;resize();dirty=true;}
   if(currentRevision!==viewRef.current.cameraRevision){currentRevision=viewRef.current.cameraRevision;yaw=0;pitch=0;zoom=1;dirty=true;}
   if(currentGroups!==groupsRef.current){currentGroups=groupsRef.current;geometryDirty=true;dirty=true;preloadVisible();}
   if(dirty){
    // A camera per shelf keeps every overview frontal, with a fixed readable size.
    renderer.shadowMap.enabled=selected!==null||currentLayout==='room';renderer.shadowMap.needsUpdate=geometryDirty;
    renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
    racks.forEach((rack,i)=>{if(selected!==null&&selected!==i){rack.cases.forEach(mesh=>mesh.visible=false);const article=container.querySelector<HTMLElement>(`[data-shelf-index="${i}"]`);if(article)article.hidden=true;}});
    if(selected===null&&currentLayout==='room')renderRoom();else if(selected===null)racks.forEach((_,i)=>renderRack(i,false));else{roof.visible=true;renderRack(selected,true);}
    geometryDirty=false;container.dataset.layout=selected!==null?'focus':currentLayout;
    container.dataset.frame=String(++renderCount);container.dataset.genre=selected===null?'all':groupsRef.current[selected].title;container.dataset.motion='idle';container.dataset.rendered='true';dirty=false;
   }
   frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();viewport.removeEventListener('scroll',scroll);viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',move);viewport.removeEventListener('pointerup',up);viewport.removeEventListener('pointercancel',up);viewport.removeEventListener('lostpointercapture',up);viewport.removeEventListener('wheel',wheel);const geometry=new Set<THREE.BufferGeometry>();scene.traverse(object=>{if(object instanceof THREE.Mesh)geometry.add(object.geometry);});geometry.forEach(g=>g.dispose());[wood,edge,wall,plastic,rug,lampMaterial].forEach(m=>m.dispose());timber.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[reduced]);
 const selected=focus===null?undefined:groups[focus];
 const displayGroups=groups.map((group,index)=>({group,index})).sort((a,b)=>Number(Boolean(b.group.collection))-Number(Boolean(a.group.collection)));
 const library=(index:number)=>onLibrary(groups[index].genre,groups[index].collection);
 return <section className="collection-room" aria-label="Sala de colección" inert={blocked} aria-hidden={blocked}>
  <div ref={viewportRef} className={`collection-viewport ${focus===null?(layout==='room'?'is-spatial':'is-overview'):'is-focused'} ${reduced?'reduce-motion':''}`} aria-label={focus===null?(layout==='room'?'Habitación de juegos 3D':'Todas las estanterías'):'Estantería ampliada'} tabIndex={0}>
   <div ref={host} className="collection-world" data-testid="collection-room">
    {displayGroups.map(({group,index:i})=><article key={group.id} className="collection-shelf" data-shelf-index={i} aria-label={`Estantería de ${group.title}`} aria-hidden={focus!==null&&focus!==i}>
     <button className="genre-plaque" onClick={()=>chooseFocus(i)}>{group.title}<small>{group.collection?'Central · ':''}{group.games.length} {group.games.length===1?'juego':'juegos'}{group.collection==='most-played'?' · Horas de ejemplo':''}</small></button>
     {group.games.slice(0,shelfCapacity).map((game,j)=><button key={game.id} className="collection-cover" data-shelf-slot={j} data-game-id={game.id} aria-label={`Ver ${game.title}`} onClick={()=>onGame(game)}><GameArt game={game} preload={preloaded.has(i)&&(focus===i||j<2)}/><span className="collection-case-title">{game.title}</span></button>)}
     {!group.games.length&&<div className="collection-empty"><p>Marca juegos con la estrella para verlos aquí.</p><button className="quiet-button" onClick={()=>onLibrary()}>Buscar juegos</button></div>}
     <div className="collection-shelf-actions"><button className="quiet-button" onClick={()=>chooseFocus(i)}>Ver estantería</button><button className="quiet-button" aria-label={`Biblioteca de ${group.title}`} onClick={()=>library(i)}>Biblioteca · {group.games.length}</button></div>
    </article>)}
   </div>
  </div>
  <header className="collection-toolbar"><button className="quiet-button" onClick={onBack}>← Volver a mi habitación</button><label>Estantería<select aria-label="Elegir estantería por género" value={focus??''} onChange={event=>chooseFocus(event.target.value===''?null:Number(event.target.value))}><option value="">{layout==='room'?'Vista de la sala':'Todas las estanterías'}</option>{displayGroups.map(({group,index:i})=><option key={group.id} value={i}>{group.title}</option>)}</select></label><div className="collection-navigation"><button className="quiet-button" onClick={()=>{setLayout(layout==='room'?'shelves':'room');chooseFocus(null);}}>{layout==='room'?'Índice frontal':'Sala 3D'}</button><button className="quiet-button" onClick={()=>onLibrary()}>Biblioteca completa</button></div></header>
  {layout==='room'&&focus===null&&<nav className="collection-room-views" aria-label="Vistas de la sala">{(Object.entries(roomViews) as [RoomView,typeof roomViews[RoomView]][]).map(([id,view])=><button key={id} className="quiet-button" aria-pressed={roomView===id} onClick={()=>chooseRoomView(id)}>{view.title}</button>)}</nav>}
  <footer className="collection-footer">{selected?<><strong>{selected.title}</strong><span>Hasta {Math.min(shelfCapacity,selected.games.length)} portadas · {selected.games.length} juegos{selected.collection==='most-played'?' · Horas de ejemplo':''}</span><button className="primary-button" onClick={()=>library(focus!)}>Ver biblioteca de {selected.title} →</button><button className="quiet-button" onClick={()=>chooseFocus(null)}>{layout==='room'?'Volver a la sala':'Ver todas las estanterías'}</button></>:<p>{layout==='room'?'Arrastra para mirar · Rueda para ampliar · Pulsa una estantería para ver sus juegos.':'Índice opcional de estanterías: desplázate para verlas de frente. Sala 3D vuelve a la habitación.'}</p>}</footer>
  {error&&<div className="collection-error"><p>No se pudo abrir la sala 3D.</p><button className="primary-button" onClick={()=>onLibrary()}>Ver biblioteca completa</button></div>}
 </section>;
}
