"""Build the island's coordinated scenery kit with Blender's bundled Python.

blender --background --python scripts/build-world-assets.py
Exports editable Blender source, individual GLBs, and material-batched runtime
geometry. Metres; authoring Z up/-Y forward, exports Y up/+Z forward.
"""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/models/world'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0

COLORS = {
    'plaster': ('E3D5B4', .94), 'plaster_light': ('F0E5CC', .93),
    'timber': ('6C5140', .87), 'wood': ('997650', .88),
    'wood_light': ('B79768', .89), 'wood_dark': ('514638', .93),
    'roof': ('A65D4C', .86), 'roof_light': ('BA725C', .86),
    'roof_dark': ('824B40', .9), 'stone': ('8F9687', .94),
    'stone_light': ('B3B4A0', .94), 'stone_dark': ('6C796E', .96),
    'moss': ('6E8252', 1), 'leaf_dark': ('3F614B', 1),
    'leaf': ('628057', 1), 'leaf_light': ('87A068', 1),
    'pine': ('3F6C60', 1), 'pine_light': ('638777', 1),
    'snow': ('E4EADF', .95), 'glass': ('7BA69D', .3),
    'glass_light': ('C1D4BE', .28), 'brass': ('C3A367', .4),
    'cream': ('F2DEB4', .93), 'red': ('BC6152', .9),
    'teal': ('5D837A', .95), 'purple': ('8C7597', .95),
    'petal': ('D3A270', .9), 'flower_centre': ('BD8D4A', .9),
    'mushroom': ('A7798D', .9), 'crystal': ('8EBFC0', .28),
    'crystal_light': ('C0DDCF', .3), 'water': ('81B6AF', .22),
    'canvas': ('8D9B7B', .96), 'fire': ('E9AC59', .8),
}
MATS = {}
for name, (color, roughness) in COLORS.items():
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    rgb = [int(color[i:i+2], 16)/255 for i in (0,2,4)]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    mat.diffuse_color = (*linear, 1)
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*linear, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = .55 if name=='brass' else 0
    MATS[name] = mat

ASSETS = {}
active = None
def asset(name):
    global active
    active = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(active)
    ASSETS[name] = active

def finish(obj, name, mat, smooth=True):
    obj.name = name
    obj.data.materials.append(MATS[mat])
    for p in obj.data.polygons:
        p.use_smooth = smooth
    # All kit roots are at the origin until export. Parenting preserves these
    # local coordinates without a costly dependency-graph update per detail.
    obj.parent = active
    return obj

def box(name, p, size, mat, bevel=.03, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft carved edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    obj.rotation_euler = rotation
    return finish(obj, name, mat)

def sphere(name, p, scale, mat, segments=12, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=p)
    obj = bpy.context.object
    obj.scale = scale
    return finish(obj, name, mat)

def ico(name, p, scale, mat, seed=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=p)
    obj = bpy.context.object
    rng = random.Random(seed)
    for v in obj.data.vertices:
        v.co *= .91+rng.random()*.16
    obj.scale = scale
    return finish(obj, name, mat)

def cylinder(name, p, radius, depth, mat, top=None, vertices=12):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius,
        radius2=radius if top is None else top, depth=depth, location=p)
    obj = finish(bpy.context.object, name, mat)
    for polygon in obj.data.polygons:
        if len(polygon.vertices) > 4:
            polygon.use_smooth = False
    return obj

def beam(name, a, b, radius, mat, top=None):
    av, bv = Vector(a), Vector(b)
    obj = cylinder(name, (av+bv)/2, radius, (bv-av).length, mat, top)
    obj.rotation_euler = (bv-av).to_track_quat('Z','Y').to_euler()
    return obj

def tube(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 5
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object, name, mat)

def torus(name, p, radius, thickness, mat, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6,
        location=p, major_radius=radius, minor_radius=thickness, rotation=rotation)
    return finish(bpy.context.object, name, mat)

def mesh(name, vertices, faces, mat, bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    if bevel:
        mod = obj.modifiers.new('Softened edges','BEVEL')
        mod.width = bevel
        mod.segments = 2
    return finish(obj,name,mat,False)

# One complete cottage shell, scaled only in X/Z for the three existing footprints.
# Service signs/awnings share this shell instead of duplicating its geometry.
asset('cottage')
w, d, eave, peak = 2.875, 2.3, 2.95, 4.3
box('Warm plaster walls',(0,0,1.55),(w*2,d*2,2.9),'plaster',.07)
for side in [-1,1]:
    mesh('Plaster gable', [(-w,side*d,eave),(w,side*d,eave),(0,side*d,peak)],
         [(2,1,0)] if side==1 else [(0,1,2)], 'plaster_light')
    for x in [-w+.07, w-.07]:
        box('Corner post',(x,side*(d-.035),1.6),(.15,.15,2.9),'timber',.025)
    box('Horizontal beam',(0,side*d,2.9),(w*2,.16,.16),'timber',.02)
    box('Foundation skirt',(0,side*d,.29),(w*2,.16,.38),'stone_dark',.025)
    # Foundation courses with a small stagger and visible mortar gaps.
    for row in range(2):
        for i in range(10):
            x = -w+.29+i*.576 + (.1 if row else 0)
            if x+.22 > w:
                continue
            box('Foundation block',(x,side*(d+.055),.14+row*.18),(.55,.12,.165),
                'stone_light' if (i+row)%4==0 else 'stone',.025)
for side in [-1,1]:
    box('Side foundation',(side*w,0,.27),(.14,d*2,.38),'stone',.03)
    box('Side timber sill',(side*w,0,.52),(.13,d*2,.14),'timber',.02)
    box('Side wall brace',(side*w,0,1.7),(.13,.14,2.45),'timber',.02)

# Pitched, overlapping individual shingles and ridge caps; no paper-thin roof.
slope = math.atan2(peak-eave,w+.32)
roof_length = math.hypot(w+.32,peak-eave)
for side in [-1,1]:
    box('Roof backing',(side*(w+.3)/2,0,(eave+peak)/2),
        (roof_length,.0+2*(d+.31),.11),'roof_dark',.025,(0,side*slope,0))
    for row in range(7):
        t = (row+.5)/7
        x = side*(w+.32)*t
        z = peak-(peak-eave)*t+.035
        for col in range(10):
            y = -(d+.3)+(.27 if row%2 else 0)+(col+.5)*(2*(d+.3)/10)
            if y > d+.35:
                continue
            mat = ['roof','roof','roof_light','roof','roof_dark'][(col+row*3)%5]
            box('Overlapping roof tile',(x,y,z),(roof_length/7+.07,.51,.065),mat,.028,(0,side*slope,0))
    for y in [-d-.31,d+.31]:
        beam('Gable fascia',(0,y,peak+.02),(side*(w+.35),y,eave-.03),.063,'timber')
    box('Eave gutter',(side*(w+.32),0,eave-.08),(.12,2*(d+.36),.15),'wood_dark',.02)
for i in range(11):
    cylinder('Ridge cap',(0,-d-.3+i*.51,peak+.055),.105,.54,'roof_dark',vertices=10).rotation_euler.x=math.pi/2

# Door, recess, carved frame, hinges and brass hardware.
box('Door recess',(0,-d-.027,1.18),(1.16,.08,2.23),'wood_dark',.07)
for i in range(5):
    box('Door board',(-.405+i*.203,-d-.082,1.15),(.195,.055,1.96),'wood',.014)
for s in [-1,1]:
    box('Door jamb',(s*.565,-d-.095,1.2),(.13,.16,2.23),'timber',.022)
box('Door lintel',(0,-d-.1,2.32),(1.24,.17,.18),'timber',.025)
box('Door threshold',(0,-d-.08,.16),(1.23,.2,.14),'stone_light',.025)
for z in [.55,1.7]:
    box('Door strap hinge',(-.32,-d-.122,z),(.24,.025,.035),'wood_dark',.008)
sphere('Door knob',(.325,-d-.16,1.15),(.045,.04,.045),'brass')
box('Door upper glass',(0,-d-.127,1.82),(.31,.019,.3),'glass',.025)
box('Door glass mullion',(0,-d-.141,1.82),(.025,.015,.31),'wood_light',.004)

def window(x, y, z, side=False):
    # Build facing -Y; side windows are authored on the side wall separately.
    box('Window frame',(x,y,z),(1.02,.14,1.12),'timber',.035)
    box('Recessed window',(x,y-.08,z),(.83,.035,.91),'glass',.015)
    box('Window reflection',(x-.2,y-.102,z+.15),(.14,.006,.42),'glass_light',.012,(0,-.2,0))
    box('Window vertical mullion',(x,y-.11,z),(.05,.045,.95),'wood_light',.008)
    box('Window horizontal mullion',(x,y-.11,z),(.87,.045,.05),'wood_light',.008)
    box('Window sill',(x,y-.13,z-.59),(1.15,.28,.12),'wood_light',.02)
    for s in [-1,1]:
        box('Painted shutter',(x+s*.65,y-.01,z),(.23,.1,1.06),'teal',.025)
        for offset in [-.31,0,.31]:
            box('Shutter slat',(x+s*.65,y-.07,z+offset),(.19,.035,.035),'canvas',.005)
for x in [-1.8,1.8]:
    window(x,-d-.045,1.73)
    box('Window planter',(x,-d-.24,.97),(1.05,.33,.27),'wood',.025)
    for i in range(4):
        ico('Planter foliage',(x-.37+i*.25,-d-.24,1.19),(.18,.2,.15),'leaf',i)
        sphere('Planter bloom',(x-.36+i*.24,-d-.28,1.29),(.07,.07,.06),'petal',8,6)
for s in [-1,1]:
    box('Side window frame',(s*(w+.03),.3,1.8),(.12,1.02,1.12),'timber',.025)
    box('Side window glass',(s*(w+.1),.3,1.8),(.035,.83,.91),'glass',.012)
    box('Side window mullion',(s*(w+.125),.3,1.8),(.025,.045,.92),'wood_light',.005)
    box('Side window crossbar',(s*(w+.125),.3,1.8),(.025,.86,.045),'wood_light',.005)
    box('Side sill',(s*(w+.14),.3,1.2),(.25,1.15,.12),'wood_light',.02)
beam('Gable centre beam',(0,-d-.055,eave),(0,-d-.055,peak-.1),.065,'timber')
for s in [-1,1]:
    beam('Gable diagonal',(0,-d-.06,3.4),(s*1.7,-d-.06,2.99),.045,'wood')
torus('Round attic frame',(0,-d-.105,3.48),.25,.05,'wood_light',(math.pi/2,0,0))
cylinder('Attic glass',(0,-d-.11,3.48),.22,.025,'glass',vertices=24).rotation_euler.x=math.pi/2
box('Stone chimney',(1.5,.8,3.95),(.62,.66,1.2),'stone',.06)
box('Chimney cap',(1.5,.8,4.57),(.76,.8,.16),'stone_light',.04)
box('Chimney flue',(1.5,.8,4.66),(.45,.48,.03),'wood_dark',.01)
for i in range(3):
    box('Chimney course',(1.5,.8,3.78+i*.24),(.64,.68,.025),'stone_dark',.006)
# Brass wall lantern; emissive-looking amber glass, shaded by its housing.
box('Lantern bracket',(.85,-d-.2,2.1),(.08,.33,.07),'wood_dark',.01)
box('Lantern glass',(.85,-d-.33,1.88),(.18,.17,.25),'cream',.025)
for z in [1.735,2.025]:
    box('Lantern metal cap',(.85,-d-.33,z),(.24,.22,.045),'wood_dark',.012)

asset('heal-sign')
box('Carved signboard',(0,-2.4,2.65),(1.24,.12,.45),'red',.09)
box('Ivory cross',(0,-2.48,2.65),(.27,.035,.085),'cream',.015)
box('Ivory cross',(0,-2.49,2.65),(.085,.035,.27),'cream',.015)

asset('shop-awning')
for i in range(12):
    x = -2.7+(i+.5)*.45
    box('Striped canvas awning',(x,-2.67,2.7),(.448,.83,.055),
        'cream' if i%2 else 'teal',.018,(.2,0,0))
    box('Awning scallop',(x,-3.06,2.57),(.448,.06,.19),
        'cream' if i%2 else 'teal',.05)
for s in [-1,1]:
    beam('Awning support',(s*2.64,-2.35,2.18),(s*2.64,-3.02,2.59),.027,'timber')

asset('guild-sign')
box('Guild carved plaque',(0,-2.42,2.65),(1.3,.12,.45),'purple',.06)
for s in [-1,1]:
    beam('Guild crossed staff',(s*.18,-2.5,2.53),(-s*.18,-2.5,2.78),.022,'brass')
sphere('Guild emblem',(0,-2.52,2.68),(.055,.02,.055),'cream')

asset('champion-sign')
box('Champion plaque',(0,-2.42,2.65),(1.3,.12,.45),'wood_dark',.06)
for s in [-1,1]:
    tube('Laurel',[(s*.06,-2.5,2.54),(s*.2,-2.5,2.59),(s*.23,-2.5,2.73)],.025,'brass')
for s in [-1,0,1]:
    box('Crown point',(s*.11,-2.51,2.72),(.06,.035,.11 if s else .16),'brass',.01)
box('Crown band',(0,-2.51,2.61),(.31,.04,.07),'brass',.01)

# Trunks and crowns are separate so foliage between the camera and explorer can
# still be hidden without removing the visible trunk or changing collision.
asset('tree-trunk')
beam('Tapered trunk',(0,0,-.08),(.06,.02,2.9),.21,'timber',.105)
for i in range(5):
    a=i*math.tau/5+.3
    beam('Root flare',(math.cos(a)*.29,math.sin(a)*.29,-.035),
         (math.cos(a)*.1,math.sin(a)*.1,.48),.07,'timber',.05)
for i in range(4):
    a=i*2.2
    beam('Branch',(.03,0,1.9+i*.19),(math.cos(a)*.8,math.sin(a)*.8,2.9+i*.1),.085,'timber',.035)
for a in [0,1.5,3.2,4.8]:
    tube('Bark ridge',[(math.cos(a)*.18,math.sin(a)*.18,.2),
        (math.cos(a+.15)*.16,math.sin(a+.15)*.16,1.2),
        (math.cos(a+.2)*.12,math.sin(a+.2)*.12,2.3)],.012,'wood')
asset('tree-crown')
for i,(x,y,z,sx,sy,sz) in enumerate([
    (-.65,0,-.05,.91,.92,.86),(.65,.05,0,.9,.88,.9),
    (0,.65,.02,.92,.78,.86),(0,-.64,.1,.88,.84,.9),
    (-.35,.1,.68,.93,.9,.9),(.38,-.15,.78,.88,.86,.87),(0,.04,1.2,.7,.7,.7)]):
    ico('Leafy canopy',(x,y,z),(sx,sy,sz),['leaf_dark','leaf','leaf','leaf','leaf_light','leaf','leaf_light'][i],i)

for snowy in [False,True]:
    asset('snow-pine-crown' if snowy else 'pine-crown')
    for i in range(4):
        z=-.6+i*.68
        radius=1.25-i*.24
        obj=cylinder('Layered pine boughs',(0,0,z+.35),radius,1.35,'pine' if i%2==0 else 'pine_light',.04,16)
        # Gently scallop the lower edges instead of using perfect cones.
        for v in obj.data.vertices:
            if v.co.z < 0:
                v.co.z += .08*math.sin(math.atan2(v.co.y,v.co.x)*5+i)
        if snowy:
            cylinder('Snow on bough',(0,0,z+.61),radius*.78,.94,'snow',.035,16)

asset('rock')
ico('Weathered boulder',(0,0,.32),(.61,.53,.46),'stone',13)
ico('Broken stone face',(.3,-.16,.18),(.31,.33,.27),'stone_light',9)
ico('Moss cushion',(-.14,.08,.63),(.35,.29,.07),'moss',4)
asset('snow-rock')
ico('Frosted boulder',(0,0,.32),(.61,.53,.46),'stone',13)
ico('Snow drift',(-.08,.04,.62),(.49,.43,.16),'snow',4)

asset('grass')
for i in range(7):
    a=i*2.4
    x,y=math.cos(a)*.13,math.sin(a)*.13
    h=.2+(i%3)*.07
    # Folded leaves catch light from both directions without billboard sprites.
    mesh('Grass blade',[(x-.022,y,0),(x+.022,y,0),(x+.024,y+.024,h*.54),
         (x+math.cos(a)*.09,y+math.sin(a)*.09,h),(x-.024,y+.024,h*.54)],
         [(0,1,2),(0,2,4),(4,2,3)],'leaf_light' if i%2 else 'leaf',.0)

asset('flower')
for i in range(3):
    x,y=(i-1)*.12,math.sin(i*3)*.09
    h=.25+i*.05
    stem=cylinder('Flower stem',(x,y,h*.5),.012,h,'leaf',vertices=6)
    sphere('Stem leaf',(x+.04,y,h*.5),(.065,.022,.025),'leaf_light',6,3)
    for k in range(5):
        a=k*math.tau/5
        sphere('Flower petal',(x+math.cos(a)*.05,y+math.sin(a)*.05,h),(.046,.035,.018),'petal',6,3)
    sphere('Golden centre',(x,y,h+.014),(.025,.025,.017),'flower_centre',6,3)

asset('reeds')
for i in range(9):
    a=i*2.4
    x,y=math.cos(a)*(.13+i*.035),math.sin(a)*(.13+i*.035)
    h=.7+(i%4)*.13
    beam('Reed stem',(x,y,0),(x+.04,y,h),.016,'leaf')
    cylinder('Velvet reed head',(x+.04,y,h),.035,.19,'wood_dark',vertices=8)
    for s in [-1,1]:
        mesh('Reed leaf',[(x,y,.13),(x+s*.08,y,.41),(x+s*.3,y,.61),
             (x+s*.1,y,.28)],[(0,1,2),(0,2,3)],'leaf_light')

asset('mushrooms')
for i in range(5):
    x,y=math.sin(i*2.4)*.5,math.cos(i*2.4)*.5
    h=.28+(i%3)*.1
    cylinder('Mushroom stalk',(x,y,h*.5),.055,h,'cream',.045,10)
    sphere('Mushroom underside',(x,y,h),(.22,.2,.05),'cream')
    sphere('Mushroom cap',(x,y,h+.055),(.23,.21,.12),'mushroom')
    for j in range(3):
        a=j*2.3+i
        sphere('Ivory cap spot',(x+math.cos(a)*.11,y+math.sin(a)*.1,h+.153),(.035,.03,.012),'cream',8,6)

asset('crystals')
for i in range(6):
    a=i*2.4
    x,y=math.sin(a)*.5,math.cos(a)*.4
    h=.65+(i%3)*.3
    cylinder('Crystal prism',(x,y,h*.4),.13,h*.8,'crystal',vertices=6)
    cylinder('Crystal point',(x,y,h*.9),.13,h*.2,'crystal_light',0,6)
ico('Crystal host stone',(0,0,.09),(.75,.57,.15),'stone_dark',2)

asset('shrine')
box('Shrine plinth',(0,0,.1),(2.4,1.02,.2),'stone',.06)
for s in [-1,1]:
    box('Pillar foot',(s*.83,0,.28),(.62,.7,.2),'stone_light',.04)
    box('Carved pillar',(s*.83,0,1.13),(.43,.46,1.6),'stone',.06)
    box('Pillar capital',(s*.83,0,1.96),(.63,.66,.19),'stone_light',.04)
    for h in [.7,1.2,1.7]:
        box('Pillar joint',(s*.83,-.239,h),(.4,.018,.025),'stone_dark',.002)
    ico('Pillar moss',(s*.83,.04,2.1),(.34,.31,.06),'moss',3)
box('Lintel',(0,0,2.12),(2.54,.74,.26),'stone_light',.06)
box('Lintel inset',(0,-.386,2.12),(.72,.03,.15),'stone_dark',.03)
torus('Ancient ring',(0,-.413,2.12),.1,.02,'brass',(math.pi/2,0,0))
box('Offering pedestal',(0,0,.4),(.5,.5,.6),'stone',.05)
sphere('Offering glow',(0,0,.77),(.13,.13,.13),'crystal')

asset('ruins')
for i in range(7):
    x=(i%3-1)*.67
    y=(i//3)*.4-.4
    box('Tumbled masonry',(x,y,.16+(i%2)*.08),(.58,.38,.29),'stone' if i%2 else 'stone_light',.06,(0,0,i*.19))
for s,h in [(-1,1.8),(1,1.2)]:
    for i in range(round(h/.32)):
        box('Ruined column',(s*.91,0,.16+i*.32),(.45,.5,.3),'stone',.04,(0,0,i*.025*s))
    ico('Wall moss',(s*.9,0,h),(.33,.3,.08),'moss',7)
box('Fallen lintel',(.1,.4,.43),(1.53,.53,.31),'stone_light',.05,(0,.12,.2))

asset('fountain')
cylinder('Fountain footing',(0,0,.1),1.04,.2,'stone_dark',vertices=24)
cylinder('Carved basin',(0,0,.31),.95,.32,'stone',vertices=24)
torus('Basin rim',(0,0,.49),.86,.1,'stone_light')
cylinder('Water surface',(0,0,.465),.8,.025,'water',vertices=32)
cylinder('Fountain column',(0,0,.86),.14,.78,'stone_light',.12,16)
cylinder('Upper bowl',(0,0,1.26),.42,.16,'stone',.46,24)
torus('Upper lip',(0,0,1.35),.43,.055,'stone_light')
sphere('Fountain finial',(0,0,1.52),(.13,.13,.19),'stone_light')
for i in range(4):
    a=i*math.pi/2
    tube('Water stream',[(math.cos(a)*.4,math.sin(a)*.4,1.34),
        (math.cos(a)*.59,math.sin(a)*.59,1.15),(math.cos(a)*.69,math.sin(a)*.69,.5)],.014,'water')

asset('windmill')
cylinder('Plaster tower',(0,0,1.9),.9,3.8,'plaster',.57,16)
cylinder('Mill base',(0,0,.18),1.03,.36,'stone',.98,16)
cylinder('Mill cap',(0,0,4.0),.84,.9,'roof',.03,16)
box('Mill door',(0,-.865,.8),(.6,.1,1.35),'wood',.06)
box('Mill window',(0,-.68,2.6),(.42,.08,.58),'timber',.03)
box('Mill glass',(0,-.73,2.6),(.3,.025,.46),'glass',.02)
for i in range(4):
    a=i*math.pi/2+.35
    end=(math.sin(a)*2.05,-.92,3.35+math.cos(a)*2.05)
    beam('Windmill sail spar',(0,-.92,3.35),end,.045,'timber')
    for j in range(5):
        r=.65+j*.29
        x,z=math.sin(a)*r,3.35+math.cos(a)*r
        box('Lattice sail',(x,-.91,z),(.48,.055,.22),'cream',.012,(0,a,0))
sphere('Mill hub',(0,-.99,3.35),(.19,.13,.19),'wood_dark')

asset('bench')
for s in [-1,1]:
    for y in [-.23,.23]:
        box('Bench leg',(s*.6,y,.26),(.11,.11,.52),'timber',.02)
    box('Back support',(s*.6,.23,.7),(.1,.1,.8),'timber',.02,(.12,0,0))
for y in [-.2,0,.2]:
    box('Seat plank',(0,y,.55),(1.65,.17,.09),'wood',.025)
for z in [.8,1.02]:
    box('Backrest plank',(0,.27,z),(1.65,.09,.18),'wood_light',.025)

asset('cart')
for i in range(5):
    box('Cart bed',(-.48+i*.24,0,.57),(.225,1.43,.09),'wood',.018)
for s in [-1,1]:
    for z in [.76,.99]:
        box('Cart side',(s*.62,0,z),(.08,1.48,.17),'wood_light',.025)
    for y in [-.64,.64]:
        box('Cart corner',(s*.6,y,.83),(.09,.09,.63),'timber',.012)
    torus('Cart wheel',(s*.76,.08,.38),.36,.055,'wood_dark',(0,math.pi/2,0))
    for i in range(8):
        a=i*math.pi/4
        beam('Wheel spoke',(s*.76,.08,.38),(s*.76,.08+math.sin(a)*.32,.38+math.cos(a)*.32),.02,'wood')
    beam('Cart shaft',(s*.4,-.4,.55),(s*.4,-1.67,.62),.04,'timber')
for x,y in [(-.2,.3),(.26,-.24)]:
    ico('Sack',(x,y,.81),(.27,.32,.28),'canvas',3)

asset('boat')
# A real open hull with outer and inner planking, pointed bow and transom.
cross=[(-1.25,.0,.35),(-.78,.42,.0),(.65,.46,.0),(1.15,.31,.22)]
verts=[]
for y,width,z in cross:
    verts.extend([(-width,y,.48),(0,y,z),(width,y,.48)])
faces=[]
for i in range(3):
    k=i*3
    faces.extend([(k,k+3,k+4,k+1),(k+1,k+4,k+5,k+2)])
obj=mesh('Clinker hull',verts,faces,'wood')
solid=obj.modifiers.new('Hull thickness','SOLIDIFY');solid.thickness=.055
for s in [-1,1]:
    tube('Gunwale',[(s*width,y,.5) for y,width,z in cross],.04,'wood_dark')
for y in [-.4,.35,.85]:
    box('Boat seat',(0,y,.41),(.75,.2,.07),'wood_light',.02)
beam('Boat oar',(-.65,-.85,.53),(.8,.8,.58),.023,'timber')
box('Oar blade',(.8,.8,.58),(.19,.4,.045),'wood_light',.03,(0,0,-.7))

asset('camp')
for i in range(9):
    a=i*math.tau/9
    ico('Fire ring stone',(math.cos(a)*.57,math.sin(a)*.57,.12),(.18,.15,.14),'stone',i)
for a in [-.6,.7]:
    beam('Campfire log',(-.4*math.cos(a),-.4*math.sin(a),.14),(.4*math.cos(a),.4*math.sin(a),.14),.09,'wood_dark')
for i in range(3):
    ico('Ember',((i-1)*.12,0,.18),(.09,.07,.04),'fire',i)
for s in [-1,1]:
    beam('Camp seat',(s*.75,-.43,.24),(s*.75,.43,.24),.13,'wood')

asset('bridge-plank')
box('Weathered deck plank',(0,0,0),(2,.34,.14),'wood',.025)
for x in [-.83,.83]:
    for y in [-.1,.1]:
        cylinder('Iron deck peg',(x,y,.074),.015,.012,'wood_dark',vertices=6)
for x in [-.42,.25]:
    tube('Plank grain',[(x,-.14,.075),(x+.025,0,.078),(x-.015,.14,.075)],.004,'wood_light')

asset('bridge-post')
box('Bridge post',(0,0,.53),(.14,.14,1.18),'timber',.025)
box('Post cap',(0,0,1.13),(.21,.21,.09),'wood_light',.025)
asset('bridge-rail')
box('Bridge handrail',(0,0,0),(1,.1,.1),'wood_light',.025)

asset('treasure')
box('Travel cache',(0,0,0),(.34,.25,.23),'wood',.035)
box('Cache lid',(0,0,.14),(.36,.27,.09),'wood_light',.025)
for s in [-1,1]:
    box('Cache metal strap',(s*.105,0,.035),(.028,.26,.29),'brass',.006)
box('Cache latch',(0,-.139,.06),(.055,.018,.08),'brass',.008)

# Bake all modifiers, batch by material, and export at each asset's own origin.
def xyz(v):
    return [round(v.x,5),round(v.z,5),round(-v.y,5)]

payload={'units':'metres','upAxis':'Y','forwardAxis':'+Z',
         'materials':{n:{'color':'#'+c,'roughness':r,'metalness':.55 if n=='brass' else 0}
                      for n,(c,r) in COLORS.items()},'assets':{}}
for name,root in ASSETS.items():
    for mat in MATS.values():
        batch=[o for o in root.children if o.type=='MESH' and o.data.materials[0]==mat]
        if not batch:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in batch:
            obj.select_set(True)
            bpy.context.view_layer.objects.active=obj
            for modifier in list(obj.modifiers):
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            if all(p.use_smooth for p in obj.data.polygons):
                mod=obj.modifiers.new('Weighted edge normals','WEIGHTED_NORMAL')
                mod.keep_sharp=True
                bpy.ops.object.modifier_apply(modifier=mod.name)
            obj.select_set(False)
        for obj in batch:
            obj.select_set(True)
        bpy.context.view_layer.objects.active=batch[0]
        if len(batch)>1:
            bpy.ops.object.join()
        bpy.context.object.name=name+'_'+mat.name
    bpy.context.view_layer.update()
    meshes=[]
    for obj in root.children:
        if obj.type!='MESH':
            continue
        obj.data.calc_loop_triangles()
        positions,normals,indices,unique=[],[],[],{}
        normal_matrix=obj.matrix_local.to_3x3().inverted().transposed()
        for tri in obj.data.loop_triangles:
            for li in tri.loops:
                vi=obj.data.loops[li].vertex_index
                p=xyz(obj.matrix_local@obj.data.vertices[vi].co)
                n=xyz((normal_matrix@obj.data.corner_normals[li].vector).normalized())
                key=tuple(p+n)
                if key not in unique:
                    unique[key]=len(positions)//3
                    positions.extend(p);normals.extend(n)
                indices.append(unique[key])
        meshes.append({'material':obj.data.materials[0].name,'positions':positions,
                       'normals':normals,'indices':indices})
    payload['assets'][name]=meshes
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for obj in root.children:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',
                              use_selection=True,export_yup=True)
    print('WORLD_ASSET',name,'triangles',sum(len(m['indices'])//3 for m in meshes))
(OUT/'world-kit.json').write_text(json.dumps(payload,separators=(',',':'))+'\n')
for i,root in enumerate(ASSETS.values()):
    root.location=((i%6)*9,(i//6)*10,0)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'world-kit.blend'))
print('WORLD_KIT_COMPLETE',len(ASSETS),'assets')
