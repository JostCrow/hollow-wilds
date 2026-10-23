"""Consistent studio review renders for the whole Pupawn evolution family."""
import sys
import shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector
from common import ROOT, Model


def render_model(model,views=('hero',),resolution=720):
    scene=bpy.context.scene
    for obj in list(scene.objects):
        if obj.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(obj,do_unlink=True)
    scene.render.engine='CYCLES';scene.cycles.samples=12
    scene.cycles.transparent_max_bounces=4
    scene.render.resolution_x=scene.render.resolution_y=resolution
    scene.render.resolution_percentage=100;scene.render.film_transparent=True
    scene.view_settings.view_transform='Standard';scene.world.color=(.28,.28,.28)
    corners=[obj.matrix_world@Vector(c) for obj in scene.objects if obj.type=='MESH' for c in obj.bound_box]
    lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
    center=(lo+hi)/2;size=max(hi-lo)
    for position,energy in [((-3,-4,6),600),((4,-1,3),300),((1,4,5),650)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(position)*size)
        light=bpy.context.object;light.data.energy=energy*size*size;light.data.size=size*4
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
    out=ROOT/'artifacts/creatures/pupawn-evolutions-review';out.mkdir(exist_ok=True,parents=True)
    directions={'hero':(-.84,-1,.24),'side':(-1,-.04,.10),'front':(0,-1,.10),'rear':(.8,1,.25)}
    for view in views:
        camera.location=center+Vector(directions[view]).normalized()*size*4
        camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        rotation=camera.rotation_euler.to_quaternion().inverted()
        projected=[rotation@(p-center) for p in corners]
        width=max(v.x for v in projected)-min(v.x for v in projected)
        height=max(v.y for v in projected)-min(v.y for v in projected)
        # Center the projected shape, rather than the 3D axis-aligned box.
        offset=Vector(((max(v.x for v in projected)+min(v.x for v in projected))/2,
                       (max(v.y for v in projected)+min(v.y for v in projected))/2,0))
        camera.location+=camera.rotation_euler.to_quaternion()@offset
        camera.data.ortho_scale=max(width,height)*1.10
        file=out/(model.name.lower()+'-'+view+'.png');scene.render.filepath=str(file)
        bpy.ops.render.render(write_still=True)
        if view=='hero':shutil.copyfile(file,ROOT/'artifacts/creatures'/(model.name.lower()+'.png'))
    print('EVOLUTION_REVIEW',model.name,','.join(views),flush=True)


if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    views=('hero','side','front','rear') if '--all-views' in args else ('hero','side')
    selected=next((arg.split('=',1)[1] for arg in args if arg.startswith('--views=')),None)
    if selected:
        views=tuple(selected.split(','))
        if not set(views)<=set(('hero','side','front','rear')):raise ValueError('Unknown review view')
    for name in (arg for arg in args if not arg.startswith('--')):
        render_model(Model.from_blend(name),views)
