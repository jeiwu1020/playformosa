import bpy,json,sys,os,math
from mathutils import Matrix,Vector
paths=sys.argv[sys.argv.index('--')+1:]
for path in paths:
 d=json.load(open(path));bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4
 meshes={};materials={}
 for key,g in d['geometries'].items():
  verts=list(zip(*[iter(g['positions'])]*3));idx=g['indices'] if g['indices'] is not None else list(range(len(verts)));faces=list(zip(*[iter(idx)]*3));m=bpy.data.meshes.new(key);m.from_pydata(verts,[],faces);m.update();meshes[key]=m
  if g.get('colors'):
   attr=m.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');rgba=[]
   for i in range(0,len(g['colors']),3):rgba.extend(g['colors'][i:i+3]+[1])
   attr.data.foreach_set('color',rgba)
 for o in d['objects']:
  matkey=(*o['color'],bool(o.get('vertexColors')))
  if matkey not in materials:
   mat=bpy.data.materials.new(str(matkey));mat.diffuse_color=(*o['color'],1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*o['color'],1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;materials[matkey]=mat
   if o.get('vertexColors'):
    color=mat.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='Color';mat.node_tree.links.new(color.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
  obj=bpy.data.objects.new(o['name'],meshes[o['geometry']]);scene.collection.objects.link(obj);a=o['matrix'];obj.matrix_world=Matrix([[a[j*4+i] for j in range(4)]for i in range(4)]);obj.data=meshes[o['geometry']].copy();obj.data.materials.clear();obj.data.materials.append(materials[matkey])
 cam_data=bpy.data.cameras.new('Game orthographic camera');cam=bpy.data.objects.new('Camera',cam_data);scene.collection.objects.link(cam);cam_data.type='ORTHO';cam_data.ortho_scale=d['camera']['orthoScale'];a=d['camera']['matrix'];cam.matrix_world=Matrix([[a[j*4+i]for j in range(4)]for i in range(4)]);scene.camera=cam
 world=bpy.data.worlds.new('Sky');world.use_nodes=True;sky=d.get('sky','#bfe6df');rgb=[int(sky[i:i+2],16)/255 for i in (1,3,5)];world.node_tree.nodes['Background'].inputs['Color'].default_value=(*(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb),1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7;nodes=world.node_tree.nodes;links=world.node_tree.links;ambient=nodes.new('ShaderNodeBackground');ambient.inputs['Color'].default_value=(.7,.8,.8,1);ambient.inputs['Strength'].default_value=.7;ray=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader');links.new(ray.outputs['Is Camera Ray'],mix.inputs[0]);links.new(ambient.outputs[0],mix.inputs[1]);links.new(nodes['Background'].outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes['World Output'].inputs['Surface']);scene.world=world
 light_data=bpy.data.lights.new('Sun','AREA');light_data.energy=1200;light_data.shape='DISK';light_data.size=8;light=bpy.data.objects.new('Sun',light_data);scene.collection.objects.link(light);localx=d['camera']['matrix'][12]-1.8;light.location=(localx-5,18,8);direction=Vector((localx,1,0))-light.location;light.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
 scene.render.resolution_x=d['camera']['width'];scene.render.resolution_y=d['camera']['height'];scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard';scene.render.film_transparent=False;scene.render.filepath=path.replace('.json','.png');bpy.ops.render.render(write_still=True)
