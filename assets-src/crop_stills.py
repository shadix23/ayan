# Crops the Blender stills to the character with an even margin, square 512 px, transparent. Same scale for every state
# (one shared box), so switching states never makes the character jump. Run: python assets-src/crop_stills.py
from PIL import Image
import glob, os
files=sorted(glob.glob('dist/assets/mascot/stills/*.png'))
ims={f:Image.open(f).convert('RGBA') for f in files}
box=None
for im in ims.values():
    b=im.getchannel('A').point(lambda v:255 if v>6 else 0).getbbox()
    box=b if box is None else (min(box[0],b[0]),min(box[1],b[1]),max(box[2],b[2]),max(box[3],b[3]))
w,h=box[2]-box[0],box[3]-box[1];side=int(max(w,h)*1.08);cx,cy=(box[0]+box[2])//2,(box[1]+box[3])//2
crop=(cx-side//2,cy-side//2,cx-side//2+side,cy-side//2+side)
for f,im in ims.items():
    out=Image.new('RGBA',(side,side),(0,0,0,0));out.alpha_composite(im.crop(crop))
    out.resize((512,512),Image.LANCZOS).save(f,optimize=True)
print('cropped',len(files),'box',box,'side',side)
