ASSET = 'Cama'
# Blender 4.x / 5.x — ejecutar desde Scripting > Text Editor > Run Script.
# No borra objetos existentes. Cada ejecución crea una colección independiente.
import bpy
import math
from mathutils import Vector

collection = bpy.data.collections.new(ASSET)
bpy.context.scene.collection.children.link(collection)
root = bpy.data.objects.new(ASSET, None)
collection.objects.link(root)
root['launcher_asset'] = ASSET

def material(name, color, roughness=0.5, metal=0, texture=None):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=roughness
    bs.inputs['Metallic'].default_value=metal
    if texture:
        nodes=m.node_tree.nodes; links=m.node_tree.links
        coord=nodes.new('ShaderNodeTexCoord')
        mapping=nodes.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'
        mapping.inputs[1].default_value=(3,35,3) if texture=='wood' else (170,170,170)
        noise=nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=3
        bump=nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.18
        bump.inputs['Distance'].default_value=.025 if texture=='wood' else .008
        links.new(coord.outputs['Generated'],mapping.inputs[0]); links.new(mapping.outputs[0],noise.inputs['Vector'])
        links.new(noise.outputs['Fac'],bump.inputs['Height']); links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m

def finish(obj, name, mat):
    obj.name=name
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj); obj.parent=root
    if mat: obj.data.materials.append(mat)
    return obj

def box(name, location, size, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    obj=bpy.context.object; obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Bordes suaves','BEVEL'); mod.width=bevel; mod.segments=3
        obj.modifiers.new('Normales','WEIGHTED_NORMAL')
    return finish(obj,name,mat)

def sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=location)
    obj=bpy.context.object; obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in obj.data.polygons:p.use_smooth=True
    return finish(obj,name,mat)

def cylinder(name, location, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=location)
    obj=bpy.context.object
    mod=obj.modifiers.new('Bordes suaves','BEVEL');mod.width=.01;mod.segments=3
    obj.modifiers.new('Normales','WEIGHTED_NORMAL')
    return finish(obj,name,mat)

wood=material('Roble cálido',(.39,.22,.10),.43,texture='wood')
metal=material('Metal oscuro',(.035,.045,.05),.3,.7)
cream=material('Lino crema',(.72,.67,.54),.95,texture='fabric')
green=material('Tejido bosque',(.14,.21,.16),.93,texture='fabric')

box('Estructura',(0,0,.25),(1.5,2.1,.25),wood)
for x in [-.6,.6]:
 for y in [-.85,.85]: box('Pata',(x,y,.12),(.12,.12,.24),wood)
box('Cabecero',(0,.99,.70),(1.56,.10,1.1),wood,.045)
box('Colchón',(0,0,.49),(1.45,2,.25),cream,.10)
# Cubierta con relieve suave, no un bloque rígido.
verts=[]; faces=[]; nx=24; ny=32
for j in range(ny+1):
 y=-1.03+j*1.5/ny
 for i in range(nx+1):
  x=-.84+i*1.68/nx
  z=.64+.014*math.sin(i*.9+j*.35)+.012*math.cos(j*.8)
  z-=max(0,abs(x)-.65)*1.8
  verts.append((x,y,z))
for j in range(ny):
 for i in range(nx):
  a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
mesh=bpy.data.meshes.new('Manta');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Edredón con pliegues',mesh);collection.objects.link(obj);obj.parent=root;obj.data.materials.append(green)
mod=obj.modifiers.new('Grosor de tejido','SOLIDIFY');mod.thickness=.025
for p in obj.data.polygons:p.use_smooth=True
for x in [-.37,.37]:
 pillow=box('Almohada',(x,.70,.72),(.64,.42,.16),cream,.075);pillow.rotation_euler[0]=.12
