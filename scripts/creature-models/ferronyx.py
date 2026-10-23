"""Ferronyx: an independently authored, articulated living-steel wolf.

Reference: assets/monster/ferronyx.png. Public coordinates: X right, Y up,
Z forward. The negative spaces in every gear are actual open geometry.
Imported by batch_a.py so full-library rebuilds retain this sculpture.
"""
import math
import bpy
from mathutils import Vector
from common import Model

VOID = '#171e20'
JOINT = '#30393b'
DARK = '#414b4e'
STEEL = '#626e72'
FACE = '#788589'
EDGE = '#a7b3b4'
SILVER = '#c3cecc'


def bevel(m, obj, width=.014, edge=EDGE, angle=.3):
    """Real, exportable chamfers with a separately colored machined edge."""
    obj.data.materials.append(m.material(edge))
    mod = obj.modifiers.new('Machined edge chamfer', 'BEVEL')
    mod.width = width
    mod.segments = 1
    mod.limit_method = 'ANGLE'
    mod.angle_limit = angle
    mod.material = 1
    # Bake once: Blender, GLB and the quantized game mesh use identical faces.
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def plate(m, name, points, normal, thickness=.07, color=STEEL,
          joint='body', ridge=.018, chamfer=.012):
    """A closed polygonal armor casting, with a slightly crowned front."""
    pp = [Vector(p) for p in points]
    nn = Vector(normal).normalized()
    n = len(pp)
    center = sum(pp, Vector()) / n + nn * ridge
    verts = pp + [p - nn * thickness for p in pp] + [center]
    faces = [(i, (i+1) % n, 2*n) for i in range(n)]
    faces += [tuple(range(2*n-1, n-1, -1))]
    faces += [(i, n+i, n+(i+1) % n, (i+1) % n) for i in range(n)]
    obj = m.mesh(name, [tuple(v) for v in verts], faces, color, joint, smooth=False)
    # Crown triangles shade the casting; only its steeper perimeter gets a
    # bright chamfer. Highlighting every internal edge looks like a wire cage.
    return bevel(m, obj, chamfer, angle=1.1) if chamfer else obj


def side_plate(m, name, side, x, yz, **kwargs):
    return plate(m, name, [(side*x, y, z) for y, z in yz], (side, 0, 0), **kwargs)


def ring(m, name, center, outer, inner, depth, side=1, teeth=0,
         color=STEEL, joint='body', phase=0):
    """Extruded annulus/cog in the YZ plane, including the inner bore wall."""
    cx, cy, cz = center
    profile = []
    count = teeth*8 if teeth else 48
    for k in range(count):
        a = k * math.tau/count + phase
        # Broad square teeth with narrow shoulders, rather than pointed stars.
        r = outer * (1 if not teeth or k % 8 in (2, 3, 4, 5) else .82)
        profile.append((a, r))
    verts = []
    for xx, inside in [(cx-side*depth/2, False), (cx+side*depth/2, False),
                       (cx-side*depth/2, True), (cx+side*depth/2, True)]:
        for a, r in profile:
            rad = inner if inside else r
            verts.append((xx, cy+math.cos(a)*rad, cz+math.sin(a)*rad))
    faces = []
    for k in range(count):
        j = (k+1) % count
        faces.extend([(k, j, count+j, count+k),
                      (2*count+k, 3*count+k, 3*count+j, 2*count+j),
                      (count+k, count+j, 3*count+j, 3*count+k),
                      (k, 2*count+k, 2*count+j, j)])
    obj = m.mesh(name, verts, faces, color, joint, smooth=False)
    return bevel(m, obj, min(.013, (outer-inner)*.12))


def spar(m, name, points, radii, color=DARK, joint='body', sides=8, flatten=1):
    """Angular swept casting; used for struts, recurved fangs and tail blades."""
    pp = [Vector(p) for p in points]
    verts = []
    for i, p in enumerate(pp):
        direction = (pp[min(i+1, len(pp)-1)]-pp[max(i-1, 0)]).normalized()
        u = direction.cross(Vector((1, 0, 0)))
        if u.length < .1:
            u = direction.cross(Vector((0, 0, 1)))
        u.normalize()
        v = direction.cross(u).normalized()
        for k in range(sides):
            a = k*math.tau/sides
            verts.append(tuple(p + radii[i]*(u*math.cos(a) + v*math.sin(a)*flatten)))
    faces = []
    for i in range(len(pp)-1):
        for k in range(sides):
            a = i*sides+k
            b = i*sides+(k+1) % sides
            faces.append((a, b, b+sides, a+sides))
    faces += [tuple(range(sides-1, -1, -1)),
              tuple((len(pp)-1)*sides+k for k in range(sides))]
    return m.mesh(name, verts, faces, color, joint, smooth=False)


def ferronyx():
    m = Model('Ferronyx')
    m.joint('head', (0, 1.43, .74))
    m.joint('tail', (0, 1.08, -.82))
    # A crouched, deep forechest and high armored withers, with a tucked waist.
    m.ellipsoid('Recessed thorax under the armor', (0, 1.10, -.08), (.39, .43, .79), JOINT)
    m.ellipsoid('Mechanical withers', (0, 1.48, .20), (.34, .40, .46), DARK)
    m.ellipsoid('Tucked abdominal core', (0, .98, -.58), (.25, .26, .39), VOID)
    spar(m, 'Forward sloping neck core', [(0, 1.1, .38), (0, 1.49, .64), (0, 1.67, .85)], [.33, .30, .25])

    # Oversized stacked cog assemblies are the defining silhouette of the art.
    for s in (-1, 1):
        ring(m, 'Great open withers gear', (s*.21, 1.57, -.24), .67, .43, .12, s, 12, DARK, phase=.10)
        ring(m, 'Withers inner running rim', (s*.285, 1.57, -.24), .43, .375, .055, s, color=STEEL)
        ring(m, 'Intermediate interlocking back gear', (s*.38, 1.38, -.01), .50, .31, .13, s, 10, STEEL, phase=.17)
        ring(m, 'Intermediate recessed bearing', (s*.395, 1.38, -.01), .30, .25, .05, s, color=JOINT)
        # Breast, belly and flank plates overlap but keep dark seams visible.
        for k in range(4):
            z = .36-k*.27
            side_plate(m, 'Interleaved rib armor %s %s' % (s, k), s, .36+(k % 2)*.025,
                       [(1.39, z+.12), (1.27, z+.22), (.97, z+.06),
                        (.78, z-.12), (.92, z-.25), (1.19, z-.12)],
                       color=DARK if k % 2 else STEEL, ridge=.045)
        # Neck ruff made of individual jagged steel blades, not organic fur.
        for row in range(3):
            y = 1.60-row*.17
            side_plate(m, 'Layered serrated neck blade %s %s' % (s, row), s, .33+row*.045,
                       [(y+.11, .78), (y+.08, .45), (y-.06, .24-row*.025),
                        (y-.11, .44), (y-.27, .31), (y-.18, .68)],
                       color=STEEL if row == 0 else DARK, ridge=.055)
        for row in range(3) if s == 1 else ():
            y = 1.22-row*.18
            plate(m, 'Overlapping breast keel',
                  [(-.25+row*.025, y+.14, .69-row*.035),
                   (.25-row*.025, y+.14, .69-row*.035),
                   (.22-row*.025, y-.02, .79-row*.04),
                   (0, y-.21, .86-row*.05),
                   (-.22+row*.025, y-.02, .79-row*.04)],
                  (0, .1, 1), color=DARK, ridge=.045)
    # Each raised dorsal plate has a distinct beveled perimeter and ridge.
    for k in range(5):
        z = .42-k*.29
        y = 1.78 - abs(k-1)*.045
        for s in (-1, 1):
            plate(m, 'Broad overlapping dorsal casting',
                  [(s*.03, y+.03, z+.16), (s*.28, y-.05, z+.20),
                   (s*.43, y-.19, z-.02), (s*.26, y-.08, z-.22),
                   (s*.09, y+.14, z-.12)], (s*.3, 1, 0), color=FACE if k % 2 else STEEL,
                  thickness=.08, ridge=.025)
        plate(m, 'Dorsal saw blade',
              [(-.045, y, z+.16), (-.045, y+.36, z-.02),
               (-.045, y+.22, z-.27), (-.045, y-.03, z-.22)],
              (-1, 0, 0), color=DARK, thickness=.09, ridge=.01)

    # Four different articulated leg chains, broad stance and enormous claws.
    for s in (-1, 1):
        j = 'leftArm' if s < 0 else 'rightArm'
        m.joint(j, (s*.36, 1.16, .35))
        ring(m, 'Shoulder gear shadow bearing', (s*.405, 1.29, .30), .395, .16, .16, s, 12, VOID, j, .09)
        ring(m, 'Large toothed shoulder guard', (s*.505, 1.29, .30), .37, .19, .12, s, 9, STEEL, j, .23)
        ring(m, 'Hollow shoulder axle lip', (s*.58, 1.29, .30), .18, .12, .065, s, color=FACE, joint=j)
        ring(m, 'Deep shoulder bore', (s*.53, 1.29, .30), .12, .095, .035, s, color=VOID, joint=j)
        spar(m, 'Foreleg piston core', [(s*.37, 1.15, .38), (s*.40, .73, .48),
                                      (s*.46, .29, .77)], [.15, .115, .10], JOINT, j)
        side_plate(m, 'Long angular upper foreleg casting', s, .49,
                   [(1.04, .32), (.98, .54), (.68, .69), (.49, .64), (.67, .44), (.90, .27)],
                   joint=j, color=STEEL, ridge=.055)
        side_plate(m, 'Raised foreleg inset', s, .552,
                   [(.94, .40), (.91, .48), (.61, .62), (.69, .54)],
                   joint=j, color=DARK, thickness=.018, chamfer=.006)
        plate(m, 'Ridged front shin shield',
              [(s*.27, .83, .61), (s*.43, 1.02, .58), (s*.57, .80, .61),
               (s*.60, .36, .86), (s*.44, .28, .96), (s*.32, .40, .86)],
              (0, .2, 1), color=STEEL, joint=j, ridge=.08)
        ring(m, 'Elbow axle', (s*.51, .73, .48), .14, .065, .06, s, 7, DARK, j)
        forefoot(m, s, .46, .12, .90, j, True)

        j = 'leftLeg' if s < 0 else 'rightLeg'
        m.joint(j, (s*.30, 1.0, -.63))
        m.ellipsoid('Hind drive housing', (s*.30, .91, -.65), (.21, .30, .29), DARK, j, 16, 10)
        ring(m, 'Hindquarter gear', (s*.405, .99, -.67), .34, .16, .13, s, 10, STEEL, j, .12)
        ring(m, 'Hindquarter hollow hub', (s*.48, .99, -.67), .15, .095, .07, s, color=DARK, joint=j)
        spar(m, 'Digitigrade rear drive strut', [(s*.30, .91, -.65), (s*.34, .60, -.48),
                                              (s*.35, .32, -.88), (s*.37, .13, -.78)],
             [.17, .125, .08, .09], JOINT, j)
        side_plate(m, 'Angular hind thigh shield', s, .43,
                   [(.92, -.80), (.92, -.56), (.62, -.36), (.47, -.49), (.62, -.69)],
                   color=DARK, joint=j, ridge=.045)
        side_plate(m, 'Long rear hock shield', s, .43,
                   [(.61, -.48), (.56, -.62), (.29, -.96), (.15, -.86), (.24, -.72)],
                   color=STEEL, joint=j, ridge=.035)
        plate(m, 'Hind shin front ridge',
              [(s*.27, .57, -.50), (s*.43, .57, -.50),
               (s*.44, .20, -.78), (s*.33, .14, -.67)],
              (0, 0, 1), color=STEEL, joint=j, ridge=.035)
        forefoot(m, s, .37, .10, -.62, j, False)

    build_head(m)
    build_tail(m)
    # Metals keep their illustrated pigments in the toon runtime. The GLB and
    # editable Blender file also carry proper metal/roughness shading.
    for color, mat in m.materials.items():
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Metallic'].default_value = .55 if '#'+color not in (VOID, '#f0faf4') else .05
        shader.inputs['Roughness'].default_value = .48
    return m


def forefoot(m, s, x, y, z, joint, front):
    # A polygonal wrist cuff overlaps the armored metacarpals.
    spar(m, 'Octagonal wrist coupling', [(s*x, y+.25, z-.13), (s*x, y+.11, z-.04)],
         [.16 if front else .12, .145 if front else .12], DARK, joint)
    for k in (-1, 0, 1):
        xx = s*x+k*(.113 if front else .09)
        zz = z + (.035 if k == 0 else 0)
        size = 1 if front else .80
        plate(m, 'Individual overlapping toe armor',
              [(xx-.048*size, y+.15, zz-.14), (xx+.048*size, y+.15, zz-.14),
               (xx+.064*size, y+.08, zz+.10), (xx, y+.035, zz+.17),
               (xx-.064*size, y+.08, zz+.10)],
              (0, 1, .3), color=STEEL, joint=joint, ridge=.045, chamfer=.008)
        spar(m, 'Long hooked steel talon',
             [(xx, y+.075, zz+.065), (xx, y+.08, zz+.19*size),
              (xx, y-.015, zz+.32*size), (xx, .015, zz+.35*size)],
             [.075*size, .068*size, .036*size, .002], FACE, joint, sides=6, flatten=.8)
    plate(m, 'Ankle keystone',
          [(s*x-.12, y+.28, z-.08), (s*x+.12, y+.28, z-.08),
           (s*x+.14, y+.13, z+.04), (s*x, y+.08, z+.09),
           (s*x-.14, y+.13, z+.04)], (0, .3, 1), color=FACE, joint=joint, ridge=.025)


def build_head(m):
    j = 'head'
    m.ellipsoid('Recessed angular skull core', (0, 1.63, .91), (.27, .27, .31), DARK, j, 16, 10)
    # Large recessed open mouth, flared at the back, narrowing toward the nose.
    spar(m, 'Deep open mouth cavity', [(0, 1.48, 1.02), (0, 1.39, 1.24), (0, 1.36, 1.48)],
         [.21, .17, .09], VOID, j, sides=8, flatten=.80)
    plate(m, 'Lower jaw armored chin',
          [(-.17, 1.26, 1.02), (.17, 1.26, 1.02), (.13, 1.18, 1.39),
           (0, 1.16, 1.52), (-.13, 1.18, 1.39)], (0, -1, .3), color=DARK,
          joint=j, ridge=.045, thickness=.065)
    for s in (-1, 1):
        side_plate(m, 'Open lower jaw rail', s, .15,
                   [(1.44, 1.01), (1.22, 1.17), (1.18, 1.47), (1.25, 1.53),
                    (1.25, 1.30), (1.47, 1.08)], color=STEEL, joint=j,
                   thickness=.055, ridge=.012, chamfer=.009)
        # Flat eye inset faces forward and sideways, under an overhanging brow.
        eye = [(s*.11, 1.76, 1.19), (s*.29, 1.80, 1.075),
               (s*.28, 1.65, 1.12), (s*.16, 1.64, 1.22)]
        plate(m, 'Deep angular eye socket', eye, (s*.6, .05, 1),
              color=VOID, joint=j, ridge=0, thickness=.03, chamfer=.006)
        center = sum((Vector(p) for p in eye), Vector())/4
        inset = [tuple(center+(Vector(p)-center)*.75+Vector((s*.008, 0, .012))) for p in eye]
        plate(m, 'Pale fierce eye', inset, (s*.6, 0, 1), color='#f0faf4',
              joint=j, thickness=.012, ridge=0, chamfer=0)
        spar(m, 'Narrow black eye slit', [(s*.205, 1.74, 1.183), (s*.209, 1.675, 1.177)],
             [.012, .008], VOID, j, 6)
        plate(m, 'Heavy overhanging brow blade',
              [(s*.055, 1.88, 1.17), (s*.26, 1.94, 1.01), (s*.36, 1.80, 1.03),
               (s*.29, 1.75, 1.16), (s*.11, 1.69, 1.285)],
              (s*.25, .3, 1), color=STEEL, joint=j, ridge=.065)
        # Two tall swept triangular steel ears, with inset dark grooves.
        plate(m, 'Tall blade ear',
              [(s*.17, 1.82, .78), (s*.32, 1.85, .72),
               (s*.42, 2.29, .55), (s*.23, 2.08, .80)],
              (s*.4, .1, 1), color=STEEL, joint=j, ridge=.025)
        plate(m, 'Ear recessed channel',
              [(s*.235, 1.91, .805), (s*.31, 1.94, .75), (s*.37, 2.19, .625)],
              (s*.3, 0, 1), color=VOID, joint=j, thickness=.012, ridge=0, chamfer=.004)
        for k in range(3):
            y = 1.72-k*.13
            side_plate(m, 'Swept cheek cutting plate', s, .30+k*.017,
                       [(y+.06, 1.08-k*.025), (y+.14, .84),
                        (y+.01, .62-k*.045), (y-.02, .81),
                        (y-.13, .72), (y-.08, 1.04)],
                       color=STEEL if k == 0 else DARK, joint=j, ridge=.04)
        # Broad wedge-shaped muzzle, scored by a parallel raised silver ridge.
        plate(m, 'Long angular muzzle half',
              [(s*.09, 1.72, 1.24), (s*.22, 1.61, 1.18),
               (s*.16, 1.45, 1.58), (0, 1.43, 1.68),
               (0, 1.57, 1.67), (s*.055, 1.67, 1.43)],
              (s*.4, .2, 1), color=STEEL, joint=j, ridge=.02)
        plate(m, 'Raised muzzle ridge',
              [(s*.11, 1.69, 1.30), (s*.135, 1.64, 1.30),
               (s*.075, 1.51, 1.60), (s*.035, 1.54, 1.63)],
              (s*.4, .2, 1), color=EDGE, joint=j, thickness=.012, ridge=0, chamfer=.004)
        for k in range(4):
            z = 1.10+k*.10
            y = 1.47-k*.019
            spar(m, 'Exposed upper metal fang',
                 [(s*(.165-k*.012), y, z), (s*(.15-k*.01), y-.09, z+.015),
                  (s*(.14-k*.01), y-(.17 if k in (0, 3) else .13), z+.04)],
                 [.04 if k in (0, 3) else .027, .023, .0015], SILVER, j, 6)
        for k in range(3):
            z = 1.17+k*.10
            spar(m, 'Lower interlocking metal fang',
                 [(s*.115, 1.24, z), (s*.12, 1.32, z+.025), (s*.115, 1.365, z+.045)],
                 [.029, .019, .0015], FACE, j, 6)
    plate(m, 'Central forehead spear',
          [(-.12, 1.95, .94), (0, 2.11, .78), (.12, 1.95, .94),
           (.12, 1.79, 1.16), (0, 1.67, 1.30), (-.12, 1.79, 1.16)],
          (0, .3, 1), color=FACE, joint=j, ridge=.065)
    plate(m, 'Blunt armored nose',
          [(-.115, 1.57, 1.68), (.115, 1.57, 1.68), (.095, 1.46, 1.71),
           (0, 1.43, 1.73), (-.095, 1.46, 1.71)],
          (0, 0, 1), color=JOINT, joint=j, ridge=.025, thickness=.05, chamfer=.009)


def build_tail(m):
    j = 'tail'
    # Curved, jointed tail ending in a flattened scimitar with a toothed back.
    points = [(0, 1.08, -.82), (0, 1.07, -1.10), (-.03, 1.17, -1.36),
              (-.06, 1.39, -1.51), (-.08, 1.64, -1.55), (-.09, 1.85, -1.48)]
    spar(m, 'Tail internal articulated spine', points, [.15, .14, .12, .10, .08, .04], VOID, j)
    for k, (a, b) in enumerate(zip(points, points[1:])):
        spar(m, 'Overlapping octagonal tail segment', [a, b],
             [.175-k*.018, .14-k*.017], STEEL if k % 2 == 0 else DARK, j)
        p = Vector(a).lerp(Vector(b), .85)
        ring(m, 'Tail lateral coupling', tuple(p), .115-k*.012, .06-k*.007,
             .21-k*.025, color=DARK, joint=j, teeth=6)
    side_plate(m, 'Swept scimitar tail blade', -1, .14,
               [(1.32, -1.48), (1.49, -1.74), (1.76, -1.86),
                (1.72, -1.75), (1.97, -1.82), (1.92, -1.71),
                (2.17, -1.66), (2.32, -1.48), (2.10, -1.58),
                (1.86, -1.57), (1.63, -1.39), (1.45, -1.34)],
               color=DARK, joint=j, thickness=.28, ridge=.025)
    for s in (-1, 1):
        side_plate(m, 'Polished tail cutting edge', s, .145,
                   [(1.42, -1.49), (1.64, -1.73), (1.92, -1.73),
                    (2.16, -1.62), (2.32, -1.48), (2.10, -1.58),
                    (1.84, -1.62), (1.61, -1.59)],
                   color=FACE, joint=j, thickness=.012, ridge=.005, chamfer=.005)


if __name__ == '__main__':
    ferronyx().export(render=True)
