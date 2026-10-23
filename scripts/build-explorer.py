"""Rebuild with: blender --background --python scripts/build-explorer.py

Authors the explorer in metres, exports an editable .blend, a portable GLB,
and indexed, material-batched geometry for the game's synchronous actor factory.
No Python packages outside Blender are required.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/models/explorer"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

PALETTE = {
    'jacket': ('C44C3B', .83), 'cap': ('D55D45', .8),
    'red_dark': ('843B35', .85), 'lining': ('F2DDB8', .9),
    'skin': ('DDA77F', .72), 'skin_shadow': ('B77D60', .8),
    'hair': ('44342E', .9), 'hair_light': ('634738', .88),
    'eye_white': ('FFF3D8', .55), 'iris': ('53766B', .56),
    'ink': ('283831', .7), 'glint': ('FFFFFF', .25),
    'trousers': ('344D4A', .9), 'trouser_light': ('49605A', .9),
    'leather': ('674939', .82), 'leather_light': ('90684A', .8),
    'sole': ('303932', .93), 'canvas': ('75836A', .95),
    'canvas_dark': ('4C6251', .95), 'brass': ('C7A261', .4),
    'scarf': ('D2A45A', .92), 'roll': ('B5BA97', .95),
}
MATS = {}
for name, (hex_color, roughness) in PALETTE.items():
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*[int(hex_color[i:i+2], 16)/255 for i in (0, 2, 4)], 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    # Blender shader inputs are linear; palette values are sRGB.
    rgb = mat.diffuse_color[:3]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    bsdf.inputs['Base Color'].default_value = (*linear, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = .65 if name == 'brass' else 0
    MATS[name] = mat

GROUPS = {}
def joint(name, origin, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = origin
    if parent:
        obj.parent = GROUPS[parent]
        obj.location = Vector(origin) - GROUPS[parent].matrix_world.translation
    bpy.context.view_layer.update()
    GROUPS[name] = obj
    return obj

def finish(obj, name, material, group, smooth=True):
    bpy.context.view_layer.update()
    obj.name = name
    obj.data.materials.append(MATS[material])
    for poly in obj.data.polygons:
        poly.use_smooth = smooth
    world = obj.matrix_world.copy()
    obj.parent = GROUPS[group]
    obj.matrix_world = world
    return obj

def ellipsoid(name, center, scale, material, group, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    obj = bpy.context.object
    obj.scale = scale
    return finish(obj, name, material, group)

def box(name, center, size, bevel, material, group, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new('Tailored soft edges', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    obj.rotation_euler = rotation
    return finish(obj, name, material, group)

def tube(name, points, radius, material, group):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 8
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return finish(obj, name, material, group)

def tailored(name, rings, material, group, segments=24):
    # Elliptical cross-sections give garments a designed, continuous silhouette.
    vertices = [(math.cos(i*math.tau/segments)*rx,
                 cy+math.sin(i*math.tau/segments)*ry, z)
                for z, rx, ry, cy in rings for i in range(segments)]
    faces = []
    for row in range(len(rings)-1):
        for i in range(segments):
            a = row*segments+i
            b = row*segments+(i+1)%segments
            faces.append((a, b, b+segments, a+segments))
    faces += [tuple(reversed(range(segments))),
              tuple((len(rings)-1)*segments+i for i in range(segments))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, material, group)

# Blender coordinates: Z up, -Y forward. Runtime export converts to Y up, +Z forward.
joint('body', (0, 0, .85))
joint('head', (0, 0, 1.29), 'body')
joint('pack', (0, .17, 1.02), 'body')
for side, s in [('left', -1), ('right', 1)]:
    joint(side+'Arm', (s*.252, 0, 1.17), 'body')
    joint(side+'Forearm', (s*.29, -.012, .94), side+'Arm')
    joint(side+'Leg', (s*.115, 0, .77), 'body')
    joint(side+'Shin', (s*.115, 0, .44), side+'Leg')

tailored('Field jacket', [(.76,.18,.115,0),(.79,.205,.13,0),(.9,.19,.123,0),
    (1.08,.22,.14,0),(1.18,.235,.125,0),(1.235,.15,.095,0)], 'jacket', 'body')
box('Jacket hem', (0,0,.785), (.395,.25,.045), .015, 'red_dark', 'body')
box('Front placket', (0,-.132,1.005), (.027,.018,.36), .007, 'red_dark','body')
for z in [.85,.96,1.07,1.17]:
    ellipsoid('Brass snap', (0,-.147,z), (.009,.005,.009),'brass','body',12,8)
ellipsoid('Neck', (0,0,1.255), (.085,.075,.1),'skin','head')
for s in [-1, 1]:
    box('Turned cream collar', (s*.085,-.083,1.215), (.12,.07,.12), .02,
        'lining','body',(0,s*-.4,s*.2))
    box('Jacket welt pocket', (s*.125,-.12,.905), (.105,.025,.055), .015,
        'red_dark','body',(0,s*.15,0))
    tube('Pocket topstitch',[(s*.08,-.14,.923),(s*.125,-.148,.927),(s*.17,-.133,.923)],
         .003,'lining','body')
box('Scarf knot', (0,-.115,1.25), (.065,.055,.06), .018,'scarf','body')
box('Scarf end', (.055,-.15,1.16), (.07,.025,.16), .012,'scarf','body',(0,-.25,-.2))
tailored('Trousers seat', [(.68,.185,.12,0),(.77,.18,.115,0),(.8,.17,.105,0)],
         'trousers','body')
box('Leather belt', (0,0,.79), (.37,.245,.037), .014,'leather','body')
box('Belt buckle', (0,-.131,.79), (.055,.012,.043), .005,'brass','body')
box('Buckle inset', (0,-.139,.79), (.033,.007,.022), .002,'leather','body')

# Broad cheeks, a shaped jaw, inset eyes, ears, brows, nose and hair locks.
tailored('Sculpted face', [(1.285,.075,.08,-.028),(1.31,.13,.105,-.033),
    (1.37,.177,.135,-.015),(1.46,.19,.154,0),(1.55,.182,.153,.01),
    (1.61,.13,.105,.015)],'skin','head',32)
ellipsoid('Hair back', (0,.073,1.48), (.196,.126,.166),'hair','head')
for s in [-1,1]:
    ellipsoid('Ear', (s*.187,0,1.42), (.034,.029,.052),'skin','head')
    ellipsoid('Inner ear', (s*.207,-.021,1.42), (.012,.009,.026),'skin_shadow','head')
    ellipsoid('Eye socket', (s*.074,-.144,1.462), (.047,.012,.058),'skin_shadow','head')
    ellipsoid('Eye', (s*.074,-.153,1.465), (.038,.013,.046),'eye_white','head')
    ellipsoid('Iris', (s*.07,-.165,1.464), (.021,.007,.032),'iris','head',20,12)
    ellipsoid('Pupil', (s*.07,-.171,1.464), (.011,.003,.024),'ink','head',16,12)
    ellipsoid('Eye highlight', (s*.07-.006,-.175,1.48), (.007,.003,.009),'glint','head',12,8)
    tube('Upper eyelid', [(s*.038,-.157,1.492),(s*.072,-.166,1.51),(s*.108,-.148,1.493)],
         .005,'hair','head')
    tube('Eyebrow', [(s*.04,-.146,1.535),(s*.076,-.153,1.546),(s*.111,-.135,1.535)],
         .008,'hair','head')
    ellipsoid('Sideburn', (s*.17,.005,1.505), (.025,.055,.075),'hair','head')
ellipsoid('Nose', (0,-.16,1.41), (.025,.034,.033),'skin','head',20,12)
tube('Smile', [(-.04,-.132,1.355),(0,-.145,1.346),(.04,-.132,1.355)], .004,'skin_shadow','head')
for i in range(5):
    lock = ellipsoid('Swept fringe', (-.13+i*.061,-.109,1.563+(i%2)*.006),
                     (.046,.039,.072),'hair_light' if i==1 else 'hair','head',20,12)
    lock.rotation_euler.y = -.35

# A shaped cap crown and curved visor, with seam piping and embroidered badge.
tailored('Cap crown', [(1.565,.193,.157,.015),(1.59,.205,.167,.015),
    (1.66,.178,.151,.022),(1.706,.11,.103,.025),(1.721,.018,.018,.025)],'cap','head',32)
tailored('Cap band', [(1.565,.195,.159,.015),(1.585,.204,.166,.015)],'red_dark','head',32)
ellipsoid('Curved cap visor', (0,-.173,1.575), (.215,.153,.022),'jacket','head',32,12)
tube('Visor piping', [(-.2,-.19,1.574),(-.14,-.286,1.568),(0,-.32,1.568),(.14,-.286,1.568),(.2,-.19,1.574)],
     .004,'lining','head')
for s in [-1,1]:
    tube('Cap panel seam', [(s*.135,-.115,1.605),(s*.1,-.105,1.67),(0,.025,1.723)],
         .0025,'red_dark','head')
ellipsoid('Cap button', (0,.025,1.722), (.017,.017,.009),'red_dark','head',16,8)
box('Cap badge', (0,-.151,1.639), (.067,.013,.055), .013,'lining','head')
tube('Badge sprout', [(-.017,-.161,1.637),(0,-.163,1.623),(.019,-.161,1.651)],
     .004,'canvas_dark','head')

for side, s in [('left',-1),('right',1)]:
    arm, fore, leg, shin = [side+n for n in ['Arm','Forearm','Leg','Shin']]
    ellipsoid('Shoulder sleeve', (s*.245,0,1.13), (.088,.102,.126),'jacket',arm)
    box('Rolled sleeve', (s*.283,-.005,1.008), (.137,.145,.065), .024,'lining',arm)
    ellipsoid('Upper forearm', (s*.29,-.012,.959), (.052,.056,.09),'skin',fore)
    ellipsoid('Wrist', (s*.29,-.019,.862), (.039,.043,.075),'skin',fore)
    ellipsoid('Hand', (s*.29,-.025,.809), (.049,.04,.062),'skin',fore)
    ellipsoid('Thumb', (s*.254,-.052,.818), (.022,.025,.036),'skin',fore,16,12)
    box('Wrist cuff', (s*.29,-.016,.865), (.087,.09,.029), .009,'leather',fore)
    if s == -1:
        box('Field watch', (s*.29,-.065,.87), (.045,.018,.043), .008,'brass',fore)
        box('Watch glass', (s*.29,-.077,.87), (.03,.008,.029), .005,'ink',fore)
    ellipsoid('Trouser thigh', (s*.112,0,.617), (.091,.111,.175),'trousers',leg)
    box('Cargo pocket', (s*.185,0,.605), (.041,.145,.14), .018,'trouser_light',leg)
    box('Pocket flap', (s*.204,-.003,.659), (.016,.15,.034), .006,'trousers',leg)
    ellipsoid('Trouser calf', (s*.115,0,.375), (.073,.087,.126),'trousers',shin)
    box('Trouser cuff', (s*.115,0,.287), (.147,.168,.055), .017,'trouser_light',shin)
    box('Sock', (s*.115,0,.248), (.13,.143,.045), .014,'lining',shin)
    box('Boot upper', (s*.115,-.009,.184), (.153,.174,.145), .035,'leather',shin)
    box('Boot toe', (s*.115,-.066,.105), (.17,.283,.117), .044,'leather_light',shin)
    box('Boot sole', (s*.115,-.06,.045), (.181,.294,.054), .018,'sole',shin)
    tube('Boot welt', [(s*.115-.075,-.142,.07),(s*.115,-.204,.07),(s*.115+.075,-.142,.07)],
         .004,'scarf',shin)
    for z, y in [(.14,-.153),(.17,-.111),(.2,-.103)]:
        tube('Boot lace',[(s*.115-.037,y,z),(s*.115,y-.006,z-.004),(s*.115+.037,y,z)],
             .004,'lining',shin)
    # Harness follows the torso instead of floating over the shoulder.
    tube('Pack shoulder strap',[(s*.13,.16,.85),(s*.167,.145,1.19),
         (s*.17,0,1.223),(s*.153,-.116,1.13),(s*.125,-.127,.94)],.018,'leather','body')
    box('Harness adjuster',(s*.143,-.141,1.02),(.041,.016,.055),.005,'brass','body')

box('Canvas rucksack', (0,.224,1.035), (.341,.196,.374), .057,'canvas','pack')
box('Reinforced pack bottom',(0,.23,.867),(.344,.198,.075),.025,'leather','pack')
box('Rucksack flap',(0,.249,1.206),(.357,.217,.104),.038,'canvas_dark','pack')
box('Front pouch',(0,.339,1.009),(.233,.069,.17),.024,'canvas_dark','pack')
box('Pouch lid',(0,.361,1.075),(.246,.035,.049),.012,'canvas','pack')
for s in [-1,1]:
    box('Pack fastening strap',(s*.099,.341,1.139),(.025,.024,.184),.007,'leather_light','pack')
    box('Pack buckle',(s*.099,.358,1.104),(.044,.013,.046),.005,'brass','pack')
    box('Buckle centre',(s*.099,.367,1.104),(.024,.008,.025),.003,'leather','pack')
    tube('Pack stitched edge',[(s*.15,.302,.897),(s*.15,.32,1.04),(s*.15,.302,1.157)],
         .003,'roll','pack')
ellipsoid('Bedroll',(0,.24,1.303),(.223,.075,.07),'roll','pack',32,16)
for s in [-1,1]:
    box('Bedroll tie',(s*.132,.241,1.304),(.026,.154,.141),.035,'leather','pack')
    tube('Bedroll end spiral',[(s*.218,.24+math.cos(a)*r,1.303+math.sin(a)*r)
         for a,r in [(i*.4,.006+i*.0017) for i in range(30)]],.003,'canvas','pack')
box('Pack label',(0,.38,1.006),(.063,.008,.047),.005,'lining','pack')
tube('Label leaf',[(-.016,.387,1.012),(0,.389,.997),(.016,.387,1.019)],.003,'canvas_dark','pack')

bpy.context.view_layer.update()
# Bake modifiers and batch by material within each articulation group. This keeps
# the detailed model inexpensive to draw and makes the .blend match the runtime.
for group in GROUPS.values():
    for mat in MATS.values():
        batch = [o for o in group.children if o.type == 'MESH' and o.data.materials[0] == mat]
        if not batch:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in batch:
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            for modifier in list(obj.modifiers):
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            # Preserve bevel normals without introducing a runtime modifier.
            weighted = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
            weighted.keep_sharp = True
            bpy.ops.object.modifier_apply(modifier=weighted.name)
            obj.select_set(False)
        for obj in batch:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = batch[0]
        if len(batch) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = group.name+'_'+mat.name

def xyz(v):
    return [round(v.x,6), round(v.z,6), round(-v.y,6)]

nodes = []
depsgraph = bpy.context.evaluated_depsgraph_get()
for name, group in GROUPS.items():
    node = {'name':name, 'parent':group.parent.name if group.parent else None,
            'position':xyz(group.location), 'meshes':[]}
    for obj in group.children:
        if obj.type != 'MESH':
            continue
        mesh = obj.evaluated_get(depsgraph).to_mesh()
        mesh.calc_loop_triangles()
        positions, normals, indices, unique = [], [], [], {}
        normal_matrix = obj.matrix_local.to_3x3().inverted().transposed()
        for tri in mesh.loop_triangles:
            for li in tri.loops:
                loop = mesh.loops[li]
                p = xyz(obj.matrix_local @ mesh.vertices[loop.vertex_index].co)
                n = xyz((normal_matrix @ mesh.corner_normals[li].vector).normalized())
                key = tuple(p+n)
                if key not in unique:
                    unique[key] = len(positions)//3
                    positions.extend(p)
                    normals.extend(n)
                indices.append(unique[key])
        node['meshes'].append({'material':obj.data.materials[0].name,
                              'positions':positions,'normals':normals,'indices':indices})
    nodes.append(node)
payload = {'units':'metres','upAxis':'Y','forwardAxis':'+Z',
           'materials':{name:{'color':'#'+color,'roughness':rough,
                              'metalness':.65 if name=='brass' else 0}
                        for name,(color,rough) in PALETTE.items()},'nodes':nodes}
(OUT/'explorer.json').write_text(json.dumps(payload,separators=(',',':'))+'\n')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'explorer.glb'),export_format='GLB',
                          use_selection=True,export_yup=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'explorer.blend'))
print('EXPLORER_EXPORT',len(nodes),'joints',sum(len(n['meshes']) for n in nodes),'batches')

# Studio evidence is deliberately excluded from the gameplay exports.
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.render.resolution_x = 900
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.world.color = (.18,.18,.18)
scene.view_settings.view_transform = 'AgX'
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.015))
floor = bpy.context.object
floor_mat = bpy.data.materials.new('Studio floor')
floor_mat.diffuse_color = (.14,.18,.16,1)
floor.data.materials.append(floor_mat)
for location, energy, size in [((3,-4,6),500,4),((-3,-1,3),250,3),((1,3,4),600,3)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((0,0,.9))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.15
scene.camera = camera
evidence = ROOT/'artifacts/explorer'
evidence.mkdir(parents=True,exist_ok=True)
for view, location in [('front',(2.5,-5,2.4)),('back',(-2.6,5,2.5))]:
    camera.location = location
    camera.rotation_euler = (Vector((0,0,.87))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(evidence/(view+'.png'))
    bpy.ops.render.render(write_still=True)
