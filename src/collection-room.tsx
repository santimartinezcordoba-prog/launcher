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

type Props={favorites:number[];onBack:()=>void;onLibrary:(genre?:string,collection?:CollectionFilter)=>void;onGame:(game:Game)=>void;blocked:boolean;reduced:boolean};
export function CollectionRoom({favorites,onBack,onLibrary,onGame,blocked,reduced}:Props){
 const groups=useMemo(()=>collectionShelves(favorites),[favorites]);
 const groupsRef=useRef(groups);groupsRef.current=groups;
 const host=useRef<HTMLDivElement>(null),viewportRef=useRef<HTMLDivElement>(null);
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
  let currentGroups=groupsRef.current;
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#eee3cd','#647568',2.4),new THREE.AmbientLight('#eee7db',1));
  const sun=new THREE.DirectionalLight('#ffe0b1',3);sun.position.set(-3,7,6);sun.castShadow=true;sun.shadow.bias=-.001;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,far:50});scene.add(sun);
  const timber=new THREE.TextureLoader().load('./textures/wood.jpg',()=>{if(!disposed)dirty=true;});timber.colorSpace=THREE.SRGBColorSpace;timber.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const wood=new THREE.MeshStandardMaterial({color:'#d0baa0',roughness:.75,map:timber}),edge=new THREE.MeshStandardMaterial({color:'#dcc4a5',roughness:.6,map:timber}),wall=new THREE.MeshStandardMaterial({color:'#35493f',roughness:.95}),plastic=new THREE.MeshStandardMaterial({color:'#152326',roughness:.5});
  function box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const room=new THREE.Group();scene.add(room);
  box(room,0,-.1,0,19.6,.2,21,wood);
  function roomBox(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){return box(room,x,y,z,w,h,d,material);}
  roomBox(0,1.8,-10,19.6,3.6,.15,wall);roomBox(-9.8,1.8,0,.15,3.6,20,wall);roomBox(9.8,1.8,0,.15,3.6,20,wall);roomBox(0,3.65,0,19.6,.1,20,wall);
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
   const next=focusRef.current===null?racks.map((_,i)=>i).filter(i=>{const {top}=tilePosition(i);return top+tileHeight>viewport.scrollTop&&top<viewport.scrollTop+viewport.clientHeight;}):[focusRef.current];
   let changed=false;for(const i of next)if(i!==null&&!preloadedRef.current.has(i)){preloadedRef.current.add(i);changed=true;}
   if(changed)setPreloaded(new Set(preloadedRef.current));
  }
  function resize(){
   width=viewport.clientWidth;
   if(!width||!viewport.clientHeight)return;
   columns=Math.max(1,Math.min(4,Math.floor(width/340)));
   tileWidth=width/columns;previewHeight=Math.round(tileWidth*3/4.9);tileHeight=previewHeight+94;
   height=focusRef.current===null?(Math.ceil(2/columns)+Math.ceil(12/columns))*tileHeight:viewport.clientHeight;
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
     button.style.visibility=visible?'visible':'hidden';
     if(visible){const points=[[-.3,.45],[.3,.45],[.3,-.45],[-.3,-.45]].map(([dx,dy])=>rack.root.localToWorld(new THREE.Vector3(x+dx*scale,y+dy*scale,z+.062)).project(camera));button.style.transform=quad(points,w,h);}
    }
   });
   renderer.setViewport(left,height-top-offset-h,w,h);renderer.setScissor(left,height-top-offset-h,w,h);
   renderer.render(scene,camera);
  }
  function tick(){
   if(disposed)return;
   const selected=focusRef.current;
   if(current!==selected){
    current=selected;resize();viewport.scrollTop=selected===null?overviewScroll.current:0;dirty=true;
   }
   if(currentGroups!==groupsRef.current){currentGroups=groupsRef.current;dirty=true;preloadVisible();}
   if(dirty){
    // A camera per shelf keeps every overview frontal, with a fixed readable size.
    renderer.shadowMap.enabled=selected!==null;renderer.shadowMap.needsUpdate=selected!==null;
    renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
    racks.forEach((rack,i)=>{if(selected!==null&&selected!==i){rack.cases.forEach(mesh=>mesh.visible=false);const article=container.querySelector<HTMLElement>(`[data-shelf-index="${i}"]`);if(article)article.hidden=true;}});
    if(selected===null)racks.forEach((_,i)=>renderRack(i,false));else renderRack(selected,true);
    container.dataset.frame=String(++renderCount);container.dataset.genre=selected===null?'all':groupsRef.current[selected].title;container.dataset.motion='idle';container.dataset.rendered='true';dirty=false;
   }
   frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();viewport.removeEventListener('scroll',scroll);const geometry=new Set<THREE.BufferGeometry>();scene.traverse(object=>{if(object instanceof THREE.Mesh)geometry.add(object.geometry);});geometry.forEach(g=>g.dispose());[wood,edge,wall,plastic].forEach(m=>m.dispose());timber.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[reduced]);
 const selected=focus===null?undefined:groups[focus];
 const displayGroups=groups.map((group,index)=>({group,index})).sort((a,b)=>Number(Boolean(b.group.collection))-Number(Boolean(a.group.collection)));
 const library=(index:number)=>onLibrary(groups[index].genre,groups[index].collection);
 return <section className="collection-room" aria-label="Sala de colección" inert={blocked} aria-hidden={blocked}>
  <div ref={viewportRef} className={`collection-viewport ${focus===null?'is-overview':'is-focused'} ${reduced?'reduce-motion':''}`} aria-label={focus===null?'Todas las estanterías':'Estantería ampliada'} tabIndex={0}>
   <div ref={host} className="collection-world" data-testid="collection-room">
    {displayGroups.map(({group,index:i})=><article key={group.id} className="collection-shelf" data-shelf-index={i} aria-label={`Estantería de ${group.title}`} aria-hidden={focus!==null&&focus!==i}>
     <button className="genre-plaque" onClick={()=>chooseFocus(i)}>{group.title}<small>{group.collection?'Central · ':''}{group.games.length} {group.games.length===1?'juego':'juegos'}{group.collection==='most-played'?' · Horas de ejemplo':''}</small></button>
     {group.games.slice(0,shelfCapacity).map((game,j)=><button key={game.id} className="collection-cover" data-shelf-slot={j} data-game-id={game.id} aria-label={`Ver ${game.title}`} onClick={()=>onGame(game)}><GameArt game={game} preload={preloaded.has(i)&&(focus===i||j<2)}/><span className="collection-case-title">{game.title}</span></button>)}
     {!group.games.length&&<div className="collection-empty"><p>Marca juegos con la estrella para verlos aquí.</p><button className="quiet-button" onClick={()=>onLibrary()}>Buscar juegos</button></div>}
     <div className="collection-shelf-actions"><button className="quiet-button" onClick={()=>chooseFocus(i)}>Ver estantería</button><button className="quiet-button" aria-label={`Biblioteca de ${group.title}`} onClick={()=>library(i)}>Biblioteca · {group.games.length}</button></div>
    </article>)}
   </div>
  </div>
  <header className="collection-toolbar"><button className="quiet-button" onClick={onBack}>← Volver a mi habitación</button><label>Estantería<select aria-label="Elegir estantería por género" value={focus??''} onChange={event=>chooseFocus(event.target.value===''?null:Number(event.target.value))}><option value="">Todas las estanterías</option>{displayGroups.map(({group,index:i})=><option key={group.id} value={i}>{group.title}</option>)}</select></label><button className="quiet-button" onClick={()=>onLibrary()}>Biblioteca completa</button></header>
  <footer className="collection-footer">{selected?<><strong>{selected.title}</strong><span>Hasta {Math.min(shelfCapacity,selected.games.length)} portadas · {selected.games.length} juegos{selected.collection==='most-played'?' · Horas de ejemplo':''}</span><button className="primary-button" onClick={()=>library(focus!)}>Ver biblioteca de {selected.title} →</button><button className="quiet-button" onClick={()=>chooseFocus(null)}>Ver todas las estanterías</button></>:<p>Desplázate para ver todas las estanterías. Acércate a una para consultar hasta ocho portadas y abre su biblioteca para ver todos sus juegos.</p>}</footer>
  {error&&<div className="collection-error"><p>No se pudo abrir la sala 3D.</p><button className="primary-button" onClick={()=>onLibrary()}>Ver biblioteca completa</button></div>}
 </section>;
}
