"""The 17 species without source artwork, sculpted from their appearance briefs."""
import sys, math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import Model

def ringbody(m,label,rings,color,joint='body',n=32):
    verts=[(math.cos(i*math.tau/n)*rx,y,cz+math.sin(i*math.tau/n)*rz) for y,rx,rz,cz in rings for i in range(n)]
    faces=[(r*n+i,r*n+(i+1)%n,(r+1)*n+(i+1)%n,(r+1)*n+i) for r in range(len(rings)-1) for i in range(n)]
    # Rings run Y up; reverse side faces to preserve outward normals.
    faces=[tuple(reversed(f)) for f in faces]
    faces += [tuple(range(n)),tuple(reversed(range((len(rings)-1)*n,len(rings)*n)))]
    return m.mesh(label,verts,faces,color,joint)

def bolt(m,points,color='#f8df62',joint='body',width=.05):
    return m.tube('Lightning vein',points,width,color,joint)

def fish(name,body,fin,stage):
    m=Model(name); m.joint('head',(0,.85,.35)); m.joint('tail',(0,.8,-.55))
    # A spindle running fore/aft with a swollen jaw and narrow caudal peduncle.
    m.ellipsoid('Sculpted fish flank',(0,.85,0),(.65,.72,.88),body)
    m.ellipsoid('Forehead',(0,1.05,.53),(.58,.54,.58),body,'head')
    m.ellipsoid('Lower jaw',(0,.48,.73),(.5,.24,.44),fin,'head')
    m.ellipsoid('Open mouth cavity',(0,.72,1.035),(.39,.34,.085),'#162735','head')
    pts=[(.42*math.sin(i*math.tau/32),.73+.37*math.cos(i*math.tau/32),1.02) for i in range(33)]
    m.tube('Raised lip',pts,.07,body,'head')
    for s in [-1,1]:
        m.eye((s*.37,1.14,.94),.19,'#eece75' if stage<3 else '#ed6c69')
        m.leaf('Pectoral fin',(s*.49,.78,.1),(s*1.1,.45,-.3),.24,fin)
        for j in range(3):
            x=s*(.56+j*.12); m.tube('Fin ray',[(s*.54,.75,.1),(x,.57,-.15),(s*(.92+j*.04),.46,-.3)],.012,body)
        for j in range(3): m.tube('Gill slit',[(s*.57,.84,.5-j*.12),(s*.61,.69,.45-j*.12),(s*.5,.56,.42-j*.12)],.014,'#304956')
    m.leaf('Dorsal fin',(0,1.3,.15),(0,1.86,-.52),.31,fin)
    m.tube('Tail stock',[(0,.85,-.57),(0,.81,-.94),(0,.9,-1.27)],.16,body,'tail')
    for s in [-1,1]: m.leaf('Caudal lobe',(0,.89,-1.1),(s*.66,1.14,-1.7),.29,fin,'tail')
    if stage>=3:
        for s in [-1,1]:
            for i in range(6):
                x=s*(.07+i*.052); m.cone('Needle tooth',(x,.99,1.08),(x,.79 if i%2 else .83,1.09),.033,'#f4e9c8','head')
                m.cone('Lower tooth',(x,.44,1.07),(x,.59,1.09),.028,'#f4e9c8','head')
    if name=='Glub-Abyss':
        m.tube('Angler lure',[(0,1.45,.45),(0,1.94,.54),(0,2.12,1.01),(0,1.83,1.29)],.035,body,'head')
        m.ellipsoid('Red lure bulb',(0,1.8,1.3),(.14,.16,.14),'#f66566','head')
        for i in range(8): m.cone('Dorsal barb',(0,1.32-i*.025,.2-i*.13),(0,1.7-i*.03,.16-i*.13),.06,fin)
    if name=='Glub-Arctic':
        for s in [-1,1]:
            for i in range(7):
                m.cone('Icicle fin ray',(s*.44,.7,.3-i*.13),(s*(.98-.04*i),.35-i*.04,-.1-i*.16),.065,'#d5f7f4')
            for row in range(3):
                for col in range(5):
                    m.ellipsoid('Frost scale',(s*(.5+row*.035),.72+row*.13,.48-col*.18),(.055,.065,.1),'#aeddeb')
    return m

def thunderbird(name,storm=False):
    m=Model(name); ink='#52556b' if storm else '#eec540'; light='#f7e290'; cloud='#a3b7cb' if storm else '#d6f0ea'
    m.joint('head',(0,1.34,.12)); m.ellipsoid('Streamlined breast',(0,.91,0),(.29,.52,.32),ink)
    m.ellipsoid('Raptor head',(0,1.45,.13),(.28,.3,.28),ink,'head')
    for s in [-1,1]:
        m.eye((s*.13,1.49,.34),.08,light)
        m.cone('Cheek lightning',(s*.19,1.42,.07),(s*.4,1.22,-.02),.08,light,'head')
    m.cone('Hooked beak',(0,1.39,.34),(0,1.26,.55),.09,'#a47c38','head')
    for i in range(3): m.leaf('Lightning crest',(0,1.57,-.02),(0,1.99-i*.07,-.16-i*.13),.09,light,'head')
    for s,side in [(-1,'left'),(1,'right')]:
        m.joint(side+'Wing',(s*.22,1.16,-.03))
        for level in range(2 if storm else 1):
            joint=side+'Wing'; y=1.15-level*.35
            m.tube('Wing spar',[(s*.22,y,0),(s*.7,y+.3,-.08),(s*1.15,y+.31,-.23)],.08,ink,joint)
            for i in range(7):
                m.leaf('Cloud flight feather',(s*(.46+i*.095),y+.19,-.09),(s*(.65+i*.15),y-.25-i*.025,-.44-i*.05),.12,cloud,joint)
                bolt(m,[(s*.28,y+.08,.08),(s*.63,y+.28,.04),(s*.58,y+.13,.08),(s*1.17,y+.32,-.17)],light,joint,.023)
        m.joint(side+'Leg',(s*.13,.53,0)); m.tube('Bird leg',[(s*.13,.53,0),(s*.17,.25,.03),(s*.17,.17,.14)],.04,'#997b43',side+'Leg')
        for j in [-1,0,1]: m.cone('Talon',(s*.17,.17,.11),(s*.17+j*.07,.1,.3),.028,'#a17d3b',side+'Leg')
    m.joint('tail',(0,.66,-.21))
    for i in range(5): m.leaf('Streaming storm tail',((i-2)*.045,.67,-.18),((i-2)*.12,.15,-.98-abs(i-2)*.06),.13,cloud if storm else light,'tail')
    return m

def insect(name):
    m=Model(name); ice=name!='Venom-Glaze'; body='#95cde1' if ice else '#313e4c'; purple='#a879cd'
    if name=='Icipillar':
        for i in range(7):
            y=.23+math.sin(i*.5)*.035; z=.65-i*.19; r=.2-i*.01
            m.ellipsoid('Fuzzy caterpillar segment',(0,y,z),(r,r,r*.9),body)
            for s in [-1,1]:
                m.ellipsoid('Crawling foot',(s*.16,.075,z),(.08,.065,.075),'#648fae')
                m.cone('Poison frost barb',(s*.08,y+r*.6,z),(s*.17,y+r+.16,z-.06),.047,purple)
                for f in range(3): m.leaf('Silky frost tuft',(s*r*.9,y,z),(s*(r+.06),y+.09,z+(f-1)*.07),.023,'#d9edf1')
        m.joint('head',(0,.28,.78)); m.ellipsoid('Larval head',(0,.28,.81),(.23,.24,.18),body,'head')
        for s in [-1,1]: m.eye((s*.1,.32,.966),.08,'#8060a7'); m.tube('Antenna',[(s*.12,.45,.82),(s*.19,.58,.85),(s*.2,.65,.9)],.025,purple,'head')
    elif name=='Frostsalis':
        ringbody(m,'Tapered cocoon',[(.01,.03,.03,0),(.16,.24,.2,0),(.53,.34,.28,0),(.91,.27,.24,0),(1.16,.04,.045,0)],'#b1d6e5',n=10)
        for row in range(6):
            y=.2+row*.14; r=.28*math.sin(y/1.2*math.pi)+.035
            m.tube('Venom binding',[(r*math.sin(a),y+.025*math.cos(a*2),r*.84*math.cos(a)) for a in [i*math.tau/32 for i in range(33)]],.022,purple)
        for s in [-1,1]: m.ellipsoid('Sleeping eye',(s*.09,.75,.238),(.06,.018,.015),'#664e84')
        m.cone('Suspension crystal',(0,1.1,0),(0,1.36,0),.09,'#e1f4f4')
    else:
        m.joint('head',(0,1.02,.05)); m.ellipsoid('Thorax',(0,.77,0),(.13,.26,.14),body); m.ellipsoid('Segmented abdomen',(0,.43,-.025),(.12,.29,.11),body)
        m.ellipsoid('Insect head',(0,1.06,.04),(.17,.16,.15),body,'head')
        for s in [-1,1]:
            m.eye((s*.09,1.08,.17),.075,purple)
            m.tube('Feathery antenna',[(s*.08,1.18,.03),(s*.19,1.43,.02),(s*.33,1.57,.04)],.015,purple,'head')
            for i in range(6): m.leaf('Antenna plume',(s*(.12+i*.025),1.24+i*.045,.025),(s*(.2+i*.035),1.27+i*.05,.03),.026,'#dbd5f1','head')
            joint='leftWing' if s<0 else 'rightWing'; m.joint(joint,(s*.09,.88,-.035))
            for level in [0,1]:
                start=(s*.11,.86-level*.13,-.04); end=(s*(1.05 if level==0 else .79),1.42 if level==0 else .32,-.14)
                m.leaf('Snowflake wing' if ice else 'Needle wing',start,end,.37 if ice else .14,'#d0e7ed' if ice else '#736183',joint)
                for ray in range(4):
                    target=(end[0]*.9+(ray-1.5)*s*.04,end[1]+(ray-1.5)*.1,end[2]+.04)
                    m.tube('Lunar wing vein',[start,((start[0]+target[0])*.55,(start[1]+target[1])*.5,.015),target],.011,purple,joint)
                    if ice:
                        mid=((start[0]+target[0])*.65,(start[1]+target[1])*.6,.025)
                        for d in [-1,1]: m.tube('Snowflake branch',[mid,(mid[0]+s*.1,mid[1]+d*.08,.025)],.008,'#fafbf4',joint)
            for i in range(3): m.tube('Insect limb',[(s*.09,.8-i*.16,.08),(s*.27,.71-i*.16,.14),(s*.34,.61-i*.16,.21)],.015,body)
    return m

def plant(name):
    m=Model(name); green='#55784e'; pale='#9cbb69'; pink='#e9a5c2'; moon=name=='Moon-Dancer'; tall=name in ['Sun-Bather','Moon-Dancer']
    if moon: green='#4a5268'; pale='#a8b6c9'; pink='#a38ac5'
    m.joint('head',(0,1.18 if tall else .65,0))
    if name=='Petal':
        m.ellipsoid('Seed body',(0,.25,0),(.21,.25,.17),'#9caf6b')
        m.leaf('Single petal hat',(-.23,.46,-.02),(.28,.76,.025),.24,pink,'head')
        m.tube('Hat midrib',[(-.22,.47,.02),(0,.58,.08),(.26,.74,.04)],.01,'#b66f9b','head')
    else:
        ringbody(m,'Braided living stem',[(.1,.13,.11,0),(.35,.17,.12,0),(.68,.11,.1,0),(1.02,.13,.11,0),(1.25,.07,.08,0)],green)
        for s in [-1,1]:
            m.joint('leftArm' if s<0 else 'rightArm',(s*.1,.78,0)); joint='leftArm' if s<0 else 'rightArm'
            m.tube('Vine arm',[(s*.12,.78,0),(s*.35,.58,.03),(s*.48,.6,.13)],.04,green,joint)
            m.leaf('Hand leaf',(s*.42,.59,.11),(s*.66,.75,.14),.1,pale,joint)
            for i in range(2): m.leaf('Stem leaf',(s*.07,.37+i*.3,0),(s*(.35+i*.09),.57+i*.24,.02),.13,green)
        for i in range(3):
            angle=i*math.tau/3
            m.tube('Twisting stem rib',[(math.sin(angle+y*5)*.12,y,math.cos(angle+y*5)*.1) for y in [.18,.35,.52,.69,.86,1.03]],.026,pale)
        if name=='Bloom-Bud':
            for i in range(5):
                a=i*math.tau/5; pos=(math.sin(a)*.19,1.01,math.cos(a)*.17)
                m.ellipsoid('Closed flower bud',pos,(.11,.22,.1),pink,'head')
                m.leaf('Bud sepal',(pos[0],.88,pos[2]),(pos[0],1.13,pos[2]+.03),.06,green,'head')
        else:
            center=(0,1.4,.04); petalcount=8 if moon else 14
            for i in range(petalcount):
                a=i*math.tau/petalcount
                m.leaf('Lunar lily petal' if moon else 'Golden ray petal',center,(math.sin(a)*.63,1.4+math.cos(a)*.63,.02),.18 if moon else .13,pink if moon else '#e8ba50','head')
                if moon: m.leaf('Silver petal edge',(math.sin(a)*.39,1.4+math.cos(a)*.39,.08),(math.sin(a)*.63,1.4+math.cos(a)*.63,.04),.055,'#d6dbe9','head')
            m.ellipsoid('Flower disk',center,(.3,.3,.13),'#706386' if moon else '#987342','head')
            if not moon:
                for row in range(4):
                    a=row*2.4
                    for i in range(6):
                        a+=2.4; r=.06+row*.045; m.ellipsoid('Sunflower seed',(math.sin(a)*r,1.4+math.cos(a)*r,.171),(.018,.025,.011),'#c89848','head',12,8)
    for s,side in [(-1,'left'),(1,'right')]:
        m.joint(side+'Leg',(s*.07,.14,0)); m.leaf('Root foot',(s*.07,.13,0),(s*.2,.06,.22),.09,green,side+'Leg')
        m.eye((s*.09,.31 if name=='Petal' else 1.4 if tall else .72,.156 if name=='Petal' else .18 if tall else .115),.06,'#d2b4dd' if moon else '#5d6b3d','body' if name=='Petal' else 'head')
    return m

def machine(name):
    m=Model(name); steel='#657e87'; dark='#344b58'; copper='#b88a54'; cream='#e4dc9d'
    if name=='Currenshell':
        m.ellipsoid('Tortoise body',(0,.36,0),(.5,.29,.64),dark)
        m.ellipsoid('Copper shell',(0,.55,-.08),(.57,.4,.64),copper)
        for row in range(7):
            y=.36+row*.073; r=.57*math.sqrt(max(.05,1-((y-.53)/.41)**2))
            m.tube('Copper shell coil',[(r*math.sin(a),y,.64/.57*r*math.cos(a)-.08) for a in [i*math.tau/40 for i in range(41)]],.033,'#e1b379')
        m.joint('head',(0,.43,.49)); m.tube('Bulb neck',[(0,.4,.4),(0,.57,.65),(0,.74,.71)],.13,dark,'head')
        for y in [.63,.68,.73]: m.tube('Screw neck',[(.14*math.sin(a),y,.71+.14*math.cos(a)) for a in [i*math.tau/24 for i in range(25)]],.022,copper,'head')
        m.ellipsoid('Lightbulb head',(0,.94,.72),(.21,.27,.2),cream,'head')
        for s,side in [(-1,'left'),(1,'right')]:
            m.eye((s*.09,.96,.89),.065,'#7d9d93')
            m.joint(side+'Leg',(s*.35,.27,0))
            for z in [-.36,.36]:
                m.ellipsoid('Tortoise leg',(s*.4,.18,z),(.16,.19,.18),dark,side+'Leg')
                for i in range(3): m.cone('Copper claw',(s*.39+(i-1)*.07,.09,z+.11),(s*.39+(i-1)*.07,.065,z+.2),.032,copper,side+'Leg')
    else:
        ringbody(m,'Armored steel trunk',[(.75,.38,.27,0),(.9,.48,.31,0),(1.5,.57,.36,0),(1.82,.5,.28,0),(1.9,.27,.2,0)],steel,n=12)
        m.joint('head',(0,1.86,0)); m.ellipsoid('Helmet',(0,2.02,.01),(.27,.3,.24),dark,'head')
        for s in [-1,1]: m.eye((s*.12,2.08,.23),.09,'#a6eeef')
        m.ellipsoid('Chest reactor',(0,1.34,.34),(.2,.23,.07),copper)
        m.ellipsoid('Reactor glass',(0,1.34,.397),(.13,.15,.035),'#b6e8de')
        for i in range(4): m.tube('Abdomen plate seam',[(-.31,.9+i*.09,.27),(0,.87+i*.09,.31),(.31,.9+i*.09,.27)],.016,dark)
        for s,side in [(-1,'left'),(1,'right')]:
            m.joint(side+'Arm',(s*.51,1.67,0)); joint=side+'Arm'
            m.ellipsoid('Pauldron',(s*.61,1.62,0),(.3,.3,.3),steel,joint)
            ringbody(m,'Steel gauntlet',[(.83,.19,.19,0),(1.3,.22,.2,0)],steel,joint,n=10).location.x+=s*.72
            m.ellipsoid('Fist',(s*.73,.77,.06),(.22,.21,.22),dark,joint)
            m.joint(side+'Leg',(s*.27,.83,0)); joint=side+'Leg'
            m.ellipsoid('Piston thigh',(s*.27,.62,0),(.18,.27,.19),dark,joint)
            m.ellipsoid('Steel shin',(s*.28,.3,.03),(.21,.29,.22),steel,joint)
            m.ellipsoid('Stabilizer foot',(s*.28,.09,.17),(.25,.1,.36),dark,joint)
            m.tube('Tesla spine',[(s*.31,1.35,-.25),(s*.44,1.84,-.32),(s*.44,2.33,-.32)],.06,dark)
            for i in range(8):
                y=1.78+i*.075
                m.tube('Tesla coil',[(s*.44+.19*math.sin(a),y,-.32+.19*math.cos(a)) for a in [j*math.tau/24 for j in range(25)]],.024,copper)
            m.ellipsoid('Tesla terminal',(s*.44,2.4,-.32),(.23,.13,.23),'#a1c4c6')
    return m

def sparkle():
    m=Model('Sparkle'); m.joint('head',(0,.5,0)); m.ellipsoid('Luminous core',(0,.5,0),(.24,.29,.19),'#f4d96a','head')
    for s in [-1,1]:
        m.eye((s*.09,.55,.17),.055,'#706744')
        bolt(m,[(s*.21,.51,0),(s*.4,.63,0),(s*.34,.43,0),(s*.52,.49,0)],'#fbe69b','body',.025)
        for i in range(3): m.cone('Spark ray',(s*.1,.76,0),(s*(.14+i*.09),.93-i*.05,0),.023,'#f9eaa5')
    m.tube('Joyful smile',[(-.06,.43,.19),(0,.4,.205),(.06,.43,.19)],.011,'#806a3b','head')
    return m

builders=[sparkle,lambda:thunderbird('Voltwing'),lambda:thunderbird('Stormlord',True),lambda:machine('Currenshell'),lambda:machine('Ohm-Titan')]
for name,body,fin,stage in [('Glub','#5a9dc9','#8bbbd5',1),('Glub-Glub','#3c789d','#89b2c7',2),('Glub-Abyss','#26313e','#684b60',3),('Glub-Arctic','#8cc8db','#d5eff2',3)]: builders.append(lambda n=name,b=body,f=fin,s=stage:fish(n,b,f,s))
for name in ['Icipillar','Frostsalis','Moth-Frost','Venom-Glaze']: builders.append(lambda n=name:insect(n))
for name in ['Petal','Bloom-Bud','Sun-Bather','Moon-Dancer']: builders.append(lambda n=name:plant(n))
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for builder in builders:
    model=builder()
    if not selected or model.name in selected: model.export()
