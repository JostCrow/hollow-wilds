"""Reference-led sculptures for the first 24 creatures. Run with Blender Python."""
import os, sys, math, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
from common import Model
from ferronyx import ferronyx
from pupawn_evolutions import BUILDERS as EVOLUTION_BUILDERS
from pupawn_review import render_model

def sweep(m, name, points, radii, color, joint='body', sides=12):
    """A smooth, tapered organic volume following a Catmull-Rom spine."""
    pp=[Vector(p) for p in points]; vv=[]; rr=[]
    for i in range(len(pp)-1):
        a,b,c,d=pp[max(0,i-1)],pp[i],pp[i+1],pp[min(len(pp)-1,i+2)]
        for k in range(5):
            t=k/5
            vv.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
            rr.append(radii[i]*(1-t)+radii[i+1]*t)
    vv.append(pp[-1]);rr.append(radii[-1]);verts=[];faces=[]
    for i,p in enumerate(vv):
        direction=(vv[min(i+1,len(vv)-1)]-vv[max(i-1,0)]).normalized()
        axis=direction.cross(Vector((0,0,1)))
        if axis.length<.1:axis=direction.cross(Vector((0,1,0)))
        axis.normalize();other=direction.cross(axis).normalized()
        for j in range(sides):
            theta=j*math.tau/sides
            verts.append(tuple(p+rr[i]*(axis*math.cos(theta)+other*math.sin(theta))))
    for i in range(len(vv)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple((len(vv)-1)*sides+j for j in range(sides))])
    m.mesh(name,verts,faces,color,joint=joint)

def ell(m,n,p,s,c,j='body'):return m.ellipsoid(n,p,s,c,joint=j)
def line(m,n,pts,r,c,j='body'):sweep(m,n,pts,[r]*len(pts),c,j,8)
def horn(m,n,pts,r,c,j='head'):sweep(m,n,pts,[r*(1-i/(len(pts)-1))+.004 for i in range(len(pts))],c,j)
def fur(m,n,start,end,width,c,j='body'):
    a,b=Vector(start),Vector(end);d=b-a;side=d.cross(Vector((0,0,1)))
    if side.length<.001:side=d.cross(Vector((0,1,0)))
    side.normalize();normal=d.cross(side).normalized()
    vs=[a-side*width*.45,a+side*width*.45,a+d*.37-side*width,a+d*.37+side*width,b,a+d*.38+normal*width*.38,a+d*.38-normal*width*.18]
    m.mesh(n,[tuple(v) for v in vs],[(0,2,5),(2,4,5),(4,3,5),(3,1,5),(1,0,5),(0,6,2),(2,6,4),(4,6,3),(3,6,1),(1,6,0)],c,joint=j)
def ear(m,n,x,y,z,c,inner,j='head',height=.55,width=.22):
    verts=[(x-width,y,z),(x+width,y,z),(x,y+height,z-.06),(x,y+.1,z-.2)]
    m.mesh(n,verts,[(0,1,2),(0,3,1),(0,2,3),(1,3,2)],c,joint=j)
    m.mesh(n+' inner',[(x-width*.55,y+.075,z+.009),(x+width*.55,y+.075,z+.009),(x,y+height*.78,z-.035)],[(0,1,2)],inner,joint=j,smooth=False)

def face(m,center,width,eye_color='#f7c450',size=.12,nose='#222932',muzzle=True):
    x,y,z=center
    if muzzle:
        ell(m,'tapered muzzle',(x,y-.15,z+.22),(width*.7,.18,.3),nose,'head')
        ell(m,'nose',(x,y-.11,z+.49),(width*.31,.09,.055),'#172023','head')
    for side in [-1,1]:m.eye((x+side*width*.67,y+.055,z+.15),size,eye_color,joint='head')

def toes(m,x,y,z,color,j='body',r=.07):
    for k in [-1,0,1]:ell(m,'rounded toe',(x+k*r*1.1,y,z+.09),(r,.065,r*1.6),color,j)

def ref_eye(m,p,size,style):
    """Flat oval eye paintings modeled after each actual reference illustration."""
    x,y,z=p;r=size
    ell(m,'illustrated dark eye outline',p,(r*.85,r*1.2,r*.16),'#23291e','head')
    if style in ('gold','frog','sage'):
        ell(m,'warm iris',(x,y,z+r*.13),(r*.71,r*1.07,r*.08),'#dd951b' if style!='sage' else '#b78419','head')
        ell(m,'large oval brown pupil',(x,y+r*.04,z+r*.2),(r*(.26 if style=='frog' else .45),r*.8,r*.045),'#3b2715','head')
        if style=='frog':line(m,'horizontal frog eyelid',[(x-r*.72,y,z+r*.24),(x+r*.72,y-.025,z+r*.24)],r*.055,'#46351b','head')
    elif style in ('ivory','dino'):
        ell(m,'ivory oval sclera',(x,y,z+r*.13),(r*.73,r*1.08,r*.075),'#f6f4d5','head')
        ell(m,'large deep oval pupil',(x+r*.12,y,z+r*.2),(r*.5,r*.92,r*.045),'#1b3030','head')
    elif style=='spirit':
        ell(m,'small glowing spirit iris',(x,y,z+r*.17),(r*.4,r*.66,r*.05),'#81d3c5','head')
    elif style=='puppy':
        ell(m,'glossy dark puppy eye',(x,y,z+r*.15),(r*.78,r*1.12,r*.07),'#182d34','head')
        ell(m,'turquoise lower iris',(x,y-r*.65,z+r*.2),(r*.54,r*.38,r*.04),'#4aabae','head')
    if style!='spirit':ell(m,'painted eye catchlight',(x-r*.2,y+r*.65,z+r*.255),(r*.24,r*.3,r*.023),'#fff9d1','head')

def flame(m,n,base,scale=1,color='#ff8c21',j='body'):
    x,y,z=base
    sweep(m,n,[(x,y,z),(x-.12*scale,y+.25*scale,z),(x+.08*scale,y+.5*scale,z),(x,y+.85*scale,z-.07*scale)],[.17*scale,.16*scale,.09*scale,.003],color,j)
    sweep(m,n+' light',[(x,y+.03,z+.1*scale),(x-.05*scale,y+.25*scale,z+.1*scale),(x+.02*scale,y+.52*scale,z+.08*scale)],[.09*scale,.07*scale,.002],'#ffe778' if color=='#ff8c21' else '#c2ffe2',j)

def flarepib():
    m=Model('Flarepib');m.joint('head',(0,1.05,.18));m.joint('tail',(0,.42,-.3))
    c='#ed6e17';gold='#ffcb44'
    ell(m,'pear shaped torso',(0,.55,0),(.37,.48,.31),c)
    ell(m,'enormous rounded head',(0,1.17,.13),(.59,.55,.49),'#f67e16','head')
    ell(m,'soft lower muzzle',(0,.99,.49),(.43,.22,.2),'#f78019','head')
    ell(m,'glowing amber belly',(0,.53,.283),(.27,.31,.075),gold)
    for s in [-1,1]:
        m.joint('leftArm' if s<0 else 'rightArm',(s*.3,.78,0))
        sweep(m,'drooping little arm',[(s*.29,.82,.08),(s*.44,.57,.21),(s*.45,.39,.24)],[.1,.09,.06],c)
        ell(m,'splayed hind foot',(s*.28,.12,.16),(.19,.1,.22),c);toes(m,s*.28,.1,.27,c,r=.045)
        ref_eye(m,(s*.32,1.25,.54),.18,'gold')
        ell(m,'nostril',(s*.09,1.01,.681),(.022,.031,.009),'#542b18','head')
    sweep(m,'paddle tail stem',[(0,.37,-.22),(-.37,.49,-.49),(-.58,.71,-.54)],[.18,.18,.12],c,'tail')
    ell(m,'upright oval paddle',(-.61,.76,-.55),(.3,.43,.1),'#ef7518','tail')
    ell(m,'paddle warm center',(-.61,.75,-.442),(.18,.28,.015),'#d85710','tail')
    for p in [(-.07,.45,.353),(.1,.66,.339)]:ell(m,'candle belly highlight',p,(.1,.11,.009),'#ffe77c')
    return m

def lumacroak():
    m=Model('Lumacroak');c='#c86c1a';m.joint('head',(0,1.48,0))
    ell(m,'upright frog belly',(0,1.0,0),(.4,.55,.3),c)
    ell(m,'wide frog face',(0,1.66,.05),(.47,.31,.31),'#dd7c1d','head')
    for s in [-1,1]:
        ell(m,'raised eye socket',(s*.31,1.88,.055),(.2,.25,.2),'#d4781c','head')
        ref_eye(m,(s*.32,1.89,.24),.16,'frog')
        sweep(m,'long relaxed arm',[(s*.32,1.4,0),(s*.57,1.1,.03),(s*.65,.72,.18)],[.13,.11,.09],c)
        for k in range(3):sweep(m,'frog finger',[(s*.65+(k-1)*.07,.75,.18),(s*.68+(k-1)*.08,.58,.22)],[.04,.025],c)
        sweep(m,'angular jumping haunch',[(s*.24,.85,0),(s*.53,.63,-.02),(s*.36,.29,.13),(s*.55,.12,.26)],[.2,.2,.1,.09],c)
        toes(m,s*.55,.1,.3,c,r=.07)
        line(m,'luminous limb stripe',[(s*.36,1.32,.12),(s*.45,1.13,.15),(s*.49,.97,.16)],.025,'#ffda65')
        line(m,'luminous torso stripe',[(s*.19,1.14,.28),(s*.25,.92,.29),(s*.22,.72,.25)],.025,'#65f5e6')
    ell(m,'huge cyan throat sac',(0,1.39,.33),(.4,.43,.17),'#53e6e5','head')
    ell(m,'throat shine',(-.14,1.56,.479),(.09,.11,.012),'#b7fff0','head')
    line(m,'wide frog smile',[(-.37,1.64,.29),(0,1.61,.365),(.37,1.64,.29)],.013,'#75411c','head')
    return m

def solamphibos():
    m=Model('Solamphibos');c='#fff2a5';m.joint('head',(0,1.72,.04));m.joint('tail',(0,.62,-.12))
    ell(m,'elegant torso',(0,1.05,0),(.3,.58,.21),c)
    sweep(m,'long slender neck',[(0,1.32,0),(0,1.61,.02),(0,1.78,.03)],[.2,.18,.2],c)
    ell(m,'rounded salamander head',(0,1.89,.08),(.32,.36,.27),c,'head')
    for s in [-1,1]:
        ref_eye(m,(s*.19,1.95,.3),.105,'sage')
        sweep(m,'long hanging head fin',[(s*.24,1.94,0),(s*.35,1.58,-.04),(s*.49,1.25,-.07),(s*.54,1.08,-.06)],[.13,.14,.1,.018],'#e8b838','head')
        sweep(m,'gentle arm',[(s*.25,1.35,0),(s*.39,1.03,.02),(s*.4,.68,.08)],[.1,.075,.055],c)
        for k in [-1,0,1]:sweep(m,'long finger',[(s*.4+k*.045,.7,.08),(s*.41+k*.05,.56,.13)],[.028,.012],c)
        sweep(m,'slim digitigrade leg',[(s*.18,.68,0),(s*.24,.39,-.07),(s*.23,.12,.13)],[.14,.09,.07],c)
        toes(m,s*.23,.09,.18,c,r=.05)
    sweep(m,'golden tail',[(0,.62,-.12),(0,.35,-.47),(-.25,.21,-.74),(-.4,.25,-.8)],[.16,.15,.075,.004],'#e7b834','tail')
    ell(m,'sun medallion',(0,1.19,.213),(.16,.16,.032),'#ffc12d')
    ell(m,'sun heart',(0,1.19,.25),(.095,.095,.015),'#ffff9a')
    for k in range(8):
        a=k*math.tau/8
        horn(m,'sun ray',[(math.sin(a)*.17,1.19+math.cos(a)*.17,.23),(math.sin(a)*.27,1.19+math.cos(a)*.27,.23)],.035,'#e9a41d','body')
    return m

def leafy_otter(name,kind):
    m=Model(name);upright=kind==2;ghost=kind==1
    base=['#586c25','#9bdca5','#28482a'][kind];light=['#879745','#b7e8b9','#aac792'][kind]
    m.joint('head',(0,1.33,0));m.joint('tail',(0,.4,-.28))
    ell(m,'pear body',(0,.75,0),(.42,.65,.3),base)
    ell(m,'otter head',(0,1.48,.05),(.37,.4,.32),base,'head')
    ell(m,'muzzle',(0,1.29,.32),(.23,.15,.16),light,'head')
    ell(m,'small dark nose',(0,1.37,.465),(.09,.06,.045),'#1c3027','head')
    for s in [-1,1]:
        if ghost:
            line(m,'peaceful closed otter eye',[(s*.12,1.56,.351),(s*.2,1.59,.366),(s*.27,1.55,.343)],.012,'#6aa27d','head')
        else:ref_eye(m,(s*.2,1.53,.33),.11,'spirit' if upright else 'ivory')
        if ghost:ell(m,'round little ear',(s*.34,1.74,0),(.12,.13,.07),base,'head')
        else:
            m.leaf('broad upright leaf ear',(s*.23,1.68,.015),(s*.49,2.2 if kind==0 else 2.08,.015),.19 if kind==0 else .145,base,joint='head')
            line(m,'leaf ear midrib',[(s*.25,1.74,.04),(s*.4,2.05 if kind==0 else 1.97,.04)],.009,light,'head')
        ell(m,'large seated haunch',(s*.3,.32,.04),(.22,.29,.23),base)
        ell(m,'long otter hind foot',(s*.29,.1,.21),(.19,.09,.3),base);toes(m,s*.29,.1,.35,base,r=.05)
        if upright:
            sweep(m,'outstretched forearm',[(s*.3,1.06,0),(s*.58,.94,.08),(s*.68,1.08,.2)],[.13,.1,.1],base)
            flame(m,'spectral green flame',(s*.68,1.08,.22),.47,'#5cefa6')
        else:
            sweep(m,'small rounded forearm',[(s*.3,1.1,.08),(s*.38,.86,.22),(s*.22,.81,.32)],[.13,.12,.09],base)
    ell(m,'pale throat and chest',(0,1.0,.43 if upright else .29),(.2 if upright else .25,.43 if upright else .38,.035),light)
    sweep(m,'sweeping otter tail',[(0,.38,-.2),(-.4,.3,-.49),(-.66,.56,-.62),(-.65,.96,-.66)],[.22,.2,.12,.015],base,'tail')
    if ghost:
        for s in [-1,1]:sweep(m,'water plant tail strand',[(-.53,.51,-.56),(-.64+s*.12,.84,-.58),(-.8+s*.18,1.08,-.59)],[.09,.06,.003],base,'tail')
    else:
        for row in range(4):
            for k in range(9):
                a=k*math.tau/9;x=math.cos(a)*(.25+.03*(3-row));z=math.sin(a)*(.23+.025*(3-row));y=1.22-row*.23
                m.leaf('overlapping kelp frond',(x,y,z),(x*1.5,y-.51,z*1.6),.15 if kind==0 else .19,base)
        for s in [-1,1]:m.leaf('cheek kelp',(s*.28,1.59,.11),(s*.38,1.14,.22),.13,base,joint='head')
    return m

def dinosaur(name,kind):
    m=Model(name);m.joint('head',(0,1.48,.15));m.joint('tail',(0,.6,-.3))
    c=['#0badd3','#344f57','#102835'][kind];light=['#37c5e4','#6b8588','#1a394b'][kind]
    ell(m,'heavy pear torso',(0,.78,0),(.45,.6,.36),c)
    sweep(m,'thick forward neck',[(0,1.01,.02),(0,1.36,.15),(0,1.51,.23)],[.3,.24,.28],c)
    ell(m,'domed dinosaur head',(0,1.63,.24),(.46,.47,.4),c,'head')
    ell(m,'broad blunt muzzle',(0,1.46,.57),(.35,.23,.28),'#405a60' if kind==0 else '#5bdae9' if kind==2 else c,'head')
    ell(m,'lower jaw',(0,1.3,.53),(.27,.12,.24),'#4dc8d7' if kind==2 else light,'head')
    line(m,'dinosaur mouth seam',[(-.26,1.36,.65),(0,1.34,.8),(.26,1.36,.65)],.016,'#182c35','head')
    if kind==0:ell(m,'small visible pink tongue',(0,1.285,.73),(.12,.045,.05),'#d17e7b','head')
    for s in [-1,1]:
        if kind==0:ref_eye(m,(s*.3,1.7,.55),.15,'dino')
        elif kind==1:
            ell(m,'narrow reptile eye socket',(s*.3,1.7,.55),(.115,.075,.045),'#21323b','head')
            ell(m,'cold reptile eye',(s*.3,1.7,.59),(.08,.05,.02),'#b6cbd0','head')
            ell(m,'reptile slit pupil',(s*.3,1.7,.611),(.018,.047,.009),'#1c2833','head')
            sweep(m,'sloping armored brow',[(s*.2,1.77,.58),(s*.31,1.74,.61),(s*.4,1.71,.55)],[.04,.05,.02],c,'head')
        ell(m,'nostril',(s*.15,1.51,.83),(.03,.025,.01),'#152b31','head')
        sweep(m,'short forward arm',[(s*.34,1.09,.03),(s*.51,.88,.2),(s*.48,.72,.34)],[.16,.13,.11],c)
        for k in [-1,0,1]:ell(m,'hand claw',(s*.48+k*.075,.68,.38),(.035,.08,.05),light)
        ell(m,'powerful rounded thigh',(s*.35,.46,0),(.27,.36,.28),c)
        sweep(m,'short shin',[(s*.38,.44,0),(s*.4,.16,.16)],[.16,.11],c)
        ell(m,'broad dinosaur foot',(s*.4,.1,.25),(.21,.11,.29),c)
        toes(m,s*.4,.1,.4,light if kind else c,r=.065)
    sweep(m,'long balancing tail',[(0,.65,-.23),(0,.5,-.65),(-.07,.56,-1.0),(-.15,.88,-1.27)],[.27,.24,.14,.008],c,'tail')
    if kind:
        for k in range(5):
            y=1.21-k*.17;z=-.22-k*.09
            m.cone('dorsal armor spine',(0,y,z),(0,y+.22,z-.22),.12,light)
        ell(m,'pale plated chest',(0,.83,.337),(.28,.36,.05),light)
        for s in [-1,1]:
            if kind==1:horn(m,'swept back skull horn',[(s*.24,1.94,.14),(s*.29,2.2,-.04),(s*.34,2.42,-.17)],.14,'#263c32')
            else:horn(m,'giant crescent horn',[(s*.31,1.91,.17),(s*.6,2.08,.08),(s*.64,2.39,.04),(s*.45,2.63,.07)],.19,'#101f27')
    if kind==2:
        ell(m,'luminous skull face',(0,1.69,.58),(.31,.33,.08),'#5bdae9','head')
        for s in [-1,1]:
            ell(m,'skull eye socket',(s*.16,1.77,.652),(.075,.1,.018),'#102c3e','head')
            horn(m,'shadow shoulder wisp',[(s*.39,1.1,-.12),(s*.64,1.31,-.25),(s*.63,1.6,-.27)],.1,c,'body')
        for s in [-1,1]:ell(m,'skull nostril',(s*.06,1.48,.847),(.026,.04,.012),'#163748','head')
    return m

def puppy():
    m=Model('Pupawn');c='#d9b880';light='#f3d9a5';m.joint('head',(0,1.04,.07));m.joint('tail',(0,.32,-.3))
    ell(m,'plump seated body',(0,.62,0),(.4,.47,.31),c)
    ell(m,'large fluffy puppy head',(0,1.24,.08),(.53,.49,.41),light,'head')
    for s in [-1,1]:
        sweep(m,'drooping velvety ear',[(s*.41,1.5,.03),(s*.52,1.24,.04),(s*.5,.97,.12)],[.17,.2,.11],c,'head')
        ref_eye(m,(s*.21,1.25,.46),.14,'puppy')
        ell(m,'cream muzzle cheek',(s*.11,1.02,.46),(.16,.13,.13),light,'head')
        ell(m,'seated round thigh',(s*.33,.28,.07),(.24,.25,.25),c)
        ell(m,'seated hind paw',(s*.39,.09,.22),(.16,.09,.23),c)
        toes(m,s*.39,.07,.3,c,r=.045)
        if s<0:
            sweep(m,'front leg',[(s*.19,.69,.24),(s*.2,.33,.29),(s*.23,.14,.34)],[.12,.1,.11],light)
            toes(m,s*.23,.09,.37,light,r=.05)
        else:
            sweep(m,'raised puppy forepaw',[(.25,.71,.15),(.41,.7,.31),(.43,.92,.33)],[.13,.11,.12],light)
            ell(m,'rounded raised paw',(.43,.94,.33),(.125,.135,.115),light)
            ell(m,'raised soft paw pad',(.43,.93,.426),(.065,.067,.02),'#9c784c')
            for k in [-1,0,1]:ell(m,'tiny raised toe pad',(.43+k*.055,1.01,.419),(.022,.025,.014),'#9c784c')
        for k in range(4):
            m.leaf('soft ear fringe',(s*.5,1.3-k*.08,.1),(s*(.57-.025*k),1.16-k*.08,.17),.055,c,joint='head')
    ell(m,'little triangular nose',(0,1.1,.585),(.095,.065,.05),'#574432','head')
    line(m,'puppy smile',[(-.1,.98,.57),(0,.95,.579),(.1,.98,.57)],.012,'#8a6641','head')
    sweep(m,'curled fluffy tail',[(0,.35,-.25),(-.4,.29,-.4),(-.55,.53,-.45),(-.45,.75,-.4),(-.34,.77,-.35)],[.15,.15,.12,.08,.008],c,'tail')
    for k in range(9):
        a=k*math.tau/9
        m.leaf('soft chest ruff',(math.cos(a)*.2,.86,.13+math.sin(a)*.16),(math.cos(a)*.3,.56,.2+math.sin(a)*.18),.1,light)
    for k in range(7):
        x=(k-3)*.105
        fur(m,'soft puppy crown tuft',(x,1.57,.06),(x+.035,1.75-abs(k-3)*.033,-.015),.055,light,'head')
    return m

# Every evolution has its own reference-led builder. Ferronyx keeps the
# previously reviewed steel sculpture; the other thirteen live in the family.
WOLVES = (*EVOLUTION_BUILDERS, 'Ferronyx')

def wolf(name):
    return ferronyx() if name == 'Ferronyx' else EVOLUTION_BUILDERS[name]()

def main():
    requested={value.lower() for value in sys.argv[sys.argv.index('--')+1:]} if '--' in sys.argv else set()
    builders=[flarepib,lumacroak,solamphibos,lambda:leafy_otter('Verdreep',0),lambda:leafy_otter('Phantotter',1),lambda:leafy_otter('Abyreedon',2),lambda:dinosaur('Rivanos',0),lambda:dinosaur('Terrinoir',1),lambda:dinosaur('Duskuragon',2),puppy]
    names=['Flarepib','Lumacroak','Solamphibos','Verdreep','Phantotter','Abyreedon','Rivanos','Terrinoir','Duskuragon','Pupawn']
    for name,fn in zip(names,builders):
        if not requested or name.lower() in requested:fn().export(render=True)
    for name in WOLVES:
        if not requested or name.lower() in requested:
            model=wolf(name);model.export(render=False)
            if name=='Ferronyx':model.render()
            else:render_model(model,('hero','side'))

if __name__=='__main__':main()
