# Renders transparent PNG sequences of Ayan clips for the video lessons (video/public/ayan/<Clip>/NNN.png).
# Usage: /Applications/Blender.app/Contents/MacOS/Blender -b assets-src/ayan.blend -P assets-src/render_video_frames.py -- Idle Explain Wave
# 30 fps, one PNG per frame. Looping clips skip the last frame (it equals the first).
import bpy, os, sys

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
CLIPS = argv or ['Idle', 'Explain', 'Wave', 'PointLeft', 'Think', 'Nod']
LOOPS = {'Idle', 'Listen', 'Rest', 'Explain', 'FlyLoop', 'Assistant'}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'video', 'public', 'ayan')
SIZE = int(os.environ.get('AYAN_FRAME_SIZE', '600'))

sc = bpy.context.scene
sc.camera = bpy.data.objects['StillCam']
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = SIZE
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.image_settings.compression = 60
try:
    sc.eevee.taa_render_samples = 16
except Exception:
    pass

# The lesson card is a prop of the Explain clip for the teacher screen; in videos Ayan talks with free hands.
card = bpy.data.objects.get('Ayan Card')
if card:
    card.hide_render = True

def activate(name):
    action = bpy.data.actions[name]
    for slot in action.slots:
        obj = bpy.data.objects[slot.identifier[2:]]
        ad = obj.animation_data
        ad.action = action
        ad.action_slot = slot
    return int(action.frame_range[1])

for name in CLIPS:
    end = activate(name)
    last = end - 1 if name in LOOPS else end
    folder = os.path.join(OUT, name)
    os.makedirs(folder, exist_ok=True)
    for f in range(0, last + 1):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(folder, '%03d.png' % f)
        bpy.ops.render.render(write_still=True)
    print('RENDERED', name, last + 1, flush=True)
