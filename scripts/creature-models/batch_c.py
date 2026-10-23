"""Reference-led Blender sculpts for Sporecrown–Harefrost and four radiant dragons.
Run: blender --background --python scripts/creature-models/batch_c.py -- [species ...]
"""
import sys, os, math, random
import bpy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import Model
from mathutils import Vector
PI=math.pi
GOLD='#ffcf38';CREAM='#fff1af';BLACK='#171924';WHITE='#f2fcff'

def ell(m,n,p,s,c,j='body',seg=24):
    return m.ellipsoid(n,p,s,c,joint=j,segments=seg,rings=16)
def box(m,n,p,s,c,j='body',bevel=.04):
    from common import bv
    bpy.ops.mesh.primitive_cube_add(size=2,location=bv(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('machined rounded edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    return m.finish(o,n,c,j,smooth=False)
def tube(m,n,pts,rs,c,j='body',sides=12,smooth=True):
    """Continuous tapered organic appendage; no sphere-chain silhouettes."""
    vs=[];fs=[]
    if isinstance(rs,(int,float)): rs=[rs]*len(pts)
    # Catmull–Rom interpolation creates curved organic silhouettes between landmarks.
    if len(pts)>2:
        original=[Vector(p) for p in pts]; oldrs=rs; pts=[];rs=[]
        for k in range(len(original)-1):
            pa,pb,pc,pd=original[max(0,k-1)],original[k],original[k+1],original[min(len(original)-1,k+2)]
            for step in range(6):
                t=step/6;v=.5*((2*pb)+(-pa+pc)*t+(2*pa-5*pb+4*pc-pd)*t*t+(-pa+3*pb-3*pc+pd)*t*t*t)
                pts.append(tuple(v));ra,rb,rc,rd=oldrs[max(0,k-1)],oldrs[k],oldrs[k+1],oldrs[min(len(oldrs)-1,k+2)];rs.append(max(.002,.5*(2*rb+(-ra+rc)*t+(2*ra-5*rb+4*rc-rd)*t*t+(-ra+3*rb-3*rc+rd)*t*t*t)))
        pts.append(tuple(original[-1]));rs.append(oldrs[-1])
    for k,p in enumerate(pts):
        p=Vector(p);a=Vector(pts[max(0,k-1)]);b=Vector(pts[min(len(pts)-1,k+1)])
        tangent=(b-a).normalized();u=tangent.cross(Vector((0,0,1)))
        if u.length<.05:u=tangent.cross(Vector((0,1,0)))
        u.normalize();v=tangent.cross(u).normalized()
        for z in range(sides):vs.append(tuple(p+rs[k]*(u*math.cos(2*PI*z/sides)+v*math.sin(2*PI*z/sides))))
    for k in range(len(pts)-1):
        for z in range(sides):a=k*sides+z;b=k*sides+(z+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs+=[tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*sides+z for z in range(sides))]
    return m.mesh(n,vs,fs,c,joint=j,smooth=smooth)
def fissure(m,n,points,width,color,j='body'):
    vs=[]
    for k,p in enumerate(points):
      prev=Vector(points[max(0,k-1)]);nxt=Vector(points[min(len(points)-1,k+1)]);side=(nxt-prev).cross(Vector((0,0,1))).normalized()*width
      vs.extend([tuple(Vector(p)+side),tuple(Vector(p)-side)])
    m.mesh(n,vs,[(k*2,k*2+1,k*2+3,k*2+2) for k in range(len(points)-1)],color,joint=j,smooth=False)

def icicle(m,n,a,b,r,c,j='body'):
    a=Vector(a);b=Vector(b);d=(b-a).normalized();u=d.cross(Vector((1,0,0)))
    if u.length<.1:u=d.cross(Vector((0,0,1)))
    u.normalize();v=d.cross(u).normalized()
    verts=[tuple(a+u*r),tuple(a+v*r),tuple(a-u*r),tuple(a-v*r),tuple(b)]
    return m.mesh(n,verts,[(0,3,2,1),(0,1,4),(1,2,4),(2,3,4),(3,0,4)],c,joint=j,smooth=False)

def spike(m,n,a,b,r,c,j='body'):return m.cone(n,a,b,r,c,joint=j)
def leaf(m,n,a,b,w,c,j='body'):return m.leaf(n,a,b,w,c,joint=j)
def eye_at(m,position,size,color,joint='head'):
    x,y,z=position
    ell(m,'inlaid eye outline',(x,y,z),(size*.79,size*1.04,size*.18),'#202629',joint)
    ell(m,'colored iris',(x,y,z+size*.13),(size*.66,size*.91,size*.09),color,joint)
    ell(m,'deep oval pupil',(x,y,z+size*.20),(size*.43,size*.70,size*.055),'#11191e',joint)
    ell(m,'eye glint',(x-size*.17,y+size*.38,z+size*.27),(size*.17,size*.23,size*.025),'#ffffff',joint)
def eyes(m,y,z,spacing,size,color='#17191e',j='head',angry=False):
    for s in [-1,1]:
        eye_at(m,(s*spacing,y,z),size,color,joint=j)
        if angry:tube(m,'intent brow',[(s*(spacing-.12),y+size*.15,z+.03),(s*(spacing+.13),y+size*.8,z+.015)],[.035,.02],BLACK,j)
def nose(m,p,s=.07,c=BLACK,j='head'):ell(m,'nose',p,(s,s*.7,s*.6),c,j)
def toes(m,x,y,z,c,j='body',r=.055):
    for i in [-1,0,1]:spike(m,'claw',(x+i*r*1.3,y,z),(x+i*r*1.5,y-.03,z+r*2.4),r,c,j)
def flame(m,a,h,w=.25,j='body',c='#ff7215',seed=1):
    x,y,z=a
    tube(m,'flame outer',[(x,y,z),(x-w*.25,y+h*.32,z),(x+w*.22,y+h*.65,z),(x-w*.12,y+h,z)],[w,w*.8,w*.45,.005],c,j)
    tube(m,'flame heart',[(x,y+.015,z+w*.7),(x-w*.1,y+h*.3,z+w*.5),(x+w*.12,y+h*.66,z+.01)],[w*.57,w*.42,.005],'#ffdc30',j)
def fur(m,p,r,c,j='body',count=9):
    x,y,z=p
    for i in range(count):
        a=2*PI*i/count;leaf(m,'fur locks',(x+r*.5*math.cos(a),y+r*.3*math.sin(a),z),(x+r*math.cos(a),y+r*math.sin(a)-r*.22,z+.03),r*.34,c,j)
def ear(m,x,y,z,h,c,inner,j='head',w=.15,lean=.0):
    leaf(m,'ear',(x,y,z),(x+lean,y+h,z-.04),w,c,j)
    leaf(m,'ear inset',(x,y+h*.15,z+.03),(x+lean*.9,y+h*.92,z),w*.57,inner,j)
def ring(m,n,center,r,th,c,j='body',tilt=0):
    x,y,z=center;pts=[]
    for i in range(49):a=2*PI*i/48;pts.append((x+r*math.cos(a),y+r*math.sin(a)*math.cos(tilt),z+r*math.sin(a)*math.sin(tilt)))
    tube(m,n,pts,th,c,j)

def mushroom():
    m=Model('Sporecrown');m.joint('head',(0,1.53,0))
    ell(m,'trunk',(0,.76,0),(.38,.76,.3),'#d7aa63')
    for s in [-1,1]:ell(m,'root foot',(s*.25,.13,.13),(.24,.14,.31),'#c89952')
    # Continuous flared robe surface, open at the front, with scalloped hem.
    robe=[];steps=48
    for rr,yy in [(.31,1.17),(.40,.96),(.54,.60),(.81,.12)]:
      for k in range(steps+1):
        a=.68+(2*PI-1.36)*k/steps
        robe.append((rr*math.sin(a),yy+.045*math.cos(a*10),rr*math.cos(a)))
    faces=[]
    for row in range(3):
      for k in range(steps):a=row*(steps+1)+k;faces.append((a,a+1,a+steps+2,a+steps+1))
    m.mesh('flowing royal fungal robe',robe,faces,'#963f27')
    for side in [-1,1]:
      for k in range(3):leaf(m,'layered robe edge',(side*.26,1.12-k*.18,.27),(side*(.42+k*.15),.65-k*.25,.35),.17,'#a4482c')
    N=60;vs=[]
    for rr,yy in [(.12,1.43),(.72,1.47),(.68,1.69),(.67,1.95)]:
      for k in range(N):
        a=2*PI*k/N;wave=(.5+.5*math.cos(a*5))**1.6*.30 if yy>1.9 else 0;vs.append((rr*math.cos(a),yy+wave,rr*math.sin(a)))
    fs=[]
    for j in range(3):
      for k in range(N):fs.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
    # Hollow crown with a rounded rim and recessed inside instead of a nonplanar cap.
    for k in range(N):
      a=2*PI*k/N;wave=(.5+.5*math.cos(a*5))**1.6*.30
      vs.append((.61*math.cos(a),1.95+wave,.61*math.sin(a)))
    for k in range(N):
      a=2*PI*k/N;vs.append((.48*math.cos(a),1.64,.48*math.sin(a)))
    for row in [3,4]:
      for k in range(N):fs.append((row*N+k,row*N+(k+1)%N,(row+1)*N+(k+1)%N,(row+1)*N+k))
    fs.append(tuple(5*N+k for k in range(N)))
    m.mesh('five lobed golden crown cap',vs,fs,'#f7aa21',joint='head',smooth=True)
    for i in range(18):
      a=2*PI*i/18;tube(m,'underside radial gill',[(.13*math.cos(a),1.425,.13*math.sin(a)),(.67*math.cos(a),1.465,.67*math.sin(a))],.014,'#754313','head')
    for i in range(15):
      a=i*2.399;ell(m,'luminous crown spot',(.679*math.cos(a),1.65+(i%3)*.10,.679*math.sin(a)),(.067,.078,.025),'#fff779','head')
    eyes(m,1.27,.294,.13,.065,'#2d1a0a')
    for s in [-1,1]:leaf(m,'drooping moustache',(s*.06,1.15,.28),(s*.22,.86,.31),.17,'#edc57b','head')
    for s in [-1,1]:
      for k in range(4):
        x=s*(.35+.095*(k%2));y=.31+k*.19;z=.23
        ell(m,'small robe mushroom stem',(x,y,z),(.045,.10,.045),'#e6bd75')
        ell(m,'small robe mushroom cap',(x,y+.07,z+.015),(.105,.065,.10),'#d99e51')
    return m

def ghosts(name):
    m=Model(name);m.joint('head',(0,1.1,0));big=name=='Phantgale';col='#9dc9d6' if big else '#acbdbe'
    if not big:
      ell(m,'mist heart',(0,.96,0),(.48,.52,.30),col)
      for k in range(18):
        a=2*PI*k/18;r=.12+.035*(k%3)
        ell(m,'cloud scallop',(.40*math.cos(a),.98+.46*math.sin(a),-.025),(r,r,r*.9),col)
      for x,y in [(-.22,1.24),(.15,1.36),(-.30,.82),(.18,.76)]:
        for side in [-1,1]:ell(m,'faint cloud face eye',(x+side*.032,y,.262),(.023,.031,.006),'#a0b3b5')
        ell(m,'faint cloud face mouth',(x,y-.052,.267),(.024,.026,.005),'#9cafb2')
      tube(m,'trailing smoke',[(.1,.8,-.1),(.22,.45,-.02),(.04,.28,0),(-.25,.31,.03),(-.44,.44,.07)],[.22,.18,.12,.065,.003],col)
      for s in [-1,1]:tube(m,'wispy arm',[(s*.3,.93,0),(s*.66,.8,.02),(s*.78,1.03,0),(s*.68,1.28,.02),(s*.82,1.45,0)],[.17,.15,.09,.045,.002],col)
      eyes(m,1.06,.29,.205,.145,'#7061ad')
    else:
      # Interlocking broad spiral ribbons form the hurricane silhouette.
      for k in range(8):
        a=2*PI*k/8;ell(m,'wind mass',(.48*math.cos(a),1.25+.48*math.sin(a),-.10),(.27,.27,.18),['#8cb5d0','#aedbe2','#a5d4df','#7c9fc9'][k%4])
      for n in range(5):
        pts=[];rs=[]
        for i in range(20):
          a=.20+i*.28+n*2*PI/5;r=.14+i*.039
          pts.append((r*math.cos(a),1.25+r*math.sin(a),-.12+math.sin(a*1.3)*.1));rs.append(.18*(1-i/23))
        tube(m,'spectral cyclone',pts,rs,['#8cb5d0','#aedbe2','#a5d4df','#7c9fc9','#cee9e7'][n])
      ell(m,'eye shadow',(0,1.32,.17),(.33,.28,.12),'#546da5','head');ell(m,'single cyclone iris',(0,1.32,.27),(.22,.24,.04),'#c7d4e7','head');ell(m,'slit pupil',(0,1.32,.312),(.064,.15,.02),'#303653','head')
      for s in [-1,1]:
        tube(m,'reaching spectral forearm',[(s*.59,1.18,0),(s*.89,.91,.07),(s*1.05,1.11,.10)],[.19,.14,.12],col)
        for j in range(3):tube(m,'claw of wind',[(s*1.02,1.1,.1),(s*(1.18+j*.07),1.19+j*.11,.15),(s*(1.20+j*.06),1.32+j*.1,.13)],[.07,.045,.002],col)
      for x,y in [(-.58,1.73),(.6,1.72),(-.45,.99),(.42,.63)]:
        for s in [-1,1]:ell(m,'lost spirit eye',(x+s*.045,y,.17),(.023,.04,.012),'#718fb4')
        ell(m,'lost spirit mouth',(x,y-.065,.18),(.026,.04,.01),'#718fb4')
    return m

def quadruped(m,color,headcolor=None,bulky=False):
    hc=headcolor or color
    m.joint('head',(0,1.12,.47));m.joint('tail',(0,.9,-.55))
    ell(m,'ribcage',(0,.75,-.1),(.40,.43,.66) if bulky else (.29,.32,.57),color)
    ell(m,'neck',(0,.95,.38),(.29,.40,.28),hc)
    ell(m,'head',(0,1.23,.54),(.36,.34,.33) if bulky else (.30,.32,.29),hc,'head')
    ell(m,'muzzle',(0,1.12,.82),(.24,.16,.24) if bulky else (.22,.14,.22),hc,'head')
    nose(m,(0,1.19,1.0),.095)
    for s in [-1,1]:
      m.joint('leftLeg' if s<0 else 'rightLeg',(s*.24,.61,-.43))
      m.joint('leftArm' if s<0 else 'rightArm',(s*.27,.7,.36))
      for front,z in [(True,.39),(False,-.48)]:
        j=('leftArm' if s<0 else 'rightArm') if front else ('leftLeg' if s<0 else 'rightLeg')
        ell(m,'rounded limb shoulder',(s*.24,.73,z),(.18,.20,.19) if bulky else (.13,.15,.14),color,j)
        tube(m,'continuous leg',[(s*.24,.75,z),(s*.29,.42,z-.025),(s*.30,.17,z+.1)],[.17 if bulky else .105,.13 if bulky else .08,.11 if bulky else .07],color,j)
        ell(m,'paw',(s*.30,.12,z+.15),(.17 if bulky else .12,.12,.21 if bulky else .16),color,j)
    return m

def squirrel():
    m=Model('Tindertail');quadruped(m,'#b45e32');eyes(m,1.29,.788,.15,.105,'#51220f')
    for s in [-1,1]:
      ear(m,s*.22,1.43,.5,.37,'#b45e32','#74321f',w=.11,lean=s*.05)
      ell(m,'ember cheek',(s*.25,1.13,.75),(.14,.14,.10),'#e2883d','head')
      flame(m,(s*.29,1.15,.79),.32,.085,'head')
    for side in [-1,1]:ell(m,'squirrel rounded haunch',(side*.22,.44,-.35),(.25,.30,.30),'#b45e32')
    ell(m,'cream chest',(0,.73,.43),(.20,.31,.07),'#e7b37d')
    # An enormous swept plume with integrated flame ribbons, not stacked fire ornaments.
    tube(m,'huge squirrel plume',[(0,.65,-.50),(-.24,1.00,-.64),(-.48,1.47,-.70),(-.49,1.85,-.62),(-.28,2.16,-.55),(-.03,2.26,-.50),(-.13,2.43,-.49)],[.17,.35,.47,.38,.23,.105,.002],'#eb8a25','tail',sides=20)
    tube(m,'russet inner tail',[(0,.76,-.35),(-.24,1.13,-.32),(-.37,1.54,-.29),(-.32,1.90,-.33),(-.16,2.10,-.42)],[.08,.22,.28,.18,.002],'#af5528','tail',sides=18)
    for side in [-1,1]:
      tube(m,'flowing outer tail flame',[(side*.12-.18,1.03,-.43),(side*.34-.25,1.42,-.48),(side*.39-.29,1.87,-.51),(side*.33-.26,2.09,-.51),(side*.24-.24,2.27,-.51)],[.12,.16,.12,.06,.002],'#ffc333','tail')
    tube(m,'sweeping yellow flame ribbon',[(-.20,1.10,-.18),(-.58,1.45,-.23),(-.58,1.86,-.28),(-.37,2.08,-.34),(-.49,2.29,-.45)],[.07,.085,.07,.045,.002],'#ffdc48','tail')
    tube(m,'inner curling yellow flame',[(-.20,1.38,-.11),(-.09,1.66,-.13),(-.24,1.87,-.20),(-.10,2.08,-.36)],[.09,.07,.045,.002],'#ffd745','tail')
    tube(m,'left lashing flame',[(-.54,1.30,-.51),(-.89,1.55,-.53),(-.87,1.86,-.54),(-.71,1.99,-.53)],[.15,.12,.06,.002],'#ffb72d','tail')
    return m

def wolves(name):
    m=Model(name);quadruped(m,'#252631');count=3 if name=='Nighterror' else 1
    # Replace the center head with additional side heads for the cerberus evolution.
    for h in range(count):
      x=0 if h==0 else (-.43 if h==1 else .43);y=1.23 if h==0 else 1.19;z=.54 if h==0 else .42
      if h:
        ell(m,'side wolf neck',(x,.99,.25),(.24,.35,.25),'#252631')
        ell(m,'side wolf skull',(x,y,z),(.26,.28,.26),'#252631','head');ell(m,'side muzzle',(x,y-.1,z+.27),(.19,.12,.22),'#282b35','head');nose(m,(x,y-.04,z+.45),.07)
      iris=['#f12a45','#9c5fe6','#ddeaff'][h]
      for s in [-1,1]:
        ear(m,x+s*.20,y+.19,z,.40,'#21222a','#111219',w=.13,lean=s*.06)
        eye_at(m,(x+s*.15,y+.04,z+.255),.085,iris,joint='head')
        tube(m,'sharp brow',[(x+s*.05,y+.10,z+.26),(x+s*.24,y+.16,z+.22)],[.04,.022],'#30313b','head')
        for k in range(3):leaf(m,'cheek fur',(x+s*.20,y-.06-k*.07,z+.12),(x+s*(.40-k*.04),y-.08-k*.1,z+.10),.12,'#262832','head')
        spike(m,'white canine',(x+s*.14,y-.14,z+.37),(x+s*.14,y-.31,z+.36),.045,'#e7e5dc','head')
    tube(m,'curling shadow plume',[(0,.82,-.56),(-.14,1.12,-.86),(-.23,1.55,-.94),(-.1,1.76,-.84),(.10,1.73,-.75),(.17,1.9,-.79)],[.18,.28,.25,.17,.07,.003],'#24252e','tail')
    for i in range(5):
      x=(i-2)*.10;tube(m,'rising smoke',[(x,1.38,.2),(x-.09,1.67,.12),(x+.08,1.79,.15),(x+.02,1.94,.1)],[.10,.075,.04,.003],'#272731')
    if name!='Shadowpup':
      for s in [-1,1]:
        for k in range(3):spike(m,'shoulder bone spikes',(s*.22,.99,-.12-k*.18),(s*(.38+k*.05),1.31-k*.07,-.25-k*.18),.11,'#41414c')
    if count==3:
      for s in [-1,1]:
        for k in range(10):ring(m,'spectral chain link',(s*(.44+k*.09),.64-k*.045,-.22-k*.10),.065,.014,'#695084',tilt=(k%2)*PI/2)
    return m

def moth(name):
    m=Model(name);big=name=='Radianthra';m.joint('head',(0,1.25,.12));m.joint('leftWing',(-.12,1.02,0));m.joint('rightWing',(.12,1.02,0))
    ell(m,'golden abdomen',(0,.77,0),(.17,.36,.15),GOLD)
    ell(m,'fluffy thorax',(0,1.06,.04),(.24,.25,.18),'#ffe56b');fur(m,(0,1.04,.17),.25,'#ffe88c')
    ell(m,'moth head',(0,1.36,.08),(.25,.25,.20),'#ffdd60','head');eyes(m,1.39,.25,.15,.095,'#64400c')
    palette=['#f37b76','#f8b444','#e6d963','#6dccad','#47aaca','#728dd0','#a06ca5']
    for s in [-1,1]:
      j='leftWing' if s<0 else 'rightWing'
      # Large upper and small lower lobes, individually triangulated glass cells.
      upper=[(s*.13,1.03,-.045),(s*.30,1.38,-.045),(s*.72,1.90,-.045),(s*1.03,2.09,-.045),(s*1.04,1.53,-.045),(s*.94,1.12,-.045),(s*.71,.96,-.045)]
      lower=[(s*.13,.98,-.055),(s*.57,.98,-.055),(s*.91,.84,-.055),(s*.91,.61,-.055),(s*1.01,.25,-.055),(s*.63,.39,-.055),(s*.32,.62,-.055)]
      if big:upper=[(x*1.12,y,z) for x,y,z in upper];lower=[(x*1.12,y,z) for x,y,z in lower]
      for ni,poly in enumerate([upper,lower]):
        center=(s*(.48 if ni==0 else .52),1.25 if ni==0 else .72,-.035)
        # Black membrane rim and mosaic fan panels.
        m.mesh('wing dark foundation',poly,[tuple(range(len(poly)))],'#39323d',joint=j,smooth=False)
        for k in range(len(poly)):
          a=poly[k];b=poly[(k+1)%len(poly)]
          # Four slices per radial triangle produce the reference's stained-glass bands.
          for q in range(3):
            t=q/3;t2=(q+1)/3
            mix=lambda p,f:tuple(center[d]+(p[d]-center[d])*f for d in range(3))
            vs=[mix(a,t),mix(b,t),mix(b,t2),mix(a,t2)]
            vs=[(x,y,z+.012) for x,y,z in vs]
            m.mesh('prismatic glass cell',vs,[(0,1,2,3)],palette[(k+q+ni*2)%len(palette)],joint=j,smooth=False)
          tube(m,'wing radial vein',[center,a],.012,'#42404a',j)
        tube(m,'thick wing perimeter',poly+[poly[0]],.028,'#39323d',j)
      antenna=[(s*.12,1.54,.10),(s*.19,1.83,.10),(s*.31,2.0,.08)]
      tube(m,'antenna quill',antenna,.019,'#a47d2c','head')
      for k in range(6):
        y=1.65+k*.052;x=s*(.15+k*.022)
        leaf(m,'feathery antenna barb',(x,y,.1),(x+s*.11,y+.12,.1),.035,'#ffe991','head')
      for k in range(2):tube(m,'dangling golden foot',[(s*.11,.81-k*.13,.12),(s*.19,.56-k*.10,.16),(s*.16,.46-k*.12,.2)],[.035,.027,.012],GOLD)
    if big:ell(m,'sunlit heart',(0,1.1,.21),(.18,.22,.08),'#fff259')
    return m

def gear(m,center,r,c,j='body',teeth=10):
    x,y,z=center;vs=[]
    for zz in [z-.035,z+.035]:
      for k in range(teeth*4):
        a=2*PI*k/(teeth*4);rr=r*(1 if k%4 in [1,2] else .80);vs.append((x+rr*math.cos(a),y+rr*math.sin(a),zz))
    n=teeth*4;fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(k,(k+1)%n,(k+1)%n+n,k+n) for k in range(n)]
    m.mesh('gear teeth',vs,fs,c,joint=j,smooth=False);ell(m,'gear hub',(x,y,z+.052),(r*.38,r*.38,.055),'#545850',j)
    ell(m,'axle',(x,y,z+.105),(r*.16,r*.16,.024),'#292e2d',j)
def robot(name):
    m=Model(name);small=name=='Coglin';c='#656655';dark='#373c39';m.joint('head',(0,1.25,.03))
    if small:ell(m,'riveted torso',(0,.92,0),(.35,.40,.22),c,seg=12)
    else:box(m,'riveted torso',(0,.96,0),(.37,.37,.25),c)
    if small:
      ell(m,'goblin skull',(0,1.48,.03),(.34,.37,.25),'#67725c','head',seg=12)
      # angular cap and iconic long triangular ears.
      m.mesh('angular goblin hood',[(-.36,1.48,.05),(-.30,1.76,-.10),(-.12,1.99,-.16),(.18,1.85,-.13),(.34,1.52,.05),(.10,1.68,.255),(-.13,1.64,.255),(-.25,1.48,.18)],[(0,1,2,6,7),(2,3,4,5,6),(0,7,6,5,4),(1,3,2)],'#555b50',joint='head',smooth=False)
      spike(m,'helmet curled tip',(-.19,1.99,-.13),(-.32,1.92,-.12),.09,'#4b5148','head')
      for s in [-1,1]:
        leaf(m,'long goblin ear',(s*.25,1.5,.01),(s*.72,1.81,-.02),.22,'#6d7c60','head');leaf(m,'ear recess',(s*.31,1.54,.08),(s*.64,1.75,.04),.11,'#3b4c39','head')
      eyes(m,1.5,.255,.19,.115,'#ffe888',angry=True);spike(m,'pointed goblin nose',(0,1.41,.23),(.10,1.35,.53),.13,'#63735a','head')
      ell(m,'wide grin',(0,1.23,.27),(.27,.11,.045),'#20291e','head')
      for i in range(8):
        xx=(i-3.5)*.057;box(m,'grinning square tooth',(xx,1.235+.035*(xx/.20)**2,.320),(.025,.047,.014),'#e0e2b9','head',bevel=.006)
      # Fitted metal cap covers the skull, leaving the characteristic low brow notch.
      cap=[]
      for yy,rx,rz in [(1.61,.35,.295),(1.81,.29,.24),(1.98,.07,.065)]:
        for k in range(20):a=2*PI*k/20;cap.append((rx*math.cos(a),yy,.02+rz*math.sin(a)))
      m.mesh('fitted goblin metal cap',cap,[(r*20+k,r*20+(k+1)%20,(r+1)*20+(k+1)%20,(r+1)*20+k) for r in range(2) for k in range(20)]+[tuple(range(40,60))],'#565d50',joint='head',smooth=False)
      gear(m,(0,.83,.26),.28,'#c8a445')
    else:
      box(m,'square furnace housing',(0,1.0,.255),(.29,.25,.055),'#33382f')
      box(m,'orange furnace',(0,.99,.315),(.21,.18,.025),'#fb7b1f',bevel=.035);ell(m,'furnace heart',(0,.93,.314),(.13,.10,.015),'#ffc94a')
      box(m,'helmet head',(0,1.49,.02),(.25,.25,.23),c,'head')
      eyes(m,1.54,.24,.12,.065,'#e4e4ba',angry=True)
      ell(m,'mechanical grin',(0,1.36,.235),(.18,.09,.025),'#d3d2b9','head',seg=8)
      for i in range(6):tube(m,'tooth separator',[((i-2.5)*.05,1.30,.263),((i-2.5)*.05,1.41,.263)],.008,dark,'head')
      for s in [-1,1]:
        tube(m,'shoulder smokestack',[(s*.34,1.23,-.12),(s*.39,1.67,-.12),(s*.43,1.81,-.12)],[.095,.085,.1],dark)
        for k in range(3):ell(m,'exhaust steam',(s*(.43+k*.055),1.90+k*.10,-.12),(.12+k*.02,.09,.08),'#b4b7ad')
    for s in [-1,1]:
      aj='leftArm' if s<0 else 'rightArm';lj='leftLeg' if s<0 else 'rightLeg'
      m.joint(aj,(s*.33,1.16,0));m.joint(lj,(s*.20,.62,0))
      ell(m,'shoulder joint',(s*.38,1.18,0),(.18,.20,.19),dark,aj,seg=12)
      tube(m,'arm axle',[(s*.4,1.14,0),(s*.56,.96,.08),(s*.62,.80,.14)],.075 if small else .12,dark,aj)
      for k in range(7):ring(m,'spring arm coil',(s*(.43+k*.028),1.09-k*.039,.04+k*.02),.09,.019,'#979980',aj,tilt=PI/2)
      if small:
        ell(m,'clawed hand',(s*.64,.78,.14),(.16,.12,.14),'#5b6b54',aj)
        for k in range(3):tube(m,'goblin claw',[(s*(.54+k*.085),.74,.19),(s*(.57+k*.085),.60,.25),(s*(.61+k*.08),.65,.32)],[.055,.035,.002],'#79866a',aj)
      elif s<0:
        for k in range(6):ell(m,'drill taper section',(s*.65,.76-k*.1,.20),(.18-k*.025,.085,.17-k*.023),'#767764',aj,seg=12)
        spike(m,'drill point',(s*.65,.27,.20),(s*.65,.10,.20),.035,c,aj)
      else:
        tube(m,'hammer handle',[(s*.63,.85,.2),(s*.65,.4,.23)],.06,dark,aj)
        box(m,'hammer block',(s*.65,.91,.21),(.25,.16,.16),'#727461',aj)
        box(m,'hammer butt',(s*.65,.39,.23),(.16,.12,.13),'#727461',aj)
      tube(m,'bent mechanical leg',[(s*.19,.63,0),(s*.26,.40,.08),(s*.30,.17,.08)],[.11,.14,.10],dark,lj)
      ell(m,'knee cap',(s*.27,.42,.17),(.13,.12,.05),c,lj,seg=12)
      box(m,'block metal foot',(s*.3,.10,.17),(.21,.12,.25),c,lj)
      if small:toes(m,s*.3,.13,.35,'#8d9b7d',lj)
    for s in [-1,1]:
      for k in range(3):ell(m,'torso rivet',(s*.30,.79+k*.15,.21),(.025,.025,.017),'#aaa994',seg=8)
    return m

def bears(name):
    m=Model(name);cub=name=='Embercub';lava=name=='Infernursus';color='#f27c20' if cub else '#b43120' if not lava else '#353436'
    # Bear-specific anatomy: compact cub vs massive raised adult forequarters.
    heady=.99 if cub else 1.28;headz=.43 if cub else .60
    m.joint('head',(0,heady,headz));m.joint('tail',(0,.53,-.56))
    ell(m,'bear barrel',(0,.49 if cub else .76,-.15),(.43,.35,.49) if cub else (.49,.49,.68),color)
    if not cub:ell(m,'massive hunched shoulders',(0,.97,.22),(.52,.59,.43) if not lava else (.61,.66,.46),color)
    ell(m,'broad bear head',(0,heady,headz),(.43,.39,.34) if cub else (.43,.38,.37),color,'head')
    ell(m,'bear cheek left',(-.23,heady-.15,headz+.15),(.22,.20,.22),color,'head');ell(m,'bear cheek right',(.23,heady-.15,headz+.15),(.22,.20,.22),color,'head')
    muzzle='#ffb34e' if cub else '#a8492a' if not lava else '#4c4037'
    ell(m,'bear muzzle',(0,heady-.13,headz+.34),(.25,.16,.15),muzzle,'head')
    nose(m,(0,heady-.065,headz+.476),.105 if cub else .13)
    for side in [-1,1]:
      ell(m,'round bear ear',(side*.33,heady+.28,headz-.02),(.18,.19,.105),color,'head');ell(m,'ear inner',(side*.33,heady+.28,headz+.077),(.105,.115,.023),'#a83e17' if cub else '#642b21','head')
      if cub:flame(m,(side*.34,heady+.40,headz-.02),.34,.115,'head')
    eyes(m,heady+.035,headz+.309,.185,.097 if cub else .083,'#241b13' if cub else '#ed9b24',angry=not cub)
    if cub:
      ell(m,'happy open mouth',(0,heady-.265,headz+.418),(.12,.09,.025),'#64281d','head');ell(m,'happy tongue',(0,heady-.29,headz+.443),(.082,.036,.014),'#f88857','head')
    else:
      ell(m,'snarling mouth',(0,heady-.245,headz+.395),(.26,.135,.05),'#2d1616','head')
      for side in [-1,1]:spike(m,'large bear canine',(side*.19,heady-.18,headz+.431),(side*.17,heady-.34,headz+.44),.055,'#fff2d0','head')
      for k in range(6):ell(m,'bear teeth',((k-2.5)*.055,heady-.18,headz+.449),(.023,.042,.015),'#efdfbd','head')
    for side in [-1,1]:
      for front in [True,False]:
        j=('leftArm' if side<0 else 'rightArm') if front else ('leftLeg' if side<0 else 'rightLeg')
        x=side*(.29 if cub else .37);z=.29 if front else -.45;y=.46 if cub else (.96 if front else .71)
        m.joint(j,(x,y,z))
        ell(m,'bear upper limb',(x,y-.05,z),(.17,.22,.20) if cub else (.25,.37,.26),color,j)
        tube(m,'bear foreleg' if front else 'bear rearleg',[(x,y,z),(x*1.08,y*.5,z+.03),(x*1.1,.15,z+.13)],[.16,.13,.14] if cub else [.23,.21,.19],color,j)
        ell(m,'broad bear paw',(x*1.1,.12,z+.19),(.20,.13,.24) if cub else (.26,.15,.33),color,j)
        for k in [-1,0,1]:spike(m,'bear claw',(x*1.1+k*(.09 if cub else .11),.13,z+.34),(x*1.1+k*(.10 if cub else .12),.07,z+(.46 if cub else .63)),.045 if cub else .075,'#8f3e20' if cub else '#fff4cf' if not lava else '#ffab26',j)
    if cub:flame(m,(0,.59,-.60),.45,.14,'tail')
    else:
      # Flame collar follows the full oval neckline; the broad bear remains visible.
      for i in range(14):
        a=2*PI*i/14;flame(m,(.46*math.cos(a),.99+.36*math.sin(a),.22),.40+.10*(i%3),.14)
      for k in range(6):flame(m,((k%2-.5)*.34,1.05,-.49+k*.09),.68 if lava else .48,.16)
      if lava:
        for side in [-1,1]:
          for zz in [-.48,-.15,.15]:
            fissure(m,'magma flank fissure',[(side*.45,1.09,zz),(side*.53,.91,zz+.055),(side*.48,.77,zz-.04),(side*.49,.58,zz+.03)],.014,'#ff9017')
          for front in [True,False]:
            j=('leftArm' if side<0 else 'rightArm') if front else ('leftLeg' if side<0 else 'rightLeg');zz=.31 if front else -.43
            for offset in [-.07,.07]:fissure(m,'magma limb fissure',[(side*.39,.89 if front else .65,zz+.20+offset),(side*.51,.65,zz+.19+offset),(side*.42,.45,zz+.21+offset),(side*.46,.21,zz+.27+offset)],.016,'#ff991e',j)
          fissure(m,'magma face crack',[(side*.08,heady+.30,headz+.22),(side*.23,heady+.20,headz+.28),(side*.15,heady+.10,headz+.35),(side*.28,heady-.05,headz+.32)],.014,'#ff981b','head')
        for side in [-1,1]:
          for k in range(5):
            yy=.48+k*.13
            fissure(m,'branching lava fracture',[(side*.27,yy,.53),(side*.38,yy+.07,.53),(side*.43,yy+.04,.51),(side*.49,yy+.13,.45)],.011,'#ff9415')
          for k in range(3):
            yy=.45+k*.15
            fissure(m,'forked forepaw fracture',[(side*.40,yy,.56),(side*.49,yy+.07,.53),(side*.45,yy+.13,.54)],.014,'#ffa219','leftArm' if side<0 else 'rightArm')
        for k in range(4):flame(m,((k-1.5)*.18,heady+.30,headz-.05),.25,.075,'head')
    return m

def glacimite():
    m=Model('Glacimite');blue='#3d8eb0';pale='#a5e7f8';m.joint('head',(0,1.35,.06));m.joint('tail',(0,.6,-.3))
    # Cut, planar ice plates: no smooth body balls in this angular reptile.
    verts=[]
    for y,w,d in [(.43,.23,.17),(.76,.36,.25),(1.10,.27,.20)]:
      for x,z in [(-w,-d),(w,-d),(w,d),(-w,d)]:verts.append((x,y,z))
    m.mesh('faceted ice torso',verts,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,9,8),(5,6,10,9),(6,7,11,10),(7,4,8,11),(8,9,10,11)],blue,smooth=False)
    m.mesh('wedge reptile ice skull',[(-.31,1.28,-.13),(.31,1.28,-.13),(-.29,1.62,-.09),(.29,1.62,-.09),(-.23,1.25,.46),(.23,1.25,.46),(-.26,1.46,.34),(.26,1.46,.34)],[(0,1,3,2),(0,4,5,1),(2,3,7,6),(4,6,7,5),(0,2,6,4),(1,5,7,3)],'#4f9dbd',joint='head',smooth=False)
    eyes(m,1.47,.348,.18,.078,'#f2fcff',angry=True)
    tube(m,'angular mouth line',[(-.18,1.29,.46),(-.08,1.24,.48),(0,1.26,.48),(.08,1.24,.48),(.18,1.29,.46)],.009,'#164562','head')
    for s in [-1,1]:
      j='leftArm' if s<0 else 'rightArm';m.joint(j,(s*.27,1.0,0))
      # Thick angular forearms with sharp knuckles.
      tube(m,'faceted ice forearm',[(s*.27,1.02,0),(s*.42,.77,.07),(s*.42,.58,.21)],[.12,.135,.12],blue,j,sides=5,smooth=False)
      hand=ell(m,'faceted ice hand',(s*.42,.58,.23),(.15,.16,.15),'#519db8',j,seg=6)
      for poly in hand.data.polygons:poly.use_smooth=False
      toes(m,s*.42,.55,.29,'#a0d6e6',j)
      j='leftLeg' if s<0 else 'rightLeg';m.joint(j,(s*.19,.48,0))
      tube(m,'crystal hind leg',[(s*.19,.48,0),(s*.25,.30,.03),(s*.27,.13,.12)],[.17,.14,.15],blue,j,sides=5,smooth=False)
      cx=s*.27;m.mesh('faceted wedge foot',[(cx-.13,.23,-.02),(cx+.13,.23,-.02),(cx-.21,.03,.43),(cx+.21,.03,.43),(cx-.19,.02,-.07),(cx+.19,.02,-.07),(cx,.16,.25)],[(0,1,6),(0,6,2,4),(1,5,3,6),(2,6,3),(4,2,3,5),(0,4,5,1)],'#4e9ab7',joint=j,smooth=False)
    for i in range(5):
      z=-.35+i*.15;icicle(m,'back icicle',(0,1.02-i*.08,z),(0,1.83-i*.12,z-.34),.16,pale)
    for side in [-1,1]:icicle(m,'large dorsal side shard',(side*.17,1.0,-.21),(side*.45,1.74,-.55),.20,pale)
    for s in [-1,1]:icicle(m,'crown crystal',(s*.17,1.57,.01),(s*.28,2.0,-.16),.13,pale,'head')
    tube(m,'barbed icy tail',[(0,.61,-.2),(0,.43,-.61),(0,.67,-1.03),(0,.97,-1.19)],[.17,.14,.10,.002],blue,'tail',sides=5)
    for i in range(3):icicle(m,'tail icicle',(0,.5+i*.11,-.56-i*.18),(0,.85+i*.13,-.70-i*.2),.10,pale,'tail')
    # The reference has a prominent white ten-point snowflake core on the chest.
    vs=[(0,.84,.265)]
    for k in range(20):
      a=2*PI*k/20;r=.23 if k%2==0 else .125;vs.append((r*math.cos(a),.84+r*math.sin(a),.268))
    m.mesh('white star shaped frost core',vs,[(0,k+1,(k+1)%20+1) for k in range(20)],'#efffff',smooth=False)
    for s in [-1,1]:tube(m,'silver metal veins',[(s*.05,1.12,.23),(s*.19,.95,.26),(s*.15,.73,.26),(s*.26,.55,.18)],.014,'#b2d7df')
    return m

def lumikid():
    m=Model('Lumikid');m.joint('head',(0,1.26,0));ell(m,'cherub body',(0,.74,0),(.25,.39,.19),'#ffeb88');ell(m,'large cherub head',(0,1.35,.02),(.34,.35,.28),'#ffeb8d','head')
    ell(m,'hair cap',(0,1.54,-.01),(.34,.22,.27),'#fff4a5','head')
    for s in [-1,1]:
      ell(m,'curl lock',(s*.25,1.38,.14),(.12,.15,.09),'#fff4ab','head');ell(m,'round ear',(s*.31,1.32,0),(.10,.13,.07),'#f4d670','head')
      m.joint('leftLeg' if s<0 else 'rightLeg',(s*.11,.49,0));tube(m,'cherub leg',[(s*.11,.5,0),(s*.14,.24,0),(s*.13,.15,.10)],[.105,.09,.09],'#f6df76','leftLeg' if s<0 else 'rightLeg');ell(m,'bare foot',(s*.14,.1,.13),(.13,.10,.19),'#ffe88a')
      tube(m,'folded arm',[(s*.22,.96,.02),(s*.27,.73,.17),(s*.12,.69,.24)],[.085,.075,.07],'#ffe98e')
      j='leftWing' if s<0 else 'rightWing';m.joint(j,(s*.19,.99,-.15))
      for k in range(4):leaf(m,'little angel feather',(s*.17,.97,-.18),(s*(.53-k*.06),1.32-k*.13,-.17),.14,'#fffbd3',j)
    eyes(m,1.36,.286,.14,.08,'#6e4d12');nose(m,(0,1.24,.302),.032,c='#dcbd52')
    leaf(m,'curl on top',(0,1.62,.06),(.18,1.88,.04),.14,'#fff2a2','head')
    ring(m,'floating golden halo',(0,1.94,0),.35,.035,'#ffe35b','head',tilt=PI/2)
    return m

def eel():
    m=Model('Volteel');navy='#19445f';m.joint('head',(.23,1.3,.02));m.joint('tail',(0,.65,-.2))
    pts=[(.27,1.32,.03),(-.12,1.43,0),(-.50,1.21,0),(-.64,.83,0),(-.39,.48,0),(.10,.36,0),(.57,.45,0),(.72,.74,0),(.56,.97,.04)]
    tube(m,'continuous coiled eel',pts,[.25,.25,.23,.20,.17,.14,.11,.07,.003],navy)
    ell(m,'eel cranium',(.29,1.31,.09),(.34,.29,.24),navy,'head');ell(m,'long eel muzzle',(.39,1.17,.24),(.29,.16,.21),navy,'head')
    ell(m,'open red jaw',(.32,1.02,.31),(.20,.18,.045),'#9f3043','head');ell(m,'mouth shadow',(.34,1.08,.347),(.18,.115,.018),'#231c27','head')
    for s in [-1,1]:eye_at(m,(.29+s*.19,1.35,.30),.09,'#35edff',joint='head')
    for x in [.17,.45]:spike(m,'eel fang',(x,1.15,.37),(x,1.01,.38),.038,'#fffce9','head')
    for k in range(1,7):
      p=Vector(pts[k]);q=p+Vector(((-1 if k<4 else 1)*.10,.12,.19));r=q+Vector((.08,-.18,0));tube(m,'lightning scale marking',[tuple(p+Vector((0,.08,.2))),tuple(q),tuple(r)],.045,'#ffe44c')
    for k in [1,2,3,6]:
      p=pts[k];leaf(m,'lightning dorsal fin',p,(p[0]-.08,p[1]+.42,p[2]-.02),.17,'#ffe95a')
    return m

def armadillo():
    m=Model('Ironhide');quadruped(m,'#41434a',bulky=True)
    # A complete domed shell with shingle patches that follow its curved surface.
    ell(m,'dark shell foundation',(0,.77,-.20),(.61,.55,.83),'#333740')
    for band in range(5):
      z0=-.98+band*.31;z1=z0+.39
      for sector in range(7):
        a0=sector*PI/7;a1=(sector+1)*PI/7
        # Domed cross section narrows smoothly toward both longitudinal ends.
        verts=[]
        for z in [z0,z1]:
          end_factor=max(.32,math.sqrt(max(.08,1-((z+.20)/.96)**2)))
          for a in [a0,a1]:verts.append((.64*end_factor*math.cos(a),.73+.65*end_factor*math.sin(a),z))
        # Raised forward lip gives distinct overlapping armor bands.
        verts[2]=(verts[2][0]*1.025,verts[2][1]+.035,verts[2][2]);verts[3]=(verts[3][0]*1.025,verts[3][1]+.035,verts[3][2])
        m.mesh('domed overlapping shell shingle',verts,[(0,1,3,2)],'#5e626b' if (band+sector)%2 else '#4b505b',smooth=False)
    # Low, wedge-shaped armored face sits below the dome, with slit eyes.
    for obj in list(m.groups['head'].children):bpy.data.objects.remove(obj,do_unlink=True)
    m.mesh('angular armored head',[(-.34,.74,.39),(.34,.74,.39),(-.28,1.18,.47),(.28,1.18,.47),(-.19,.72,1.13),(.19,.72,1.13),(-.25,.94,.96),(.25,.94,.96)],[(0,1,3,2),(0,4,5,1),(2,3,7,6),(4,6,7,5),(0,2,6,4),(1,5,7,3)],'#505661',joint='head',smooth=False)
    eyes(m,.99,.908,.18,.060,'#eff1ec',angry=True)
    tube(m,'armored mouth seam',[(-.16,.76,1.132),(0,.73,1.145),(.16,.76,1.132)],.008,'#242a33','head')
    for s in [-1,1]:
      for front,z in [(True,.39),(False,-.48)]:
        j=('leftArm' if s<0 else 'rightArm') if front else ('leftLeg' if s<0 else 'rightLeg')
        ell(m,'layered shoulder armor',(s*.32,.65,z),(.22,.24,.22),'#666870',j,seg=8);toes(m,s*.3,.12,z+.32,'#a2a5a8',j,.09)
    tube(m,'segmented armored tail',[(0,.69,-.58),(0,.42,-.93),(0,.22,-1.14)],[.22,.14,.002],'#4b4e56','tail',sides=6)
    return m

def rabbit(name):
    m=Model(name);sno=name=='Snochi';armor=name=='Harefrost';spectral=name=='Glacimal';col='#edf6f6' if not armor else '#a9b8c1';ice='#b0dfed';m.joint('head',(0,1.18,.37));m.joint('tail',(0,.68,-.52))
    ell(m,'hare body',(0,.52 if sno else .65,-.17),(.35,.32,.49) if sno else (.33,.34,.59) if name=='Snoven' else (.35,.39,.49),col);ell(m,'rounded hare haunches',(0,.39 if sno else .45,-.38),(.34,.28,.32) if sno else (.31,.28,.34) if name=='Snoven' else (.40,.35,.35),col)
    ell(m,'hare head',(0,1.03 if sno else 1.13,.40),(.39,.38,.34) if sno else (.35,.35,.31),col,'head');ell(m,'gentle muzzle',(0,1.01,.65),(.23,.15,.13),col,'head');nose(m,(0,1.065,.777),.045,c='#4e636c')
    for s in [-1,1]:
      ear(m,s*.19,1.35,.36,.80 if not armor else .83,col,'#9bc5d9' if sno else '#71bfd5' if not armor else '#566572',w=.19,lean=s*.17)
      j='leftArm' if s<0 else 'rightArm';m.joint(j,(s*.20,.75,.25));ell(m,'hare shoulder',(s*.21,.72,.29),(.135,.17,.14),col,j);tube(m,'hare foreleg',[(s*.21,.76,.3),(s*.22,.4,.34),(s*.23,.13,.43)],[.13,.095,.095],col,j)
      ell(m,'front paw',(s*.23,.105,.49),(.14,.105,.22),ice if name=='Snoven' else col,j)
      j='leftLeg' if s<0 else 'rightLeg';m.joint(j,(s*.26,.45,-.35));ell(m,'folded rabbit thigh',(s*.30,.40,-.37),(.25,.30,.29),col,j);ell(m,'long rear paw',(s*.33,.12,-.12),(.22,.12,.38),col,j)
      if not sno:toes(m,s*.23,.12,.66,'#75bdcf' if not armor else '#d1e2e8','leftArm' if s<0 else 'rightArm',.05)
      if name=='Snoven':
        fur(m,(s*.22,.27,.4),.18,'#ccebf0','leftArm' if s<0 else 'rightArm',8)
      if armor:
        for yy,z,rx,ry in [(.74,.32,.17,.18),(.47,.35,.15,.16),(.47,-.37,.25,.23)]:box(m,'articulated silver limb plate',(s*.27,yy,z), (rx,ry,.15),'#a6b7c2',bevel=.045)
    eyes(m,1.18,.666,.18,.11,'#111f28' if sno else '#0a526e' if not spectral else '#42c6ee',angry=armor)
    if sno:
      for s in [-1,1]:ell(m,'pink cheek',(s*.24,1.04,.68),(.07,.036,.012),'#f0cfd0','head')
      ell(m,'cotton tail',(0,.72,-.57),(.19,.23,.17),WHITE,'tail')
    else:
      fur(m,(0,.95,.38),.43,'#d9f1f6' if not armor else '#9baeb8',count=13)
      leaf(m,'upright tuft tail',(0,.74,-.55),(0,1.19,-.73),.25,ice if not armor else '#a2b9c5','tail')
    if spectral:
      for s in [-1,1]:
        for k in range(4):
          tube(m,'flowing snow mist',[(s*.27,.54+k*.12,-.25),(s*(.49+k*.045),.60+k*.20,-.4),(s*(.55-k*.04),.82+k*.24,-.43),(s*(.40+k*.025),1.0+k*.21,-.40),(s*(.48+k*.015),1.12+k*.19,-.39)],[.085,.07,.05,.025,.002],'#d0ebf3')
        for k in range(5):leaf(m,'long snow mane lock',(s*.18,1.11-k*.06,.52),(s*(.32+.03*(k%2)),.52+k*.07,.53),.13,'#e6f6fb')
    if armor:
      box(m,'armored forehead',(0,1.34,.56),(.31,.17,.12),'#b9c6cd','head',bevel=.06)
      for k in range(4):ell(m,'dorsal interlocking armor',(0,.9,-.54+k*.24),(.38,.14,.20),'#9daeb9' if k%2 else '#c4d0d5',seg=8)
      for s in [-1,1]:
        for k in range(3):ell(m,'plate rivet',(s*.31,.85-k*.10,.25),(.023,.023,.017),'#e0e8e9',seg=8)
    return m

def phoenix():
    m=Model('Solarius');m.joint('head',(0,1.65,.15));m.joint('tail',(0,.69,-.27));ell(m,'phoenix body',(0,1.02,0),(.32,.46,.25),'#f5ac16')
    tube(m,'graceful long neck',[(0,1.15,.04),(0,1.51,.14),(0,1.76,.14)],[.18,.115,.17],'#ffbd20','head')
    ell(m,'phoenix head',(0,1.78,.17),(.22,.25,.20),'#ffcb36','head');eyes(m,1.84,.33,.12,.07,'#fff8b1');spike(m,'curved phoenix beak',(0,1.74,.30),(0,1.63,.64),.13,'#c37b11','head')
    for s in [-1,1]:
      j='leftWing' if s<0 else 'rightWing';m.joint(j,(s*.2,1.18,0))
      for k in range(7):
        start=(s*.18,1.21-k*.045,-.02);end=(s*(.88-k*.055),1.56-k*.14,-.08)
        leaf(m,'layered golden wing feather',start,end,.16,'#ffc325' if k%2 else '#ffe060',j)
      j='leftLeg' if s<0 else 'rightLeg';m.joint(j,(s*.16,.72,0));tube(m,'bird shank',[(s*.15,.72,.03),(s*.18,.43,.04),(s*.19,.16,.12)],[.075,.045,.045],'#b86a16',j)
      for k in [-1,0,1]:tube(m,'phoenix talon',[(s*.19,.13,.12),(s*.19+k*.12,.08,.32),(s*.19+k*.14,.07,.41)],[.043,.025,.003],'#9c5811',j)
    for k in range(5):
      x=(k-2)*.12;tube(m,'long ribbon tail',[(x,.82,-.23),(x*1.5,.45,-.58),(x*2,.25,-1.08),(x*2.2,.41,-1.48),(x*1.8,.76,-1.64)],[.105,.10,.09,.055,.003],'#ffc72b' if k%2 else '#ff9b14','tail')
    for i in range(12):
      a=2*PI*i/12;flame(m,(.25*math.cos(a),1.77+.25*math.sin(a),.13),.34,.085,'head')
    for s in [-1,1]:flame(m,(s*.30,1.1,0),.55,.15)
    return m

def dragons(name):
    m=Model(name);light=name=='Lumidrake';eclipse=name=='Eclipserion';c='#e0f2eb' if light else '#c8e0e7' if eclipse else '#252f3d';mem='#ffd96c' if light else '#a7c5d0' if eclipse else '#3e465d';m.joint('head',(0,1.62,.36));m.joint('tail',(0,.65,-.62))
    ell(m,'dragon chest',(0,.89,0),(.32,.45,.42),c);ell(m,'dragon haunch',(0,.59,-.39),(.35,.32,.37),c)
    tube(m,'long proud dragon neck',[(0,1.02,.15),(0,1.36,.27),(0,1.64,.33)],[.24,.17,.18],c,'head')
    if not light and not eclipse:
      m.mesh('angular shadow dragon skull',[(-.24,1.52,.27),(.24,1.52,.27),(-.18,1.98,.23),(.18,1.98,.23),(-.18,1.52,.82),(.18,1.52,.82),(-.19,1.77,.63),(.19,1.77,.63)],[(0,1,3,2),(0,4,5,1),(2,3,7,6),(4,6,7,5),(0,2,6,4),(1,5,7,3)],c,joint='head',smooth=False)
    else:
      ell(m,'dragon skull',(0,1.72,.41),(.24,.25,.27),c,'head');ell(m,'tapered dragon muzzle',(0,1.61,.66),(.19,.13,.26),c,'head')
    nose(m,(0,1.65,.87),.04,c='#7895a0' if light or eclipse else '#111822')
    eyes(m,1.77,.626,.15,.09,'#31a9cf' if light or eclipse else '#e06e62',angry=not light and not eclipse)
    for s in [-1,1]:
      spike(m,'long swept horn',(s*.16,1.85,.31),(s*.24,2.27,.04),.10,mem if light else c,'head')
      leaf(m,'cheek dragon fin',(s*.20,1.65,.30),(s*.44,1.82,.15),.15,c,'head')
      aj='leftArm' if s<0 else 'rightArm';lj='leftLeg' if s<0 else 'rightLeg';m.joint(aj,(s*.23,.98,.19));m.joint(lj,(s*.27,.58,-.39))
      ell(m,'dragon shoulder',(s*.22,.93,.22),(.14,.21,.16),c,aj)
      tube(m,'front dragon leg',[(s*.22,.97,.21),(s*.28,.53,.25),(s*.26,.18,.39)],[.12,.085,.08],c,aj)
      tube(m,'back dragon leg',[(s*.28,.60,-.4),(s*.37,.35,-.35),(s*.31,.17,-.12)],[.18,.11,.09],c,lj)
      for j,z in [(aj,.46),(lj,-.03)]:ell(m,'dragon foot',(s*.29,.12,z),(.15,.11,.22),c,j);toes(m,s*.29,.11,z+.15,mem if light or eclipse else '#697889',j)
    tube(m,'curling dragon tail',[(0,.65,-.60),(-.21,.42,-.87),(-.56,.46,-.99),(-.70,.76,-.93),(-.57,.97,-.80)],[.18,.14,.10,.07,.002],c,'tail')
    for k in range(8):
      z=-.64+k*.11;leaf(m,'dorsal fin',(0,.89,z),(0,1.18+(.04*(k%2)),z-.13),.13,mem if light else '#334555' if not eclipse else '#e2f1f4')
    if eclipse:
      # The reference's signature black eclipse circle behind the head.
      ring(m,'dark eclipse corona',(0,1.82,-.03),.50,.085,'#1d2b3a','head')
      for k in range(18):
        a=2*PI*k/18;start=(.51*math.cos(a),1.82+.51*math.sin(a),-.055);end=(.76*math.cos(a+.11),1.82+.76*math.sin(a+.11),-.055)
        leaf(m,'spectral corona ray',start,end,.10,'#c9e2eb','head')
      for s in [-1,1]:
        j='leftWing' if s<0 else 'rightWing';m.joint(j,(s*.23,1.06,-.12))
        for k in range(3):leaf(m,'spectral ribbon wing',(s*.23,1.06,-.12),(s*(.74+k*.13),1.23-k*.23,-.18),.16,'#bedde8',j)
    else:
      for s in [-1,1]:
        j='leftWing' if s<0 else 'rightWing';m.joint(j,(s*.23,1.10,-.13))
        if light:
          # Tall gold feathered wings with layered discrete flight feathers.
          for k in range(9):
            leaf(m,'sunlight flight feather',(s*(.31+k*.015),1.15+k*.072,-.15),(s*(.68+k*.065),1.17+k*.137,-.20),.145,'#ffe38c' if k%2 else '#f9c750',j)
          tube(m,'golden wing leading edge',[(s*.24,1.08,-.15),(s*.48,1.83,-.18),(s*.99,2.22,-.20)],[.065,.04,.006],'#e6aa36',j)
        else:
          root=(s*.23,1.10,-.15);tip=(s*1.11,2.11,-.24);elbow=(s*.51,1.95,-.2)
          perimeter=[root,elbow,tip,(s*.85,1.85,-.23),(s*.95,1.58,-.22),(s*.66,1.65,-.21),(s*.68,1.33,-.20),(s*.46,1.42,-.17)]
          m.mesh('scalloped shadow bat membrane',perimeter,[tuple(range(len(perimeter)))],mem,joint=j,smooth=False)
          tube(m,'bat wing frame',[root,elbow,tip],[.06,.05,.008],c,j)
          for idx in [3,5,7]:tube(m,'bat wing finger',[elbow,perimeter[idx]],.018,'#1c2736',j)
          tube(m,'bat wing scallop',perimeter+[root],.018,'#1c2736',j)
    # Stained-glass / broken shard scale patches, explicitly match each palette.
    random.seed(90)
    colors=['#c4e7e7','#f9e4aa','#e6ebd2','#a8d8df'] if light else ['#2e3e50','#536373','#364353','#182635']
    if not eclipse:
      for row in range(7):
        yy=.64+row*.13;zz=.421 if row<4 else .47
        for side in [-1,1]:
          xx=side*(.08 if row>3 else .14)
          m.mesh('surface glass facet',[(xx-.07,yy,zz),(xx+.07,yy+.025,zz+.01),(xx+.025,yy+.135,zz+.005)],[(0,1,2)],colors[(row+(side>0))%4],joint='head' if row>3 else 'body',smooth=False)
      for i in range(28):
        a=i*2.399;y=.56+(i%7)*.16;r=.30 if y<1.1 else .18;cx=r*math.cos(a);zz=.05+r*.8*math.sin(a)
        if y>1.1:zz+=.24
        m.mesh('opalescent scale shard' if light else 'broken shadow scale',[(cx-.055,y,zz+.02),(cx+.07,y+.05,zz+.025),(cx+.02,y+.14,zz+.02)],[(0,1,2)],colors[i%4],joint='head' if y>1.1 else 'body',smooth=False)
    return m

def soften_skin(m):
    """Blend intersecting anatomy into unified organic skin, preserving details and rig joints."""
    labels={'ribcage','neck','head','muzzle','continuous leg','paw','trunk','root foot','mist heart','cloud scallop','cherub body','large cherub head','cherub leg','bare foot','hare body','rounded hare haunches','hare head','gentle muzzle','hare foreleg','front paw','folded rabbit thigh','long rear paw','dragon chest','dragon haunch','long proud dragon neck','dragon skull','tapered dragon muzzle','front dragon leg','back dragon leg','dragon foot','eel cranium','long eel muzzle','phoenix body','graceful long neck','phoenix head','fluffy thorax','golden abdomen','moth head','goblin skull','warm muzzle','round bear ear','side wolf skull','side wolf neck','side muzzle','squirrel rounded haunch','rounded limb shoulder','bear barrel','massive hunched shoulders','broad bear head','bear cheek left','bear cheek right','bear muzzle','bear upper limb','bear foreleg','bear rearleg','broad bear paw','hare shoulder','dragon shoulder'}
    buckets={}
    for obj in list(bpy.context.scene.objects):
        label=obj.name.rsplit('.',1)[0] if obj.name.rsplit('.',1)[-1].isdigit() else obj.name
        if obj.type=='MESH' and label in labels:
            key=(obj.parent.name,obj.data.materials[0].name);buckets.setdefault(key,[]).append(obj)
    for objs in buckets.values():
        if len(objs)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for ob in objs:ob.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();ob=bpy.context.object
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        mod=ob.modifiers.new('continuous anatomical skin','REMESH');mod.mode='VOXEL';mod.voxel_size=.032;mod.use_smooth_shade=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
        smooth=ob.modifiers.new('soft sculpt finish','SMOOTH');smooth.factor=.7;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)

def dragon_skin(m):
    """Bake the illustrated opal/shattered-glass mosaic into skin faces, avoiding raised badges."""
    if m.name not in ['Lumidrake','Umbradrake']:return
    light=m.name=='Lumidrake';base='e0f2eb' if light else '252f3d'
    for obj in list(bpy.context.scene.objects):
      if any(obj.name.startswith(n) for n in ['surface glass facet','opalescent scale shard','broken shadow scale']):bpy.data.objects.remove(obj,do_unlink=True)
    palette=['#edf2e5','#d3e8e5','#e8e5cf','#cce5e9','#f1e6c9','#e2eee7'] if light else ['#293746','#3d4d5f','#253340','#344456','#465568','#2d3c4b']
    random.seed(901 if light else 911)
    seeds=[(random.uniform(-.6,.6),random.uniform(-1.1,1.0),random.uniform(.1,2.2)) for _ in range(130)]
    for obj in list(bpy.context.scene.objects):
      if obj.type!='MESH' or not obj.data.materials or obj.data.materials[0].name.split('pigment_')[-1].split('.')[0]!=base:continue
      for color in palette:obj.data.materials.append(m.material(color))
      world=obj.matrix_world
      for poly in obj.data.polygons:
        p=world@poly.center
        nearest=min(range(len(seeds)),key=lambda k:(p.x-seeds[k][0])**2+(p.y-seeds[k][1])**2+(p.z-seeds[k][2])**2)
        poly.material_index=1+nearest%len(palette)

BUILDERS={'Sporecrown':mushroom,'Whispling':lambda:ghosts('Whispling'),'Phantgale':lambda:ghosts('Phantgale'),'Tindertail':squirrel,'Shadowpup':lambda:wolves('Shadowpup'),'Duskhound':lambda:wolves('Duskhound'),'Nighterror':lambda:wolves('Nighterror'),'Glimmoth':lambda:moth('Glimmoth'),'Radianthra':lambda:moth('Radianthra'),'Coglin':lambda:robot('Coglin'),'Mechagrin':lambda:robot('Mechagrin'),'Embercub':lambda:bears('Embercub'),'Flamebear':lambda:bears('Flamebear'),'Infernursus':lambda:bears('Infernursus'),'Glacimite':glacimite,'Lumikid':lumikid,'Volteel':eel,'Ironhide':armadillo,'Snochi':lambda:rabbit('Snochi'),'Snoven':lambda:rabbit('Snoven'),'Glacimal':lambda:rabbit('Glacimal'),'Harefrost':lambda:rabbit('Harefrost'),'Solarius':phoenix,'Lumidrake':lambda:dragons('Lumidrake'),'Umbradrake':lambda:dragons('Umbradrake'),'Eclipserion':lambda:dragons('Eclipserion')}
if __name__=='__main__':
    names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(BUILDERS)
    for name in names:
        print('BUILDING',name,flush=True)
        m=BUILDERS[name]();soften_skin(m);dragon_skin(m);m.export(render=True)
