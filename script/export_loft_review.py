#!/usr/bin/env python3
"""Build a repeatable annotation packet from the plan, renderer exports and footprints.

Usage: python script/export_loft_review.py --assets tmp/pdfs/round-3 --revision 3
Assets: ground-render.png, loft-render.png, footprints.json and review-notes.json.
Requires reportlab, Pillow and pypdf (available in the Codex bundled Python runtime).
"""
import argparse
import hashlib
import json
from pathlib import Path
import textwrap
from PIL import Image, ImageChops
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--assets', type=Path, required=True)
parser.add_argument('--revision', type=int, required=True)
args = parser.parse_args()
plan = json.loads((ROOT / 'web/public/plans/loft113.json').read_text())
footprints = json.loads((args.assets / 'footprints.json').read_text())
notes = json.loads((args.assets / 'review-notes.json').read_text())
changes = notes['changes']
assert len(footprints) == len(plan['furniture'])
out = ROOT / 'output/pdf' / f'revision-{args.revision}'
out.mkdir(parents=True, exist_ok=True)
pdf = out / f'Loft-113-Annotation-Packet-Revision-{args.revision}.pdf'
c = canvas.Canvas(str(pdf), pagesize=(864, 1152), pageCompression=1)
c.setTitle(f'Loft 113 - Annotation Packet - Revision {args.revision}')
c.setAuthor('House Control')
INK = '#243943'; MUTED = '#6d7e84'; BLUE = '#3282a1'; ORANGE = '#c88935'
FLOORS = {'oak':'#efe5d5','carpet':'#e5e1e4','tile':'#e3e9ec','deck':'#ebe5db'}
room_levels = {r['id']:r['level'] for r in plan['rooms']}
# Reserve retired labels so removing a fixture cannot renumber the owner's notes.
review = ROOT / 'output/pdf/.review-state'
previous_path = review / f'revision-{args.revision-1}.json'
previous = json.loads(previous_path.read_text()) if previous_path.exists() else {}
registry = previous.get('calloutRegistry', previous.get('callouts', {})).copy()
codes = {device_id:code for code,device_id in registry.items()}
for key,prefix in [('lights','L'),('devices','D')]:
    next_number = max([int(code[1:]) for code in registry if code.startswith(prefix)], default=0) + 1
    for v in plan[key]:
        if v['id'] not in codes:
            code = f'{prefix}{next_number:02}'; next_number += 1
            codes[v['id']] = code; registry[code] = v['id']


def text(x,y,s,size=10,color=INK,bold=False):
    c.setFillColor(HexColor(color)); c.setFont('Helvetica-Bold' if bold else 'Helvetica',size); c.drawString(x,y,s)


def lines(x,y,s,width=45,size=11,leading=16,color=MUTED):
    for line in textwrap.wrap(s,width):
        text(x,y,line,size,color); y-=leading
    return y


def header(title,sub,n):
    c.setFillColor(white); c.rect(0,0,864,1152,fill=1,stroke=0)
    text(40,1110,f'LOFT 113  /  REVISION {args.revision}',11,BLUE,True)
    text(40,1068,title,29,INK,True)
    text(40,1041,sub,11,MUTED)
    c.setStrokeColor(HexColor('#d4dde0')); c.setLineWidth(0.6); c.line(40,1020,824,1020)
    text(40,27,'Owner markup applied. Dimensions and spacing remain approximate.',8,MUTED)
    text(745,27,f'{n:02} / 06',9,INK,True)


def note_box(subtitle):
    c.setStrokeColor(HexColor('#d1dadd')); c.setLineWidth(0.8); c.roundRect(40,65,784,120,10,fill=0,stroke=1)
    text(54,166,'NEXT CORRECTIONS',9,MUTED,True)
    text(54,146,subtitle,9,MUTED)
    c.setStrokeColor(HexColor('#e5ebed')); c.setLineWidth(0.5)
    for y in [126,104,82]: c.line(54,y,810,y)


def shape_path(points,fill=True,stroke=True):
    p=c.beginPath(); p.moveTo(*points[0])
    for pt in points[1:]: p.lineTo(*pt)
    p.close(); c.drawPath(p,stroke=stroke,fill=fill)


def plan_transform(level):
    rooms=[r for r in plan['rooms'] if r['level']==level]
    z0=min(r['rect'][1] for r in rooms); z1=max(r['rect'][1]+r['rect'][3] for r in rooms)
    scale=min(55, 766/(z1-z0)); left=198 if level=='ground' else 161; top=986
    return rooms,scale,lambda p:(left+p[0]*scale,top-(p[1]-z0)*scale)


def furniture(f,dim,xy,scale,faded=False):
    w,d=dim; x,y=xy(f['pos']); typ=f['type']
    fill=f.get('color', '#bda17a' if typ in ['dresser','nightstand','counter','kitchen','sideboard','desk'] else '#d0d5d8')
    if typ in ['simRig','tv','piano','fireplace','speaker']: fill='#47505a'
    if typ in ['plant','bamboo']: fill='#79936f'
    col=HexColor(fill)
    if faded: col=Color(*[(v+2.5)/3.5 for v in col.rgb()])
    c.saveState(); c.translate(x,y); c.rotate(f.get('rot',0)); c.scale(scale,scale)
    c.setFillColor(col); c.setStrokeColor(HexColor('#a4acae') if faded else HexColor('#747d7e')); c.setLineWidth(0.018)
    if typ in ['plant','firepit','stool']:
        c.circle(0,0,w/2,fill=1,stroke=1)
    elif typ=='sectional':
        shape_path([(-w/2,d/2),(w/2,d/2),(w/2,d/2-.95),(-w/2+.95,d/2-.95),(-w/2+.95,-d/2),(-w/2,-d/2)])
        c.line(-w/2+.22,d/2-.23,w/2-.18,d/2-.23); c.line(-w/2+.23,d/2-.23,-w/2+.23,-d/2+.18)
    elif typ=='laundry':
        fw=.65; centers=[0] if f.get('stacked',True) else [-.335,.335]
        for cx in centers:
            c.rect(cx-fw/2,-.34,fw,.68,fill=1,stroke=1); c.line(cx-.25,-.28,cx+.25,-.28)
    elif typ=='diningSet':
        c.roundRect(-w/2,-.43,w,.86,.05,fill=1,stroke=1)
        for cx in [-w*.28,w*.28]:
            for cy in [-.72,.72]: c.rect(cx-.18,cy-.18,.36,.36,fill=1,stroke=1)
    else:
        c.roundRect(-w/2,-d/2,w,d,min(.04,w/5,d/5),fill=1,stroke=1)
        if typ in ['sofa','armchair','bed','vanity','simRig']:
            c.line(-w*.4,d*.31,w*.4,d*.31)
        if typ=='vanity':
            c.setFillColor(white)
            for i in range(f.get('basins',1)):
                c.ellipse((i-(f.get('basins',1)-1)/2)*w/f.get('basins',1)-.16,-.14,(i-(f.get('basins',1)-1)/2)*w/f.get('basins',1)+.16,.14,fill=1,stroke=1)
        if typ=='stairs':
            for i in range(1,14): c.line(-w/2,-d/2+i*d/14,w/2,-d/2+i*d/14)
    if typ not in ['plant','rug','railing','art','bamboo','glazing','stairs','firepit','stool']:
        c.setStrokeColor(HexColor(BLUE)); c.setLineWidth(.034); c.line(-w*.15,-d/2,w*.15,-d/2)
    c.restoreState()


def base_map(level,faded=False):
    rooms,scale,xy=plan_transform(level)
    for r in rooms:
        x,z,w,d=r['rect']; a,b=xy([x,z+d]); c.setFillColor(HexColor(FLOORS.get(r.get('floor'),'#eee')))
        c.setStrokeColor(HexColor('#bdc7ca')); c.setLineWidth(.8); c.rect(a,b,w*scale,d*scale,fill=1,stroke=1)
    indices=sorted(range(len(plan['furniture'])),key=lambda i:plan['furniture'][i]['type']!='rug')
    for i in indices:
        f=plan['furniture'][i]
        if f.get('level')==level: furniture(f,footprints[i],xy,scale,faded)
    for o in plan['openings']:
        if o['level']!=level: continue
        a,b=xy(o['from']),xy(o['to']); c.setLineWidth(4); c.setStrokeColor(white); c.line(*a,*b)
        if o.get('type')!='open':
            c.setLineWidth(1.7); c.setStrokeColor(HexColor(BLUE if o.get('type')=='window' else '#d1a170')); c.line(*a,*b)
    # Room names outside the drawing, grouped by height to keep labels readable.
    for r in rooms:
        if faded or (level=='ground' and r['id'] in ['kitchen','bath','racing']): continue
        x,z,w,d=r['rect']; px,py=xy([0,z+d/2]);
        label=r['name']; text(40,py+3,label,10,INK,True); text(40,py-11,f'{w:.2f} x {d:.2f} m',8,MUTED)
        c.setStrokeColor(HexColor('#b9c4c7')); c.setLineWidth(.5); c.line(145,py,px-8,py)
    for r in rooms:
        if faded or level!='ground' or r['id'] not in ['kitchen','bath','racing']: continue
        x,z,w,d=r['rect']; px,py=xy([x+w/2,z+d-.27 if r['id']=='racing' else z+d/2]);
        c.setFillColor(Color(1,1,1,.86)); c.roundRect(px-45,py-8,90,18,3,fill=1,stroke=0)
        c.setFillColor(HexColor(INK)); c.setFont('Helvetica-Bold',8); c.drawCentredString(px,py-2,r['name'])
    if not faded:
        text(536,225,'Modeled scale',9,MUTED,True)
        c.setStrokeColor(HexColor(INK)); c.setLineWidth(2); c.line(536,211,536+2*scale,211)
        for x,label in [(536,'0'),(536+scale,'1 m'),(536+2*scale,'2 m')]:
            c.line(x,207,x,215); text(x-3,195,label,8,MUTED)
    return xy,scale


def badge(x,y,label,color=BLUE):
    c.setFillColor(white); c.setStrokeColor(HexColor(color)); c.setLineWidth(1.2); c.circle(x,y,10,fill=1,stroke=1)
    c.setFillColor(HexColor(color)); c.setFont('Helvetica-Bold',7); c.drawCentredString(x,y-2.5,label)


def furniture_page(level,n):
    header('Ground + patio - furniture' if level=='ground' else 'Bedroom loft - furniture','Owner annotations applied | Mark further moves directly on the map.',n)
    xy,scale=base_map(level)
    text(536,975,'CHANGED IN THIS ROUND',10,BLUE,True); y=947
    for code,pos,title,desc in changes[level]:
        badge(*xy(pos),code); text(536,y,code,10,BLUE,True)
        y=lines(561,y,title,34,11,15,INK)-5
        y=lines(561,y,desc,39,10,14,MUTED)-22
    text(536,y-4,'REVIEW NOTES',10,ORANGE,True); y-=27
    lines(536,y,notes['pending'][level],42,10,15)
    note_box(notes['notePrompts'][level])
    c.showPage()


def packed(values,xy):
    order=sorted(values,key=lambda v:xy(v['pos'])[1],reverse=True); ys=[]
    for v in order: ys.append(min(xy(v['pos'])[1],(ys[-1]-22) if ys else 978))
    if ys and ys[-1]<231: ys=[y+(231-ys[-1]) for y in ys]
    return zip(order,ys)


def device_page(level,n):
    header('Ground - lights and devices' if level=='ground' else 'Loft - lights and devices','Orange: lighting circuits | Blue: mapped equipment | Device codes match revision 1.',n)
    xy,scale=base_map(level,True)
    for key,color,left in [('lights',ORANGE,True),('devices',BLUE,False)]:
        values=[v for v in plan[key] if room_levels[v['room']]==level]
        for v,y in packed(values,xy):
            x0,y0=xy(v['pos']); elbow=174 if left else 487; end=164 if left else 505
            c.setStrokeColor(HexColor(color)); c.setLineWidth(.55); c.line(x0,y0,elbow,y); c.line(elbow,y,end,y)
            c.setFillColor(HexColor(color)); c.circle(x0,y0,2.7,fill=1,stroke=0)
            if left:
                text(40,y+3,codes[v['id']],8,color,True)
                name=v['name'].replace(' · ',' / ')
                for j,s in enumerate(textwrap.wrap(name,25)): text(64,y+3-j*9,s,7.5,INK)
            else:
                text(512,y-2,codes[v['id']],8,color,True); text(539,y-2,v['name'].replace(' · ',' / '),9,INK)
    note_box('Add names, fixture types, missing devices, or arrows to correct their positions.')
    c.showPage()


def render_page(level,n):
    header('Ground + patio - angled render' if level=='ground' else 'Bedroom loft - angled render','Spatial review | Mark furniture rotations, spacing, height, and anything missing.',n)
    im=Image.open(args.assets/f'{level}-render.png').convert('RGB')
    bg=Image.new('RGB',im.size,im.getpixel((0,0)))
    mask=ImageChops.difference(im,bg).convert('L').point(lambda p:255 if p>12 else 0)
    bounds=mask.getbbox(); x0,y0,x1,y1=bounds
    im=im.crop((max(0,x0-40),max(0,y0-40),min(im.width,x1+40),min(im.height,y1+40)))
    im.save(out/f'{level}-render.png')
    w,h=im.size; factor=min(784/w,796/h); w*=factor;h*=factor
    c.drawImage(ImageReader(im),(864-w)/2,204+(796-h)/2,width=w,height=h)
    note_box('Rotate / move / add / remove - mark this view freely. See pages 1-2 for the change list.')
    c.showPage()

furniture_page('ground',1);furniture_page('loft',2)
device_page('ground',3);device_page('loft',4)
render_page('ground',5);render_page('loft',6)
c.save()
manifest={'revision':args.revision,'pdf':pdf.name,'pdfSHA256':hashlib.sha256(pdf.read_bytes()).hexdigest(),
 'plan':plan,'callouts':{codes[v['id']]:v['id'] for key in ['lights','devices'] for v in plan[key]},
 'calloutRegistry':registry,
 'annotationInput':f'revision-{args.revision-1}-owner-annotated.pdf',
 'renderAssets':f'revision-{args.revision}-assets',
 'annotationChanges':changes,'remainingVerification':plan['survey']['unverified']+plan['survey'].get('pendingAnnotations',[])}
manifest['retiredCallouts'] = {code:device_id for code,device_id in registry.items() if code not in manifest['callouts']}
review.mkdir(exist_ok=True)
(review/f'revision-{args.revision}.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print(pdf)
