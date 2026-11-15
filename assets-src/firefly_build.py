# Аян, new firefly mascot (V2.1, docs/briefs/edtech-v2-claude/requirements/MASCOT_REDESIGN_AND_UI.md).
# Reproducible: builds the model, materials, a simple rig and seven clips from scratch, saves assets-src/firefly.blend,
# exports dist/assets/mascot/firefly.glb, renders stills per state and a front/side/three-quarter sheet.
# Run inside Blender:  exec(open('assets-src/firefly_build.py').read())   or   blender -b -P assets-src/firefly_build.py
# Design: small friendly firefly, matte body, warm honey abdomen, beige round head, calm face readable at 96 px.
# No glow/bloom/particles as the basis of the look. Rigid parts parented to bones (no skinning) = clean glTF.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix, Quaternion, Euler

ROOT = os.environ.get('AYAN_ROOT', '/Users/nurma/Desktop/ClaudeProject/ayan')
FPS = 30
C = {  # palette (linear conversion below); matches dist/v2/tokens.css
    'head': '#E6C792', 'body': '#2F6F65', 'belly': '#F4B740', 'limb': '#2F6F65', 'stalk': '#2C3A39', 'tip': '#F2C14E',
    'eye': '#1D2833', 'glint': '#FFFFFF', 'mouth': '#3A2A26', 'wing': '#B9DFCF', 'cheek': '#F2B5A0'}

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

def reset():
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.context.scene; sc.render.fps = FPS
    return sc

def material(name, hexcol, rough=0.78, alpha=1.0, spec=0.25):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = lin(hexcol); p.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in p.inputs: p.inputs[k].default_value = spec; break
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(m, attr, val)
            except Exception: pass
    m.diffuse_color = lin(hexcol)[:3] + (alpha,)
    return m

def ellipsoid(name, center, radii, mat, seg=32, rings=20, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector(radii), verts=bm.verts)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.location = center; o.rotation_euler = Euler(rot); me.materials.append(mat)
    return o

def tube(name, pts, radius, mat, res=10):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cu.resolution_u = res
    tmp = bpy.data.objects.new(name + ' curve', cu); bpy.context.scene.collection.objects.link(tmp); cu.materials.append(mat)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp); bpy.data.curves.remove(cu)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if not me.materials: me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return o

def head_surface_y(x, z, hc=(0, 0, 1.58), hr=(0.62, 0.55, 0.52)):
    k = 1 - ((x - hc[0]) / hr[0]) ** 2 - ((z - hc[2]) / hr[2]) ** 2
    return hc[1] - hr[1] * math.sqrt(max(0.0, k))

def build():
    sc = reset()
    M = {k: material('Аян | ' + k, v, rough=0.3 if k in ('eye',) else 0.12 if k == 'glint' else 0.7 if k == 'wing' else 0.78, alpha=0.72 if k == 'wing' else 1.0, spec=0.5 if k == 'eye' else 0.25) for k, v in C.items()}
    parts = {}
    HC, HR = (0, 0, 1.58), (0.62, 0.55, 0.52)
    parts['Head'] = ellipsoid('Head', HC, HR, M['head'], seg=48, rings=32)
    parts['Thorax'] = ellipsoid('Thorax', (0, 0.0, 1.02), (0.42, 0.35, 0.29), M['body'], seg=40, rings=24)
    parts['Abdomen'] = ellipsoid('Abdomen', (0, -0.03, 0.56), (0.45, 0.41, 0.41), M['belly'], seg=40, rings=28)
    for s, side in ((1, 'L'), (-1, 'R')):
        parts['Leg' + side] = ellipsoid('Leg ' + side, (0.17 * s, 0.0, 0.21), (0.085, 0.085, 0.17), M['limb'], seg=20, rings=12)
        parts['Foot' + side] = ellipsoid('Foot ' + side, (0.185 * s, -0.07, 0.065), (0.13, 0.19, 0.072), M['limb'], seg=24, rings=12)
        # arm: an elongated capsule from the shoulder, hanging slightly outwards
        sh = Vector((0.38 * s, -0.02, 1.10)); d = Vector((0.36 * s, -0.08, -0.93)).normalized(); L = 0.48
        arm = ellipsoid('Arm ' + side, sh + d * (L / 2), (0.078, 0.078, L / 2 + 0.03), M['limb'], seg=20, rings=14)
        arm.rotation_mode = 'QUATERNION'; arm.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); parts['Arm' + side] = arm
        # wings: two thin leaf shapes per side, behind the thorax
        parts['WingUp' + side] = ellipsoid('Wing Upper ' + side, (0.46 * s, 0.30, 1.16), (0.42, 0.014, 0.16), M['wing'], seg=32, rings=10, rot=(0, math.radians(-22 * s), math.radians(-24 * s)))
        parts['WingLo' + side] = ellipsoid('Wing Lower ' + side, (0.38 * s, 0.33, 0.92), (0.32, 0.012, 0.13), M['wing'], seg=28, rings=10, rot=(0, math.radians(-44 * s), math.radians(-20 * s)))
        # antenna: a soft curve and a honey tip
        base = Vector((0.15 * s, -0.04, 2.03)); mid = Vector((0.22 * s, -0.05, 2.23)); top = Vector((0.33 * s, -0.02, 2.39))
        parts['Antenna' + side] = tube('Antenna ' + side, [base, mid, top], 0.024, M['stalk'])
        parts['Tip' + side] = ellipsoid('Antenna Tip ' + side, top + Vector((0.025 * s, 0, 0.04)), (0.075, 0.07, 0.065), M['tip'], seg=20, rings=12)
        # face: eyes sit on the head surface, glint up and towards the centre, calm (no raised brows)
        ex, ez = 0.205 * s, 1.60
        ey = head_surface_y(ex, ez, HC, HR) + 0.012
        n = Vector((ex / HR[0] ** 2, (ey - HC[1]) / HR[1] ** 2, (ez - HC[2]) / HR[2] ** 2)).normalized()
        eye = ellipsoid('Eye ' + side, (ex, ey, ez), (0.086, 0.048, 0.118), M['eye'], seg=24, rings=16)
        eye.rotation_mode = 'QUATERNION'; eye.rotation_quaternion = Vector((0, -1, 0)).rotation_difference(-n); parts['Eye' + side] = eye
        parts['Glint' + side] = ellipsoid('Eye Glint ' + side, (ex - 0.022 * s + 0.0, ey - 0.04, ez + 0.042), (0.024, 0.012, 0.026), M['glint'], seg=12, rings=8)
        cx, cz = 0.36 * s, 1.46
        parts['Cheek' + side] = ellipsoid('Cheek ' + side, (cx, head_surface_y(cx, cz, HC, HR) + 0.02, cz), (0.06, 0.012, 0.036), M['cheek'], seg=16, rings=8)
    # mouth: small, soft smile on the head surface
    pts = []
    for i in range(7):
        x = -0.085 + 0.17 * i / 6; z = 1.435 - 0.032 * (1 - (x / 0.085) ** 2)
        pts.append(Vector((x, head_surface_y(x, z, HC, HR) - 0.004, z)))
    parts['Mouth'] = tube('Mouth', pts, 0.0155, M['mouth'], res=6)
    return sc, parts, M

def rig(sc, parts):
    arm_data = bpy.data.armatures.new('Аян rig'); ao = bpy.data.objects.new('Аян', arm_data); sc.collection.objects.link(ao)
    vl = sc.view_layers[0]; vl.objects.active = ao; ao.select_set(True)
    wins = bpy.context.window_manager.windows
    ctx = dict(window=wins[0], view_layer=vl, active_object=ao, object=ao, selected_objects=[ao]) if len(wins) else dict(view_layer=vl, active_object=ao, object=ao)
    with bpy.context.temp_override(**ctx):
        bpy.ops.object.mode_set(mode='EDIT')
        _edit_bones(arm_data)
        bpy.ops.object.mode_set(mode='OBJECT')
    return _attach(ao, parts)

def _edit_bones(arm_data):
    eb = arm_data.edit_bones
    def bone(n, h, t, parent=None):
        b = eb.new(n); b.head = h; b.tail = t
        if parent: b.parent = eb[parent]
        return b
    bone('root', (0, 0, 0), (0, 0, 0.3))
    bone('body', (0, 0, 0.36), (0, 0, 1.18), 'root')
    bone('head', (0, 0, 1.20), (0, 0, 2.08), 'body')
    for s, side in ((1, 'L'), (-1, 'R')):
        bone('arm.' + side, (0.38 * s, -0.02, 1.10), (0.38 * s + 0.36 * s * 0.5, -0.06, 1.10 - 0.93 * 0.5), 'body')
        bone('wing.' + side, (0.12 * s, 0.24, 1.08), (0.56 * s, 0.42, 1.18), 'body')
        bone('antenna.' + side, (0.15 * s, -0.04, 2.03), (0.33 * s, -0.02, 2.39), 'head')
        bone('eye.' + side, (0.205 * s, -0.40, 1.60), (0.205 * s, -0.62, 1.60), 'head')
    bone('mouth', (0, -0.40, 1.43), (0, -0.60, 1.43), 'head')

def _attach(ao, parts):
    owner = {'Head': 'head', 'Thorax': 'body', 'Abdomen': 'body', 'Mouth': 'mouth'}
    for s, side in (('L', 'L'), ('R', 'R')):
        owner.update({'Leg' + s: 'root', 'Foot' + s: 'root', 'Arm' + s: 'arm.' + s, 'WingUp' + s: 'wing.' + s, 'WingLo' + s: 'wing.' + s,
                      'Antenna' + s: 'antenna.' + s, 'Tip' + s: 'antenna.' + s, 'Eye' + s: 'eye.' + s, 'Glint' + s: 'eye.' + s, 'Cheek' + s: 'head'})
    for key, o in parts.items():
        b = owner[key]; mw = o.matrix_world.copy()
        o.parent = ao; o.parent_type = 'BONE'; o.parent_bone = b
        o.matrix_world = mw  # keep the modelled position
    for pb in ao.pose.bones: pb.rotation_mode = 'QUATERNION'
    return ao

# ---- animation helpers: rotations given in armature space, converted to each bone's local space ----
def q_axis(pb, axis, deg):
    R = pb.bone.matrix_local.to_3x3(); q = Matrix.Rotation(math.radians(deg), 3, Vector(axis))
    return (R.inverted() @ q @ R).to_quaternion()
def q_aim(pb, direction, extra=None):
    R = pb.bone.matrix_local.to_3x3(); d0 = (R @ Vector((0, 1, 0))).normalized()
    q = d0.rotation_difference(Vector(direction).normalized()).to_matrix()
    return (R.inverted() @ q @ R).to_quaternion()
def loc_world(pb, v):
    R = pb.bone.matrix_local.to_3x3(); return R.inverted() @ Vector(v)

def make_clip(ao, name, length, keys, loop):
    """keys: {frame: {bone: {'q':Quaternion,'loc':Vector,'scale':Vector}}}. Bones not mentioned stay at rest."""
    act = bpy.data.actions.new(name); act.use_fake_user = True
    ao.animation_data_create(); ao.animation_data.action = act
    first, last = min(keys), max(keys)
    for f in (first, last):
        for pb in ao.pose.bones: keys[f].setdefault(pb.name, {})
    used = set(b for f in keys.values() for b in f)
    for pb in ao.pose.bones:
        pb.rotation_quaternion = Quaternion(); pb.location = Vector(); pb.scale = Vector((1, 1, 1))
    for f in sorted(keys):
        for bname in used:
            pb = ao.pose.bones[bname]; k = keys[f].get(bname, None)
            if k is None: continue
            if f == last and loop and not k and keys[first].get(bname): k = keys[first][bname]
            pb.rotation_quaternion = k.get('q', Quaternion()); pb.location = k.get('loc', Vector()); pb.scale = k.get('scale', Vector((1, 1, 1)))
            pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f); pb.keyframe_insert('scale', frame=f)
    act.frame_range = (1, length)
    try: act.use_cyclic = loop
    except Exception: pass
    return act

def clips(ao):
    P = ao.pose.bones; I = Quaternion(); one = Vector((1, 1, 1))
    def pose(**b): return b
    # Eye blink uses the eye bones' local scale on the axis that maps to world Z
    def eye_scale(pb, zf):
        R = pb.bone.matrix_local.to_3x3(); axes = [R @ Vector(v) for v in ((1, 0, 0), (0, 1, 0), (0, 0, 1))]
        s = [1, 1, 1]; i = max(range(3), key=lambda k: abs(axes[k].z)); s[i] = zf; return Vector(s)
    def blinkkeys(f0):
        return {f0: {'eye.L': {'scale': one}, 'eye.R': {'scale': one}}, f0 + 2: {'eye.L': {'scale': eye_scale(P['eye.L'], 0.12)}, 'eye.R': {'scale': eye_scale(P['eye.R'], 0.12)}},
                f0 + 5: {'eye.L': {'scale': one}, 'eye.R': {'scale': one}}}
    def merge(*ds):
        out = {}
        for d in ds:
            for f, b in d.items(): out.setdefault(f, {}).update(b)
        return out
    rest = lambda f, *names: {f: {n: {'q': I} for n in names}}
    hang = lambda s: (0.36 * s, -0.06, -0.93)
    acts = []
    # Idle 120f loop: slow breath, tiny head tilt and wing/antenna sway, one blink.
    acts.append(make_clip(ao, 'Idle', 120, merge(
        {1: {'body': {'scale': one}, 'head': {'q': q_axis(P['head'], (0, 1, 0), 1.5)}, 'wing.L': {'q': I}, 'wing.R': {'q': I}, 'antenna.L': {'q': I}, 'antenna.R': {'q': I}},
         60: {'body': {'scale': Vector((1, 1.012, 1))}, 'head': {'q': q_axis(P['head'], (0, 1, 0), -1.5)}, 'wing.L': {'q': q_axis(P['wing.L'], (0, 1, 0), -5)}, 'wing.R': {'q': q_axis(P['wing.R'], (0, 1, 0), 5)},
              'antenna.L': {'q': q_axis(P['antenna.L'], (0, 1, 0), -4)}, 'antenna.R': {'q': q_axis(P['antenna.R'], (0, 1, 0), 4)}},
         120: {'body': {'scale': one}, 'head': {'q': q_axis(P['head'], (0, 1, 0), 1.5)}, 'wing.L': {'q': I}, 'wing.R': {'q': I}, 'antenna.L': {'q': I}, 'antenna.R': {'q': I}}},
        blinkkeys(82)), True))
    # Greeting 60f once: right arm up beside the head, two small waves, head tilt; back to rest.
    up = lambda deg: q_aim(P['arm.R'], (-math.sin(math.radians(deg)), -0.22, math.cos(math.radians(deg))))
    acts.append(make_clip(ao, 'Greeting', 60, {
        1: {'arm.R': {'q': I}, 'head': {'q': I}}, 12: {'arm.R': {'q': up(50)}, 'head': {'q': q_axis(P['head'], (0, 1, 0), -6)}},
        20: {'arm.R': {'q': up(72)}}, 28: {'arm.R': {'q': up(46)}}, 36: {'arm.R': {'q': up(72)}}, 44: {'arm.R': {'q': up(52)}, 'head': {'q': q_axis(P['head'], (0, 1, 0), -6)}},
        60: {'arm.R': {'q': I}, 'head': {'q': I}}}, False))
    # Explaining 90f loop: open right hand forward to the side (towards the task), gentle nod.
    fw = lambda a: q_aim(P['arm.R'], (-0.62, -0.55 - a, -0.35 + a))
    acts.append(make_clip(ao, 'Explaining', 90, {
        1: {'arm.R': {'q': fw(0)}, 'head': {'q': q_axis(P['head'], (1, 0, 0), 2)}}, 45: {'arm.R': {'q': fw(0.12)}, 'head': {'q': q_axis(P['head'], (1, 0, 0), -3)}},
        90: {'arm.R': {'q': fw(0)}, 'head': {'q': q_axis(P['head'], (1, 0, 0), 2)}}}, True))
    # Thinking 90f loop: head tilt, right hand up to the chin, eyes look up a little.
    chin = q_aim(P['arm.R'], (0.30, -0.88, 0.37))
    look = lambda pb: loc_world(pb, (0, 0, 0.022))
    acts.append(make_clip(ao, 'Thinking', 90, {
        1: {'arm.R': {'q': chin}, 'head': {'q': q_axis(P['head'], (0, 1, 0), -8)}, 'eye.L': {'loc': look(P['eye.L'])}, 'eye.R': {'loc': look(P['eye.R'])}, 'antenna.L': {'q': q_axis(P['antenna.L'], (0, 1, 0), -6)}},
        45: {'arm.R': {'q': chin}, 'head': {'q': q_axis(P['head'], (0, 1, 0), -10)}, 'eye.L': {'loc': look(P['eye.L'])}, 'eye.R': {'loc': look(P['eye.R'])}, 'antenna.L': {'q': q_axis(P['antenna.L'], (0, 1, 0), -10)}},
        90: {'arm.R': {'q': chin}, 'head': {'q': q_axis(P['head'], (0, 1, 0), -8)}, 'eye.L': {'loc': look(P['eye.L'])}, 'eye.R': {'loc': look(P['eye.R'])}, 'antenna.L': {'q': q_axis(P['antenna.L'], (0, 1, 0), -6)}}}, True))
    # Encouraging 48f once: two calm nods, both hands slightly up and open.
    open_ = lambda pb, s: q_aim(pb, (0.55 * s, -0.45, -0.55))
    acts.append(make_clip(ao, 'Encouraging', 48, {
        1: {'head': {'q': I}, 'arm.L': {'q': I}, 'arm.R': {'q': I}}, 10: {'head': {'q': q_axis(P['head'], (1, 0, 0), -9)}, 'arm.L': {'q': open_(P['arm.L'], 1)}, 'arm.R': {'q': open_(P['arm.R'], -1)}},
        18: {'head': {'q': q_axis(P['head'], (1, 0, 0), 2)}}, 26: {'head': {'q': q_axis(P['head'], (1, 0, 0), -8)}}, 34: {'head': {'q': I}, 'arm.L': {'q': open_(P['arm.L'], 1)}, 'arm.R': {'q': open_(P['arm.R'], -1)}},
        48: {'head': {'q': I}, 'arm.L': {'q': I}, 'arm.R': {'q': I}}}, False))
    # Celebrating 54f once: a small hop with both arms up, short wing flutter. No confetti, no sound.
    hop = lambda h: loc_world(P['root'], (0, 0, h))
    upb = lambda pb, s: q_aim(pb, (0.78 * s, -0.22, 0.58))
    acts.append(make_clip(ao, 'Celebrating', 54, {
        1: {'root': {'loc': Vector()}, 'arm.L': {'q': I}, 'arm.R': {'q': I}, 'wing.L': {'q': I}, 'wing.R': {'q': I}},
        10: {'root': {'loc': hop(-0.03)}, 'arm.L': {'q': upb(P['arm.L'], 1)}, 'arm.R': {'q': upb(P['arm.R'], -1)}},
        18: {'root': {'loc': hop(0.14)}, 'wing.L': {'q': q_axis(P['wing.L'], (0, 1, 0), -16)}, 'wing.R': {'q': q_axis(P['wing.R'], (0, 1, 0), 16)}},
        24: {'wing.L': {'q': q_axis(P['wing.L'], (0, 1, 0), 6)}, 'wing.R': {'q': q_axis(P['wing.R'], (0, 1, 0), -6)}},
        28: {'root': {'loc': Vector()}, 'wing.L': {'q': q_axis(P['wing.L'], (0, 1, 0), -12)}, 'wing.R': {'q': q_axis(P['wing.R'], (0, 1, 0), 12)}},
        36: {'arm.L': {'q': upb(P['arm.L'], 1)}, 'arm.R': {'q': upb(P['arm.R'], -1)}, 'wing.L': {'q': I}, 'wing.R': {'q': I}},
        54: {'root': {'loc': Vector()}, 'arm.L': {'q': I}, 'arm.R': {'q': I}, 'wing.L': {'q': I}, 'wing.R': {'q': I}}}, False))
    # Helping 90f loop: lean towards the task on the viewer's left, point down to it, look at it.
    pt = lambda a: q_aim(P['arm.R'], (-0.75, -0.45, -0.45 + a))
    acts.append(make_clip(ao, 'Helping', 90, {
        1: {'body': {'q': q_axis(P['body'], (0, 1, 0), -4)}, 'head': {'q': q_axis(P['head'], (1, 0, 0), -7) @ q_axis(P['head'], (0, 0, 1), -10)}, 'arm.R': {'q': pt(0)}},
        45: {'body': {'q': q_axis(P['body'], (0, 1, 0), -5)}, 'head': {'q': q_axis(P['head'], (1, 0, 0), -9) @ q_axis(P['head'], (0, 0, 1), -10)}, 'arm.R': {'q': pt(0.08)}},
        90: {'body': {'q': q_axis(P['body'], (0, 1, 0), -4)}, 'head': {'q': q_axis(P['head'], (1, 0, 0), -7) @ q_axis(P['head'], (0, 0, 1), -10)}, 'arm.R': {'q': pt(0)}}}, True))
    ao.animation_data.action = bpy.data.actions['Idle']
    # NLA strips are not needed: the exporter writes every action as a separate glTF animation.
    return acts

POSE_FRAME = {'Idle': 1, 'Greeting': 20, 'Explaining': 45, 'Thinking': 45, 'Encouraging': 10, 'Celebrating': 18, 'Helping': 45}

def lights_camera(sc):
    eng = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'BLENDER_WORKBENCH'):
        if e in eng: sc.render.engine = e; break
    sc.render.film_transparent = True
    try: sc.view_settings.view_transform = 'Standard'
    except Exception: pass
    w = bpy.data.worlds.new('Soft'); sc.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (0.93, 0.95, 0.94, 1); bg.inputs[1].default_value = 0.55
    for name, loc, en, size in (('Key', (-3.5, -5, 5.5), 420, 4), ('Fill', (4, -4, 3), 150, 5), ('Rim', (0.5, 4.5, 4.5), 300, 3)):
        l = bpy.data.lights.new(name, 'AREA'); l.energy = en; l.size = size; o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector((0, 0, 1.1)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('Camera'); cam.lens = 70; co = bpy.data.objects.new('Camera', cam); sc.collection.objects.link(co); sc.camera = co
    return co

def aim_camera(co, az, el=8, dist=10.0, target=(0, 0, 1.2)):
    a = math.radians(az); e = math.radians(el); t = Vector(target)
    co.location = t + Vector((math.sin(a) * math.cos(e) * dist, -math.cos(a) * math.cos(e) * dist, math.sin(e) * dist))
    co.rotation_euler = (t - co.location).to_track_quat('-Z', 'Y').to_euler()

def render(sc, path, size):
    sc.render.resolution_x = sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

def main(render_stills=True):
    sc, parts, M = build()
    ao = rig(sc, parts)
    clips(ao)
    sc.frame_start, sc.frame_end = 1, 120
    blend = os.path.join(ROOT, 'assets-src', 'firefly.blend'); glb = os.path.join(ROOT, 'dist', 'assets', 'mascot', 'firefly.glb')
    os.makedirs(os.path.dirname(glb), exist_ok=True)
    co = lights_camera(sc)
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    # Export only the character (no camera/lights), every action as its own animation.
    bpy.ops.object.select_all(action='DESELECT')
    for o in [ao] + list(parts.values()): o.select_set(True)
    kw = dict(filepath=glb, export_format='GLB', use_selection=True, export_apply=True, export_animations=True, export_yup=True, export_cameras=False, export_lights=False)
    for k, v in (('export_animation_mode', 'ACTIONS'), ('export_force_sampling', True), ('export_optimize_animation_size', True), ('export_def_bones', False), ('export_skins', False)):
        kw[k] = v
    try: bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        for k in ('export_animation_mode', 'export_optimize_animation_size', 'export_def_bones'): kw.pop(k, None)
        bpy.ops.export_scene.gltf(**kw)
    if render_stills:
        stills = os.path.join(ROOT, 'dist', 'assets', 'mascot', 'stills'); os.makedirs(stills, exist_ok=True)
        review = os.path.join(ROOT, 'docs', 'mascot-review'); os.makedirs(review, exist_ok=True)
        aim_camera(co, 14)
        for name, f in POSE_FRAME.items():
            for pb in ao.pose.bones: pb.rotation_quaternion = Quaternion(); pb.location = Vector(); pb.scale = Vector((1, 1, 1))
            ao.animation_data.action = bpy.data.actions[name]; sc.frame_set(f)
            render(sc, os.path.join(stills, name + '.png'), 1024)
        ao.animation_data.action = bpy.data.actions['Idle']; sc.frame_set(1)
        for n, az in (('new-front.png', 0), ('new-side.png', 90), ('new-three-quarter.png', 35)):
            aim_camera(co, az); render(sc, os.path.join(review, n), 512)
        aim_camera(co, 0); render(sc, os.path.join(review, 'new-96px.png'), 96)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in parts.values())
    return {'blend': blend, 'glb': glb, 'glb_bytes': os.path.getsize(glb), 'triangles': tris, 'actions': [a.name for a in bpy.data.actions]}

if __name__ == '__main__' or True:
    RESULT = main(render_stills=os.environ.get('AYAN_NO_RENDER') != '1')
    print('FIREFLY', RESULT)
