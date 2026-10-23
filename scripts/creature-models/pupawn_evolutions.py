"""Individually authored reference-led sculptures for Pupawn's evolutions.

The elemental forms share modeling tools, not a completed wolf mesh. Each
builder specifies its own silhouette, stance, mane, tail and surface details.
Ferronyx remains in its separate living-steel sculpture module.
"""
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mathutils import Vector
from pupawn_anatomy import anatomy, loft, lock, line, shell, paint, collar, plume_tail, claws, halo, curve


def flame_lobe(m,name,points,width,*,joint='body',normal=(1,0,0),depth=.09):
    """A full flame tongue, with nested gold/orange insets on both faces."""
    nn=Vector(normal).normalized()
    pp=[Vector(p) for p in points]
    direction=(pp[-1]-pp[0]).normalized();bend=direction.cross(nn).normalized()
    knots=[pp[0],pp[0].lerp(pp[1],.55)+bend*width*.25,pp[1],
           pp[1].lerp(pp[-1],.57)-bend*width*.48,pp[-1]]
    radii=[(width*.45,depth*.6),(width*.90,depth*.85),(width,depth),
           (width*.39,depth*.5),(.001,.001)]
    loft(m,name,[tuple(p) for p in knots],radii,'#ed4510',joint,normal,steps=5,sides=16)
    spine=curve(knots,5);sizes=[]
    for a,b in zip(radii,radii[1:]):
        for k in range(5):
            t=k/5;sizes.append((a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t))
    sizes.append(radii[-1])
    # These are curved surface inlays on the actual flame ellipsoid, rather
    # than separate colored tongues hovering outside the silhouette.
    for side in (-1,1):
        for scale,color,offset in [(.80,'#ff8b19',.0015),(.37,'#ffda4d',.003)]:
            verts=[];faces=[]
            for i,(p,(w,d)) in enumerate(zip(spine,sizes)):
                tangent=(spine[min(i+1,len(spine)-1)]-spine[max(i-1,0)]).normalized()
                u=tangent.cross(nn).normalized();n=u.cross(tangent).normalized()
                for k in range(5):
                    angle=(k/4-.5)*2*math.asin(scale)
                    verts.append(tuple(p+u*math.sin(angle)*w+n*side*(math.cos(angle)*d+offset)))
            for i in range(len(spine)-1):
                for k in range(4):
                    a=i*5+k;faces.append((a,a+1,a+6,a+5))
            m.mesh(name+' curved incandescent core',verts,faces,color,joint)


def side_glyph(m,name,s,y,z,scale,color,joint='body',kind=0):
    paths=[[(0,-.09),(.10,-.03),(.11,.06),(.05,.10),(-.02,.06),(.01,.01),(.05,.03)],
           [(-.13,-.07),(-.02,-.02),(.06,.08),(.13,.04),(.10,-.04)],
           [(-.13,0),(-.03,.07),(.08,0),(-.03,-.07),(-.13,0)],
           [(-.15,-.05),(-.08,.02),(.03,.01),(.13,.08)]]
    points=[(y+a*scale,z+b*scale) for a,b in paths[kind%4]]
    paint(m,name,points,.018*scale,color,joint,side=s)


def leg_marks(m,s,colors,*,veins=False):
    for front in (True,False):
        j=('left' if s<0 else 'right')+('Arm' if front else 'Leg')
        z=m.front_z if front else m.rear_z
        pts=[(.93,z+.04),(.77,z+.09),(.63,z+.04),(.46,z+.01),(.28,z+.10)]
        if not front:pts=[(.87,z+.07),(.70,z+.15),(.56,z+.16),(.42,z-.03),(.27,z-.08)]
        paint(m,'Flowing limb vein' if veins else 'Painted limb glyph',pts,.022,colors[0],j,s)
        if veins:
            paint(m,'Branch of luminous limb vein',[(.72,z+.10),(.61,z+.22),(.52,z+.22)],.012,colors[-1],j,s)


def ignisrael():
    m=anatomy('Ignisrael','#302a27','#564033','#f9be35',head_y=1.97,body_y=1.18,
              width=.29,leg_x=.32,ear_height=.52,ear_width=.125,muzzle=.40)
    collar(m,['#342b27','#423026'],rows=2,fullness=.83)
    # The high crown and flowing nape are a connected volume of flame tongues.
    for s in (-1,1):
        for k in range(3):
            y=1.29+k*.25;z=.37-k*.13
            flame_lobe(m,'Large swept nape flame',[(s*.19,y,z),(s*.30,y+.37,z-.10),
                       (s*.25,y+.72,z-.47-k*.035)],.29-k*.020,normal=(s,0,.1))
        for k in range(3):
            flame_lobe(m,'Burning chest fringe',[(s*.18,1.23+k*.17,.63),
                       (s*.29,1.50+k*.17,.72),(s*.39,1.72+k*.15,.68)],.135,
                       normal=(s*.5,0,1),depth=.065)
        for k in range(3):
            z=.35-k*.30
            paint(m,'Branched glowing body fissure',[(1.35,z),(1.21,z-.035),(1.12,z+.025),(.98,z-.03)],
                  .024,'#ed711b',side=s)
            paint(m,'Small fissure branch',[(1.21,z-.035),(1.17,z+.07),(1.11,z+.10)],.014,'#ffd14e',side=s)
        # Red stocking fur covers the paws, then breaks into tongues up the shins.
        for front in (True,False):
            j=('left' if s<0 else 'right')+('Arm' if front else 'Leg')
            x,y,z=m.feet[j]
            loft(m,'Crimson paw stocking',[(x,.07,z-.09),(x,.22,z-.15),(x,.37,z-.18)],
                 [(.15,.16),(.105,.105),(.07,.07)],'#a52d1c',j)
            for k in range(3):
                lock(m,'Rising ember stocking tip',(x+(k-1)*.055,.23,z-.09),
                     (x+(k-1)*.07,.40,z-.12),(x+(k-1)*.09,.62-abs(k-1)*.09,z-.16),
                     .045,'#bc371a',j,normal=(0,0,1))
    flame_lobe(m,'Central forehead inferno',[(0,2.02,.79),(0,2.46,.68),
               (0,2.95,.37)],.27,joint='head',normal=(0,0,1),depth=.10)
    flame_lobe(m,'Split crown fire',[(.03,2.17,.67),(.12,2.52,.49),
               (.16,2.77,.63)],.16,joint='head',normal=(0,0,1),depth=.08)
    # Long solid obsidian horns have angular highlights rather than round tubes.
    for s in (-1,1):
        loft(m,'Tapered swept obsidian horn',[(s*.17,2.08,.75),(s*.24,2.38,.56),
             (s*.22,2.72,.37)],[(.115,.075),(.09,.055),(.001,.001)],'#211e1d','head',
             normal=(0,0,1),sides=6,steps=4,smooth=False)
    plume_tail(m,[(0,1.12,-.68),(0,1.32,-1.01),(-.04,1.65,-1.20),(-.02,1.93,-1.14)],
               '#a32d17',width=.21,feathers=3)
    for k in range(4):
        flame_lobe(m,'Living tail flame',[(k*.035-.05,1.35,-1.05),
                   (k*.035-.05,1.72+k*.09,-1.22),(k*.035-.05,2.10+k*.09,-1.12+k*.06)],
                   .17-k*.012,joint='tail',normal=(1,0,0),depth=.07)
    for joint in m.feet:
        for obj in m.groups[joint].children:
            if obj.type!='MESH':continue
            obj.data.materials.append(m.material('#a52d1c'));index=len(obj.data.materials)-1
            for p in obj.data.polygons:
                if (obj.matrix_world@p.center).z<.20:p.material_index=index
    claws(m,'#242422',length=.13,size=.047)
    return m


def torrentis():
    m=anatomy('Torrentis','#197ca7','#339fbd','#e6f4db',head_y=1.76,body_y=1.03,
              width=.29,leg_x=.30,ear_height=.47,muzzle=.40)
    # A single broad curled wave, with real thickness and overlapping crest tips.
    yz=[(1.06,.70),(1.35,.95),(1.77,.85),(2.12,.63),(2.75,.59),
        (2.54,.25),(2.94,.12),(2.81,-.25),(2.65,-.43),(2.65,-.13),
        (2.52,-.12),(2.53,-.52),(2.38,-.85),(2.38,-.43),
        (2.19,-.41),(2.16,-.92),(1.94,-.64),(1.80,-.44),(1.45,.17)]
    for s in (-1,1):
        # Rounded wave scallops keep the broad fin from reading as an armor slab.
        outline=[Vector((s*.12,1.55+(y-1.55)*.82 if y>1.55 else y,z)) for y,z in yz]
        rounded=[]
        for i in range(len(outline)):
            a,b,c,d=[outline[j%len(outline)] for j in (i-1,i,i+1,i+2)]
            for k in range(6):
                t=k/6;rounded.append(tuple(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
        shell(m,'Continuous swept wave mane',rounded,(s,0,0),
              '#65c3da',thickness=.12,bevel=.018)
        for k in range(5):
            lock(m,'Layered pale wave crest',(s*.15,1.22+k*.12,.55-k*.09),
                 (s*.16,1.88+k*.15,.48-k*.20),(s*.16,2.31+k*.11,.38-k*.27),
                 .16,'#b5eaf0',normal=(s,0,0),depth=.012)
        for k in range(3):
            lock(m,'Long flowing throat fin',(s*(.08+k*.075),1.67-k*.07,.73-k*.03),
                 (s*(.15+k*.08),1.34-k*.03,.89-k*.04),
                 (s*(.02+k*.06),.97-k*.06,.76-k*.03),
                 .16,'#88d8e5' if k%2 else '#b5eaf0',normal=(s*.4,0,1),depth=.045)
        # A tidy fish-scale pattern follows the actual curved foreleg surface.
        j='leftArm' if s<0 else 'rightArm'
        for row in range(4):
            y=.77-row*.10;z=m.front_z+.04+row*.02
            paint(m,'Overlapping shin scale',[(y+.06,z-.06),(y-.015,z),(y+.055,z+.07)],
                  .013,'#55b4cd',j,s)
    plume_tail(m,[(0,1.0,-.67),(0,1.17,-1.06),(0,1.67,-1.26),(0,2.00,-1.10)],
               '#2589af',width=.25,feathers=6,accent='#75ccde')
    for s in (-1,1):
        m.skin['tail']=[o for o in m.groups['tail'].children if o.type=='MESH']
        paint(m,'Fitted tail wave interior',[(1.23,-1.09),(1.48,-1.20),
              (1.72,-1.22),(1.90,-1.13)],.17,'#8bdde8','tail',s)
    return m


def verdama():
    m=anatomy('Verdama','#2f602a','#557f31','#edcb63',head_y=1.79,body_y=1.04,
              width=.33,ear_height=.46,ear_width=.145)
    collar(m,lambda x,r,k:'#456f2c' if k%3 else '#557f31',rows=4,fullness=1.13)
    for s in (-1,1):
        for row in range(3):
            for k in range(6):
                z=.39-k*.20;y=1.27-row*.14
                lock(m,'Overlapping moss-green leafy coat',(s*(.24+row*.015),y,z),
                     (s*(.34+row*.02),y-.10,z-.08),(s*(.40+row*.02),y-.30,z-.20),
                     .10,'#386b2b' if (k+row)%2 else '#47772d',normal=(s,0,0),depth=.03)
        # Living vines wrap the shoulders and trail down the chest.
        vine=[(s*.22,1.31,-.61),(s*.27,1.40,-.20),(s*.30,1.46,.20),
              (s*.38,1.32,.52),(s*.34,1.02,.70)]
        line(m,'Growing shoulder vine',vine,.018,'#769242')
        for k in range(7):
            p=Vector((s*.27,1.35+k*.025,-.58+k*.13))
            end=p+Vector((s*(.14 if k%2 else -.06),.28,-.12))
            lock(m,'Veined living leaf',tuple(p),tuple(p.lerp(end,.50)),tuple(end),.075,
                 '#70983a',normal=(s,0,.2),depth=.015)
            line(m,'Leaf midrib',[tuple(p),tuple(end)],.004,'#a9ba59')
        for k in range(3):
            p=(s*.18,1.72+k*.14,.36-k*.17)
            lock(m,'Upright leafy nape shoot',p,(s*.20,1.90+k*.14,.31-k*.17),
                 (s*.26,2.12+k*.14,.24-k*.17),.08,'#3e762d',normal=(s,0,0),depth=.02)
        for p in [(s*.40,1.43,.34),(s*.40,1.25,-.12),(s*.34,1.39,-.53),(s*.34,1.02,.71)]:
            flower(m,p,normal=(s,.1,.35))
    plume_tail(m,[(0,1.01,-.68),(0,1.16,-1.07),(0,1.61,-1.26),(0,1.95,-1.07)],
               '#2c6029',width=.25,feathers=12,accent='#4b7b2d')
    for s in (-1,1):flower(m,(s*.19,1.58,-1.23),normal=(s,0,.2),joint='tail',size=.066)
    return m


def flower(m,position,normal=(0,0,1),joint='body',size=.075):
    p=Vector(position);nn=Vector(normal).normalized();u=nn.cross(Vector((0,1,0))).normalized();v=nn.cross(u)
    for k in range(5):
        a=k*math.tau/5;d=u*math.cos(a)+v*math.sin(a)
        lock(m,'Five-point luminous flower petal',tuple(p),tuple(p+d*size*.63+nn*.012),
             tuple(p+d*size*1.35),size*.43,'#ffd75e',joint,tuple(nn),depth=.014)
    m.ellipsoid('Golden flower heart',tuple(p+nn*.018),(size*.29,)*3,'#fff2a4',joint,12,8)


def runaris():
    m=anatomy('Runaris','#818a91','#adb5b6','#ffe18c',head_y=1.81,body_y=1.08,
              width=.275,ear_height=.44,ear_width=.13)
    collar(m,['#939da3','#b3b8b7','#7b868f'],rows=3,fullness=.93)
    colors=['#80daf0','#f7ba75','#d5ed94','#a3e8d7','#f4df8e']
    m.skin['body']=[o for o in m.groups['body'].children if o.type=='MESH']
    for k in range(7):
        x=(k-3)*.068
        paint(m,'Flowing luminous breast rune',[(x,1.57),(x+.03,1.45),(x-.015,1.32),
              (x+.018,1.18),(x,1.07)],.014,colors[k%5],front=True)
    for s in (-1,1):
        for k in range(7):
            z=.43-k*.17;y=1.20+(k%2)*.07
            side_glyph(m,'Multicolored flank rune',s,y,z,.8,colors[k%5],kind=k)
        for front in (True,False):
            j=('left' if s<0 else 'right')+('Arm' if front else 'Leg')
            z=m.front_z if front else m.rear_z
            for row in range(3):
                side_glyph(m,'Etched leg rune',s,.84-row*.19,z+.05,.65,colors[(row+1)%5],j,kind=row)
        for k in range(3):
            paint(m,'Luminous cheek stroke',[(s*.12,1.86-k*.035),(s*.21,1.85-k*.05),
                  (s*.26,1.80-k*.05)],.013,colors[k],'head',front=True)
        for k in range(3):
            lock(m,'Silver back sweep',(s*.18,1.41,.18-k*.24),(s*.27,1.45,-.07-k*.24),
                 (s*.33,1.49,-.32-k*.24),.09,'#919ba3',normal=(s,1,0),depth=.025)
    plume_tail(m,[(0,1.04,-.67),(0,1.21,-1.07),(0,1.77,-1.28),(0,2.14,-1.05)],
               '#8e989e',width=.26,feathers=10,accent='#afb7ba')
    # Painted tail swirls are projected onto the tail itself, never floating rods.
    m.skin['tail']=[o for o in m.groups['tail'].children if o.type=='MESH']
    for s in (-1,1):
        for k in range(3):side_glyph(m,'Tail runic spiral',s,1.42+k*.16,-1.16,.65,colors[k],'tail',kind=k)
    paint(m,'Forehead spiral',[(0,2.015),(-.055,2.04),(-.09,2.00),(-.045,1.965),
          (.015,1.97),(.045,1.93),(0,1.90)],.019,'#ffcb80','head',front=True)
    glow(m,colors+['#ffcb80'],.22)
    return m


def noctyros():
    m=anatomy('Noctyros','#30323c','#41424e','#c096fa',head_y=1.69,body_y=1.00,
              width=.32,ear_height=.52,ear_width=.145,muzzle=.37)
    collar(m,['#30323c','#393a46','#282b35'],rows=3,fullness=1.08)
    for s in (-1,1):
        for k in range(4):
            z=.36-k*.26
            paint(m,'Broad shadow-striped coat',[(1.35,z+.03),(1.21,z-.02),(1.06,z+.07),(.92,z+.14)],
                  .085,'#181e2b',side=s)
        for front in (True,False):
            joint=('left' if s<0 else 'right')+('Arm' if front else 'Leg')
            z=m.front_z if front else m.rear_z
            for k in range(3):
                y=.83-k*.18
                paint(m,'Shadow-striped leg',[(y+.07,z-.08),(y,z+.02),(y-.02,z+.13)],
                      .055,'#191e2a',joint,s)
        for k in range(5):
            lock(m,'High swept shadow nape',(s*.10,1.46+k*.07,.44-k*.11),
                 (s*.21,1.68+k*.025,.20-k*.12),(s*.19,1.84+k*.02,-.10-k*.10),
                 .10,'#333540' if k%2 else '#282c36',normal=(s,0,0),depth=.04)
        # A jagged closed snarl exposes a row of dark, close-set teeth.
        shell(m,'Jagged snarling mouth corner',[(s*.16,1.51,1.12),(s*.135,1.44,1.33),
              (s*.09,1.39,1.40),(s*.13,1.43,1.18)],(s,0,.1),'#111b24','head',.012)
        for k in range(4):
            loft(m,'Visible shadow fang',[(s*(.145-k*.01),1.49-k*.018,1.15+k*.06),
                 (s*(.14-k*.01),1.41-k*.012,1.16+k*.06)],[.025,.001],
                 '#71818c','head',sides=6,steps=2,smooth=False)
    plume_tail(m,[(0,1.00,-.67),(0,1.14,-1.04),(0,1.60,-1.20),(0,1.88,-1.02)],
               '#2b2e38',width=.25,feathers=9,accent='#41424b')
    claws(m,'#252935',length=.11,size=.037)
    return m


def solarune():
    m=anatomy('Solarune','#e9be4f','#fff0a8','#ffe14b',head_y=1.86,body_y=1.08,
              width=.31,ear_height=.47,ear_width=.14)
    collar(m,lambda x,r,k:['#fff2b6','#f4da87','#ffe9a0'][(r+k)%3],rows=4,fullness=1.22)
    for s in (-1,1):
        for k in range(3):
            lock(m,'Long ivory-gold breast lock',(s*(.04+k*.075),1.68,.78-k*.025),
                 (s*(.11+k*.075),1.33,.94-k*.02),(s*(.03+k*.075),.87+k*.08,.73),.15-k*.012,
                 '#fff3b6' if k%2 else '#f3da8e',normal=(s*.3,0,1),depth=.045)
        for k in range(5):
            lock(m,'Golden feathered back coat',(s*.19,1.35,.30-k*.22),
                 (s*.27,1.32,.12-k*.22),(s*.33,1.29,-.09-k*.22),
                 .095,'#f1cc65',normal=(s,1,0),depth=.03)
    plume_tail(m,[(0,1.05,-.67),(0,1.25,-1.09),(0,1.86,-1.30),(0,2.24,-1.06)],
               '#f6d56c',width=.31,feathers=11,accent='#fff1ad')
    m.skin['tail']=[o for o in m.groups['tail'].children if o.type=='MESH']
    for s in (-1,1):
        paint(m,'Fitted sunlight through tail',[(1.29,-1.10),(1.60,-1.23),
              (1.88,-1.22),(2.12,-1.13)],.18,'#fff2ac','tail',s)
    halo(m,'#fff5a4',2.62,radius=.29)
    glow(m,['#ffe14b','#fffbd0','#fff5a4'],.40)
    return m


def stone(m,name,points,normal,color='#a88b58',joint='body',depth=.09,ridge=.05):
    pp=[Vector(p) for p in points];nn=Vector(normal).normalized();n=len(pp)
    center=sum(pp,Vector())/n+nn*ridge
    verts=pp+[p-nn*depth for p in pp]+[center]
    faces=[(i,(i+1)%n,2*n) for i in range(n)]+[tuple(range(2*n-1,n-1,-1))]
    faces += [(i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n)]
    obj=m.mesh(name,[tuple(p) for p in verts],faces,color,joint,smooth=False)
    m.skin[joint].append(obj)
    return obj


def gravulor():
    m=anatomy('Gravulor','#80613d','#a68a57','#ed9d38',head_y=1.72,body_y=1.11,
              width=.43,leg_x=.39,length=.79,heavy=True,ear_width=.16,
              ear_height=.44,muzzle=.44)
    for s in (-1,1):
        for k in range(5):
            z=.46-k*.27;y=1.76-k*.055
            stone(m,'Thick interlocking rock mantle',[(s*.03,y+.26,z+.12),(s*.27,y+.32,z+.18),
                  (s*.57,y+.10,z-.12),(s*.44,y-.13,z-.27),(s*.12,y-.09,z-.14)],
                  (s*.5,1,0),'#ad915f' if k%2 else '#9a7b4d',depth=.16,ridge=.09)
        for k in range(3):
            y=1.49-k*.19
            stone(m,'Overlapping rock shoulder mantle',[(s*.34,y+.12,.56),(s*.51,y+.08,.32),
                  (s*.64,y-.02,.14),(s*.50,y-.16,.34),(s*.35,y-.13,.67)],
                  (s,0,.2),'#a28755' if k%2 else '#987b4e',ridge=.07)
        for row in range(3):
            y=1.56-row*.17
            stone(m,'Serrated sandstone throat plate',[(s*.02,y+.09,.81),(s*.24,y+.11,.74),
                  (s*.39,y-.03,.58),(s*.27,y-.24,.69),(s*.04,y-.19,.84)],
                  (s*.3,0,1),'#9f8050',ridge=.04)
        stone(m,'Swept rock brow',[(s*.03,1.98,.92),(s*.18,2.08,.70),(s*.34,1.93,.83),
              (s*.30,1.83,1.10),(s*.11,1.80,1.18)],(s*.3,.4,1),'#b29867','head',ridge=.06)
        stone(m,'Angular rock cheek',[(s*.22,1.79,.99),(s*.35,1.82,.75),
              (s*.48,1.71,.65),(s*.35,1.56,.89)],(s,0,.2),'#9b7e51','head',ridge=.035)
        joint='leftArm' if s<0 else 'rightArm'
        x,y,z=m.feet[joint]
        for row in range(3):
            yy=.25+row*.17
            loft(m,'Hexagonal stone foreleg cuff',[(x,yy,z-.16),(x,yy+.13,z-.17)],
                 [(.205-row*.006,.17),(.185-row*.006,.15)],'#a08759',joint,
                 sides=7,steps=1,smooth=False)
        for joint in [('leftArm' if s<0 else 'rightArm'),('leftLeg' if s<0 else 'rightLeg')]:
            z=m.front_z if joint.endswith('Arm') else m.rear_z
            for k in range(3):
                yy=.72+k*.13
                paint(m,'Hairline weathered stone crack',[(yy+.06,z-.12),(yy,z-.06),
                      (yy+.015,z+.02),(yy-.05,z+.10)],.009,'#59472f',joint,s)
        for k in range(4):
            z=.36-k*.28
            paint(m,'Fracture through rock armor',[(1.61,z),(1.51,z-.05),(1.47,z+.04),
                  (1.36,z+.08)],.009,'#625137',side=s)
    plume_tail(m,[(0,1.06,-.76),(0,1.19,-1.13),(0,1.72,-1.34),(0,2.03,-1.10)],
               '#8f7046',width=.29,feathers=5,accent='#a18453')
    for joint,(x,y,z) in m.feet.items():
        for k in (-1,0,1):
            xx=x+k*.105
            loft(m,'Long faceted amber crystal talon',[(xx,.17,z+.04),(xx,.15,z+.22),(xx,.035,z+.39)],
                 [(.09,.085),(.067,.07),(.001,.001)],'#c7924f',joint,sides=5,steps=2,smooth=False)
            line(m,'Crystal longitudinal face',[(xx-.03,.20,z+.10),(xx,.10,z+.33)],.006,'#f1bf72',joint)
    return m


def smoke(m,name,points,width,color='#a2bfc8',joint='body',normal=(1,0,0)):
    sizes=[(width*.65,width*.27)]
    sizes += [(width*(1-.60*i/(len(points)-1)),width*.24) for i in range(1,len(points)-1)]
    sizes += [(.001,.001)]
    return loft(m,name,points,sizes,color,joint,normal,sides=10,steps=5)


def wraithound():
    m=anatomy('Wraithound','#839faa','#adc8ce','#e4ffff',head_y=1.79,body_y=1.06,
              width=.265,ear_height=.47,ear_width=.115,muzzle=.37)
    collar(m,['#91aeb8','#a3bdc5','#7998a5'],rows=2,fullness=.93)
    for s in (-1,1):
        for k in range(6):
            z=.46-k*.23;y=1.34+(k%2)*.08
            smoke(m,'S-shaped rising shoulder vapor',[(s*.24,y,z),(s*.40,y+.24,z-.08),
                  (s*.34,y+.46,z-.18),(s*.48,y+.65,z-.25),(s*.39,y+.81,z-.31)],
                  .10,'#abc8ce',normal=(s,0,0))
        for k in range(3):
            y=1.66-k*.22
            smoke(m,'Dissolving chest vapor',[(s*.23,y,.72),(s*.32,y-.17,.82),
                  (s*.27,y-.36,.88),(s*.38,y-.53,.81)],.095,'#adc8ce',normal=(s,0,1))
        for k in range(4):
            z=.35-k*.27
            paint(m,'Flowing pale ghost body contour',[(1.29,z),(1.15,z-.07),(1.00,z+.025),(.90,z-.04)],
                  .046,'#a3c0c9',side=s)
        for joint in [('leftArm' if s<0 else 'rightArm'),('leftLeg' if s<0 else 'rightLeg')]:
            x,y,z=m.feet[joint]
            smoke(m,'Leg dissolving into wisps',[(x,.49,z-.09),(x+s*.13,.42,z-.21),
                  (x+s*.16,.62,z-.31),(x+s*.26,.79,z-.27)],.06,'#a3c0c9',joint)
    smoke(m,'Long curling smoke tail',[(0,1.03,-.70),(0,1.14,-1.13),(0,1.52,-1.30),
          (0,1.79,-1.09),(0,2.03,-1.22)],.21,'#91b0bc','tail')
    for k in range(3):
        smoke(m,'Splitting tail vapor',[(0,1.18+k*.17,-1.04),(0,1.38+k*.17,-1.40),
              (0,1.65+k*.17,-1.49),(0,1.80+k*.17,-1.34)],.12,'#abc8ce','tail')
    # Alpha is exported into both GLB and the game material batches.
    for color in ['#839faa','#91aeb8','#a3bdc5','#7998a5','#abc8ce','#adc8ce','#a3c0c9','#91b0bc']:
        alpha(m,color,.82 if color=='#839faa' else .72)
    glow(m,['#e4ffff'],.55)
    return m


def glow(m,colors,strength=.3):
    for color in colors:
        mat=m.material(color);shader=mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Emission Color'].default_value=shader.inputs['Base Color'].default_value
        shader.inputs['Emission Strength'].default_value=strength


def alpha(m,color,value):
    mat=m.material(color);mat.diffuse_color=(*mat.diffuse_color[:3],value)
    mat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=value
    mat.surface_render_method='DITHERED'


def tempestral():
    m=anatomy('Tempestral','#577e9c','#a8c5d6','#7ceefa',head_y=1.64,body_y=1.02,
              width=.265,leg_x=.30,crouch=True,ear_height=.48,muzzle=.36)
    collar(m,['#7b9fb8','#a3bdcf','#638ba7'],rows=3,fullness=1.03,flow='back')
    for s in (-1,1):
        j='leftWing' if s<0 else 'rightWing';m.joint(j,(s*.20,1.31,.04))
        loft(m,'Cloud wing leading arch',[(s*.20,1.30,.04),(s*.57,1.63,-.40),
             (s*.94,2.01,-.94)],[(.17,.12),(.24,.13),(.09,.06)],'#c3dce7',j,
             normal=(s*.2,0,1),steps=5)
        for k in range(7):
            end=(s*(.87+k*.11),2.20+k*.035,-1.63+k*.155)
            lock(m,'Long recurved vapor flight feather',(s*.27,1.35,.02-k*.045),
                 (s*(.66+k*.075),1.85+k*.015,-.62-k*.07),end,
                 .22-k*.009,'#d8edf2' if k%2 else '#bfd9e6',j,
                 normal=(s*.25,0,1),depth=.085)
        for k in range(5):
            lock(m,'Overlapping cloud wing covert',(s*.27,1.37,.04-k*.08),
                 (s*.60,1.55,-.38-k*.09),(s*.84,1.76,-.77-k*.08),
                 .16,'#e6f4f5',j,normal=(s*.25,0,1),depth=.055)
        for k in range(5):
            lock(m,'Swept blue nape feather',(s*.14,1.61,.50-k*.075),
                 (s*.29,1.80,.18-k*.08),(s*.38,1.94,-.17-k*.10),
                 .11,'#709ab7' if k%2 else '#a3bdcf',normal=(s,0,0),depth=.035)
        for k in range(3):
            z=.25-k*.35
            paint(m,'Lightning through storm coat',[(1.29,z),(1.21,z-.075),(1.15,z+.025),
                  (1.03,z-.05)],.014,'#91e3ee',side=s)
        j='leftArm' if s<0 else 'rightArm'
        for k in range(3):
            lock(m,'Swept ankle feather',(s*.33,.55,m.front_z+.13),
                 (s*.40,.47,m.front_z+.03),(s*.47,.50,m.front_z-.13-k*.055),
                 .055,'#8aafc6',j,normal=(s,0,.2),depth=.02)
    plume_tail(m,[(0,1.00,-.68),(0,1.12,-1.02),(0,1.27,-1.40),(0,1.63,-1.67)],
               '#7197b1',width=.20,feathers=9,accent='#acc8d7')
    # Lift the far forepaw and opposite hindpaw to retain the running reference.
    from common import bv
    for joint,offset in [('rightArm',(0,.16,-.07)),('leftLeg',(0,.09,-.04))]:
        for obj in m.groups[joint].children:
            if obj.type=='MESH':obj.location+=bv(offset)
    glow(m,['#7ceefa','#91e3ee'],.35)
    return m


def ice_blade(m,name,start,mid,end,width,color,joint='body',normal=(1,0,0)):
    return loft(m,name,[start,mid,end],[(width*.65,width*.35),(width,width*.32),(.001,.001)],
                color,joint,normal,sides=4,steps=2,smooth=False)


def cryovelis():
    m=anatomy('Cryovelis','#579ebd','#b5e5ed','#a6f6ff',head_y=1.52,body_y=1.01,
              width=.33,leg_x=.35,crouch=True,snarl=True,ear_height=.39,muzzle=.40)
    collar(m,['#9edbe7','#b9eaf0','#72bcd5'],rows=3,fullness=1.09,flow='back')
    for s in (-1,1):
        for k in range(7):
            z=.52-k*.17
            ice_blade(m,'Long radiating ice mane blade',(s*.15,1.40,z),
                      (s*.25,1.80+k*.025,z-.14),
                      (s*(.40+(k%2)*.08),2.20+k*.035,z-.50),
                      .17,'#a9e3ed' if k%2 else '#83cde0',normal=(s,0,0))
        for k in range(4):
            ice_blade(m,'Sharp cheek icicle',(s*.17,1.67-k*.11,.86),
                      (s*.31,1.62-k*.12,.71),(s*.53,1.72-k*.13,.40),
                      .12,'#b8eaf0','head',normal=(s,0,.2))
        for k in range(3):
            ice_blade(m,'Backward foreleg ice spur',(s*.33,.72-k*.15,.45),
                      (s*.40,.77-k*.15,.28),(s*.48,.97-k*.15,.17),
                      .065,'#a3dfe9','leftArm' if s<0 else 'rightArm',normal=(s,0,0))
        for k in range(15):
            z=.39-(k%5)*.24;y=1.24-(k//5)*.10
            paint(m,'Scattered frost sparkle',[(y-.010,z-.010),(y+.015,z+.015)],
                  .018,'#d4f5f4',side=s)
    for k in range(5):
        x=(k-2)*.067
        ice_blade(m,'Swept frozen forehead crest',(x,1.67,.96),(x,1.91,.69),
                  (x*1.1,2.21-abs(k-2)*.05,.36),.075,'#a9e3ed','head',normal=(0,0,1))
    plume_tail(m,[(0,1.00,-.70),(0,1.21,-1.09),(0,1.65,-1.27),(0,1.91,-1.05)],
               '#80cadd',width=.23,feathers=7,accent='#c0edf1')
    claws(m,'#c4edf0',length=.18,size=.052)
    glow(m,['#a6f6ff','#d4f5f4'],.35)
    return m


def voltalis():
    m=anatomy('Voltalis','#ecc52b','#c1981e','#ef9565',head_y=1.40,body_y=.97,
              width=.34,length=.79,leg_x=.37,front_z=.55,rear_z=-.64,
              crouch=True,snarl=True,ear_height=.46,muzzle=.40,
              leg_colors={'leftLeg':'#364347','rightLeg':'#364347'})
    collar(m,['#efc92c','#f8d947','#dcae23'],rows=2,fullness=1.07,flow='back')
    for s in (-1,1):
        for k in range(5):
            lock(m,'Long swept lightning mane',(s*.12,1.40,.64-k*.085),
                 (s*.29,1.73,.39-k*.12),(s*.44,2.02-k*.025,-.01-k*.17),
                 .14,'#f5d544' if k%2 else '#e8ba21',normal=(s,0,.2),depth=.045)
        for k in range(4):
            z=.45-k*.31
            paint(m,'Broad jagged black lightning pattern',[(1.31,z+.03),(1.22,z-.10),
                  (1.14,z+.04),(1.02,z-.12),(.90,z-.03)],.145,'#293b3f',side=s)
        for front in (True,False):
            j=('left' if s<0 else 'right')+('Arm' if front else 'Leg')
            z=m.front_z if front else m.rear_z
            paint(m,'Jagged leg lightning flash',[(.86,z+.015),(.73,z+.10),(.66,z+.03),
                  (.50,z+.14),(.36,z+.12)],.09,'#283b3e' if front else '#f1c92a',j,s)
        paint(m,'Black forehead lightning blaze',[(s*.05,1.60),(s*.11,1.55),
              (s*.09,1.49),(s*.18,1.46)],.055,'#283b3e','head',front=True)
        j='leftArm' if s<0 else 'rightArm'
        lock(m,'Elbow lightning tuft',(s*.35,.76,.48),(s*.46,.82,.35),
             (s*.52,1.01,.23),.07,'#f6d649',j,normal=(s,0,0),depth=.025)
    # An enormous hooked tail arcs forward above the body, as in the reference.
    plume_tail(m,[(0,1.01,-.74),(0,1.48,-1.21),(0,2.14,-1.16),(0,2.40,-.27)],
               '#e9bf24',width=.34,feathers=13,accent='#fbe15a')
    m.skin['tail']=[o for o in m.groups['tail'].children if o.type=='MESH']
    for s in (-1,1):
        paint(m,'Fitted dark underside of hooked tail',[(1.27,-1.10),(1.63,-1.24),
              (1.99,-1.18),(2.21,-.90),(2.30,-.55)],.18,'#35474a','tail',s)
    claws(m,'#2d4147',length=.17,size=.048)
    return m


def venomaris():
    m=anatomy('Venomaris','#292235','#3e314b','#a0ed36',head_y=1.40,body_y=.98,
              width=.32,length=.80,leg_x=.35,front_z=.53,rear_z=-.64,
              crouch=True,snarl=True,ear_height=.38,muzzle=.42)
    collar(m,['#2b2639','#382c46','#211f2f'],rows=2,fullness=1.10,flow='back')
    for s in (-1,1):
        for k in range(7):
            lock(m,'Swept poisonous dorsal blade',(s*.10,1.37,.53-k*.14),
                 (s*.22,1.72+k*.035,.31-k*.15),
                 (s*.35,2.15+k*.025,-.07-k*.15),.14,
                 '#30253e' if k%2 else '#241f32',normal=(s,0,0),depth=.043)
        for k in range(3):
            z=.33-k*.37
            paint(m,'Branching luminous poison vein',[(1.31,z),(1.18,z-.11),(1.10,z-.04),
                  (.98,z+.10),(.88,z+.07)],.027,'#7fbd3c',side=s)
            paint(m,'Vein fork',[(1.18,z-.11),(1.11,z-.23),(1.02,z-.26)],.014,'#96d647',side=s)
        leg_marks(m,s,['#80c33c','#b0e756'],veins=True)
        paint(m,'Venomous cheek vein',[(s*.11,1.50),(s*.23,1.47),(s*.29,1.40),
              (s*.22,1.34)],.020,'#7dbb36','head',front=True)
    # The mouth glows from within and a small connected tongue of vapor curls out.
    m.ellipsoid('Glowing poison mouth',(0,1.10,1.21),(.105,.105,.17),'#78cf20','head',20,14)
    m.ellipsoid('Bright toxic tongue',(0,1.085,1.34),(.070,.032,.09),'#b6f25d','head',16,10)
    smoke(m,'Curl of toxic breath',[(0,1.11,1.37),(-.025,1.08,1.54),(.05,1.00,1.66),
          (.07,1.11,1.76),(.015,1.21,1.73)],.055,'#a1e84a','head',normal=(0,0,1))
    plume_tail(m,[(0,.98,-.72),(0,1.06,-1.12),(0,1.29,-1.39),(0,1.57,-1.31)],
               '#292235',width=.17,feathers=5,accent='#3a2c44')
    smoke(m,'Toxic tail tip',[(0,1.47,-1.34),(0,1.68,-1.27),(0,1.85,-1.43),
          (0,2.00,-1.31),(0,2.12,-1.40)],.06,'#86c83b','tail')
    claws(m,'#211f30',length=.15,size=.046)
    glow(m,['#a0ed36','#78cf20','#b6f25d','#a1e84a','#86c83b'],.42)
    return m


def eclipsera():
    m=anatomy('Eclipsera','#2e2b30','#484047','#f6b759',head_y=1.86,body_y=1.08,
              width=.30,ear_height=.53,ear_width=.14,muzzle=.38,split=True)
    collar(m,lambda x,r,k:('#ffe398' if (r+k)%2 else '#f6ce6c') if x>0 else
           ('#3a343b' if (r+k)%2 else '#292a31'),rows=4,fullness=1.24)
    for s in (-1,1):
        for row in range(3):
            for k in range(5):
                z=.30-k*.24;y=1.30-row*.12
                lock(m,'Flowing golden coat' if s>0 else 'Shadow cloak lock',
                     (s*.22,y,z),(s*(.33+row*.025),y+.04,z-.15),
                     (s*(.47+row*.03),y+.20,z-.38),.115,
                     '#f4d174' if s>0 else ('#3c353d' if k%2 else '#292b33'),
                     normal=(s,0,.1),depth=.035)
        for k in range(4):
            lock(m,'Asymmetric long breast plume',(s*.07,1.67-k*.07,.78),
                 (s*.22,1.32-k*.09,.94),(s*.14,.95-k*.08,.73),.155,
                 '#ffe49b' if s>0 else '#403841',normal=(s*.25,0,1),depth=.04)
    plume_tail(m,[(0,1.04,-.68),(-.10,1.24,-1.13),(-.22,1.78,-1.36),(-.08,2.04,-1.05)],
               '#2a2c34',width=.25,feathers=10,accent='#403841')
    for k in range(4):
        smoke(m,'Recurved shadow ribbon',[(-.16,1.20+k*.12,-.89-k*.10),
              (-.41,1.40+k*.13,-1.12-k*.09),(-.43,1.68+k*.13,-1.23-k*.06),
              (-.29,1.79+k*.13,-1.10-k*.06)],.11,'#30313b','tail')
    halo(m,'#ffe591',2.73,radius=.29)
    # A genuine thick crescent, built with an open inner curve.
    points=[]
    for k in range(29):
        a=math.radians(60+k*240/28);points.append((-.44+math.cos(a)*.17,2.75+math.sin(a)*.17,.75))
    for k in range(28,-1,-1):
        a=math.radians(80+k*200/28);points.append((-.37+math.cos(a)*.15,2.75+math.sin(a)*.15,.75))
    shell(m,'Orbiting dark crescent',points,(0,0,1),'#282e38','head',thickness=.045,bevel=.006)
    glow(m,['#ffe591'],.35)
    return m


BUILDERS={'Ignisrael':ignisrael,'Torrentis':torrentis,'Verdama':verdama,'Runaris':runaris,
          'Noctyros':noctyros,'Solarune':solarune,'Gravulor':gravulor,'Wraithound':wraithound,
          'Tempestral':tempestral,'Cryovelis':cryovelis,'Voltalis':voltalis,
          'Venomaris':venomaris,'Eclipsera':eclipsera}

if __name__=='__main__':
    from pupawn_review import render_model
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    requested={arg.lower() for arg in args if not arg.startswith('--')}
    for name,builder in BUILDERS.items():
        if not requested or name.lower() in requested:
            model=builder();model.export(render=False)
            if '--no-render' not in args:render_model(model,('hero','side'))
