"""New sculptural anatomy and surface-detail tools for Pupawn's evolutions.

Coordinates follow common.Model: X right, Y up, Z forward. No geometry is
borrowed from batch_a's old wolf. Species builders control proportions,
stance, head shape, coat construction and appendages independently.
"""
import math
import bpy
from mathutils import Vector
from common import Model, bv


def curve(points, steps=5):
    pp = [Vector(p) for p in points]
    result = []
    for i in range(len(pp)-1):
        a,b,c,d = pp[max(i-1,0)],pp[i],pp[i+1],pp[min(i+2,len(pp)-1)]
        for k in range(steps):
            t=k/steps
            result.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    return result+[pp[-1]]


def loft(m,name,points,radii,color,joint='body',normal=(0,0,1),sides=12,steps=4,smooth=True):
    spine=curve(points,steps)
    rr=[(r,r) if isinstance(r,(int,float)) else r for r in radii]
    sizes=[]
    for a,b in zip(rr,rr[1:]):
        for k in range(steps):
            t=k/steps
            sizes.append((a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t))
    sizes.append(rr[-1]);verts=[];faces=[]
    for i,(p,(width,depth)) in enumerate(zip(spine,sizes)):
        tangent=(spine[min(i+1,len(spine)-1)]-spine[max(i-1,0)]).normalized()
        u=tangent.cross(Vector(normal))
        if u.length<.02:u=tangent.cross(Vector((1,0,0)))
        if u.length<.02:u=tangent.cross(Vector((0,1,0)))
        u.normalize();v=tangent.cross(u).normalized()
        for k in range(sides):
            a=k*math.tau/sides
            verts.append(tuple(p+u*math.cos(a)*width+v*math.sin(a)*depth))
    for i in range(len(spine)-1):
        for k in range(sides):
            a=i*sides+k;b=i*sides+(k+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple((len(spine)-1)*sides+k for k in range(sides))])
    return m.mesh(name,verts,faces,color,joint,smooth=smooth)


def lock(m,name,start,mid,end,width,color,joint='body',normal=(0,0,1),depth=None):
    depth=depth if depth is not None else width*.3
    return loft(m,name,[start,mid,end],[(width*.35,depth*.5),(width,depth),(.001,.001)],
                color,joint,normal,sides=10,steps=5)


def line(m,name,points,radius,color,joint='body'):
    return loft(m,name,points,[radius]*len(points),color,joint,sides=8,steps=3)


def shell(m,name,points,normal,color,joint='body',thickness=.04,bevel=0):
    pp=[Vector(p) for p in points];nn=Vector(normal).normalized();n=len(pp)
    verts=pp+[p-nn*thickness for p in pp]
    faces=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]
    faces += [(i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n)]
    obj=m.mesh(name,[tuple(p) for p in verts],faces,color,joint,smooth=False)
    if bevel:
        mod=obj.modifiers.new('Soft carved perimeter','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def fuse(m,objects,name,joint,color,voxel=.028):
    """Blend the anatomical masses into one sculpted skin for each joint."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();obj=bpy.context.object;obj.name=name
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    remesh=obj.modifiers.new('Unified sculpted anatomy','REMESH')
    remesh.mode='VOXEL';remesh.voxel_size=voxel;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=obj.modifiers.new('Relax anatomical transitions','SMOOTH');smooth.factor=1.1;smooth.iterations=4
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    decimate=obj.modifiers.new('Game sculpture topology','DECIMATE');decimate.ratio=.45
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    obj.data.materials.clear();obj.data.materials.append(m.material(color))
    for face in obj.data.polygons:face.use_smooth=True
    bpy.context.view_layer.update()
    m.skin.setdefault(joint,[]).append(obj)
    return obj


def paint(m,name,points,width,color,joint='body',side=1,front=False):
    """A thin painted ribbon ray-projected onto the actual sculpted skin."""
    path=curve([(0,y,z) for y,z in points],4)
    if front:path=curve([(x,y,0) for x,y in points],4)
    verts=[];faces=[];previous=None
    skins=m.skin[joint]
    for i,p in enumerate(path):
        pair=[]
        t=(path[min(i+1,len(path)-1)]-path[max(i-1,0)]).normalized()
        across=t.cross(Vector((0,0,1) if front else (1,0,0))).normalized()
        taper=.35+.65*math.sin(math.pi*i/max(1,len(path)-1))**.35
        for sign in (-1,1):
            q=p+across*width*.5*sign*taper
            start=Vector((q.x,q.y,4)) if front else Vector((side*4,q.y,q.z))
            direction=Vector((0,0,-1)) if front else Vector((-side,0,0))
            hits=[]
            for obj in skins:
                inv=obj.matrix_world.inverted()
                origin=inv@bv(start);delta=(inv.to_3x3()@bv(direction)).normalized()
                hit,co,norm,_=obj.ray_cast(origin,delta)
                if hit:
                    co=obj.matrix_world@co;norm=(obj.matrix_world.to_3x3().inverted().transposed()@norm).normalized()
                    point=co+norm*.006
                    hits.append(((co-bv(start)).length,point))
            if not hits:
                pair=[]
                break
            v=min(hits,key=lambda hit:hit[0])[1]
            pair.append((v.x,v.z,-v.y))
        if len(pair)!=2:
            previous=None
            continue
        current=len(verts);verts.extend(pair)
        if previous is not None:faces.append((previous,previous+1,current+1,current))
        previous=current
    if not faces:return
    return m.mesh(name,verts,faces,color,joint)


def anatomy(name,coat,accent,eye,*,head_y=1.80,body_y=1.07,width=.31,
            length=.73,leg_x=.31,front_z=.48,rear_z=-.60,crouch=False,
            heavy=False,snarl=False,ear_height=.43,ear_width=.13,
            muzzle=.41,leg_colors=None,split=False):
    m=Model(name);m.skin={};m.coat=coat;m.accent=accent;m.head_y=head_y;m.split=split
    m.front_z=front_z;m.rear_z=rear_z;m.leg_x=leg_x;m.crouch=crouch
    m.joint('head',(0,head_y-.19,.71));m.joint('tail',(0,body_y,-length*.91))
    e=lambda n,p,s,c=coat,j='body':m.ellipsoid(n,p,s,c,j,segments=24,rings=16)
    # Smooth, continuous anatomy, with a deep chest and a noticeably tucked loin.
    core=[e('Long rib cage',(0,body_y,-.10),(width,.33 if not heavy else .40,length)),
          e('Deep canine chest',(0,body_y+.08,.38),(width*1.08,.43,.38)),
          e('Tucked loin',(0,body_y-.015,-.59),(width*.78,.24,.31)),
          loft(m,'Sloping muscular neck',[(0,body_y+.10,.39),(0,head_y-.32,.60),(0,head_y-.06,.76)],
               [width*.91,width*.78,.22],coat)]
    fuse(m,core,'Sculpted rib cage, chest and neck','body',coat)
    # Closed and open mouths share an anatomically tapered muzzle, never a sphere snout.
    skull=[e('Skull',(0,head_y,.83),(.255 if not heavy else .29,.255,.29),coat,'head'),
           e('Cheek mass',(0,head_y-.08,.96),(.245,.18,.21),coat,'head'),
           loft(m,'Tapered upper muzzle',[(0,head_y-.075,.99),(0,head_y-.14,1.18),
                                          (0,head_y-.17,1.06+muzzle)],
                [(.22,.17),(.18,.12),(.12,.08)] if heavy else [(.18,.15),(.14,.10),(.095,.065)],
                coat,'head',normal=(0,1,0),sides=16)]
    fuse(m,skull,'Sculpted skull and tapered muzzle','head',coat,voxel=.018)
    if snarl:
        e('Deep mouth interior',(0,head_y-.29,1.13),(.145,.12,.23),'#15212a','head')
        e('Lower lip and jaw',(0,head_y-.39,1.13),(.135,.065,.24),coat,'head')
        e('Visible tongue',(0,head_y-.345,1.26),(.075,.025,.10),'#8583a4' if name=='Cryovelis' else '#b86562','head')
    else:
        jaw=e('Soft lower jaw',(0,head_y-.235,1.15),(.14,.07,.24),accent,'head')
        m.skin['head'].append(jaw)
        for side in (-1,1):
            line(m,'Recessed mouth corner',[(side*.15,head_y-.19,1.12),(side*.115,head_y-.235,1.33),
                                           (0,head_y-.25,1.06+muzzle+.04)],.009,'#182a2a','head')
    # A carved triangular nose and a subtle central philtrum.
    shell(m,'Canine nose',[(-.105,head_y-.13,1.06+muzzle+.015),(.105,head_y-.13,1.06+muzzle+.015),
                           (.073,head_y-.22,1.06+muzzle+.045),(0,head_y-.25,1.06+muzzle+.055),
                           (-.073,head_y-.22,1.06+muzzle+.045)],(0,0,1),'#1a2a2d','head',.055,.012)
    e('Nose soft gleam',(-.035,head_y-.145,1.06+muzzle+.043),(.039,.012,.008),'#617275','head')
    for side in (-1,1):
        color=('#e7bb54' if side>0 else coat) if split else coat
        build_eye(m,side,head_y,eye)
        # Broad, recessed triangular ears, with true thickness and inset pinnae.
        x=side*.20;y=head_y+.17
        shell(m,'Upright sculpted ear',[(x-ear_width,y,.76),(x+ear_width,y,.76),
              (x+side*.095,y+ear_height,.61)],(0,.1,1),color,'head',.09,.01)
        inner=('#ae8638' if name=='Solarune' or (split and side>0) else
               '#355d2b' if name=='Verdama' else '#315c72' if name=='Torrentis' else
               accent if name=='Wraithound' else '#25383c')
        shell(m,'Recessed ear pinna',[(x-ear_width*.60,y+.06,.773),(x+ear_width*.60,y+.06,.773),
              (x+side*.079,y+ear_height*.82,.65)],(0,.1,1),inner,'head',.014)
        for row in range(3):
            lock(m,'Swept cheek fur',(side*.19,head_y+.11-row*.10,.87),
                 (side*(.31+row*.015),head_y+.07-row*.12,.76),
                 (side*(.44-row*.025),head_y+.14-row*.16,.56),
                 .085+row*.015,color,'head',normal=(side,0,.3))
        if snarl:
            for k in range(4):
                z=1.09+k*.085
                loft(m,'Upper exposed canine' if k in (0,3) else 'Upper small incisor',
                     [(side*(.14-k*.007),head_y-.205,z),(side*(.135-k*.007),head_y-.30,z+.015),
                      (side*(.12-k*.007),head_y-(.37 if k in (0,3) else .265),z+.025)],
                     [.033 if k in (0,3) else .02,.02,.001],'#e8efdd','head',sides=8,steps=3)
            for k in range(3):
                loft(m,'Lower interlocking tooth',[(side*.11,head_y-.365,1.13+k*.09),
                         (side*.12,head_y-.27,1.15+k*.09)],[.024,.001],'#c7d8d3','head',sides=8,steps=3)
    # Distinct bent hocks and a wide front stance; paws and toes belong to limbs.
    m.feet={}
    for side in (-1,1):
        for front in (True,False):
            j=('left' if side<0 else 'right')+('Arm' if front else 'Leg')
            z=front_z if front else rear_z;x=side*leg_x
            foot_z=z+(.27 if crouch and front else .12 if front else .09)
            foot_x=x*(1.18 if crouch and front else 1)
            c=(leg_colors or {}).get(j,('#e7bb54' if side>0 else coat) if split else coat)
            m.joint(j,(x,body_y,z))
            if front:
                points=[(x,body_y+.08,z),(x*1.04,body_y*.59,z+.035),
                        (foot_x,.26,foot_z-.08),(foot_x,.13,foot_z)]
                radii=[.165 if not heavy else .23,.105 if not heavy else .16,.075 if not heavy else .12,.09]
                masses=[e('Rounded shoulder cap',(x,body_y+.015,z),
                          (.185 if not heavy else .255,.245,.215),c,j),
                        e('Subtle elbow muscle',(x*1.04,body_y*.65,z+.015),
                          (.115 if not heavy else .17,.18,.13),c,j),
                        loft(m,'Foreleg muscles and pastern',points,radii,c,j)]
            else:
                masses=[e('Rounded rear thigh',(x,body_y-.09,z),(.225 if not heavy else .29,.30,.29),c,j),
                        loft(m,'Bent rear hock',[(x,body_y-.07,z),(x*1.08,body_y*.58,z+.18),
                               (x*1.06,.29,z-.13),(x*1.07,.13,foot_z)],
                             [.18 if not heavy else .22,.125,.07,.085],c,j)]
            masses.append(e('Broad paw',(foot_x,.11,foot_z+.055),(.15 if not heavy else .20,.10,.20),c,j))
            fuse(m,masses,'Sculpted '+j,j,c,voxel=.021)
            m.feet[j]=(foot_x,.10,foot_z+.14)
            for k in (-1,0,1):
                toe_x=foot_x+k*(.075 if not heavy else .095)
                e('Individual toe',(toe_x,.085,foot_z+.18),(.057 if not heavy else .075,.074,.11),c,j)
                if k<1:
                    line(m,'Toe separation',[(toe_x+.034,.139,foot_z+.18),(toe_x+.034,.10,foot_z+.255)],.006,
                         '#243131' if coat[1:3]<'70' else accent,j)
    if split:
        # Split every skin triangle on the sagittal plane, including the muzzle.
        for objects in m.skin.values():
            for obj in objects:
                obj.data.materials.append(m.material('#f3ce65'))
                for p in obj.data.polygons:
                    center=obj.matrix_world@p.center
                    p.material_index=1 if center.x>0 else 0
    return m


def build_eye(m,side,y,color):
    center=Vector((side*.205,y+.035,1.035));u=Vector((side*.80,0,-.60));n=Vector((side*.60,0,.80))
    coords=[(-.092,-.008),(-.040,.068),(.094,.065),(.076,-.027),(-.012,-.057)]
    for scale,pigment,depth in [(1.14,'#15242b',0),(1,color,.008)]:
        vertices=[tuple(center+u*a*scale+Vector((0,b*scale,0))+n*depth) for a,b in coords]
        shell(m,'Inset almond eye',vertices,tuple(n),pigment,'head',thickness=.016)
    # The pupil is oriented to the eye plane, so side views retain the expression.
    if m.name not in ('Wraithound','Solarune'):
        shell(m,'Vertical eye pupil',[tuple(center+u*a+Vector((0,b,0))+n*.019)
              for a,b in [(-.011,.046),(.009,.035),(.011,-.033),(-.008,-.040)]],tuple(n),'#17303a','head',.008)
    glint=center-u*.025+Vector((0,.029,0))+n*.028
    m.ellipsoid('Eye glint',tuple(glint),(.012,.013,.009),'#f5fff0','head',12,8)
    lock(m,'Strong swept eyebrow',(side*.10,y+.11,1.07),(side*.21,y+.13,1.04),
         (side*.30,y+.15,.96),.040,'#e7bb54' if m.split and side>0 else m.coat,
         'head',normal=(side*.4,0,1),depth=.025)


def collar(m,colors,*,rows=3,fullness=1,flow='down',head=False):
    """Layered curved locks wrapping a neck, with a full chest silhouette."""
    y=m.head_y
    for row in range(rows):
        for k in range(9):
            a=(k+.43*(row%2))*math.tau/9
            x=math.cos(a)*(.21+.025*row);z=.62+math.sin(a)*.22
            start=(x,y-.10-row*.065,z)
            dx=math.cos(a);dz=math.sin(a)
            end=(x+dx*.20*fullness,y-.67-row*.075+math.cos(a*2)*.04,z+dz*.20-.09)
            if flow=='back':end=(x+dx*.25*fullness,y-.04-row*.10,z-.55)
            color=colors[k%len(colors)] if isinstance(colors,(list,tuple)) else colors
            if callable(colors):color=colors(x,row,k)
            lock(m,'Layered flowing neck coat',start,(x+dx*.12,y-.34-row*.065,z+dz*.15),end,
                 (.12+.009*row)*fullness,color,'head' if head else 'body',normal=(dx,.15,dz))


def plume_tail(m,points,color,*,width=.24,feathers=7,accent=None,normal=(1,0,0)):
    loft(m,'Full flowing tail',points,[(.12,.11),(width,width*.67),
         (width*.88,width*.55),(.002,.002)],color,'tail',normal=normal,sides=14,steps=6)
    pp=curve(points,4)
    for k in range(feathers):
        i=2+int(k*(len(pp)-4)/max(1,feathers))
        p=pp[i];side=-1 if k%2 else 1
        lock(m,'Swept tail fringe',tuple(p),(p.x+side*.10,p.y+.08,p.z-.12),
             (p.x+side*.17,p.y+.24,p.z-.22),width*.58,accent if accent and k%3==0 else color,
             'tail',normal=(1,0,0))


def claws(m,color,*,length=.14,size=.036,all_feet=True):
    for joint,(x,y,z) in m.feet.items():
        if not all_feet and joint.endswith('Leg'):continue
        for k in (-1,0,1):
            xx=x+k*.075
            loft(m,'Curved pointed claw',[(xx,y+.015,z+.055),(xx,y+.02,z+length),
                 (xx,.025,z+length+.06)],[size,size*.75,.001],color,joint,sides=8,steps=3,smooth=False)


def halo(m,color,y,*,radius=.30):
    points=[(math.cos(k*math.tau/64)*radius,y+math.sin(k*math.tau/64)*.025,.73+math.sin(k*math.tau/64)*radius*.63) for k in range(65)]
    line(m,'Thin celestial halo',points,.013,color,'head')
