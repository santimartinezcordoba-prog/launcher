ASSET = 'Lampara'
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

cylinder('Base',(0,0,.02),.10,.04,metal)
cylinder('Soporte',(0,0,.20),.012,.36,metal)
shade=material('Pantalla lino',(.78,.65,.43),.95,texture='fabric')
cylinder('Pantalla',(0,0,.40),.15,.20,shade)
data=bpy.data.lights.new('Bombilla cálida','POINT');data.energy=18;data.color=(1,.72,.43);data.shadow_soft_size=.1
obj=bpy.data.objects.new('Bombilla',data);collection.objects.link(obj);obj.parent=root;obj.location=(0,0,.34)
