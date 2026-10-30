import json, sys, math
P = json.load(open('plan.json'))
rect = {int(k): v for k, v in P['rect'].items()}; name = {int(k): v for k, v in P['name'].items()}
T, W, CT = P['params']['T'], P['params']['W'], P['params']['CT']
t = T / 2
titles = {'HALL_0': 'Welcome', 'HALL_1': 'Warm water', 'HALL_2': 'Clean water', 'HALL_3': 'Safe water', 'HALL_4': 'The chemistry of pools', 'HALL_5': 'A day in the life', 'HALL_6': 'World of pumps', 'HALL_7': 'Grout (black box)', 'HALL_8': 'Never again (black box)', 'HALL_9': 'The whole plant'}
# Doors per hall: (side, centre along the wall)
doors = {p: [] for p in rect}
for c in P['corridors']:
    doors[c['inn']].append(tuple(c['door_in'])); doors[c['out']].append(tuple(c['door_out']))
blocks = {}   # name -> (base, lines[(layer,x1,y1,x2,y2)], texts)
def face_lines(x0, y0, x1, y1, cuts, layer):
    """A rectangle's four sides, each cut at its doors: cuts = [(side, u)]."""
    out = []
    sides = {'S': ((x0, y0), (x1, y0)), 'E': ((x1, y0), (x1, y1)), 'N': ((x1, y1), (x0, y1)), 'W': ((x0, y1), (x0, y0))}
    for s, (a, b) in sides.items():
        horiz = s in 'SN'
        lo, hi = sorted((a[0], b[0]) if horiz else (a[1], b[1]))
        gaps = sorted(u for side, u in cuts if side == s)
        cur = lo
        for u in gaps:
            out.append((cur, u - W / 2)); cur = u + W / 2
        out.append((cur, hi))
        for u0, u1 in out[-len(gaps) - 1:]:
            pass
        segs = out[-(len(gaps) + 1):]
        del out[-(len(gaps) + 1):]
        for u0, u1 in segs:
            if horiz: lines.append((layer, u0, a[1], u1, a[1]))
            else: lines.append((layer, a[0], u0, a[0], u1))
    return out
for p, r in rect.items():
    cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
    lines = []
    face_lines(r[0] - t, r[1] - t, r[2] + t, r[3] + t, doors[p], 'WALLS')
    face_lines(r[0] + t, r[1] + t, r[2] - t, r[3] - t, doors[p], 'WALLS')
    for side, u in doors[p]:  # jambs through the wall
        for e in (u - W / 2, u + W / 2):
            if side in 'SN':
                y = r[1] if side == 'S' else r[3]
                lines.append(('WALLS', e, y - t, e, y + t))
            else:
                x = r[0] if side == 'W' else r[2]
                lines.append(('WALLS', x - t, e, x + t, e))
    lines = [(l, x1 - cx, y1 - cy, x2 - cx, y2 - cy) for l, x1, y1, x2, y2 in lines]
    w, d = r[2] - r[0], r[3] - r[1]
    texts = [(-w / 2 + 1.2, 0.8, 1.0, name[p].replace('_', ' ')), (-w / 2 + 1.2, -0.6, 0.6, titles[name[p]]), (-w / 2 + 1.2, -1.6, 0.45, f'{w:g} x {d:g} m')]
    blocks[name[p]] = ((cx, cy), lines, texts)
# One corridor, drawn once: from its door at (0, 0) north to the bend, then
# east into the next hall (a right turn). Each is placed by a rotation, and
# a left turn by the same drawing mirrored first.
def unit(p, q):
    dx, dy = q[0] - p[0], q[1] - p[1]; L = math.hypot(dx, dy); return dx / L, dy / L, L
shapes = set()
for c in P['corridors']:
    a, cn, b = c['leg1'][0], c['leg1'][1], c['leg2'][1]
    shapes.add((round(unit(a, cn)[2], 6), round(unit(cn, b)[2], 6)))
assert len(shapes) == 1, f'corridors differ: {shapes}'
L1, L2 = shapes.pop()
lines = []
for d in (W / 2, -W / 2, W / 2 + CT, -(W / 2 + CT)):
    # Leg 1 along +y, offset by -d in x; leg 2 along +x, offset by +d in y; mitred.
    lines += [('CORRIDORS', -d, 0, -d, L1 + d), ('CORRIDORS', -d, L1 + d, L2, L1 + d)]
blocks['CORRIDOR'] = ((0, 0), lines, [])
inserts = []  # (block, x, y, rotation degrees, x scale, name)
turns = {'right': 0, 'left': 0}
for c in P['corridors']:
    a, cn, b = c['leg1'][0], c['leg1'][1], c['leg2'][1]
    u1x, u1y, _ = unit(a, cn); u2x, u2y, _ = unit(cn, b)
    det = u2x * u1y - u2y * u1x
    if det > 0: rot, sx = math.degrees(math.atan2(u2y, u2x)), 1; turns['right'] += 1
    else: rot, sx = math.degrees(math.atan2(-u2y, -u2x)), -1; turns['left'] += 1
    nm = f"CORRIDOR {name[c['a']].split('_')[1]}-{name[c['b']].split('_')[1]}"
    inserts.append(('CORRIDOR', a[0], a[1], rot % 360, sx, nm))
# DXF R12
f = lambda v: f'{v:.4f}'
colours = {'WALLS': 7, 'CORRIDORS': 3, 'LABELS': 2, 'ROOMS': 7, 'NOTES': 2}
dx = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', str(len(colours))]
for n, c in colours.items(): dx += ['0', 'LAYER', '2', n, '70', '0', '62', str(c), '6', 'CONTINUOUS']
dx += ['0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'BLOCKS']
for n, (base, lines, texts) in blocks.items():
    dx += ['0', 'BLOCK', '8', '0', '2', n, '70', '0', '10', '0', '20', '0', '30', '0', '3', n]
    for l, x1, y1, x2, y2 in lines: dx += ['0', 'LINE', '8', l, '10', f(x1), '20', f(y1), '30', '0', '11', f(x2), '21', f(y2), '31', '0']
    for x, y, h, s in texts: dx += ['0', 'TEXT', '8', 'LABELS', '10', f(x), '20', f(y), '30', '0', '40', f(h), '1', s]
    dx += ['0', 'ENDBLK', '8', '0']
dx += ['0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES']
for n, (base, _, _) in blocks.items():
    if n != 'CORRIDOR': dx += ['0', 'INSERT', '8', 'ROOMS', '2', n, '10', f(base[0]), '20', f(base[1]), '30', '0']
for blk, x, y, rot, sx, nm in inserts:
    dx += ['0', 'INSERT', '8', 'CORRIDORS', '2', blk, '10', f(x), '20', f(y), '30', '0', '41', f(sx), '42', '1', '43', '1', '50', f(rot)]
xs = [v for r in rect.values() for v in (r[0], r[2])]; ys = [v for r in rect.values() for v in (r[1], r[3])]
notes = [(min(xs), max(ys) + 3, 0.9, 'LAYOUT C - NORTH UP - 1 unit = 1 m - halls and corridors are blocks'), (min(xs), min(ys) - 3.5, 0.9, 'STREET (south)')]
for x, y, h, s in notes: dx += ['0', 'TEXT', '8', 'NOTES', '10', f(x), '20', f(y), '30', '0', '40', f(h), '1', s]
dx += ['0', 'ENDSEC', '0', 'EOF']
open(sys.argv[1] + '.dxf', 'w').write('\n'.join(dx) + '\n')
# SVG
S, m = 13, 5
X = lambda x: (x - min(xs) + m) * S; Y = lambda y: (max(ys) + m + 2 - y) * S
Wd, Hd = (max(xs) - min(xs) + 2 * m) * S, (max(ys) - min(ys) + 2 * m + 4) * S
col = {'WALLS': '#222', 'CORRIDORS': '#1a8f5a'}
out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{Wd:.0f}" height="{Hd:.0f}" viewBox="0 0 {Wd:.0f} {Hd:.0f}"><rect width="100%" height="100%" fill="#fff"/>']
out.append('<defs><g id="CORRIDOR">')
for l, x1, y1, x2, y2 in blocks['CORRIDOR'][1]: out.append(f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" stroke="{col[l]}" stroke-width="{1.4/S:.4f}"/>')
out.append('</g></defs>')
for n, (base, lines, texts) in blocks.items():
    if n == 'CORRIDOR': continue
    out.append(f'<g id="{n}" transform="translate({X(base[0]):.1f} {Y(base[1]):.1f})">')
    for l, x1, y1, x2, y2 in lines: out.append(f'<line x1="{x1*S:.1f}" y1="{-y1*S:.1f}" x2="{x2*S:.1f}" y2="{-y2*S:.1f}" stroke="{col[l]}" stroke-width="1.4"/>')
    for x, y, h, s_ in texts: out.append(f'<text x="{x*S:.1f}" y="{-y*S:.1f}" font-size="{h*S:.0f}" font-family="Helvetica, Arial, sans-serif" fill="#333">{s_}</text>')
    out.append('</g>')
for blk, x, y, rot, sx, nm in inserts:
    r = math.radians(rot); c_, s2 = math.cos(r), math.sin(r)
    m00, m01, m10, m11 = c_ * sx, -s2, s2 * sx, c_
    out.append(f'<use id="{nm.replace(" ", "_")}" href="#{blk}" transform="matrix({S*m00:.4f} {-S*m10:.4f} {S*m01:.4f} {-S*m11:.4f} {X(x):.2f} {Y(y):.2f})"/>')
for x, y, h, s in notes: out.append(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" font-size="{h*S:.0f}" font-family="Helvetica, Arial, sans-serif" fill="#333">{s}</text>')
out.append('</svg>')
open(sys.argv[1] + '.svg', 'w').write('\n'.join(out) + '\n')
print('ok', turns, 'corridor legs', L1, L2, len(blocks), 'blocks', f'{max(xs)-min(xs):.1f} x {max(ys)-min(ys):.1f} m')
