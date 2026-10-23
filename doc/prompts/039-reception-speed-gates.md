# 039: The reception's speed gates

Status: planned 2026-10-23; not to be modelled yet (the owner). For when the leisure centre's reception, changing village and showers are put back as new sections.

## Why

The owner, 2026-10-23: a modern-style turnstile for the reception, a feature of it, that opens as the walker passes through. Its appearance and its motion are to be modelled; reference photographs in `doc/research/reception-turnstiles/` (a bystander's face blurred in the second).

## What they are (from the photographs)

Speed gates: glass swing-wing optical turnstiles, as office and leisure receptions have them.

- **A bank of cabinets with lanes between them.** The end cabinets serve one lane each; the middle ones serve the lanes either side, with wings on both faces.
- **The cabinet:** a long, flat top beam at about hip height, satin black, about 1.6 to 1.8 m long and 150 mm wide; under it fixed clear glass in a slim brushed stainless frame, a bottom rail just off the floor; at its entry end a pair of stainless tubular legs, open-cornered, so the whole reads light and see-through.
- **The drive post:** part way along each cabinet, a brushed stainless column of two half-round drums, carrying the moving wing on two chunky stainless hinge clamps.
- **The wings:** frameless clear glass, radiused corners, starting a little off the floor, a small maker's label at the foot. A pair, one from each side of the lane, meets in its middle to close it.
- **The indicator:** a small domed LED on top of each drive post, a green double chevron (» or «) for the way the lane may be used, red when barred. Lanes run either way.
- **The readers:** on the beam's top near each end, a flush square reader glowing white-blue, beside it a recessed plate (a QR or ticket window) and a blank inset.
- **The sensors:** a row of tiny red dots along the lane-side face of the beam (clearest in the first photograph): the optical beams that follow a person through the lane and catch tailgating.
- **Around them:** a terrazzo or resin floor; in the photographs a revolving door, a reception desk, and a lift destination panel on the wall.

## How they move

The owner wants them free-flow: no card, they open as the walker passes. The lane's sensors pick up someone walking the allowed way; the two wings swing open together in the direction of travel, quickly and quietly (about half a second), folding back alongside the cabinets; once the sensors see the walker clear, the wings swing shut behind. Walking the barred way, or into closing wings, the walker is stopped by the glass.

## Rules it must keep

- Its sensing and motion pure, tested logic (a state: the wings' positions, opening and closing, the lane's direction, who is in the lane), as the doors' are; the view only shows it.
- Its own maker in `brands.ts`, its mark on the cabinet.
- A newer item than the plant's 2000: the forty-years rule allows it, but its era is worth a thought when it is modelled.
- Modelled in a dev room first, then fitted to the reception.

## Order of work

Not now. When the reception is put back: a dev room with a bank of three cabinets and two lanes, one each way; then into the reception.
