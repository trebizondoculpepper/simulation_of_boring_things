"""Plan C: the owner's layout B formalised. Halls on a ring, every pair of
neighbours staggered by DELTA on the axis across their side, joined by an
L corridor (one 90° bend) round the one that sticks out. Units metres,
x east, y north. Hall rectangles are wall lines (wall centres)."""
import json, sys
T = 0.6            # hall wall thickness (centred on the wall line)
W = 1.2            # corridor clear width (the corridor template)
CT = 0.3           # corridor wall thickness
DELTA = 5.0        # stagger between neighbours
GAP = 3.0          # gap between neighbouring halls' outer faces
END = 1.8          # a door's centre from the inside corner of its wall
LEG = 1.8          # the corridor's first leg, inner side, from the hall face

# Ring positions, with the owner's hall at each, (w, d) at wall lines.
RING = [  # pos, hall, w (x), d (y)
    (0, 'HALL_0', 16, 14), (1, 'HALL_1', 16, 21), (2, 'HALL_2', 16, 14),
    (3, 'HALL_3', 14, 24), (4, 'HALL_4', 16, 14), (5, 'HALL_5', 16, 14),
    (6, 'HALL_6', 16, 21), (7, 'HALL_7', 16, 14), (8, 'HALL_8', 16, 14),
    (9, 'HALL_9', 14, 24),
]
g = GAP + T  # gap between wall lines
size = {p: (w, d) for p, _, w, d in RING}
name = {p: n for p, n, _, _ in RING}
# Offsets: 1 = pushed out. Top row y: 2,3,4,5; bottom 7,8,9,0; left x: 0,1,2; right 5,6,7.
yout = {2: 0, 3: 1, 4: 0, 5: 1, 7: 0, 8: 1, 9: 0, 0: 1}
xout = {0: 0, 1: 1, 2: 0, 5: 0, 6: 1, 7: 0}
XW, YS = 0.0, 0.0
rect = {}
# Left column, south to north (P0, P1, P2): x by xout, y stacked from P0's south.
y = YS + (0 if yout[0] else DELTA)
for p in (0, 1, 2):
    w, d = size[p]
    x0 = XW + (0 if xout[p] else DELTA)
    rect[p] = [x0, y, x0 + w, y + d]
    y += d + g
YN = rect[2][3] + (0 if yout[2] else DELTA)
# Top row, west to east (P2..P5).
x = rect[2][2] + g
for p in (3, 4, 5):
    w, d = size[p]
    top = YN - (0 if yout[p] else DELTA)
    rect[p] = [x, top - d, x + w, top]
    x += w + g
XE = rect[5][2] + (0 if xout[5] else DELTA)
# Right column, north to south (P5, P6, P7).
yy = rect[5][1] - g
for p in (6, 7):
    w, d = size[p]
    east = XE - (0 if xout[p] else DELTA)
    rect[p] = [east - w, yy - d, east, yy]
    yy -= d + g
# Bottom row, east to west (P7, P8, P9), then check P0.
x = rect[7][0] - g
for p in (8, 9):
    w, d = size[p]
    south = YS + (0 if yout[p] else DELTA)
    rect[p] = [x - w, south, x, south + d]
    x -= w + g
problems = []
if abs(rect[7][1] - YS - (0 if yout[7] else DELTA)) > 1e-6: problems.append(f'P7 south {rect[7][1]} out of line')
if abs(rect[9][0] - g - rect[0][2]) > 1e-6: problems.append(f'bottom row does not close: P9 west {rect[9][0]} vs P0 east+g {rect[0][2]+g}')

def axis_of(a, b):
    """Neighbours a,b: 'x' if side by side along x (a row), else 'y' (a column)."""
    ra, rb = rect[a], rect[b]
    return 'x' if (ra[2] <= rb[0] or rb[2] <= ra[0]) else 'y'

corridors = []
for a in range(10):
    b = (a + 1) % 10
    ax = axis_of(a, b)
    ra, rb = rect[a], rect[b]
    t = T / 2
    if ax == 'x':
        # Row: which sticks out further on which side? Compare tops and bottoms.
        # The one whose top is higher by >= DELTA sticks out north; else bottoms.
        # Corridors run round the outside of the ring: north of the top row, south of the bottom.
        side = 'N' if {a, b} <= {2, 3, 4, 5} else 'S'
        if side == 'N': out, inn = (a, b) if ra[3] > rb[3] else (b, a)
        else: out, inn = (a, b) if ra[1] < rb[1] else (b, a)
        if abs((ra[3] - rb[3]) if side == 'N' else (ra[1] - rb[1])) < DELTA - 1e-6: problems.append(f'{name[a]}-{name[b]}: no stagger on the {side}')
        ro, ri = rect[out], rect[inn]
        towards = 1 if ro[0] > ri[0] else -1   # from inn to out along x
        # Door in inn's outer wall (N or S), near its end towards out.
        face_i = ri[3] + t if side == 'N' else ri[1] - t
        dx = (ri[2] - t - END) if towards > 0 else (ri[0] + t + END)
        s = 1 if side == 'N' else -1
        cy = face_i + s * (LEG + W / 2)         # corridor centreline of leg 2
        face_o = ro[0] - t if towards > 0 else ro[2] + t
        leg1 = [(dx, face_i), (dx, cy)]
        leg2 = [(dx, cy), (face_o, cy)]
        door_i = ('N' if side == 'N' else 'S', dx)
        door_o = ('W' if towards > 0 else 'E', cy)
        # Inner lengths: leg1 from face to inner corner, leg2 from inner corner to the far face.
        l1 = LEG
        l2 = abs(face_o - dx) - W / 2
        # Check the door into out lies within its wall, clear of its corner.
        lo, hi = ro[1] + t + 0.6 + W / 2, ro[3] - t - 0.6 - W / 2
        if not (lo <= cy <= hi): problems.append(f'{name[a]}-{name[b]}: door into {name[out]} at y {cy:.2f} outside {lo:.2f}..{hi:.2f}')
    else:
        # West of the left column, east of the right.
        side = 'W' if {a, b} <= {0, 1, 2} else 'E'
        if side == 'W': out, inn = (a, b) if ra[0] < rb[0] else (b, a)
        else: out, inn = (a, b) if ra[2] > rb[2] else (b, a)
        if abs((ra[0] - rb[0]) if side == 'W' else (ra[2] - rb[2])) < DELTA - 1e-6: problems.append(f'{name[a]}-{name[b]}: no stagger on the {side}')
        ro, ri = rect[out], rect[inn]
        towards = 1 if ro[1] > ri[1] else -1
        face_i = ri[0] - t if side == 'W' else ri[2] + t
        dy = (ri[3] - t - END) if towards > 0 else (ri[1] + t + END)
        s = -1 if side == 'W' else 1
        cx = face_i + s * (LEG + W / 2)
        face_o = ro[1] - t if towards > 0 else ro[3] + t
        leg1 = [(face_i, dy), (cx, dy)]
        leg2 = [(cx, dy), (cx, face_o)]
        door_i = (side, dy)
        door_o = ('S' if towards > 0 else 'N', cx)
        l1 = LEG
        l2 = abs(face_o - dy) - W / 2
        lo, hi = ro[0] + t + 0.6 + W / 2, ro[2] - t - 0.6 - W / 2
        if not (lo <= cx <= hi): problems.append(f'{name[a]}-{name[b]}: door into {name[out]} at x {cx:.2f} outside {lo:.2f}..{hi:.2f}')
    # No line of sight through an L whose inner legs l1, l2 have l1*l2 > W*W.
    sight = l1 * l2 > W * W
    if not sight: problems.append(f'{name[a]}-{name[b]}: sight through corridor (legs {l1:.2f}, {l2:.2f})')
    corridors.append(dict(a=a, b=b, out=out, inn=inn, leg1=leg1, leg2=leg2, l1=l1, l2=l2, door_in=door_i, door_out=door_o))

# A corridor must not cross any other hall.
def seg_box(seg, pad):
    (x1, y1), (x2, y2) = seg
    return [min(x1, x2) - pad, min(y1, y2) - pad, max(x1, x2) + pad, max(y1, y2) + pad]
for c in corridors:
    for seg in (c['leg1'], c['leg2']):
        bx = seg_box(seg, W / 2 + CT)
        for p, r in rect.items():
            if p in (c['a'], c['b']): continue
            o = [r[0] - T / 2, r[1] - T / 2, r[2] + T / 2, r[3] + T / 2]
            if bx[0] < o[2] and bx[2] > o[0] and bx[1] < o[3] and bx[3] > o[1]:
                problems.append(f"corridor {name[c['a']]}-{name[c['b']]} crosses {name[p]}")
# Corridors must not cross or touch each other.
boxes = [(c, seg_box(seg, W / 2 + CT)) for c in corridors for seg in (c['leg1'], c['leg2'])]
for i in range(len(boxes)):
    for j in range(i + 1, len(boxes)):
        (c1, b1), (c2, b2) = boxes[i], boxes[j]
        if c1 is c2: continue
        if b1[0] < b2[2] and b1[2] > b2[0] and b1[1] < b2[3] and b1[3] > b2[1]:
            problems.append(f"corridors {name[c1['a']]}-{name[c1['b']]} and {name[c2['a']]}-{name[c2['b']]} meet")
json.dump(dict(rect=rect, corridors=corridors, name=name, problems=problems,
               params=dict(T=T, W=W, CT=CT, DELTA=DELTA, GAP=GAP, END=END, LEG=LEG)),
          open(sys.argv[1], 'w'), indent=1)
print('\n'.join(problems) or 'no problems')
for c in corridors: print(name[c['a']], '->', name[c['b']], 'legs', round(c['l1'], 2), round(c['l2'], 2), 'door in', name[c['inn']], c['door_in'][0], 'into', name[c['out']], c['door_out'][0])
for p in range(10): print(p, name[p], [round(v, 2) for v in rect[p]])
