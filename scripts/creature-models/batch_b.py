"""Reference-sculpted creatures 24–49. Run with Blender's Python."""
import math
import os
import sys
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
from common import Model

_n = 0
def name(prefix):
    global _n
    _n += 1
    return f'{prefix}_{_n}'
def ball(m, p, s, c, j='body'):
    return m.ellipsoid(name('form'), p, s, c, joint=j)
def line(m, pts, r, c, j='body'):
    return m.tube(name('curve'), pts, r, c, joint=j)
def cone(m, a, b, r, c, j='body'):
    return m.cone(name('tip'), a, b, r, c, joint=j)
def leaf(m, a, b, w, c, j='body'):
    return m.leaf(name('leaf'), a, b, w, c, joint=j)
def flame(m,points,widths,c):
    v=[]
    for i,p in enumerate(points):
        a=Vector(points[max(0,i-1)]);b=Vector(points[min(len(points)-1,i+1)])
        d=(b-a).normalized();side=Vector((0,d.z,-d.y)).normalized()
        for sx,sw in [(-1,-1),(1,-1),(1,1),(-1,1)]:
            q=Vector(p)+side*widths[i]*sw+Vector((sx*.022,0,0));v.append(tuple(q))
    f=[(i*4+k,i*4+(k+1)%4,(i+1)*4+(k+1)%4,(i+1)*4+k) for i in range(len(points)-1) for k in range(4)]
    f += [(3,2,1,0),tuple((len(points)-1)*4+k for k in range(4))]
    mesh(m,v,f,c,'tail')
def mesh(m, v, f, c, j='body', smooth=True):
    return m.mesh(name('surface'),v,f,c,joint=j,smooth=smooth)
def decal(m,points,width,c,j='body'):
    """Project a narrow marking onto the actual front surface, without floating rods."""
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
    samples=[]
    for a,b in zip(points,points[1:]):
        for q in range(6):
            t=q/6;samples.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
    samples.append(points[-1][:2]);v=[]
    for i,(x,y) in enumerate(samples):
        a=samples[max(0,i-1)];b=samples[min(len(samples)-1,i+1)];dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy) or 1
        for sign in [-1,1]:
            xx=x-dy/length*width*.5*sign;yy=y+dx/length*width*.5*sign
            hit,co,normal,index,obj,mat=bpy.context.scene.ray_cast(deps,Vector((xx,-10,yy)),Vector((0,1,0)))
            v.append((xx,yy,-co.y+.006) if hit else (xx,yy,0))
    front=[(i*2,i*2+2,i*2+3,i*2+1) for i in range(len(samples)-1)]
    n=len(v);v += [(x,y,z-.004) for x,y,z in v]
    faces=front+[tuple(i+n for i in reversed(f)) for f in front]
    boundary=[0]+[i*2 for i in range(1,len(samples))]+[n-1]+[i*2+1 for i in range(len(samples)-2,-1,-1)]
    faces += [(a,b,b+n,a+n) for a,b in zip(boundary,boundary[1:]+boundary[:1])]
    mesh(m,v,faces,c,j)
def profile(m, rings, c, j='body', sides=32):
    # Each ring: y, radiusX, radiusZ, offsetZ. Deliberately shaped silhouettes.
    v=[]
    for y,rx,rz,z in rings:
        v.extend((rx*math.cos(a*math.tau/sides),y,z+rz*math.sin(a*math.tau/sides)) for a in range(sides))
    f=[]
    for r in range(len(rings)-1):
        for a in range(sides):
            b=(a+1)%sides
            f.append((r*sides+a,r*sides+b,(r+1)*sides+b,(r+1)*sides+a))
    f.extend([tuple(range(sides-1,-1,-1)),tuple((len(rings)-1)*sides+a for a in range(sides))])
    return mesh(m,v,f,c,j)
def make(n,head=(0,1.25,.3)):
    m=Model(n)
    for j,p in [('head',head),('tail',(0,.6,-.6)),('leftLeg',(-.35,.5,0)),('rightLeg',(.35,.5,0)),('leftArm',(-.5,1,0)),('rightArm',(.5,1,0)),('leftWing',(-.3,1.1,0)),('rightWing',(.3,1.1,0))]:
        m.joint(j,p)
    return m
def eyes(m,y,z,spread,size=.14,iris='#171b26'):
    for s in [-1,1]: m.eye((s*spread,y,z),size,iris,joint='head')
def beads(m,y,z,spread,size=.14,c='#15232b'):
    for s in [-1,1]:
        ball(m,(s*spread,y,z),(size*.72,size,size*.38),c,'head')
        ball(m,(s*spread-size*.22,y+size*.42,z+size*.34),(size*.19,size*.25,size*.09),'#fff9df','head')
def flateyes(m,y,z,spread,size,iris='#202624'):
    for s in [-1,1]:
        ball(m,(s*spread,y,z),(size*.74,size,.025),'#f4f0d8','head')
        ball(m,(s*spread,y,z+.022),(size*.45,size*.75,.018),iris,'head')
        ball(m,(s*spread-size*.13,y+size*.36,z+.04),(size*.15,size*.2,.009),'#fffbe6','head')
def smile(m,y,z,width=.22,c='#35313c'):
    line(m,[(-width,y+.04,z),(0,y-.04,z+.015),(width,y+.04,z)],.018,c,'head')
def toes(m,x,y,z,c,j):
    for dx in [-.1,0,.1]: ball(m,(x+dx,y,z+.09),(.08,.075,.17),c,j)
def quadruped(m,c,body=(.65,.55,.85),head=(0,1.2,.6),headscale=(.43,.44,.42),feet=.18):
    ball(m,(0,.85,-.15),body,c)
    ball(m,head,headscale,c,'head')
    for x in [-.43,.43]:
        for z in [-.68,.48]:
            j='leftLeg' if x<0 else 'rightLeg'
            root=(x*.8,.83,z+.12 if z<0 else z-.13)
            line(m,[root,(x,.42,z+.04),(x,.19,z+.16)],feet,c,j)
            ball(m,root,(feet*1.12,feet*1.17,feet*1.1),c,j)
            ball(m,(x,.42,z+.04),(feet,feet*1.08,feet),c,j)
            ball(m,(x,.14,z+.21),(feet*1.2,.14,feet*1.6),c,j)
def ears(m,center,spread,height,c,inner,wide=.21):
    y,z=center
    for s in [-1,1]:
        mesh(m,[(s*(spread-wide),y,z),(s*(spread+wide),y-.02,z),(s*(spread+.08),y+height,z-.06),(s*spread,y+.1,z+.18)],[(0,1,3),(1,2,3),(2,0,3),(0,2,1)],c,'head')
        mesh(m,[(s*(spread-wide*.57),y+.04,z+.075),(s*(spread+wide*.57),y+.02,z+.075),(s*(spread+.07),y+height*.8,z+.015)],[(0,1,2)],inner,'head')

def pipereef():
    m=make('Pipereef',(0,.65,.55)); blue='#3183ad'; dark='#235c79'
    profile(m,[(.08,.2,.52,-.1),(.14,.72,1,-.12),(.35,.78,.94,-.06),(.6,.59,.75,.1),(.86,.35,.45,.42),(.98,.02,.03,.45)],blue)
    ball(m,(0,.62,.69),(.5,.36,.5),blue,'head')
    beads(m,.78,1.04,.27,.14,'#101b22')
    ball(m,(0,.55,1.13),(.28,.13,.12),'#4d9db9','head')
    line(m,[(-.59,.25,.58),(-.71,.23,.1),(-.65,.27,-.5),(-.4,.29,-.92)],.055,'#64b5cf')
    for x,z,h in [(-.38,-.3,.9),(.3,-.58,1.12)]:
        line(m,[(x,.6,z),(x-.05,1.05,z-.1),(x-.13,1.05+h*.42,z-.24)],.12,'#d7c78e')
        ball(m,(x-.13,1.05+h*.42,z-.24),(.14,.025,.14),'#5b4c35')
    for x in [-.3,.3]: leaf(m,(x,.57,-.24),(x*1.45,1.38,-.33),.33,blue)
    leaf(m,(0,.45,-.88),(0,.96,-1.1),.35,dark)
    return m
def reedmollusk():
    m=make('Reedmollusk',(0,.65,.63)); c='#83bbcc'; pale='#b6e1e5'
    ball(m,(0,.7,-.18),(.68,.59,.82),c)
    ball(m,(0,.59,.64),(.53,.4,.45),pale,'head');eyes(m,.69,1.025,.26,.14,'#367f9e')
    for s in [-1,1]:
        leaf(m,(s*.37,.6,-.15),(s*1.15,.16,-1.22),.18,pale,'leftWing' if s<0 else 'rightWing')
        leaf(m,(s*.32,.55,.12),(s*.89,.09,.67),.18,pale,'leftWing' if s<0 else 'rightWing')
        cone(m,(s*.36,.9,-.64),(s*.64,1.72,-1.4),.105,'#75a5b7')
    for i in range(7):
        a=(i-3)*.25; x=math.sin(a)*.63
        leaf(m,(x,.87,.58),(x*1.04,1.19-(abs(i-3)*.045),.6),.15,'#ccebf0','head')
    return m
def nibbkit():
    m=make('Nibbkit',(0,1.16,.59));c='#5d5c59'
    quadruped(m,c,body=(.48,.5,.64),head=(0,1.16,.59),headscale=(.64,.55,.46),feet=.18)
    ears(m,(1.45,.56),.4,.53,c,'#393837',.22);eyes(m,1.24,.977,.29,.18,'#9885c7')
    ball(m,(0,1.04,1.04),(.08,.045,.04),'#302b2b','head')
    mesh(m,[(-.06,.94,1.025),(.06,.94,1.025),(0,1.005,1.04)],[(0,1,2)],'#b87280','head')
    line(m,[(0,.85,-.66),(-.13,1.07,-1.03),(-.23,1.35,-1.07)],.065,c,'tail')
    for dx,dy,dz in [(0,0,0),(-.1,.02,0),(.1,.03,0),(0,.1,-.03),(0,-.08,.04)]:ball(m,(-.23+dx,1.35+dy,-1.07+dz),(.17,.14,.16),c,'tail')
    for x,y,z in [(-.25,1.58,.89),(.4,.82,.68),(-.46,.54,.62),(-.33,.97,-.5)]:
        line(m,[(x-.09,y+.13,z),(x+.08,y-.14,z)],.012,'#292929','head' if y>1.4 else 'body')
        for t in [-.6,0,.6]:line(m,[(x-.06+t*.07,y+t*.12,z+.005),(x+.04+t*.07,y-.045+t*.12,z+.005)],.009,'#292929','head' if y>1.4 else 'body')
    return m
def purlarcen():
    m=make('Purlarcen',(0,1.24,.63));c='#aaa398';d='#373735'
    quadruped(m,c,body=(.43,.39,.85),head=(0,1.24,.63),headscale=(.42,.36,.39),feet=.105)
    for x in [-.43,.43]:
        for z in [-.68,.48]: ball(m,(x,.2,z+.2),(.13,.23,.18),d,'leftLeg' if x<0 else 'rightLeg')
    ball(m,(0,1.29,.69),(.43,.27,.36),d,'head');ears(m,(1.48,.64),.29,.54,d,'#6b6963',.16)
    for s in [-1,1]:
        v=[(s*.1,1.36,.996),(s*.19,1.3,1.024),(s*.31,1.33,.989),(s*.36,1.43,.949),(s*.25,1.4,.991)]
        mesh(m,v,[(0,1,2,3,4)],'#dfbe5e','head')
        ball(m,(s*.235,1.355,1.021),(.022,.066,.018),'#242b25','head')
        ball(m,(s*.22,1.385,1.038),(.009,.017,.006),'#f6ebbe','head')
    ball(m,(0,1.12,1.02),(.15,.1,.09),c,'head')
    line(m,[(0,.96,-.95),(-.17,1.3,-1.21),(-.17,1.73,-1.26),(-.42,1.99,-1.09),(-.65,1.99,-.92)],.065,c,'tail')
    cone(m,(-.65,1.99,-.92),(-.81,1.87,-.79),.063,c,'tail')
    for s in [-1,1]:
        for h in [-.05,.06]:line(m,[(s*.14,1.17,1.04),(s*.48,1.2+h,1.1),(s*.68,1.24+h,1.05)],.009,'#c3c7c4','head')
    return m
def twigglo():
    m=make('Twigglo',(0,1.43,0));wood='#76612c'; green='#9bb742'
    profile(m,[(.66,.13,.11,0),(1.05,.18,.13,0),(1.34,.1,.09,0)],wood)
    for s in [-1,1]:
        j='leftLeg' if s<0 else 'rightLeg'
        line(m,[(s*.09,.75,0),(s*.18,.43,.01),(s*.23,.08,.14),(s*.34,.06,.22)],.045,wood,j)
        j='leftArm' if s<0 else 'rightArm'
        line(m,[(s*.14,1.18,0),(s*.29,.91,.03),(s*.45,.79,.08)],.039,wood,j)
        for dx in [-.07,.07]:line(m,[(s*.43,.8,.08),(s*(.49+dx),.7,.12)],.025,wood,j)
        leaf(m,(s*.07,1.34,-.06),(s*.8,1.12,-.22),.37,green)
    ball(m,(0,1.47,.04),(.29,.28,.23),'#eee39a','head')
    profile(m,[(1.48,.26,.22,-.015),(1.65,.34,.28,-.02),(1.88,.22,.2,-.035),(2.14,.015,.015,-.03)],green,'head')
    line(m,[(0,1.56,.22),(0,1.83,.18),(0,2.13,0)],.012,'#c9da6b','head')
    for s in [-1,1]:line(m,[(s*.09,1.47,.255),(s*.12,1.5,.255),(s*.15,1.47,.255)],.013,'#716437','head')
    ball(m,(0,1.06,.145),(.085,.13,.04),'#ffdc58');smile(m,1.38,.255,.055)
    return m
def vinebody(m,big=False):
    g='#387525'; light='#649133'; wood='#244d21'; sc=1.5 if big else 1
    ball(m,(0,1.12*sc,0),(.28*sc,.43*sc,.2*sc),wood)
    for s in [-1,1]:
        j='leftLeg' if s<0 else 'rightLeg'
        line(m,[(s*.14*sc,.85*sc,0),(s*.23*sc,.47*sc,0),(s*.28*sc,.12*sc,.08)],.11*sc,g,j)
        ball(m,(s*.3*sc,.08*sc,.14),(.18*sc,.09*sc,.28*sc),g,j)
        j='leftArm' if s<0 else 'rightArm'
        line(m,[(s*.23*sc,1.37*sc,0),(s*.49*sc,1.15*sc,0),(s*.7*sc,1.28*sc,.04)],.09*sc,g,j)
        for k in range(3):
            line(m,[(s*(.1+k*.06)*sc,.78*sc,-.04),(s*(.3-k*.04)*sc,.5*sc,.1),(s*(.18+k*.07)*sc,.14*sc,.14)],.023*sc,light,'leftLeg' if s<0 else 'rightLeg')
    for i in range(6):
        y=(.83+i*.1)*sc
        line(m,[(-.2*sc,y,-.03),(.22*sc,y+.19*sc,.08),(.12*sc,y+.29*sc,.22),(-.2*sc,y+.14*sc,.1)],.045*sc,g)
    return sc
def brambright():
    m=make('Brambright',(0,1.65,0));vinebody(m)
    ball(m,(0,1.66,.02),(.34,.33,.29),'#529734','head');eyes(m,1.69,.277,.135,.13,'#123b27');smile(m,1.49,.303,.1)
    for k in range(5):
        y=1.78+k*.07
        line(m,[(-.29,y,0),(-.1,y+.09,.25),(.23,y-.02,.19),(.29,y-.1,-.02)],.045,'#326524','head')
    for a in [-.6,0,.6]:
        leaf(m,(math.sin(a)*.22,1.95,0),(math.sin(a)*.42,2.4-abs(a)*.14,.02),.12,'#f4ed9a','head')
    colors=['#e79abd','#e9c35b','#b3cfdf','#b59fe3','#eea2c5']
    for s in [-1,1]:
        for k in range(5):
            a=(-.7+k*.35)
            leaf(m,(s*.69,1.28,.04),(s*(.83+math.sin(a)*.32),1.5+math.cos(a)*.34,.08),.12,colors[k],'leftArm' if s<0 else 'rightArm')
    return m
def solbriar():
    m=make('Solbriar',(0,2.5,0));sc=vinebody(m,True)
    ball(m,(0,1.82,0),(.45,.5,.29),'#386c24')
    for k in range(8):
        y=1.42+k*.08
        line(m,[(-.33,y,.1),(0,y+.1,.31),(.34,y+.27,.09)],.065,'#57872b')
    # Broad armored shoulders, long thorn-lined forearms and crown of sunflower petals.
    for s in [-1,1]:
        j='leftArm' if s<0 else 'rightArm'
        ball(m,(s*.48,1.97,0),(.34,.3,.3),'#3f7425',j)
        line(m,[(s*.6,1.9,0),(s*.8,1.35,.03),(s*.84,1.05,.13)],.17,'#3a7928',j)
        ball(m,(s*.84,1.03,.16),(.21,.23,.2),'#356125',j)
        for dx in [-.12,0,.12]:cone(m,(s*.84+dx,.95,.2),(s*.84+dx,.78,.35),.065,'#7f9741',j)
        for h in [1.32,1.59,1.91]:cone(m,(s*.84,h,0),(s*1.01,h+.23,-.05),.095,'#5a8b29',j)
        for k in range(3):line(m,[(s*(.77+k*.035),1.08,.3),(s*(.74+k*.04),1.42,.2),(s*(.6+k*.06),1.85,.22)],.018,'#c1ac3d',j)
    ball(m,(0,2.39,0),(.32,.42,.25),'#3b7125','head');eyes(m,2.45,.24,.12,.09,'#e3c347')
    for k in range(18):
        a=k*math.tau/18;x=math.sin(a);y=math.cos(a)
        leaf(m,(x*.25,2.43+y*.25,-.14),(x*.63,2.43+y*.63,-.13),.12,'#e9bd32','head')
    for s in [-1,1]:
        leaf(m,(s*.16,2.4,.16),(s*.3,2.71,.05),.13,'#557c23','head')
        for k in range(3):line(m,[(s*(.15+k*.05),1.22,.24),(s*(.25+k*.025),.76,.16),(s*(.3+k*.03),.2,.3)],.018,'#b1a53c','leftLeg' if s<0 else 'rightLeg')
        for y,x in [(.95,.25),(.52,.3)]:ball(m,(s*x,y,.02),(.22,.28,.2),'#3d7427','leftLeg' if s<0 else 'rightLeg')
        for dx in [-.11,0,.11]:cone(m,(s*.45+dx,.15,.37),(s*.45+dx,.06,.58),.07,'#7f9741','leftLeg' if s<0 else 'rightLeg')
    return m
def mitelet():
    m=make('Mitelet',(0,.4,.78));c='#786541';dark='#5a4a30'
    ball(m,(0,.56,-.16),(.73,.58,.96),c)
    for i in range(6):
        z=-.86+i*.27
        shrink=math.sqrt(max(.05,1-((z+.16)/.96)**2))
        pts=[]
        for k in range(11):
            a=-.4+k*(math.pi+.8)/10;pts.append((math.cos(a)*.738*shrink,.56+math.sin(a)*.588*shrink,z))
        line(m,pts,.016,dark)
    ball(m,(0,.35,.83),(.5,.29,.4),c,'head');beads(m,.43,1.145,.26,.1,'#171919');smile(m,.25,1.198,.13)
    for s in [-1,1]:
        for z in [-.68,-.2,.36]:cone(m,(s*.5,.25,z),(s*.73,.06,z+.07),.09,c,'leftLeg' if s<0 else 'rightLeg')
        line(m,[(s*.25,.59,.94),(s*.33,.99,1),(s*.48,1.26,1.03)],.042,'#8c46b7','head')
    for i in range(15):
        a=i*2.4;z=-.65+(i%5)*.3;x=math.sin(a)*.53;y=.67+math.cos(a)*.24
        ball(m,(x,y,z),(.05,.035,.06),'#95805a')
    return m
def caraphex():
    m=make('Caraphex',(0,.65,.76));base='#493b30';plate='#675140'
    quadruped(m,base,body=(.85,.65,.93),head=(0,.65,.76),headscale=(.45,.37,.48),feet=.23)
    # Tessellated armored dome, each plate is a bevel-edged hexagonal shield.
    for iz in range(5):
        z=-.79+iz*.34
        for ix in [-1,0,1]:
            x=ix*.43
            def shell_y(xx,zz):return .85+.66*math.sqrt(max(.03,1-(xx/.88)**2-((zz+.15)/1.01)**2))
            ring=[]
            for k in range(6):
                xx=x+math.cos(k*math.tau/6)*.237;zz=z+math.sin(k*math.tau/6)*.207
                ring.append((xx,shell_y(xx,zz)+.012,zz))
            mesh(m,ring+[(x,shell_y(x,z)+.045,z)],[(k,(k+1)%6,6) for k in range(6)],plate if (iz+ix)%2 else '#755c45',smooth=False)
    for x,y,z,h in [(0,1.36,-.63,.53),(-.44,1.12,-.49,.35),(.44,1.12,-.53,.37),(0,1.4,.03,.37),(-.53,1.05,.15,.31),(.53,1.05,.15,.31),(0,1.27,.58,.34)]:
        v=[(x+math.cos(k*math.tau/5)*r,y+dy,z+math.sin(k*math.tau/5)*r) for dy,r in [(0,.12),(h*.62,.145)] for k in range(5)]+[(x-.04,y+h,z-.03)]
        mesh(m,v,[(k,(k+1)%5,(k+1)%5+5,k+5) for k in range(5)]+[(k+5,(k+1)%5+5,10) for k in range(5)],'#9a4cbd',smooth=False)
    rock(m,(0,.58,1.05),(.32,.2,.25),'#695341','head')
    flateyes(m,.76,1.16,.25,.1,'#d63e5d')
    for s in [-1,1]:leaf(m,(s*.12,.89,1.05),(s*.41,.82,1.03),.09,'#6f5945','head')
    for s in [-1,1]:
        for z in [-.7,.5]:
            for k in [-1,0,1]:cone(m,(s*.43+k*.1,.16,z+.26),(s*.43+k*.13,.06,z+.49),.075,'#86755d','leftLeg' if s<0 else 'rightLeg')
    return m
def bird(n,big=False):
    m=make(n,(0,1.25,.31));c='#383a3b' if not big else '#68675d'; wing='#343334' if not big else '#77766a';fire='#ed4b1d'
    profile(m,[(.46,.22,.2,0),(.65,.42,.34,0),(1,.43,.37,-.02),(1.23,.25,.24,.07)],c)
    ball(m,(0,1.37,.24),(.35,.36,.32) if not big else (.3,.3,.28),c,'head');flateyes(m,1.42,.512 if not big else .49,.21 if not big else .18,.145 if not big else .08,'#161618' if not big else '#df8028')
    mesh(m,[(-.12,1.29,.49),(.12,1.29,.49),(0,1.32,.88),(0,1.45,.53)],[(0,1,2),(0,2,3),(1,3,2)],'#626259','head',False)
    mesh(m,[(-.1,1.28,.52),(.1,1.28,.52),(0,1.31,.85),(0,1.2,.55)],[(0,2,1),(0,3,2),(1,2,3)],'#463c34','head',False)
    if not big:
        ball(m,(0,.82,.34),(.28,.26,.08),'#d9481f');ball(m,(0,.84,.406),(.16,.16,.025),'#ffb52e')
    for s in [-1,1]:
        j='leftWing' if s<0 else 'rightWing'
        ball(m,(s*.34,.95,-.08),(.145,.25,.28) if not big else (.11,.23,.26),wing,j)
        for k in range(4 if not big else 7):
            leaf(m,(s*(.3+k*.015),1.1-k*.035,-.02),(s*(.57+k*.025),.69-k*.03,-.4-k*.07) if not big else (s*(.62+k*.025),.61-k*.025,-.55-k*.07),.12,fire if not big and k>1 else wing,j)
        j='leftLeg' if s<0 else 'rightLeg'
        line(m,[(s*.18,.51,.03),(s*.19,.15,.06)],.045,'#454544',j)
        for dx in [-.1,0,.1]:line(m,[(s*.19,.15,.06),(s*.19+dx,.08,.31)],.032,'#454544',j)
    for k in range(5):
        x=(k-2)*.11
        leaf(m,(x,.68,-.25),(x*1.7,.45,-1.14),.17,fire if not big else '#af5327','tail')
    for x,y in [(-.14,1.64),(0,1.76),(.13,1.66)]:leaf(m,(x*.5,1.55,.16),(x,y,.05),.11,c,'head')
    if big:
        for s in [-1,1]:
            leaf(m,(s*.055,1.46,.535),(s*.31,1.55,.47),.065,'#4a4b42','head')
            leaf(m,(s*.1,1.55,.17),(s*.38,1.74,-.02),.1,c,'head')
        flame(m,[(0,.53,-.95),(0,.8,-1.26),(0,1.15,-1.46),(0,1.53,-1.42),(0,1.8,-1.12),(0,1.83,-.77)],[.09,.23,.21,.17,.08,.002],'#f58d26')
        flame(m,[(-.03,.56,-1.01),(-.03,.85,-1.22),(-.03,1.17,-1.34),(-.03,1.48,-1.28),(-.03,1.65,-1.03)],[.05,.13,.12,.07,.002],'#ffd24d')
        for i in range(6):leaf(m,((i-2.5)*.095,1.2,.25),((i-2.5)*.15,.93,.34),.09,'#8c8a7b')
    return m
def noxling():
    m=make('Noxling',(0,1,.18));c='#292931'
    profile(m,[(.17,.48,.33,-.03),(.47,.56,.37,-.02),(.82,.36,.27,.04),(1.1,.3,.25,.06)],c)
    ball(m,(0,1.08,.1),(.52,.5,.43),c,'head')
    ball(m,(0,1.04,.43),(.33,.31,.05),'#191b22','head');beads(m,1.1,.49,.17,.075,'#e6edcb')
    for s in [-1,1]:
        for k in range(3):leaf(m,(s*.19,.88-k*.18,0),(s*(.62+k*.04),.69-k*.2,-.2),.19,'#33333c')
        line(m,[(s*.23,.3,0),(s*.24,.08,.1)],.1,c,'leftLeg' if s<0 else 'rightLeg')
    line(m,[(0,.42,-.3),(-.4,.66,-.6),(-.56,1.03,-.65),(-.48,1.32,-.63),(-.58,1.63,-.61)],.055,c,'tail')
    cone(m,(-.58,1.63,-.61),(-.65,1.78,-.59),.055,c,'tail')
    for s in [-1,1]:line(m,[(s*.1,1.43,.27),(s*.43,1.15,.36),(s*.45,.8,.19)],.025,'#3e3e46','head')
    return m
def ferrimaw():
    m=make('Ferrimaw',(0,.94,.67));c='#282c29';metal='#565951'
    quadruped(m,c,body=(.66,.51,.76),head=(0,.94,.67),headscale=(.59,.39,.48),feet=.19)
    # Box-shaped metal jaw frame and recessed open maw.
    ball(m,(0,.77,1.02),(.52,.28,.1),'#111614','head')
    for y in [.53,1.03]:line(m,[(-.56,y,.92),(-.5,y,1.14),(.5,y,1.14),(.56,y,.92)],.11,metal,'head')
    for s in [-1,1]:line(m,[(s*.54,.53,1),(s*.6,.88,1),(s*.52,1.05,1)],.11,metal,'head')
    for x in [-.37,-.18,0,.18,.37]:
        cone(m,(x,.98,1.12),(x,.84,1.12),.07,'#b7b8a4','head');cone(m,(x,.59,1.12),(x,.72,1.12),.065,'#b7b8a4','head')
    eyes(m,1.15,.985,.29,.14,'#d7ac3e')
    for s in [-1,1]:
        line(m,[(s*.33,1.22,.55),(s*.51,1.56,.5),(s*.5,1.89,.52),(s*.29,2,.55)],.13,metal,'head')
        for y in [.58,.8,1.02]:ball(m,(s*.56,y,1.1),(.05,.05,.025),'#818477','head')
        for z in [-.65,.5]:
            line(m,[(s*.44,.38,z),(s*.57,.36,z+.1)],.2,metal,'leftLeg' if s<0 else 'rightLeg')
            for dx in [-.1,.1]:cone(m,(s*.44+dx,.13,z+.2),(s*.44+dx,.06,z+.49),.085,metal,'leftLeg' if s<0 else 'rightLeg')
    line(m,[(0,.86,-.7),(-.2,1.02,-1.04),(-.1,1.31,-1.25)],.1,c,'tail')
    return m
def niblet():
    m=make('Niblet',(0,.92,.15));c='#c7ad79';pink='#eea3a0'
    profile(m,[(.14,.28,.26,0),(.28,.47,.36,0),(.65,.5,.38,0),(1,.39,.31,.02),(1.22,.13,.15,.03)],c)
    for s in [-1,1]:
        ball(m,(s*.3,1.42,-.03),(.19,.44,.105),c,'head');ball(m,(s*.3,1.45,.068),(.137,.34,.025),pink,'head')
        ball(m,(s*.24,.1,.12),(.17,.09,.22),c,'leftLeg' if s<0 else 'rightLeg')
        ball(m,(s*.22,.64,.35),(.18,.15,.07),'#d9be89','head')
    beads(m,.83,.37,.19,.075,'#27201a');ball(m,(0,.7,.44),(.09,.07,.04),'#9b7c50','head')
    for s in [-1,1]:ball(m,(s*.05,.49,.41),(.048,.11,.04),'#fff6d5','head')
    smile(m,.6,.43,.1)
    for s in [-1,1]:
        for dy in [-.09,0,.09]:line(m,[(s*.23,.68,.38),(s*.58,.67+dy,.42)],.011,'#68533d','head')
    for x,y,z in [(0,.36,-.4),(-.12,.4,-.46),(.11,.43,-.46),(0,.53,-.46)]:ball(m,(x,y,z),(.17,.16,.16),'#efe0b6','tail')
    return m
def gnawer():
    m=make('Gnawer',(0,.87,.68));c='#503627';dark='#33251e'
    quadruped(m,c,body=(.63,.56,.82),head=(0,.87,.68),headscale=(.52,.45,.5),feet=.18)
    for s in [-1,1]:ball(m,(s*.36,1.23,.52),(.18,.23,.1),dark,'head');ball(m,(s*.36,1.23,.615),(.1,.15,.025),'#71513e','head')
    ball(m,(0,.62,1.1),(.39,.27,.17),'#251d18','head')
    ball(m,(0,.88,1.14),(.25,.15,.16),c,'head');ball(m,(0,.94,1.27),(.14,.08,.08),dark,'head');eyes(m,1.03,1.035,.29,.12,'#b8a268')
    for x in [-.17,-.06,.06,.17]:ball(m,(x,.66,1.265),(.055,.13,.04),'#d5c49a','head')
    for s in [-1,1]:
        line(m,[(s*.15,1.15,.96),(s*.41,1.09,.98)],.036,dark,'head')
        for y in [.98,1.2]:line(m,[(s*.17,y,1.11),(s*.4,y-.13,1.075)],.024,'#aa5f4c','head')
        for z in [-.68,.48]:
            for dx in [-.1,0,.1]:cone(m,(s*.43+dx,.16,z+.23),(s*.43+dx,.06,z+.48),.05,'#c7b68d','leftLeg' if s<0 else 'rightLeg')
    line(m,[(0,.75,-.8),(-.16,1.02,-1.15),(-.11,1.42,-1.36),(.04,1.67,-1.33)],.085,dark,'tail')
    for i in range(8):leaf(m,((i%2-.5)*.2,1.03,-.8+i*.17),((i%2-.5)*.32,1.33,-.84+i*.17),.15,c)
    return m
def puddlop():
    m=make('Puddlop',(0,.72,.15));c='#5bb4d4'
    # Uneven puddle perimeter and tapered gel dome rather than a generic sphere.
    sides=48;v=[]
    for y,r in [(.04,1),(.14,1.03),(.3,.85),(.52,.64),(.83,.59),(1.12,.43),(1.27,.05)]:
        for k in range(sides):
            a=k*math.tau/sides;w=1+.09*math.sin(a*5)+.045*math.cos(a*7)
            v.append((math.cos(a)*r*w,y,math.sin(a)*r*.7*w))
    f=[(i*sides+k,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,(i+1)*sides+k) for i in range(6) for k in range(sides)]
    mesh(m,v,f,c);beads(m,.76,.54,.23,.13,'#244d68');smile(m,.53,.65,.18,'#31617d')
    def blobsurf(y,a):
        rings=[(.04,1),(.14,1.03),(.3,.85),(.52,.64),(.83,.59),(1.12,.43),(1.27,.05)]
        for (yy,r),(zz,q) in zip(rings,rings[1:]):
            if y<=zz:
                rr=r+(q-r)*(y-yy)/(zz-yy);break
        w=1+.09*math.sin(a*5)+.045*math.cos(a*7)
        return (math.cos(a)*(rr*w+.009),y,math.sin(a)*(rr*.7*w+.009))
    for y,a in [(1.08,1.95),(.98,2.3),(.32,2.3),(.25,1.05),(.13,1.5)]:
        v=[blobsurf(y,a)]+[blobsurf(y+math.sin(k*math.tau/20)*.035,a+math.cos(k*math.tau/20)*.14) for k in range(20)]
        mesh(m,v,[(0,k+1,(k+1)%20+1) for k in range(20)],'#96d7e2')
    return m
def sparkbug():
    m=make('Sparkbug',(0,.45,.71));yellow='#f2cc3c';dark='#292a25'
    ball(m,(0,.6,-.2),(.69,.43,.91),yellow)
    ball(m,(0,.44,.63),(.52,.34,.43),yellow,'head');eyes(m,.48,.97,.26,.15,'#252b29');smile(m,.28,1.02,.15,'#8a5828')
    line(m,[(0,1.02,-.98),(0,1.03,-.37),(0,.89,.35)],.019,dark)
    for s in [-1,1]:
        for z in [-.67,-.17,.3]:line(m,[(s*.52,.31,z),(s*.77,.15,z+.02),(s*.87,.05,z+.14)],.065,dark,'leftLeg' if s<0 else 'rightLeg')
        line(m,[(s*.24,.73,.81),(s*.39,1.03,.82),(s*.42,1.38,.73)],.021,dark,'head')
        # Clearly legible surface lightning motif.
        coords=[(s*.16,-.65),(s*.44,-.47),(s*.3,-.35),(s*.57,-.09),(s*.21,-.3),(s*.35,-.42)]
        v=[(x,.6+.43*math.sqrt(max(.01,1-(x/.69)**2-((z+.2)/.91)**2))+.009,z) for x,z in coords]
        mesh(m,v,[(0,1,2),(0,2,4),(2,3,4),(0,4,5)],dark)
    mesh(m,[(-.17,.72,.96),(.02,.75,.99),(-.06,.62,1.047),(.2,.64,1.006),(.01,.83,.94),(.07,.72,1)],[(0,1,2,3,4,5)],dark,'head')
    return m
def voltbeetle():
    m=make('Voltbeetle',(0,.55,.78));c='#273d50';light='#3d5870';yellow='#efd849'
    ball(m,(0,.68,-.26),(.83,.6,.99),c)
    for s in [-1,1]:ball(m,(s*.38,.83,-.31),(.4,.45,.89),light)
    line(m,[(0,1.24,-1.1),(0,1.26,-.28),(0,.98,.52)],.025,'#172735')
    ball(m,(0,.59,.69),(.5,.38,.49),c,'head');eyes(m,.71,1.07,.29,.14,'#ddc137')
    for s in [-1,1]:
        for z in [-.77,-.13,.47]:
            j='leftLeg' if s<0 else 'rightLeg'
            line(m,[(s*.58,.53,z),(s*.85,.32,z+.02),(s*1.02,.09,z+.24)],.12,c,j)
            for dx in [-.05,.05]:cone(m,(s*1.02+dx,.1,z+.23),(s*1.02+dx,.04,z+.4),.045,'#637987',j)
        line(m,[(s*.24,.42,.98),(s*.29,.33,1.22),(s*.14,.37,1.32)],.055,c,'head')
    # Flattened lightning-shaped rhinoceros horn, rising from the forehead.
    v=[(-.08,.79,.91),(.08,.79,.91),(.11,1.25,.98),(.24,1.2,.98),(.03,1.94,.86),(-.04,1.5,.94),(-.18,1.52,.94)]
    v += [(x,y,z-.09) for x,y,z in v]
    mesh(m,v,[tuple(range(7)),tuple(range(13,6,-1))]+[(i,(i+1)%7,(i+1)%7+7,i+7) for i in range(7)],yellow,'head',False)
    return m
def rock(m,p,s,c,j='body'):
    # Angular hand-cut stones avoid the smooth pebble look of the previous models.
    v=[];n=7
    for iy,(y,r) in enumerate([(-1,.65),(-.35,1),(.45,.91),(1,.45)]):
        for k in range(n):
            a=(k+iy*.18)*math.tau/n;v.append((p[0]+math.cos(a)*s[0]*r,p[1]+y*s[1],p[2]+math.sin(a)*s[2]*r))
    f=[(iy*n+k,iy*n+(k+1)%n,(iy+1)*n+(k+1)%n,(iy+1)*n+k) for iy in range(3) for k in range(n)]
    f+=[tuple(range(n-1,-1,-1)),tuple(3*n+k for k in range(n))]
    mesh(m,v,f,c,j,False)
def peblit():
    m=make('Peblit',(0,.72,.32));c='#666762'
    # The reference is a round pebble with a chipped crust and four tiny feet.
    ball(m,(0,.69,0),(.8,.71,.64),c)
    for s in [-1,1]:
        for z in [-.28,.28]:ball(m,(s*.51,.17,z),(.18,.24,.2),'#545650','leftLeg' if s<0 else 'rightLeg')
    beads(m,.75,.601,.29,.15,'#343c36')
    for path in [[(-.6,1.06,.34),(-.4,.96,.5),(-.47,.7,.55),(-.25,.52,.63),(-.2,.18,.51)],[(-.4,.96,.5),(-.1,1.1,.46),(.08,1.24,.32),(.38,1.21,.3)],[(-.47,.7,.55),(-.67,.65,.4)]]:decal(m,path,.032,'#ff9c3b')
    return m
def boulrock():
    m=make('Boulrock',(0,1.02,.59));c='#79786d';dark='#5b5c55'
    rock(m,(0,.89,0),(.83,.86,.65),c)
    for s in [-1,1]:
        j='leftLeg' if s<0 else 'rightLeg';rock(m,(s*.53,.24,.06),(.3,.26,.36),dark,j)
        j='leftArm' if s<0 else 'rightArm';rock(m,(s*.79,.57,.33),(.31,.42,.3),c,j);rock(m,(s*.9,.15,.51),(.34,.18,.39),c,j)
        cone(m,(s*.49,1.26,-.1),(s*.64,1.95,-.06),.2,dark)
    rock(m,(0,1.13,.56),(.47,.44,.19),c,'head');flateyes(m,1.23,.758,.23,.09,'#787c68')
    line(m,[(-.24,.91,.77),(0,.94,.79),(.25,.91,.77)],.025,dark,'head')
    for s in [-1,1]:line(m,[(s*.43,1.37,.51),(s*.17,1.4,.76),(s*.05,1.36,.78)],.065,c,'head')
    cracks=[[(-.66,1.25,.3),(-.4,1.46,.42),(-.05,1.42,.5),(.11,1.63,.25)],[(-.75,.85,.44),(-.47,.96,.63),(-.41,.65,.65),(-.09,.49,.69),(.14,.65,.67),(.43,.56,.56),(.6,.81,.47)],[(.1,.64,.68),(.15,1,.65),(.4,1.21,.5)],[(-.41,.65,.65),(-.65,.46,.42),(-.74,.15,.65)]]
    for p in cracks:decal(m,p,.035,'#ff9437')
    return m
def terramight():
    m=make('Terramight',(0,1.94,0));c='#323635';edge='#464b48'
    rock(m,(0,1.25,0),(.53,.57,.33),c)
    for s in [-1,1]:
        j='leftLeg' if s<0 else 'rightLeg'
        rock(m,(s*.3,.62,0),(.24,.32,.24),edge,j);rock(m,(s*.34,.24,.07),(.25,.27,.25),c,j);rock(m,(s*.34,.07,.2),(.31,.1,.4),c,j)
        j='leftArm' if s<0 else 'rightArm';rock(m,(s*.6,1.58,0),(.31,.34,.29),edge,j);rock(m,(s*.76,1.15,.03),(.25,.33,.25),c,j);rock(m,(s*.81,.76,.12),(.27,.29,.29),c,j)
        for y in [1.4,1.7]:cone(m,(s*.63,y,-.03),(s*.87,y+.43,-.1),.15,'#414642',j)
    rock(m,(0,1.96,.02),(.32,.34,.28),edge,'head')
    for s in [-1,1]:ball(m,(s*.14,1.99,.29),(.085,.035,.015),'#ff9a24','head')
    for s in [-1,1]:cone(m,(s*.2,2.11,-.04),(s*.31,2.5,-.1),.14,c,'head')
    ball(m,(0,1.34,.32),(.19,.22,.035),'#f57d20')
    for a in range(7):
        t=a*math.tau/7;decal(m,[(0,1.33,.36),(math.sin(t)*.22,1.34+math.cos(t)*.2,.35),(math.sin(t+.3)*.38,1.34+math.cos(t+.3)*.32,.28)],.045,'#fc8b27')
    for s in [-1,1]:decal(m,[(s*.32,.18,.31),(s*.25,.35,.27),(s*.34,.52,.21)],.025,'#d76823','leftLeg' if s<0 else 'rightLeg')
    return m
def frostling():
    m=make('Frostling',(0,.98,.05));c='#d2eef1';shade='#9fcfdc'
    profile(m,[(.21,.03,.02,0),(.43,.25,.16,0),(.65,.3,.23,0),(.88,.26,.24,.03)],c)
    ball(m,(0,1.1,.06),(.42,.42,.32),c,'head')
    profile(m,[(1.28,.26,.22,.05),(1.52,.16,.16,0),(1.72,.13,.1,-.11),(1.91,.025,.02,-.03)],c,'head')
    for s in [-1,1]:
        leaf(m,(s*.2,.73,.02),(s*.33,.3,.12),.1,c,'leftArm' if s<0 else 'rightArm')
        ball(m,(s*.19,1.09,.355),(.085,.12,.025),'#5895af','head')
        ball(m,(s*.19-.02,1.15,.38),(.022,.035,.009),'#e9faff','head')
        line(m,[(s*.1,1.27,.335),(s*.28,1.2,.325)],.017,'#7399a9','head')
    line(m,[(-.12,.87,.356),(0,.91,.383),(.12,.87,.356)],.017,'#7399a9','head')
    line(m,[(0,.34,0),(-.36,.25,-.03),(-.61,.52,-.08),(-.55,.75,-.12),(-.67,.91,-.1)],.075,shade,'tail')
    for x,y,z in [(-.27,1.08,.29),(.09,.6,.2),(-.22,.5,.13)]:
        for a in range(3):
            t=a*math.pi/3;line(m,[(x-math.cos(t)*.07,y-math.sin(t)*.09,z+.02),(x+math.cos(t)*.07,y+math.sin(t)*.09,z+.02)],.012,'#89c5d8','head' if y>1 else 'body')
    return m
def fly(n,big=False):
    m=make(n,(0,.72,.51));green='#83a93e' if not big else '#5f6b31';purple='#8c51a4' if not big else '#754489';dark='#344323'
    ball(m,(0,.64,-.35),(.48,.44,.66),green)
    if big:
        for k in range(5):line(m,[(-.41,.61,-.79+k*.2),(-.29,.89,-.8+k*.2),(0,1.02,-.8+k*.2),(.29,.89,-.8+k*.2),(.41,.61,-.79+k*.2)],.034,'#323e24')
    ball(m,(0,.73,.44),(.48,.42,.41),green,'head')
    for s in [-1,1]:
        ball(m,(s*.31,.79,.72),(.23,.32,.17),purple,'head')
        # Raised facet lenses in the compound eyes and hanging venom drops.
        for k in range(9):
            a=k*2.4;ball(m,(s*.31+math.cos(a)*.14,.79+math.sin(a)*.22,.865),(.032,.042,.02),'#a570b5' if not big else '#8b609f','head')
        line(m,[(s*.36,.59,.79),(s*.38,.4,.84),(s*.36,.26,.85)],.045,purple,'head')
        ball(m,(s*.36,.25,.85),(.055,.08,.05),purple,'head')
        for k in range(3):
            j='leftLeg' if s<0 else 'rightLeg'
            z=-.5+k*.4
            line(m,[(s*.3,.55,z),(s*.65,.3,z+.06),(s*.82,.03,z+.14)],.035,dark,j)
            if big:
                for dy in [.12,.23]:cone(m,(s*(.82-dy*.6),dy,z+.1),(s*(.94-dy*.6),dy+.07,z+.08),.026,dark,j)
        j='leftWing' if s<0 else 'rightWing'
        # Thin asymmetric pointed wings with iridescent bands and branching veins.
        outline=[(s*.22,.95,-.1),(s*.5,1.5,-.2),(s*1.12,1.96,-.36),(s*1.36,1.79,-.39),(s*1.2,1.37,-.31),(s*.75,1.04,-.2)]
        if big:
            v=outline[:4]+[(s*1.22,1.54,-.34),(s*1.09,1.58,-.32),(s*1.08,1.38,-.3),(s*.93,1.4,-.28),(s*.87,1.16,-.25),outline[-1]]
            mesh(m,[(s*.77,1.43,-.26)]+v,[(0,k+1,(k+1)%len(v)+1) for k in range(len(v))],'#9ba968',j)
        else:
            ring=[]
            for q in range(len(outline)):
                p0=outline[(q-1)%len(outline)];p1=outline[q];p2=outline[(q+1)%len(outline)];p3=outline[(q+2)%len(outline)]
                for h in range(5):
                    t=h/5
                    ring.append(tuple(.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t) for k in range(3)))
            v=[(s*.79,1.44,-.28)]+ring
            palette=['#91bbb1','#a5b8c1','#b2acd0','#a8c88b','#9cc4b3']
            for k in range(len(ring)):mesh(m,[v[0],v[k+1],v[(k+1)%len(ring)+1]],[(0,1,2)],palette[(k//6)%5],j)
        for k in range(3):
            start=(s*(.33+k*.22),1.08+k*.2,-.21)
            end=(s*(.82+k*.18),1.18+k*.23,-.29)
            line(m,[start,end],.013,'#638e80' if not big else '#596a39',j)
        line(m,[(s*.22,.96,-.11),(s*.65,1.32,-.24),(s*1.23,1.84,-.38)],.017,'#5f766e',j)
        if big:
            for k in range(3):line(m,[(s*(.8+k*.16),1.16+k*.12,-.24),(s*(.84+k*.17),.95+k*.13,-.24)],.025,green,j)
    for k in range(24 if big else 18):
        a=k*2.4;x=math.sin(a)*.37;y=.7+math.cos(a)*.29;z=-.75+(k%6)*.2
        ball(m,(x,y,z),(.045,.05,.045),'#a4b759' if not big else '#899042')
        if k%3==0:cone(m,(x,y,z),(x*1.13,y+.13,z-.03),.018,dark)
    for s in [-1,1]:cone(m,(s*.12,.48,.72),(s*.16,.31,.87),.055,'#596331','head')
    return m
def mushroom(n,big=False):
    m=make(n,(0,.63,.16));stem='#d9c89b' if not big else '#bba76a';cap='#b74747' if not big else '#925197'
    capheight=lambda y: y if big else .83+(y-.99)*.97/.81
    profile(m,[(.12,.2,.18,0),(.18,.34,.28,0),(.29,.41,.31,0),(.45,.4,.3,0),(.65,.34,.27,0),(.94,.26,.24,0),(1.11,.3,.27,0)],stem)
    # Shaped, overhanging bell cap with a separate shadowed gill underside.
    profile(m,[(capheight(y),x,z,0) for y,x,z in [(.99,.22,.2),(.99,.91,.76),(1.09,1,.83),(1.25,.88,.7304),(1.4,.75,.6225),(1.57,.55,.4565),(1.73,.3,.249),(1.78,.14,.1162),(1.8,.015,.01245)]],cap,'head')
    profile(m,[(capheight(y),x,z,0) for y,x,z in [(.97,.24,.21),(.985,.91,.76),(1.05,.94,.78)]],'#766749' if big else '#795544','head')
    for k in range(22):
        a=k*math.tau/22
        line(m,[(math.cos(a)*.28,capheight(.966),math.sin(a)*.24),(math.cos(a)*.87,capheight(.99),math.sin(a)*.72)],.01,'#b99a60' if big else '#ae8872','head')
    if big: eyes(m,.69,.291,.18,.11,'#28241c')
    else: beads(m,.57,.268,.17,.105,'#28241c')
    if big:smile(m,.45,.32,.12,'#5b382a')
    for s in [-1,1]:
        j='leftLeg' if s<0 else 'rightLeg';line(m,[(s*.2,.21,.02),(s*.31,.08,.18)],.085,'#5c7b36' if big else stem,j);ball(m,(s*.34,.065,.23),(.19,.07,.2),'#5c7b36' if big else stem,j)
    # Cap spots sit on the actual dome surface with flattened, readable patches.
    def cap_y(r):
        points=[(0,1.8),(.14,1.78),(.3,1.73),(.55,1.57),(.75,1.4),(.88,1.25),(1,1.09)]
        for (a,y),(b,z) in zip(points,points[1:]):
            if r<=b:return capheight(y+(z-y)*(r-a)/(b-a))
        return capheight(1.09)
    for k in range(10):
        a=k*2.4;r=.28+(k%3)*.24;x=math.cos(a)*r;z=math.sin(a)*r*.83
        v=[(x,cap_y(r)+.009,z)]
        for q in range(20):
            t=q*math.tau/20;xx=x+math.cos(t)*(.1+(k%3)*.018);zz=z+math.sin(t)*(.075+(k%2)*.015)
            v.append((xx,cap_y(math.sqrt(xx*xx+(zz/.83)**2))+.009,zz))
        mesh(m,v,[(0,q+1,(q+1)%20+1) for q in range(20)],'#e9e5c9' if not big else '#b777b1','head')
    if big:
        for s in [-1,1]:
            j='leftArm' if s<0 else 'rightArm';line(m,[(s*.32,.64,0),(s*.55,.46,.07)],.09,'#527333',j);ball(m,(s*.57,.43,.12),(.16,.15,.13),'#4e7135',j)
            for y,x in [(.63,.58),(.85,.49)]:
                line(m,[(s*x,y-.1,.11),(s*x,y+.13,.11)],.035,stem)
                ball(m,(s*x,y+.12,.11),(.16,.075,.14),'#b58a55')
        for x,y in [(-.2,.33),(.29,.47)]:
            line(m,[(x,y,.29),(x,y+.12,.3)],.028,stem);ball(m,(x,y+.13,.3),(.12,.07,.09),'#b68c55')
        for k in range(14):
            a=k*2.4;ball(m,(math.sin(a)*(1.03+(k%3)*.05),.42+(k%6)*.25,math.cos(a)*.3),(.025,.025,.025),'#beda80')
    return m

BUILDERS=[pipereef,reedmollusk,nibbkit,purlarcen,twigglo,brambright,solbriar,mitelet,caraphex,lambda:bird('Cindlark'),lambda:bird('Pyrocor',True),noxling,ferrimaw,niblet,gnawer,puddlop,sparkbug,voltbeetle,peblit,boulrock,terramight,frostling,lambda:fly('Venomite'),lambda:fly('Plaguewing',True),lambda:mushroom('Shroombud'),lambda:mushroom('Fungrowth',True)]
BUILDER_NAMES=['Pipereef','Reedmollusk','Nibbkit','Purlarcen','Twigglo','Brambright','Solbriar','Mitelet','Caraphex','Cindlark','Pyrocor','Noxling','Ferrimaw','Niblet','Gnawer','Puddlop','Sparkbug','Voltbeetle','Peblit','Boulrock','Terramight','Frostling','Venomite','Plaguewing','Shroombud','Fungrowth']
if __name__=='__main__':
    selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    for species,build in zip(BUILDER_NAMES,BUILDERS):
        if selected and species.lower() not in [s.lower() for s in selected]:continue
        m=build()
        m.export(render=True)
