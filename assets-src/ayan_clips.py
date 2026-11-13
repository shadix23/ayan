
import bpy, math
from mathutils import Euler, Vector
FPS=30
O=bpy.data.objects
NAMES={'root':'Ayan Motion Root','head':'Ayan Head Control','la':'Ayan Left Arm Control','ra':'Ayan Right Arm Control',
 'lw':'Ayan Left Wing Control','rw':'Ayan Right Wing Control','bl':'Ayan Blink L','br':'Ayan Blink R','ex':'Ayan Expression Control',
 'ebl':'Ayan Eyebrow L','ebr':'Ayan Eyebrow R','card':'Ayan Card'}
REST={k:(O[n].location.copy()) for k,n in NAMES.items()}
PI=math.pi
def ss(x):
    x=max(0.0,min(1.0,x)); return x*x*(3-2*x)
def env(t,D,a=0.3,b=0.3): return ss(t/a)*ss((D-t)/b)
def cb(t,c,w):
    d=abs(t-c)/w
    return 0.5*(1+math.cos(PI*d)) if d<1 else 0.0
def win(t,a,b,c,d):  # 0 -> rise a..b -> hold -> fall c..d
    return ss((t-a)/(b-a))*(1-ss((t-c)/(d-c)))
def cyc(t,D,hz): 
    n=max(1,round(hz*D)); return math.sin(2*PI*n*t/D)
def blink(t,times):
    return 1-0.92*max([cb(t,c,0.1) for c in times]+[0])
def base(D,t,bob=0.12,wa=0.2,whz=1.5,blinks=()):
    P={k:{'loc':[0,0,0],'rot':[0,0,0],'scl':[1,1,1]} for k in NAMES}
    if D>=2.4: P['root']['loc'][2]+=bob*math.sin(2*PI*max(1,round(D/4))*t/D)
    w=wa*cyc(t,D,whz); P['lw']['rot'][2]+=w; P['rw']['rot'][2]-=w
    b=blink(t,blinks); P['bl']['scl'][2]=b; P['br']['scl'][2]=b
    P['card']['scl']=[0.0001]*3
    return P
def card_on(P,k):
    s=max(0.0001,1.35*k); P['card']['scl']=[s,s,s]

def Idle(t,D):
    P=base(D,t,blinks=(2.6,))
    P['head']['rot'][2]+=0.12*math.sin(2*PI*t/D)       # look aside and back
    P['head']['rot'][1]+=0.035*math.sin(4*PI*t/D)
    P['ra']['rot'][1]+=0.06*math.sin(2*PI*t/D); P['la']['rot'][1]-=0.05*math.sin(2*PI*t/D)
    return P
def Listen(t,D):
    P=base(D,t,bob=0.06,blinks=(1.9,))
    P['head']['rot'][1]-=0.16; P['head']['rot'][2]-=0.10; P['head']['rot'][0]+=0.05+0.02*math.sin(2*PI*t/D)
    P['ex']['scl'][0]=1.05
    return P
def Rest(t,D):
    P=base(D,t,bob=0.0,wa=0.04,whz=0.25)
    P['root']['loc'][2]-=0.32; P['root']['loc'][2]+=0.03*math.sin(2*PI*t/D)
    P['head']['rot'][0]+=0.14; P['head']['rot'][1]+=0.05
    P['ra']['rot'][1]+=0.45; P['la']['rot'][1]-=0.25
    P['bl']['scl'][2]=0.1; P['br']['scl'][2]=0.1; P['ex']['scl'][0]=0.92
    return P
def Wave(t,D):
    P=base(D,t,blinks=()); e=env(t,D,0.35,0.4)
    P['ra']['rot'][1]+=e*(-0.95+0.28*math.sin(2*PI*2*(t-0.35)/(D-0.75)) if 0.35<t<D-0.4 else -0.95*e)
    P['head']['rot'][1]+=0.08*e; P['head']['rot'][2]+=0.1*e
    P['ex']['scl'][0]=1+0.15*e
    return P
def point(side):
    def f(t,D):
        P=base(D,t,blinks=()); e=win(t,0,0.45,0.95,D)
        s=1 if side=='R' else -1
        P['root']['rot'][2]+=s*0.5*e
        P['head']['rot'][2]+=s*0.22*e
        if side=='R': P['ra']['rot'][1]+=-0.25*e; P['ra']['rot'][2]+=0.3*e
        else: P['la']['rot'][1]+=0.95*e; P['la']['rot'][2]-=0.15*e
        P['ex']['scl'][0]=1+0.08*e
        return P
    return f
def Explain(t,D):
    P=base(D,t,bob=0.06,blinks=(2.2,))
    card_on(P,1.0)
    P['ra']['rot'][1]-=0.18; P['ra']['rot'][2]-=0.12
    P['head']['rot'][2]+=0.12; P['head']['rot'][0]+=0.06+0.06*(0.5-0.5*math.cos(2*PI*3*t/D))
    P['ex']['scl'][2]=1+0.3*max(0.0,math.sin(2*PI*4*t/D)); P['ex']['scl'][0]=1.06
    return P
def Think(t,D):
    P=base(D,t,blinks=()); e=env(t,D,0.45,0.45)
    P['ra']['rot'][1]-=1.25*e; P['ra']['rot'][2]+=0.55*e
    P['head']['rot'][0]-=0.14*e; P['head']['rot'][2]-=0.16*e; P['head']['rot'][1]-=0.06*e
    P['ebl']['loc'][2]+=0.07*e; P['ebr']['loc'][2]+=0.07*e
    P['ex']['scl'][0]=1-0.1*e
    return P
def Encourage(t,D):
    P=base(D,t,blinks=()); e=env(t,D,0.35,0.4)
    P['head']['rot'][0]+=0.16*cb(t,0.7,0.35); P['head']['rot'][1]+=0.07*e
    P['ra']['rot'][1]-=0.3*e; P['ra']['rot'][2]+=0.35*e
    P['ex']['scl'][0]=1+0.12*e
    return P
def Nod(t,D):
    P=base(D,t,blinks=())
    P['head']['rot'][0]+=0.18*cb(t,0.45,0.4)
    P['ex']['scl'][0]=1+0.12*cb(t,0.5,0.5)
    return P
def Celebrate(t,D):
    P=base(D,t,wa=0.28,whz=2.5,blinks=()); e=env(t,D,0.5,0.5)
    P['root']['loc'][2]+=0.55*e
    P['root']['rot'][2]+=2*PI*ss((t-0.5)/1.4)
    P['ra']['rot'][1]-=1.15*e; P['la']['rot'][1]+=1.15*e
    P['ex']['scl'][0]=1+0.2*e; P['ex']['scl'][2]=1+0.2*e
    P['ebl']['loc'][2]+=0.04*e; P['ebr']['loc'][2]+=0.04*e
    return P
def Plant(t,D):
    P=base(D,t,blinks=()); lean=win(t,0,0.5,1.4,D)
    P['root']['rot'][0]+=0.32*lean; P['root']['loc'][2]-=0.25*lean
    P['ra']['rot'][1]+=0.35*lean; P['ra']['rot'][0]+=0.4*lean
    pat=win(t,0.7,0.8,1.2,1.35)*math.sin(2*PI*5*(t-0.7))
    P['ra']['rot'][2]+=0.15*pat; P['la']['rot'][2]-=0.15*pat
    P['head']['rot'][0]+=0.22*win(t,0.2,0.6,1.6,D)
    P['ex']['scl'][0]=1+0.1*win(t,1.0,1.4,1.7,D)
    return P
FLY_Z=0.25; FLY_TILT=0.2
def fly_pose(P,k,t,D,hz=4):
    P['root']['loc'][2]+=FLY_Z*k; P['root']['rot'][0]+=FLY_TILT*k
    P['ra']['rot'][1]+=0.35*k; P['la']['rot'][1]-=0.35*k
    P['head']['rot'][0]-=0.1*k
def TakeOff(t,D):
    P=base(D,t,wa=0.0); k=ss((t-0.15)/(D-0.15))
    P['root']['loc'][2]-=0.15*cb(t,0.12,0.15); P['root']['scl']=[1+0.04*cb(t,0.12,0.15),1+0.04*cb(t,0.12,0.15),1-0.06*cb(t,0.12,0.15)]
    fly_pose(P,k,t,D)
    w=(0.2+0.25*k)*math.sin(2*PI*2*t/D)  # 2 flaps, accelerating amplitude
    P['lw']['rot'][2]+=w; P['rw']['rot'][2]-=w
    return P
def FlyLoop(t,D):
    P=base(D,t,wa=0.45,whz=4.2); fly_pose(P,1,t,D)
    P['root']['loc'][2]+=0.08*math.sin(2*PI*t/D)
    return P
def Land(t,D):
    P=base(D,t,wa=0.0); k=1-ss(t/(D-0.12))
    fly_pose(P,k,t,D)
    w=(0.2+0.25*k)*math.sin(2*PI*2*t/D); P['lw']['rot'][2]+=w; P['rw']['rot'][2]-=w
    d=cb(t,0.45,0.15); P['root']['loc'][2]-=0.1*d; P['root']['scl']=[1+0.03*d,1+0.03*d,1-0.05*d]
    return P
def Spin(t,D):
    P=base(D,t,wa=0.25,whz=2.5); e=env(t,D,0.3,0.3)
    P['root']['rot'][2]+=2*PI*ss(t/D); P['root']['loc'][2]+=0.2*e
    P['ra']['rot'][1]-=0.4*e; P['la']['rot'][1]+=0.4*e; P['ex']['scl'][0]=1+0.15*e
    return P
def Jump(t,D):
    P=base(D,t,wa=0.25,whz=3)
    c=cb(t,0.15,0.15); l=cb(t,0.85,0.15)
    P['root']['loc'][2]+=-0.15*c+0.9*cb(t,0.5,0.32)-0.08*l
    sq=c+0.6*l; P['root']['scl']=[1+0.05*sq,1+0.05*sq,1-0.08*sq]
    up=cb(t,0.5,0.35); P['ra']['rot'][1]-=0.9*up; P['la']['rot'][1]+=0.9*up
    P['ex']['scl'][0]=1+0.2*cb(t,0.5,0.45)
    return P
def Greet(t,D):
    P=base(D,t,blinks=(2.2,)); peek=1-ss(t/0.8)
    P['root']['loc'][0]-=0.7*peek; P['root']['rot'][1]-=0.35*peek; P['head']['rot'][1]-=0.2*peek
    w=win(t,0.7,1.0,1.9,2.2)
    P['ra']['rot'][1]+=w*(-0.95+0.28*math.sin(2*PI*2*(t-1.0)/0.9))
    P['ex']['scl'][0]=1+0.15*win(t,0.5,0.9,2.0,D)
    return P
def Assistant(t,D):
    P=base(D,t,bob=0.05,blinks=(1.4,))
    card_on(P,1.0)
    P['ra']['rot'][1]-=0.1; P['ra']['rot'][2]-=0.25
    P['head']['rot'][2]+=0.18; P['head']['rot'][0]+=0.1-0.08*cb(t,2.0,0.5)
    return P

CLIPS=[('Idle',4.0,True,1,'всегда в покое',Idle),('Listen',3.0,True,1,'ребёнок думает 5+ секунд',Listen),('Rest',4.0,True,1,'перерыв',Rest),
 ('Wave',1.6,False,2,'приветствие, верный ответ',Wave),('PointLeft',1.5,False,2,'подсказка: задание слева',point('L')),('PointRight',1.5,False,2,'подсказка: задание справа',point('R')),
 ('Explain',3.0,True,2,'показ шага урока',Explain),('Think',2.0,False,2,'не знаю / вторая подсказка',Think),
 ('Encourage',1.5,False,2,'неверный ответ',Encourage),('Nod',1.0,False,2,'верный ответ в игре',Nod),('Celebrate',2.4,False,3,'игра или урок завершены',Celebrate),
 ('Plant',2.0,False,2,'посажен цветок в саду',Plant),('TakeOff',0.6,False,2,'начало перелёта',TakeOff),('FlyLoop',1.2,True,2,'перелёт',FlyLoop),('Land',0.6,False,2,'конец перелёта',Land),
 ('Spin',1.6,False,3,'лендинг: Покрутись',Spin),('Jump',1.0,False,3,'лендинг: наведение на Я ученик',Jump),('Greet',2.5,False,3,'лендинг: первый экран',Greet),('Assistant',3.0,True,1,'учитель: Спросить Аяна',Assistant)]

def build():
    sc=bpy.context.scene; sc.render.fps=FPS
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for k,n in NAMES.items():
        o=O[n]; o.rotation_mode='QUATERNION'; ad=o.animation_data_create(); ad.action=None
        for tr in list(ad.nla_tracks): ad.nla_tracks.remove(tr)
    for name,D,loop,inten,ev,fn in CLIPS:
        A=bpy.data.actions.new(name); A.use_fake_user=True
        layer=A.layers.new('L'); strip=layer.strips.new(type='KEYFRAME')
        nf=int(round(D*FPS))
        frames=[fn(i/FPS,D) for i in range(nf+1)]
        for k,n in NAMES.items():
            o=O[n]; slot=A.slots.new(id_type='OBJECT',name=n); bag=strip.channelbags.new(slot)
            series={}
            for i,P in enumerate(frames):
                p=P[k]; loc=REST[k]+Vector(p['loc']); q=Euler(p['rot'],'XYZ').to_quaternion()
                vals={('location',j):loc[j] for j in range(3)}
                vals.update({('rotation_quaternion',j):q[j] for j in range(4)})
                vals.update({('scale',j):p['scl'][j] for j in range(3)})
                for key,v in vals.items(): series.setdefault(key,[]).extend((i,v))
            for (path,idx),co in series.items():
                fc=bag.fcurves.new(path,index=idx); fc.keyframe_points.add(nf+1); fc.keyframe_points.foreach_set('co',co)
                for kp in fc.keyframe_points: kp.interpolation='LINEAR'
                fc.update()
            ad=o.animation_data; tr=ad.nla_tracks.new(); tr.name=name
            st=tr.strips.new(name,0,A)
            try: st.action_slot=slot
            except Exception as e: print('slot',e)
            tr.mute=True
    print('built',len(CLIPS))
