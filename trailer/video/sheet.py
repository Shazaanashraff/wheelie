import sys
from PIL import Image
fs=sys.argv[2:]; out=sys.argv[1]
ims=[Image.open(f'out/stills/f{x}.jpg') for x in fs]
w,h=ims[0].size; rows=(len(ims)+1)//2
sheet=Image.new('RGB',(w*2,h*rows),'black')
for i,im in enumerate(ims): sheet.paste(im,((i%2)*w,(i//2)*h))
sheet.save(out,quality=80)
