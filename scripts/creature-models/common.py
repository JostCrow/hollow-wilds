"""Blender creature authoring. Public coordinates are X right, Y up, Z forward.
Run batch files with Blender --background --python; no external packages needed.
"""
import bpy, bmesh, math, json, base64, struct
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
SPECIES = {c['name']: c for c in json.loads((ROOT/'data/creatures.json').read_text())}
def xyz(v): return [round(v.x,6),round(v.z,6),round(-v.y,6)]
def bv(p): return Vector((p[0],-p[2],p[1]))
def packed(values,code): return base64.b64encode(struct.pack('<'+str(len(values))+code,*values)).decode()
class Model:
    def __init__(self,name):
        bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
        for block in list(bpy.data.meshes):
            if not block.users: bpy.data.meshes.remove(block)
        self.name=name; self.groups={}; self.materials={}; self.joint('body',(0,0,0),None)
    @classmethod
    def from_blend(cls,name):
        bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/models/creatures'/(name.lower()+'.blend')))
        model=cls.__new__(cls); model.name=name; model.materials={}
        model.groups={obj.name:obj for obj in bpy.context.scene.objects if obj.type=='EMPTY'}
        if 'body' not in model.groups: raise ValueError('The model requires a body root joint')
        # Blender's inside-out surfaces are visible in Cycles but culled by WebGL.
        for obj in bpy.context.scene.objects:
            if obj.type!='MESH': continue
            bm=bmesh.new(); bm.from_mesh(obj.data); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(obj.data); bm.free()
            if obj.parent is None:
                world=obj.matrix_world.copy(); obj.parent=model.groups['body']; obj.matrix_world=world
        return model
    def joint(self,name,origin,parent='body'):
        obj=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(obj)
        obj.location=bv(origin)
        if parent:
            obj.parent=self.groups[parent]; obj.location=bv(origin)-self.groups[parent].matrix_world.translation
        bpy.context.view_layer.update(); self.groups[name]=obj; return obj
    def material(self,color):
        color=color.lstrip('#')
        if color not in self.materials:
            mat=bpy.data.materials.new('pigment_'+color); mat.use_nodes=True
            rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
            linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
            mat.diffuse_color=(*linear,1)
            shader=mat.node_tree.nodes.get('Principled BSDF'); shader.inputs['Base Color'].default_value=(*linear,1); shader.inputs['Roughness'].default_value=.78
            self.materials[color]=mat
        return self.materials[color]
    def finish(self,obj,label,color,joint,smooth=True):
        obj.name=label; obj.data.materials.append(self.material(color))
        for p in obj.data.polygons: p.use_smooth=smooth
        bpy.context.view_layer.update(); world=obj.matrix_world.copy(); obj.parent=self.groups[joint]; obj.matrix_world=world
        return obj
    def ellipsoid(self,label,position,scale,color,joint='body',segments=24,rings=16):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=bv(position))
        obj=bpy.context.object; obj.scale=(scale[0],scale[2],scale[1]); return self.finish(obj,label,color,joint)
    def mesh(self,label,vertices,faces,color,joint='body',smooth=True):
        mesh=bpy.data.meshes.new(label); mesh.from_pydata([bv(v) for v in vertices],[],faces); mesh.update()
        # Correct hand-authored ring winding before GLB/WebGL back-face culling.
        bm=bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free(); mesh.update()
        obj=bpy.data.objects.new(label,mesh); bpy.context.collection.objects.link(obj)
        return self.finish(obj,label,color,joint,smooth)
    def tube(self,label,points,radius,color,joint='body'):
        curve=bpy.data.curves.new(label,'CURVE'); curve.dimensions='3D'; curve.resolution_u=5; curve.bevel_depth=radius; curve.bevel_resolution=2; curve.use_fill_caps=True
        spline=curve.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
        for p,co in zip(spline.bezier_points,points): p.co=bv(co); p.handle_left_type=p.handle_right_type='AUTO'
        obj=bpy.data.objects.new(label,curve); bpy.context.collection.objects.link(obj)
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj; bpy.ops.object.convert(target='MESH')
        return self.finish(obj,label,color,joint)
    def cone(self,label,start,end,radius,color,joint='body'):
        a,b=bv(start),bv(end); delta=b-a
        bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=radius,radius2=.002,depth=delta.length,location=(a+b)/2)
        obj=bpy.context.object; obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler(); return self.finish(obj,label,color,joint)
    def leaf(self,label,start,end,width,color,joint='body'):
        a,b=Vector(start),Vector(end); delta=b-a; side=delta.cross(Vector((0,0,1)))
        if side.length<.01: side=delta.cross(Vector((0,1,0)))
        side.normalize(); normal=delta.cross(side).normalized(); verts=[]
        for t,w in [(0,.02),(.22,.7),(.5,1),(.76,.67),(1,.006)]:
            center=a+delta*t+normal*math.sin(t*math.pi)*width*.23
            for angle in range(8):
                theta=angle*math.tau/8; p=center+side*(math.cos(theta)*width*w)+normal*(math.sin(theta)*width*w*.13); verts.append(tuple(p))
        faces=[]
        for row in range(4):
            for i in range(8): faces.append((row*8+i,row*8+(i+1)%8,(row+1)*8+(i+1)%8,(row+1)*8+i))
        faces.extend([tuple(reversed(range(8))),tuple(range(32,40))]); return self.mesh(label,verts,faces,color,joint)
    def eye(self,position,size,irisColor,joint='head'):
        x,y,z=position; s=size
        self.ellipsoid('Eye rim',(x,y,z),(s*.82,s*1.1,s*.31),'#272c29',joint,20,12)
        self.ellipsoid('Eye ivory',(x,y,z+s*.18),(s*.7,s*.96,s*.27),'#fff1cf',joint,20,12)
        self.ellipsoid('Iris',(x,y,z+s*.39),(s*.49,s*.77,s*.14),irisColor,joint,20,12)
        self.ellipsoid('Pupil',(x,y+s*.01,z+s*.5),(s*.25,s*.61,s*.09),'#202b2b',joint,16,10)
        self.ellipsoid('Eye catchlight',(x-s*.14,y+s*.38,z+s*.58),(s*.17,s*.23,s*.055),'#fffbe8',joint,12,8)
    def export(self,render=True):
        bpy.context.view_layer.update()
        meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
        corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
        low=min(v.z for v in corners); high=max(v.z for v in corners); factor=SPECIES[self.name]['height']/(high-low)
        # Bake the uniform normalization into joint translations and local mesh transforms.
        for group in self.groups.values(): group.location*=factor
        for obj in meshes:
            obj.location*=factor; obj.scale*=factor
        self.groups['body'].location.z-=low*factor
        bpy.context.view_layer.update(); deps=bpy.context.evaluated_depsgraph_get(); nodes=[]
        for name,group in self.groups.items():
            batches={}
            for obj in group.children:
                if obj.type!='MESH': continue
                evaluated=obj.evaluated_get(deps); mesh=evaluated.to_mesh(); mesh.calc_loop_triangles()
                matrix=obj.matrix_local; normalmat=matrix.to_3x3().inverted().transposed()
                for tri in mesh.loop_triangles:
                    mat=obj.data.materials[tri.material_index]
                    rgb=mat.diffuse_color[:3]; opacity=mat.diffuse_color[3]; emission=0.0
                    if mat.use_nodes:
                        shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
                        if shader:
                            rgb=shader.inputs['Base Color'].default_value[:3]
                            opacity=shader.inputs['Alpha'].default_value
                            emission=shader.inputs['Emission Strength'].default_value if any(shader.inputs['Emission Color'].default_value[:3]) else 0.0
                    srgb=[v*12.92 if v<=.0031308 else 1.055*max(0,v)**(1/2.4)-.055 for v in rgb]
                    color=''.join(f'{max(0,min(255,round(v*255))):02x}' for v in srgb)
                    key=(color,round(opacity,4),round(emission,4))
                    batch=batches.setdefault(key,{'positions':[],'normals':[],'indices':[],'unique':{}})
                    for li in tri.loops:
                        loop=mesh.loops[li]; pos=xyz(matrix@mesh.vertices[loop.vertex_index].co); normal=xyz((normalmat@mesh.corner_normals[li].vector).normalized()); key=tuple(pos+normal)
                        if key not in batch['unique']:
                            batch['unique'][key]=len(batch['positions'])//3; batch['positions'].extend(pos); batch['normals'].extend(normal)
                        batch['indices'].append(batch['unique'][key])
                evaluated.to_mesh_clear()
            payload=[]
            for (color,opacity,emission),batch in batches.items():
                positions=batch['positions']; lo=[min(positions[i::3]) for i in range(3)]; hi=[max(positions[i::3]) for i in range(3)]; extent=[hi[i]-lo[i] for i in range(3)]
                quant=[round((p-lo[i%3])/(extent[i%3] or 1)*65535) for i,p in enumerate(positions)]
                normals=[max(-127,min(127,round(n*127))) for n in batch['normals']]
                code='H' if len(positions)//3<=65535 else 'I'
                payload.append({'color':'#'+color,'min':lo,'extent':extent,'positions':packed(quant,'H'),'normals':packed(normals,'b'),'indices':packed(batch['indices'],code),'indexType':'u16' if code=='H' else 'u32'})
                if opacity<1: payload[-1]['opacity']=opacity
                if emission>0: payload[-1]['emission']=emission
            nodes.append({'name':name,'parent':group.parent.name if group.parent else None,'position':xyz(group.location),'meshes':payload})
        out=ROOT/'assets/models/creatures'; out.mkdir(exist_ok=True,parents=True); slug=self.name.lower()
        payload={'name':self.name,'source':'Blender','reference':('../../monster/'+SPECIES[self.name]['sprite']) if (ROOT/'assets/monster'/SPECIES[self.name]['sprite']).exists() else None,'encoding':'quantized-v1','nodes':nodes}
        (out/(slug+'.json')).write_text(json.dumps(payload,separators=(',',':'))+'\n')
        bpy.ops.object.select_all(action='SELECT'); bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models'/(slug+'.glb')),export_format='GLB',use_selection=True,export_yup=True)
        bpy.context.preferences.filepaths.save_version=0; bpy.ops.wm.save_as_mainfile(filepath=str(out/(slug+'.blend')))
        print('CREATURE_EXPORT',self.name,len(nodes),sum(len(n['meshes']) for n in nodes),flush=True)
        if render: self.render()
    def render(self):
        scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=12
        scene.render.resolution_x=480; scene.render.resolution_y=480; scene.render.resolution_percentage=100
        scene.world.color=(.3,.3,.3); scene.view_settings.view_transform='Standard'; scene.render.film_transparent=True
        corners=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' for c in o.bound_box]; center=sum(corners,Vector())/len(corners)
        lo=Vector(tuple(min(v[i] for v in corners) for i in range(3))); hi=Vector(tuple(max(v[i] for v in corners) for i in range(3))); center=(lo+hi)/2; size=max(hi.x-lo.x,hi.y-lo.y,hi.z-lo.z)
        for loc,energy in [((3,-4,6),500),((-3,-2,3),300),((1,4,5),600)]:
            bpy.ops.object.light_add(type='AREA',location=Vector(loc)*max(size,.5)+center); obj=bpy.context.object; obj.data.energy=energy*max(size,.5)**2; obj.data.size=max(size,.5)*4; obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
        bpy.ops.object.camera_add(location=center+Vector((.65,-1,.25))*max(size,.5)*4); camera=bpy.context.object; camera.data.type='ORTHO'; camera.data.ortho_scale=size*1.25; camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler(); scene.camera=camera
        directory=ROOT/'artifacts/creatures'; directory.mkdir(exist_ok=True,parents=True); scene.render.filepath=str(directory/(self.name.lower()+'.png')); bpy.ops.render.render(write_still=True)
