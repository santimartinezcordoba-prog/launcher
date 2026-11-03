"""Monta un entorno con los modelos proporcionados por el usuario.
Blender 4.3. Uso: blender -b --factory-startup --disable-autoexec --python montar_entorno.py -- --input ./input --output ./output
No ejecuta textos ni scripts de los .blend importados. Se recomienda una escena nueva.
"""
import bpy, math, argparse, sys, json, re
from pathlib import Path
from mathutils import Vector, Matrix
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--input',default=str(Path(__file__).parent/'input'));p.add_argument('--output',default=str(Path(__file__).parent/'output'));p.add_argument('--preview',action='store_true');p.add_argument('--engine',default='BLENDER_EEVEE_NEXT',choices=['CYCLES','BLENDER_EEVEE_NEXT']);opt=p.parse_args(args)
BASE=Path(opt.input).resolve();OUT=Path(opt.output).resolve();OUT.mkdir(parents=True,exist_ok=True)
required=['Cupboard_01.blend','Gaming setup Pro/gaming_setup.blend','FBX/RubberDuck_LOD0.fbx','Dumbledore+funko+pop+stl.stl','trophy.fbx']
for name in required:
 if not (BASE/name).is_file():raise FileNotFoundError(f'Falta el modelo: {BASE/name}')
scene=bpy.data.scenes.new('Habitación — modelos del usuario')
if bpy.context.window:bpy.context.window.scene=scene
# Añade una colección propia; no elimina la escena del usuario.
main=bpy.data.collections.new('ENTORNO — modelos del usuario');scene.collection.children.link(main)
def collection(name):
 c=bpy.data.collections.new(name);main.children.link(c);return c
architecture=collection('01 Arquitectura y cámara');bedroom=collection('02 Cama PROVISIONAL — falta archivo');gaming=collection('03 Setup gaming — importado');library=collection('04 Armario — importado');books=collection('05 Biblioteca — 50 juegos');awards=collection('06 Trofeos — importados');decor=collection('07 Figuras opcionales — importadas');lighting=collection('08 Iluminación')
active=architecture

def link(obj,name,coll=None):
 obj.name=name
 for c in list(obj.users_collection):c.objects.unlink(obj)
 (coll or active).objects.link(obj)
 return obj

def mat(name,color,rough=.5,metal=0,texture=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes;bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if texture:
  coord=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(3,140,5) if texture=='wood' else (180,180,180)
  noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=2;noise.inputs['Detail'].default_value=3
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.014 if texture=='wood' else .006
  links=m.node_tree.links;links.new(coord.outputs['Generated'],mapping.inputs[0]);links.new(mapping.outputs[0],noise.inputs['Vector']);links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],bs.inputs['Normal'])
 return m

def box(name,pos,dims,material,bevel=.015,coll=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  b=o.modifiers.new('Cantos naturales','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Normales','WEIGHTED_NORMAL')
 if material:o.data.materials.append(material)
 return link(o,name,coll)

def cylinder(name,pos,radius,depth,material,coll=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=pos);o=bpy.context.object
 if material:o.data.materials.append(material)
 for face in o.data.polygons:face.use_smooth=True
 return link(o,name,coll)

def sphere(name,pos,scale,material,coll=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=pos);o=bpy.context.object;o.scale=scale
 if material:o.data.materials.append(material)
 for face in o.data.polygons:face.use_smooth=True
 return link(o,name,coll)

def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

def text(name,body,pos,size,material,rotation=(math.pi/2,0,0),coll=None):
 data=bpy.data.curves.new(name,'FONT');data.body=body;data.size=size;data.align_x='CENTER';data.extrude=.0002
 o=bpy.data.objects.new(name,data);(coll or active).objects.link(o);o.location=pos;o.rotation_euler=rotation;o.data.materials.append(material);return o

def area(name,pos,target,power,color,size,shape='DISK',size_y=None):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape=shape;d.size=size
 if size_y and shape=='RECTANGLE':d.size_y=size_y
 o=bpy.data.objects.new(name,d);lighting.objects.link(o);o.location=pos;aim(o,target);return o

def load(name,coll,dimensions,position,angle=0):
 path=BASE/name;before=set(bpy.data.objects)
 if path.suffix=='.blend':
  with bpy.data.libraries.load(str(path),link=False) as (src,dst):dst.objects=src.objects
  objs=[o for o in dst.objects if o and o.type=='MESH']
  for o in objs:coll.objects.link(o)
 elif path.suffix=='.stl':
  bpy.ops.wm.stl_import(filepath=str(path));objs=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
 else:
  bpy.ops.import_scene.fbx(filepath=str(path),use_anim=False);objs=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
 bpy.context.view_layer.update()
 depsgraph=bpy.context.evaluated_depsgraph_get()
 saved={o:o.matrix_world.copy() for o in objs};R=Matrix.Rotation(angle,4,'Z')
 coords=[R@saved[o]@Vector(v) for o in objs for v in o.evaluated_get(depsgraph).bound_box];low=Vector([min(v[i] for v in coords) for i in range(3)]);high=Vector([max(v[i] for v in coords) for i in range(3)])
 sizes=high-low
 scales=Vector([dimensions[i]/sizes[i] for i in range(3)]) if isinstance(dimensions,tuple) else Vector((dimensions/max(sizes),)*3)
 M=Matrix.Translation(Vector(position))@Matrix.Diagonal((*scales,1))@Matrix.Translation(Vector((-(low.x+high.x)/2,-(low.y+high.y)/2,-low.z)))@R
 for o in objs:
  evaluated=o.evaluated_get(depsgraph)
  mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=depsgraph)
  mesh.transform(M@saved[o]);o.modifiers.clear();o.constraints.clear();o.parent=None;o.data=mesh;o.matrix_world=Matrix.Identity(4)
  link(o,name.split('/')[-1]+' / '+o.name,coll);o['source_asset']=name
 # Busca imágenes recibidas; elimina referencias a texturas ausentes más adelante.
 for img in bpy.data.images:
  if img.source=='FILE' and not img.packed_file:
   filename=Path(img.filepath.replace('\\','/')).name
   candidate=next((f for f in BASE.rglob(filename) if f.is_file()),None)
   if candidate:
    img.filepath=str(candidate)
    try:img.reload()
    except RuntimeError:pass
 return objs

wood=mat('Roble natural / sustitución de textura no incluida',(.34,.19,.085),.48,texture='wood')
walnut=mat('Nogal oscuro',(.12,.065,.032),.43,texture='wood')
wall=mat('Verde salvia profundo',(.11,.17,.15),.9)
ceiling=mat('Techo marfil',(.58,.56,.49),.95)
linen=mat('Lino crudo',(.67,.61,.48),.95,texture='fabric')
duvet=mat('Lino verde oliva',(.16,.22,.16),.95,texture='fabric')
black=mat('Metal grafito',(.023,.026,.029),.4,.65)
brass=mat('Latón cepillado',(.42,.28,.11),.3,.78)
white=mat('Rotulación marfil',(.8,.76,.64),.7)
platinum=mat('Platino cepillado',(.52,.63,.7),.24,.85)
glass=mat('Cristal oscuro',(.06,.105,.15),.18,.25)
# Arquitectura completa, con apertura de ventana en la pared izquierda.
box('Forjado',(0,0,-.12),(5.6,6.1,.20),wood)
for row in range(15):
 for col in range(6):
  x=-2.7+(col+.5)*.9;y=-2.9+(row+.5)*.39
  plank=mat(f'Roble parquet {row}-{col}',(.27+.025*((row+col)%4),.15+.013*((row+col)%4),.065+.008*((row+col)%4)),.48,texture='wood')
  box('Lama de parquet',(x,y,-.012),(.895,.385,.025),plank,.003)
box('Pared fondo',(0,3.02,1.43),(5.6,.14,2.86),wall)
box('Pared derecha',(2.77,0,1.43),(.14,6,2.86),wall)
box('Pared izquierda frontal',(-2.77,-1.45,1.43),(.14,2.9,2.86),wall)
box('Pared izquierda trasera',(-2.77,2.40,1.43),(.14,1.20,2.86),wall)
box('Bajo ventana',(-2.77,.9,.46),(.14,1.8,.92),wall)
box('Sobre ventana',(-2.77,.9,2.59),(.14,1.8,.54),wall)
box('Techo',(0,0,2.91),(5.6,6.1,.10),ceiling)
# Rodapiés y molduras discretas.
box('Rodapié fondo',(0,2.91,.055),(5.4,.05,.11),wood,.006)
for x in [-2.66,2.66]:
 box('Rodapié lateral',(x,0,.055),(.05,5.9,.11),wood,.006)
 box('Cornisa lateral',(x,0,2.76),(.12,5.9,.08),ceiling,.01)
box('Cornisa fondo',(0,2.88,2.76),(5.4,.12,.08),ceiling,.01)
for x in [-2.62,2.62]:box('Marco de entrada',(x,-2.96,1.42),(.15,.15,2.84),wood,.02)
# Ventana: apertura real, marco y cristal independiente.
for y in [-.02,.9,1.82]:box('Montante ventana',(-2.70,y,1.62),(.12,.045,1.42),wood,.006)
for z in [.92,2.32]:box('Travesaño ventana',(-2.70,.9,z),(.12,1.9,.06),wood,.006)
box('Vidrio ventana',(-2.80,.9,1.62),(.012,1.8,1.35),glass,.002)
box('Alféizar',(-2.61,.9,.92),(.36,2.0,.055),wood,.01)
# Cortinas de malla ondulada.
for center in [-.05,1.87]:
 verts=[];faces=[]
 for k in range(2):
  for j in range(41):verts.append((-2.52+.04*math.sin(j*.8),center-.16+j*.008, .82+k*1.65))
 for j in range(40):faces.append((j,j+1,j+42,j+41))
 data=bpy.data.meshes.new('Caída de lino');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new('Cortina',data);architecture.objects.link(o);o.data.materials.append(linen)
 for f in o.data.polygons:f.use_smooth=True
# Alfombra con borde cosido.
box('Alfombra',(0,-.65,.017),(1.7,2.5,.025),linen,.04)
for x in [-.78,.78]:box('Borde alfombra',(x,-.65,.033),(.012,2.30,.003),duvet,.002)
for y in [-1.78,.48]:box('Borde alfombra',(0,y,.033),(1.57,.012,.003),duvet,.002)
# Cama provisional: se reemplazará por el archivo del usuario.
active=bedroom;cx=-1.73;cy=.25
box('Base provisional',(cx,cy,.22),(1.48,2.15,.23),wood,.045)
box('Cabecero provisional',(cx,cy+1.08,.64),(1.55,.10,1.0),wood,.04)
for x in [cx-.60,cx+.60]:
 for y in [cy-.9,cy+.9]:box('Pata cama',(x,y,.10),(.09,.09,.2),wood,.015)
box('Colchón provisional',(cx,cy,.43),(1.44,2.08,.24),linen,.10)
verts=[];faces=[];nx=36;ny=48
for j in range(ny+1):
 y=cy-1.08+j*1.60/ny
 for i in range(nx+1):
  x=cx-.83+i*1.66/nx;edge=max(0,abs(x-cx)-.70)
  z=.602+.008*math.sin(i*.7+j*.32)+.006*math.cos(j*.65+i*.09)-edge*1.6
  verts.append((x,y,z))
for j in range(ny):
 for i in range(nx):
  a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
data=bpy.data.meshes.new('Tejido con pliegues');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new('Edredón provisional',data);bedroom.objects.link(o);o.data.materials.append(duvet)
for f in o.data.polygons:f.use_smooth=True
mod=o.modifiers.new('Grosor textil','SOLIDIFY');mod.thickness=.02
for x in [cx-.37,cx+.37]:
 pillow=box('Almohada provisional',(x,cy+.74,.63),(.65,.43,.15),linen,.07);pillow.rotation_euler[0]=.16
box('Mesilla provisional',(-.68,1.20,.35),(.52,.48,.65),wood,.025)
box('Cajón mesilla',(-.68,.948,.49),(.45,.022,.2),wood,.008)
box('Tirador mesilla',(-.68,.925,.49),(.13,.025,.012),brass,.004)
cylinder('Base lámpara',(-.68,1.20,.70),.11,.035,brass)
cylinder('Pie lámpara',(-.68,1.20,.83),.018,.25,brass)
cylinder('Pantalla lino',(-.68,1.20,1.00),.15,.22,linen)
area('Luz mesilla',(-.67,1.15,.95),(-1.5,.5,.3),25,(1,.64,.32),.25)
# Modelos importados. Se mantienen en colecciones independientes.
active=library
cupboard=load('Cupboard_01.blend',library,(2.10,.50,2.15),(0,2.62,0),-math.pi/2)
for o in cupboard:
 for i,m in enumerate(o.data.materials):
  if m and m.name.startswith('cupboard'):o.data.materials[i]=wood
  elif m and m.name.startswith('LED'):
   led=mat('LED cálido',(.9,.55,.2),.4);bs=led.node_tree.nodes['Principled BSDF'];bs.inputs['Emission Color'].default_value=(1,.54,.18,1);bs.inputs['Emission Strength'].default_value=2;o.data.materials[i]=led
# Setup completo: conserva los materiales y texturas recibidos.
setup=load('Gaming setup Pro/gaming_setup.blend',gaming,(1.95,2.15,1.62),(1.55,1.44,0),math.pi)
# Materiales de imagen ausentes -> neutro, sin magenta de error.
missing_images=[]
for material in bpy.data.materials:
 if not material.use_nodes:continue
 for node in list(material.node_tree.nodes):
  if node.type=='TEX_IMAGE' and node.image and not node.image.packed_file:
   path=Path(bpy.path.abspath(node.image.filepath))
   if not path.is_file():
    missing_images.append(path.name)
    for output in node.outputs:
     for edge in list(output.links):material.node_tree.links.remove(edge)
# Pantallas suaves; el setup incluye una imagen original del usuario.
for m in bpy.data.materials:
 if m.use_nodes:
  bs=m.node_tree.nodes.get('Principled BSDF')
  if bs and ('screen' in m.name.lower()):
   bs.inputs['Emission Color'].default_value=(.12,.14,.32,1);bs.inputs['Emission Strength'].default_value=.7
# Balda para colección opcional, a la derecha sobre el setup.
active=architecture
for z in [2.00,2.43]:
 box('Balda colección',(2.53,1.37,z),(.28,1.70,.045),wood,.014)
 for y in [.75,1.98]:box('Escuadra balda',(2.58,y,z-.07),(.16,.028,.12),brass,.009)
# Figuras recibidas: independientes y ocultas al abrir, como el inventario vacío de la app.
duck=load('FBX/RubberDuck_LOD0.fbx',decor,.19,(2.51,.95,2.03),-math.pi/2)
yellow=mat('Patito — amarillo sin textura recibida',(.95,.58,.035),.4)
for obj in duck:
 obj.data.materials.clear();obj.data.materials.append(yellow)
figure=load('Dumbledore+funko+pop+stl.stl',decor,.28,(2.51,1.72,2.03),-math.pi/2)
ivory=mat('Figura STL — resina marfil',(.67,.63,.52),.56)
for obj in figure:
 obj.data.materials.clear();obj.data.materials.append(ivory)
 for face in obj.data.polygons:face.use_smooth=True
# Trofeos del usuario, material platino. Demostración de exposición, no logros oficiales.
for i,x in enumerate([-.75,-.38,0,.38,.75]):
 objs=load('trophy.fbx',awards,.24,(x,2.56,1.615),0)
 for obj in objs:obj.data.materials.clear();obj.data.materials.append(platinum)
# 50 cajas y lomos legibles en dos baldas inferiores del armario.
active=books
palette=[(.045,.12,.17),(.20,.08,.07),(.23,.23,.12),(.08,.19,.15),(.12,.08,.18),(.23,.14,.06)]
titles=['HOLLOW KNIGHT','ELDEN RING','STARDEW VALLEY','RED DEAD REDEMPTION 2','BALDURS GATE 3','CYBERPUNK 2077','HADES','CELESTE','FORZA HORIZON 5','SEA OF THIEVES','ORI','MINECRAFT','THE WITCHER 3','PORTAL 2','IT TAKES TWO','A WAY OUT','DIABLO IV','OVERWATCH 2','WORLD OF WARCRAFT','HEARTHSTONE','VALORANT','LEAGUE OF LEGENDS','TEAMFIGHT TACTICS','RUNETERRA','ASSASSINS CREED','FAR CRY 6','THE DIVISION 2','ANNO 1800','ALAN WAKE 2','FORTNITE','CONTROL','SIFU','DISCO ELYSIUM','NO MANS SKY','OUTER WILDS','DREDGE','DOOM ETERNAL','DEATH STRANDING','RESIDENT EVIL 4','DEAD CELLS','CUPHEAD','TERRARIA','VALHEIM','SUBNAUTICA','CITIES SKYLINES','CIVILIZATION VI','AGE OF EMPIRES IV','HALO INFINITE','PSYCHONAUTS 2','GROUNDED']
spine_rotation=Matrix(((0,1,0),(0,0,-1),(-1,0,0))).to_euler()
for row,z in enumerate([.294,.902]):
 for i in range(25):
  index=row*25+i;x=-.88+i*.073
  case=mat('Lomo '+str(index),palette[index%len(palette)],.45)
  o=box('Juego / '+titles[index],(x,2.50,z+.16),(.066,.17,.32),case,.003);o['game_id']=index
  box('Banda PC',(x,2.412,z+.30),(.064,.004,.033),black,.001)
  t=text('Título / '+titles[index],titles[index],(x-.006,2.408,z+.16),.0125,white,spine_rotation)
  t.data.align_x='CENTER'
# Rotulación discreta independiente del mueble.
active=architecture
text('Rótulo superior','T U S   M U N D O S',(0,2.915,2.46),.075,white)
text('Placa platinos','P L A T I N O S',(0,2.347,1.515),.018,brass)
# Un cuadro minimalista frente a la cama.
box('Marco lámina',(-1.75,2.907,1.95),(.67,.045,.83),wood,.01)
art=mat('Lámina verde',(.17,.27,.24),.9)
box('Lámina',(-1.75,2.878,1.95),(.59,.012,.75),art,.001)
text('Lámina / titulo','PAUSE',(-1.75,2.866,1.97),.07,linen)
text('Lámina / detalle','TAKE YOUR TIME',(-1.75,2.865,1.82),.021,linen)
# Luminaria principal y luz suave de atardecer.
active=architecture
cylinder('Plafón',(0,-.1,2.70),.28,.12,linen)
area('Principal suave',(0,-.10,2.58),(0,.5,0),160,(1,.84,.64),2.0)
area('Ventana atardecer',(-2.52,.9,1.73),(-.2,.6,.5),140,(.55,.68,1),1.3,'RECTANGLE',1.5)
area('Rebote entrada',(0,-2.95,2.1),(0,1,1),70,(1,.84,.67),3.0)
area('Luz balda alta',(0,2.37,2.04),(0,2.45,1.55),14,(1,.65,.3),1.5,'RECTANGLE',.07)
area('Monitor violeta',(2.0,1.4,1.15),(1.1,1.0,.5),18,(.43,.39,1),.65)
# LED de cornisa: piezas separadas, no pintadas en una imagen.
emissive=mat('LED de ambiente',(.8,.43,.12),.3)
led_bs=emissive.node_tree.nodes['Principled BSDF'];led_bs.inputs['Emission Color'].default_value=(1,.46,.13,1);led_bs.inputs['Emission Strength'].default_value=3
for x in [-2.59,2.59]:
 box('Tira LED de cornisa',(x,0,2.735),(.012,5.8,.014),emissive,.002)
 area('Rebote LED lateral',(x,0,2.72),(x*.99,0,2.3),10,(1,.53,.23),4.5,'RECTANGLE',.05)
box('Tira LED fondo',(0,2.80,2.735),(5.2,.012,.014),emissive,.002)
# Cámara conserva la perspectiva desde la entrada; lente arquitectónica sin ojo de pez.
data=bpy.data.cameras.new('Desde la puerta');cam=bpy.data.objects.new('CAMARA / entrada',data);architecture.objects.link(cam);cam.location=(.05,-3.22,1.53);aim(cam,(0,.75,1.32));data.lens=24;data.sensor_width=36;data.clip_start=.05;data.clip_end=100;scene.camera=cam
scene.world=bpy.data.worlds.new('Cielo nocturno');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.11,.17,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.18
scene.render.engine=opt.engine;scene.cycles.samples=96;scene.cycles.use_denoising=False;scene.cycles.max_bounces=7;scene.cycles.diffuse_bounces=4;scene.cycles.glossy_bounces=4
scene.render.resolution_x=1280;scene.render.resolution_y=854;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'vista-entrada.png')
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.eevee.taa_render_samples=96;scene.eevee.use_raytracing=True
# Mantiene la colección de figuras opcional vacía visualmente al abrir.
decor.hide_render=True;decor.hide_viewport=True
# Cada material de imagen se empaqueta; no quedan rutas externas indispensables.
for img in bpy.data.images:
 if img.source=='FILE' and not img.packed_file:
  try:
   if Path(bpy.path.abspath(img.filepath)).is_file():img.pack()
  except RuntimeError:pass
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.overlay.show_overlays=False;a.spaces.active.shading.type='MATERIAL'
scene['launcher_note']='Cama provisional. Texturas ausentes del armario/patito sustituidas. Figuras opcionales ocultas. Trofeos ilustrativos.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'habitacion-modelos-usuario.blend'))
(OUT/'informe.json').write_text(json.dumps({'sources':required,'missing_images_replaced':sorted(set(missing_images)),'bed':'provisional, upload exceeded 32 MiB','optional_figures_hidden':True,'blender_version':bpy.app.version_string,'camera':'doorway','games':50},indent=2,ensure_ascii=False))
if opt.preview:
 scene.render.resolution_x=960;scene.render.resolution_y=640;scene.cycles.samples=24
bpy.ops.render.render(write_still=True)
print('ROOM_RENDER_COMPLETE',str(OUT))
