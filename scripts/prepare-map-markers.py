"""Bake the existing SVG sRGB colour matrices once, without resizing or lossy compression."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'dist/map-study/assets/markers'
crops={'komi':(25,30,380,400),'kalyazin':(435,25,320,410),'chuvashia':(727,60,430,365),'caucasus':(1200,0,310,435),'moscow':(45,505,470,430),'udmurtia':(555,515,420,420),'kazan':(1015,525,485,410)}
for theme in ('life','death'):
    source=Image.open(root/f'engraved-sheet-{theme}-v1.webp').convert('RGBA')
    for name,(x,y,w,h) in crops.items():
        image=source.crop((x,y,x+w,y+h)); pixels=[]
        for r,g,b,a in image.getdata():
            luminance=(.2126*r+.7152*g+.0722*b)/255
            alpha=(a/255-luminance) if theme=='life' else (luminance-.067*a/255)
            pixels.append(((0,0,0) if theme=='life' else (255,255,255))+(round(max(0,min(1,alpha))*255),))
        image.putdata(pixels)
        # Match the original clipped sickle artwork exactly.
        if name=='kalyazin':
            for yy in range(130,h):
                for xx in range(270,w): image.putpixel((xx,yy),(0,0,0,0))
        image.save(root/f'{name}-{theme}-baked.webp',lossless=True,exact=True,method=6)
print('Prepared 14 full-resolution, lossless marker crops')
