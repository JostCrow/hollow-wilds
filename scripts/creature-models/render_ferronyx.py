"""Render repeatable reference-matched and orthographic Ferronyx review views.

blender --background --python scripts/creature-models/render_ferronyx.py
Reads the saved sculpture; never modifies or re-exports the model.
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Model, ROOT

model = Model.from_blend('Ferronyx')
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.render.resolution_x = scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
scene.world.color = (.3, .3, .3)
corners = [obj.matrix_world @ Vector(c) for obj in scene.objects
           if obj.type == 'MESH' for c in obj.bound_box]
lo = Vector(tuple(min(v[i] for v in corners) for i in range(3)))
hi = Vector(tuple(max(v[i] for v in corners) for i in range(3)))
center = (lo+hi)/2
size = max(hi-lo)
for loc, energy, light_size in [((-3, -4, 6), 650, 4), ((4, -1, 3), 300, 4), ((1, 4, 5), 750, 3)]:
    bpy.ops.object.light_add(type='AREA', location=center+Vector(loc)*size)
    light = bpy.context.object
    light.data.energy = energy*size*size
    light.data.size = size*light_size
    light.rotation_euler = (center-light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
scene.camera = camera
out = ROOT/'artifacts/creatures/ferronyx-review'
out.mkdir(parents=True, exist_ok=True)
views = [('hero', (-.86, -1, .31)), ('side', (-1, -.04, .12)),
         ('front', (0, -1, .12)), ('rear', (.8, 1, .3))]
for name, direction in views:
    camera.location = center+Vector(direction).normalized()*size*4
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()
    rotation = camera.rotation_euler.to_quaternion().inverted()
    projected = [rotation @ (p-center) for p in corners]
    width = max(v.x for v in projected)-min(v.x for v in projected)
    height = max(v.y for v in projected)-min(v.y for v in projected)
    camera.data.ortho_scale = max(width, height)*1.08
    scene.render.filepath = str(out/(name+'.png'))
    bpy.ops.render.render(write_still=True)
print('Ferronyx review views rendered to', out)
