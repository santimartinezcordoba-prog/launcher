import {useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import type {Game} from './games';
import {collectionShelves,shelfCapacity,shelfWidth,shelfPosition,type CollectionFilter} from './collection-layout';
import {GameArt} from './game-art';
import './collection-room.css';
// Project a rectangular DOM cover onto its actual 3D face, including the side walls.
function quad(points:THREE.Vector3[],width:number,height:number){
 const input=[[0,0],[180,0],[180,270],[0,270]],rows:number[][]=[];
 points.forEach((p,i)=>{const x=(p.x+1)*width/2,y=(1-p.y)*height/2,[u,v]=input[i];rows.push([u,v,1,0,0,0,-u*x,-v*x,x],[0,0,0,u,v,1,-u*y,-v*y,y]);});
 for(let k=0;k<8;k++){let best=k;for(let j=k+1;j<8;j++)if(Math.abs(rows[j][k])>Math.abs(rows[best][k]))best=j;[rows[k],rows[best]]=[rows[best],rows[k]];const d=rows[k][k];if(Math.abs(d)<1e-8)return '';for(let j=k;j<9;j++)rows[k][j]/=d;for(let i=0;i<8;i++)if(i!==k){const n=rows[i][k];for(let j=k;j<9;j++)rows[i][j]-=n*rows[k][j];}}
 const [a,b,c,d,e,f,g,h]=rows.map(r=>r[8]);return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
}
export function CollectionRoom({favorites,onBack,onLibrary,onGame,blocked,reduced}:{favorites:number[];onBack:()=>void;onLibrary:(genre?:string,collection?:CollectionFilter)=>void;onGame:(g:Game)=>void;blocked:boolean;reduced:boolean}){
 const groups=useMemo(()=>collectionShelves(favorites),[favorites]),groupsRef=useRef(groups);groupsRef.current=groups;
 const host=useRef<HTMLDivElement>(null),[focus,setFocus]=useState<number|null>(null),[error,setError]=useState(false);const focusRef=useRef(focus);focusRef.current=focus;const [preloaded,setPreloaded]=useState<Set<number>>(()=>new Set()),preloadedRef=useRef(new Set<number>());
 useEffect(()=>{
  const container=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor('#171e1c');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;container.prepend(renderer.domElement);
  let dirty=true;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,70);scene.add(new THREE.HemisphereLight('#eee3cd','#647568',2),new THREE.AmbientLight('#eee7db',.8));const sun=new THREE.DirectionalLight('#ffe0b1',3);sun.position.set(-3,3,4);sun.castShadow=true;sun.shadow.bias=-.001;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,far:45});scene.add(sun);
  const timber=new THREE.TextureLoader().load('./textures/wood.jpg',()=>{dirty=true;renderer.shadowMap.needsUpdate=true;});timber.colorSpace=THREE.SRGBColorSpace;timber.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const wood=new THREE.MeshStandardMaterial({color:'#bea78f',roughness:.75,map:timber}),edge=new THREE.MeshStandardMaterial({color:'#cdb291',roughness:.6,map:timber}),wall=new THREE.MeshStandardMaterial({color:'#35493f',roughness:.95}),plastic=new THREE.MeshStandardMaterial({color:'#152326',roughness:.5});
  function box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  box(scene,0,-.1,0,22.5,.2,17.5,wood);box(scene,0,1.8,-8.65,22.5,3.6,.15,wall);box(scene,-11.25,1.8,0,.15,3.6,17.3,wall);box(scene,11.25,1.8,0,.15,3.6,17.3,wall);box(scene,0,3.65,0,22.5,.1,17.3,wall);
  for(let x=-11;x<11.2;x+=.4)box(scene,x,.004,0,.009,.005,17.3,edge);
  const racks=groupsRef.current.map((_,i)=>{
   const root=new THREE.Group(),[x,y,z,rotation]=shelfPosition(i);root.position.set(x,y,z);root.rotation.y=rotation;scene.add(root);
   box(root,0,1.2,-.02,shelfWidth-.12,2.45,.1,wood);for(const x of [-shelfWidth/2+.04,shelfWidth/2-.04])box(root,x,1.2,.16,.1,2.55,.5,edge);for(const y of [.1,1.22,2.48])box(root,0,y,.17,shelfWidth,.08,.56,edge);
   const covers=Array.from({length:shelfCapacity},(_,j)=>{const x=(j%4-1.5)*.78,y=j<4?1.74:.62,mesh=box(root,x,y,.26,.64,.96,.1,plastic);return {mesh,x,y,slot:j};});return {root,covers};
  });
  container.dataset.rackLayout=JSON.stringify(racks.map((rack,i)=>({title:groupsRef.current[i].title,position:rack.root.position.toArray(),rotation:rack.root.rotation.y})));
  const home=new THREE.Vector3(0,2.2,4.4),homeLook=new THREE.Vector3(0,1.35,-3),from=new THREE.Vector3(),fromLook=homeLook.clone(),look=homeLook.clone();camera.position.copy(home);let current:number|null|undefined=undefined,start=0,frame=0,renderCount=0,disposed=false;let currentGroups=groupsRef.current;
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const project=(v:THREE.Vector3)=>v.clone().project(camera);
  function tick(time:number){if(disposed)return;const selected=focusRef.current;
   if(currentGroups!==groupsRef.current){currentGroups=groupsRef.current;dirty=true;renderer.shadowMap.needsUpdate=true;}
   if(current!==selected){current=selected;renderer.shadowMap.needsUpdate=true;from.copy(camera.position);fromLook.copy(look);start=time;dirty=true;}
   let target=home,targetLook=homeLook;
   if(selected!==null){const rack=racks[selected];targetLook=rack.root.localToWorld(new THREE.Vector3(0,1.32,.25));target=rack.root.localToWorld(new THREE.Vector3(0,1.55,3.4));}
   const t=reduced||matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(time-start)/650),factor=1-(1-t)**3;
   if(dirty||t<1){camera.position.lerpVectors(from,target,factor);look.lerpVectors(fromLook,targetLook,factor);camera.lookAt(look);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
    const w=container.clientWidth,h=container.clientHeight,labels:DOMRect[]=[];let newPreloads=false;
    racks.forEach((rack,i)=>{
     const label=container.querySelector<HTMLElement>(`[data-genre-index="${i}"]`),p=project(rack.root.localToWorld(new THREE.Vector3(0,2.7,.25)));
     if(label){label.style.left=`${(p.x+1)*w/2}px`;label.style.top=`${(1-p.y)*h/2}px`;label.style.visibility=selected===null&&p.z>0&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1?'visible':'hidden';if(label.style.visibility==='visible'){const bounds=label.getBoundingClientRect();if(labels.some(b=>bounds.left<b.right+6&&bounds.right>b.left-6&&bounds.top<b.bottom+6&&bounds.bottom>b.top-6))label.style.visibility='hidden';else labels.push(bounds);}}
     rack.covers.forEach(({mesh,x,y,slot})=>{
      const game=groupsRef.current[i].games[slot];if(!game){mesh.visible=false;return;}
      const points=[[-.3,.45],[.3,.45],[.3,-.45],[-.3,-.45]].map(([dx,dy])=>project(rack.root.localToWorld(new THREE.Vector3(x+dx,y+dy,.322))));
      // Keep the original perspective room: distant covers remain visible without the F11 size cutoff.
      const visible=points.every(p=>p.z>0&&p.z<1)&&points.some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1)&&(selected===null||selected===i);
      if(visible&&points.some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1)&&!preloadedRef.current.has(game.id)){preloadedRef.current.add(game.id);newPreloads=true;}
      mesh.visible=visible;const button=container.querySelector<HTMLElement>(`[data-collection-game="${i}:${slot}"]`);if(button){button.style.visibility=visible?'visible':'hidden';button.style.transform=visible?quad(points,w,h):'';}
     });
    });
    // Visibility uses the settled projection; draw physical cases once with those visibility flags.
    if(t===1)renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);if(newPreloads)setPreloaded(new Set(preloadedRef.current));container.dataset.frame=String(++renderCount);container.dataset.genre=selected===null?'all':groupsRef.current[selected].title;container.dataset.layout=selected===null?'room':'focus';container.dataset.motion=t<1?'moving':'idle';container.dataset.rendered='true';dirty=t<1;
   }frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();const geometries=new Set<THREE.BufferGeometry>();scene.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());[wood,edge,wall,plastic].forEach(m=>m.dispose());timber.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[reduced]);
 const selected=focus===null?undefined:groups[focus];
 const library=(index:number)=>onLibrary(groups[index].genre,groups[index].collection);
 return <section className="collection-room" aria-label="Sala de colección" inert={blocked} aria-hidden={blocked}>
  <div ref={host} className="collection-world" data-testid="collection-room">
   {groups.map((group,i)=><article key={group.id} aria-label={`Estantería de ${group.title}`} hidden={focus!==null&&focus!==i}>
    <button className="genre-plaque" data-genre-index={i} onClick={()=>setFocus(i)}>{group.title}<small>{group.games.length} juegos · Acercarse{group.collection==='most-played'?' · Horas de ejemplo':''}</small></button>
    {group.games.slice(0,shelfCapacity).map((game,j)=><button key={game.id} className="collection-cover" data-collection-game={`${i}:${j}`} data-game-id={game.id} aria-label={`Ver ${game.title}`} onClick={()=>onGame(game)}><GameArt game={game} preload={preloaded.has(game.id)}/><span className="collection-case-title">{game.title}</span></button>)}
   </article>)}
  </div>
  <header className="collection-toolbar"><button className="quiet-button" onClick={onBack}>← Volver a mi habitación</button><label>Estantería<select aria-label="Elegir estantería por género" value={focus??''} onChange={event=>setFocus(event.target.value===''?null:Number(event.target.value))}><option value="">Vista de la sala completa</option>{groups.map((group,i)=><option key={group.id} value={i}>{group.title}</option>)}</select></label><button className="quiet-button" onClick={()=>onLibrary()}>Biblioteca completa</button></header>
  <footer className="collection-footer">{selected?<><strong>{selected.title}</strong><span>Hasta {Math.min(shelfCapacity,selected.games.length)} portadas · {selected.games.length} juegos{selected.collection==='most-played'?' · Horas de ejemplo':''}</span><button className="primary-button" onClick={()=>library(focus!)}>Ver biblioteca de {selected.title} →</button><button className="quiet-button" onClick={()=>setFocus(null)}>Ver toda la sala</button></>:<p>Elige una estantería para ver sus portadas con claridad. Los juegos que no caben siguen en la biblioteca de su género.</p>}</footer>
  {selected&&!selected.games.length&&<div className="collection-empty"><p>Marca juegos con la estrella para verlos aquí.</p><button className="quiet-button" onClick={()=>onLibrary()}>Buscar juegos</button></div>}
  {error&&<div className="collection-error"><p>No se pudo abrir la sala 3D.</p><button className="primary-button" onClick={()=>onLibrary()}>Ver biblioteca completa</button></div>}
 </section>;
}
