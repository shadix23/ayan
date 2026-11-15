# Renders transparent PNG sequences of the V2.1 firefly for the video lessons (video/public/firefly/<Clip>/NNN.png).
# Usage: /Applications/Blender.app/Contents/MacOS/Blender -b assets-src/firefly.blend -P assets-src/render_firefly_frames.py -- Idle Explaining
# 30 fps, file 000.png is frame 1. Looping clips skip the last frame (it equals the first).
# Camera: slightly from the character's left, so in the video the firefly is turned towards the board on the viewer's left.
import bpy, os, sys, math
from mathutils import Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
CLIPS = argv or ['Idle', 'Greeting', 'Explaining', 'Helping', 'Thinking', 'Encouraging', 'Celebrating']
LOOPS = {'Idle', 'Explaining', 'Thinking', 'Helping'}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'video', 'public', 'firefly')
SIZE = int(os.environ.get('AYAN_FRAME_SIZE', '720'))

sc = bpy.context.scene; ao = bpy.data.objects['Аян']; co = bpy.data.objects['Camera']; sc.camera = co
sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.compression = 60
try: sc.eevee.taa_render_samples = 24
except Exception: pass
az, el, dist, target = math.radians(18), math.radians(7), 7.0, Vector((0, 0, 1.3))
co.location = target + Vector((math.sin(az) * math.cos(el) * dist, -math.cos(az) * math.cos(el) * dist, math.sin(el) * dist))
co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()

for name in CLIPS:
    act = bpy.data.actions[name]
    for pb in ao.pose.bones: pb.rotation_quaternion = Quaternion(); pb.location = Vector(); pb.scale = Vector((1, 1, 1))
    ao.animation_data.action = act
    try:
        if act.slots: ao.animation_data.action_slot = act.slots[0]
    except Exception: pass
    end = int(act.frame_range[1]); last = end - 1 if name in LOOPS else end
    folder = os.path.join(OUT, name); os.makedirs(folder, exist_ok=True)
    for f in range(1, last + 1):
        sc.frame_set(f); sc.render.filepath = os.path.join(folder, '%03d.png' % (f - 1)); bpy.ops.render.render(write_still=True)
    print('RENDERED', name, last, flush=True)
