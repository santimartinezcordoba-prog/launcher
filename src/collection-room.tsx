import {useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import type {Game} from './games';
import {collectionShelves,shelfCapacity,shelfWidth,arrangeShelves,bayPosition,baySpacing,cameraDistance,type CollectionFilter} from './collection-layout';
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
 const arrangement=useMemo(()=>arrangeShelves(groups),[groups]);
 const arrangementKey=JSON.stringify(arrangement);
 const host=useRef<HTMLDivElement>(null),[focus,setFocus]=useState<number|null>(null),[error,setError]=useState(false);const focusRef=useRef(focus);focusRef.current=focus;const [preview,setPreview]=useState<{game:Game;x:number;y:number}|null>(null);
 const previewTarget=useRef<HTMLButtonElement|null>(null);
 const clearPreview=()=>{previewTarget.current=null;setPreview(null);};
 useEffect(clearPreview,[focus,blocked]);
 const showPreview=(game:Game,element:HTMLButtonElement)=>{if(focus!==null||previewTarget.current===element)return;previewTarget.current=element;const b=element.getBoundingClientRect(),width=190,height=320;setPreview({game,x:b.right+width+16<innerWidth?b.right+12:Math.max(12,b.left-width-12),y:Math.max(80,Math.min(innerHeight-height-80,b.top-70))});};
 const [preloaded,setPreloaded]=useState<Set<number>>(()=>new Set()),preloadedRef=useRef(new Set<number>());
 useEffect(()=>{
  const container=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor('#171e1c');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;container.prepend(renderer.domElement);
  let dirty=true;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,70);scene.add(new THREE.HemisphereLight('#eee3cd','#647568',2),new THREE.AmbientLight('#eee7db',.8));const sun=new THREE.DirectionalLight('#ffe0b1',3);sun.position.set(-3,3,4);sun.castShadow=true;sun.shadow.bias=-.001;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,far:45});scene.add(sun);
  const timber=new THREE.TextureLoader().load('./textures/wood.jpg',()=>{dirty=true;renderer.shadowMap.needsUpdate=true;});timber.colorSpace=THREE.SRGBColorSpace;timber.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const wood=new THREE.MeshStandardMaterial({color:'#bea78f',roughness:.75,map:timber}),edge=new THREE.MeshStandardMaterial({color:'#cdb291',roughness:.6,map:timber}),wall=new THREE.MeshStandardMaterial({color:'#35493f',roughness:.95}),plastic=new THREE.MeshStandardMaterial({color:'#152326',roughness:.5});
  function box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const placements=arrangement,wallTop=Math.max(...placements.map(p=>p.position[1]+p.height))+.6;
  const floorTexture=timber.clone();floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;floorTexture.repeat.set(3,10);
  const floorMaterial=new THREE.MeshStandardMaterial({color:'#b6a188',roughness:.9,map:floorTexture});
  box(scene,0,-.1,19.5,18.4,.2,41,floorMaterial);
  box(scene,-9.2,wallTop/2,20,.15,wallTop,40,wall);box(scene,9.2,wallTop/2,20,.15,wallTop,40,wall);box(scene,0,wallTop+.05,19.5,18.4,.1,41,wall);
  for(let bay=0;bay<5;bay++){
   const [x,z,rotation]=bayPosition(bay),facet=new THREE.Group();facet.position.set(x,0,z);facet.rotation.y=rotation;scene.add(facet);
   box(facet,0,wallTop/2,-.23,baySpacing+.06,wallTop,.15,wall);
   for(const x of [-shelfWidth/2-.06,shelfWidth/2+.06])box(facet,x,wallTop/2,.12,.10,wallTop,.48,edge);
  }
  const racks=groupsRef.current.map((_,i)=>{
   const placement=placements[i],root=new THREE.Group();root.position.fromArray(placement.position);root.rotation.y=placement.rotation;scene.add(root);
   const height=placement.height;
   box(root,0,height/2,-.02,shelfWidth-.12,height-.08,.1,wood);
   for(const x of [-shelfWidth/2+.04,shelfWidth/2-.04])box(root,x,height/2,.16,.08,height,.5,edge);
   for(const y of [.1,...(placement.rows===2?[1.375]:[]),height-.04])box(root,0,y,.17,shelfWidth,.08,.56,edge);
   const covers=Array.from({length:shelfCapacity},(_,j)=>{const x=(j%4-1.5)*.78,y=placement.rows===1||j>=4?.725:2,mesh=box(root,x,y,.26,.78,1.17,.1,plastic);return {mesh,x,y,slot:j};});return {root,covers,placement};
  });
  container.dataset.rackLayout=JSON.stringify(racks.map((rack,i)=>({title:groupsRef.current[i].title,position:rack.root.position.toArray(),rotation:rack.root.rotation.y,height:rack.placement.height,bay:rack.placement.bay})));
  const top=Math.max(...placements.map(p=>p.position[1]+p.height))+.22;
  const home=new THREE.Vector3(0,top/2,cameraDistance),homeLook=new THREE.Vector3(0,top/2,0),from=new THREE.Vector3(),fromLook=homeLook.clone(),look=homeLook.clone();
  camera.position.copy(home);camera.lookAt(homeLook);camera.updateMatrixWorld();
  let current:number|null|undefined=undefined,start=0,frame=0,renderCount=0,disposed=false,overviewFov=15,fromViewHeight=1;
  let currentGroups=groupsRef.current;
  scene.updateMatrixWorld(true);
  const rackCorners=racks.map(rack=>{const box=new THREE.Box3().setFromObject(rack.root);box.max.y+=.22;return [box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>new THREE.Vector3(x,y,z))));});
  const fitCamera=new THREE.PerspectiveCamera(15,1,.1,100);fitCamera.position.copy(home);fitCamera.lookAt(homeLook);fitCamera.updateMatrixWorld();
  function resize(){
   const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
   renderer.setSize(w,h);camera.aspect=w/h;
   const horizontal=1-48/w,verticalTop=1-176/h,verticalBottom=1-170/h;
   let tangent=0;
   for(const corners of rackCorners)for(const corner of corners){const local=corner.clone().applyMatrix4(fitCamera.matrixWorldInverse),depth=-local.z;tangent=Math.max(tangent,Math.abs(local.x)/(depth*camera.aspect*horizontal),Math.abs(local.y)/(depth*(local.y>0?verticalTop:verticalBottom)));}
   overviewFov=THREE.MathUtils.radToDeg(2*Math.atan(tangent*1.005));
   if(current===undefined||focusRef.current===null){camera.fov=overviewFov;camera.updateProjectionMatrix();fromViewHeight=2*camera.position.distanceTo(look)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));}
   dirty=true;
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const project=(v:THREE.Vector3)=>v.clone().project(camera);
  function tick(time:number){if(disposed)return;const selected=focusRef.current;
   if(currentGroups!==groupsRef.current){currentGroups=groupsRef.current;dirty=true;renderer.shadowMap.needsUpdate=true;}
   if(current!==selected){current=selected;renderer.shadowMap.needsUpdate=true;from.copy(camera.position);fromLook.copy(look);fromViewHeight=2*camera.position.distanceTo(look)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));start=time;dirty=true;}
   let target=home,targetLook=homeLook;
   if(selected!==null){const rack=racks[selected];targetLook=rack.root.localToWorld(new THREE.Vector3(0,rack.placement.height/2,.25));target=rack.root.localToWorld(new THREE.Vector3(0,rack.placement.height/2+.15,3.4));}
   const t=reduced||matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(time-start)/650),factor=1-(1-t)**3;
   if(dirty||t<1){camera.position.lerpVectors(from,target,factor);look.lerpVectors(fromLook,targetLook,factor);camera.lookAt(look);const targetFov=selected===null?overviewFov:55,targetViewHeight=2*target.distanceTo(targetLook)*Math.tan(THREE.MathUtils.degToRad(targetFov/2)),viewHeight=THREE.MathUtils.lerp(fromViewHeight,targetViewHeight,factor);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(viewHeight/(2*Math.max(.1,camera.position.distanceTo(look)))));camera.updateProjectionMatrix();camera.updateMatrixWorld();scene.updateMatrixWorld(true);
    const w=container.clientWidth,h=container.clientHeight;let newPreloads=false;
    racks.forEach((rack,i)=>{
     const label=container.querySelector<HTMLElement>(`[data-genre-index="${i}"]`),p=project(rack.root.localToWorld(new THREE.Vector3(0,rack.placement.height+.12,.25)));
     if(label){
      const projected=rackCorners[i].map(project),rackWidth=(Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)))*w/2;
      const scale=Math.min(1,rackWidth*.86/Math.max(1,label.offsetWidth));
      label.style.left=`${(p.x+1)*w/2}px`;label.style.top=`${(1-p.y)*h/2}px`;label.style.transform=`translate(-50%,-50%) scale(${scale})`;
      label.style.visibility=selected===null&&p.z>0&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1?'visible':'hidden';
     }
     rack.covers.forEach(({mesh,x,y,slot})=>{
      const game=groupsRef.current[i].games[slot];if(!game){mesh.visible=false;return;}
      const points=[[-.38,.57],[.38,.57],[.38,-.57],[-.38,-.57]].map(([dx,dy])=>project(rack.root.localToWorld(new THREE.Vector3(x+dx,y+dy,.322))));
      // The shallow, front-facing layout keeps every cover legible in the room overview.
      const visible=points.every(p=>p.z>0&&p.z<1)&&points.some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1)&&(selected===null||selected===i);
      if(visible&&points.some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1)&&!preloadedRef.current.has(game.id)){preloadedRef.current.add(game.id);newPreloads=true;}
      mesh.visible=visible;const button=container.querySelector<HTMLElement>(`[data-collection-game="${i}:${slot}"]`);if(button){button.style.visibility=visible?'visible':'hidden';button.style.transform=visible?quad(points,w,h):'';}
     });
    });
    if(selected===null)container.dataset.rackScreenBounds=JSON.stringify(rackCorners.map((corners,i)=>{const points=corners.map(project);return {title:groupsRef.current[i].title,left:Math.min(...points.map(p=>(p.x+1)*w/2)),right:Math.max(...points.map(p=>(p.x+1)*w/2)),top:Math.min(...points.map(p=>(1-p.y)*h/2)),bottom:Math.max(...points.map(p=>(1-p.y)*h/2))};}));
    container.dataset.viewportSize=`${w}x${h}`;
    // Visibility uses the settled projection; draw physical cases once with those visibility flags.
    if(t===1)renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);if(newPreloads)setPreloaded(new Set(preloadedRef.current));container.dataset.frame=String(++renderCount);container.dataset.genre=selected===null?'all':groupsRef.current[selected].title;container.dataset.layout=selected===null?'room':'focus';container.dataset.motion=t<1?'moving':'idle';container.dataset.rendered='true';dirty=t<1;
   }frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();const geometries=new Set<THREE.BufferGeometry>();scene.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());[wood,edge,wall,plastic,floorMaterial].forEach(m=>m.dispose());timber.dispose();floorTexture.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[reduced,arrangementKey]);
 const selected=focus===null?undefined:groups[focus];
 const library=(index:number)=>onLibrary(groups[index].genre,groups[index].collection);
 return <section className="collection-room" aria-label="Sala de colección" inert={blocked} aria-hidden={blocked}>
  <div ref={host} className="collection-world" data-testid="collection-room">
   {groups.map((group,i)=><article key={group.id} aria-label={`Estantería de ${group.title}`} hidden={focus!==null&&focus!==i}>
    <button className="genre-plaque" data-genre-index={i} onClick={()=>setFocus(i)}>{group.title}<small>{group.games.length} juegos · Acercarse{group.collection==='most-played'?' · Horas de ejemplo':''}</small></button>
    {group.games.slice(0,shelfCapacity).map((game,j)=><button key={game.id} className="collection-cover" data-collection-game={`${i}:${j}`} data-game-id={game.id} aria-label={`Ver ${game.title}`} onPointerMove={event=>{if(event.movementX||event.movementY)showPreview(game,event.currentTarget);}} onPointerLeave={clearPreview} onFocus={event=>showPreview(game,event.currentTarget)} onBlur={clearPreview} onClick={()=>{clearPreview();onGame(game);}}><GameArt game={game} preload={preloaded.has(game.id)}/><span className="collection-case-title">{game.title}</span></button>)}
   </article>)}
  </div>
  <header className="collection-toolbar"><button className="quiet-button" onClick={onBack}>← Volver a mi habitación</button><label>Estantería<select aria-label="Elegir estantería por género" value={focus??''} onChange={event=>setFocus(event.target.value===''?null:Number(event.target.value))}><option value="">Vista de la sala completa</option>{groups.map((group,i)=><option key={group.id} value={i}>{group.title}</option>)}</select></label><button className="quiet-button" onClick={()=>onLibrary()}>Biblioteca completa</button></header>
  <footer className="collection-footer">{selected?<><strong>{selected.title}</strong><span>Hasta {Math.min(shelfCapacity,selected.games.length)} portadas · {selected.games.length} juegos{selected.collection==='most-played'?' · Horas de ejemplo':''}</span><button className="primary-button" onClick={()=>library(focus!)}>Ver biblioteca de {selected.title} →</button><button className="quiet-button" onClick={()=>setFocus(null)}>Ver toda la sala</button></>:<p>Pasa el ratón por un juego para ampliar su portada. Pulsa un género para acercarte y abrir su biblioteca.</p>}</footer>
  {preview&&focus===null&&!blocked&&<aside className="collection-game-preview" aria-label="Portada ampliada" style={{left:preview.x,top:preview.y}}><div><GameArt key={preview.game.id} game={preview.game} preload/></div><strong>{preview.game.title}</strong></aside>}
  {selected&&!selected.games.length&&<div className="collection-empty"><p>Marca juegos con la estrella para verlos aquí.</p><button className="quiet-button" onClick={()=>onLibrary()}>Buscar juegos</button></div>}
  {error&&<div className="collection-error"><p>No se pudo abrir la sala 3D.</p><button className="primary-button" onClick={()=>onLibrary()}>Ver biblioteca completa</button></div>}
 </section>;
}
