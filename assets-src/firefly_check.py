# Round-trip check: import the exported GLB into an empty scene and report scale, parts, materials and clips.
import bpy, mathutils, json, os
ROOT=os.environ.get('AYAN_ROOT','/Users/nurma/Desktop/ClaudeProject/ayan')
bpy.ops.wm.read_homefile(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'dist/assets/mascot/firefly.glb'))
ms=[o for o in bpy.context.scene.objects if o.type=='MESH'];mn=mathutils.Vector((9,9,9));mx=-mn
for o in ms:
    for c in o.bound_box:
        w=o.matrix_world@mathutils.Vector(c);mn=mathutils.Vector(map(min,mn,w));mx=mathutils.Vector(map(max,mx,w))
print('CHECK',json.dumps({'meshes':len(ms),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms),'height_m':round(mx.z-mn.z,3),'min_z':round(mn.z,3),
 'materials':sorted({m.name for o in ms for m in o.data.materials}),'animations':sorted(a.name for a in bpy.data.actions),
 'wing_alpha':[m.blend_method if hasattr(m,'blend_method') else '' for m in bpy.data.materials if 'wing' in m.name]},ensure_ascii=False))
