# Olympic plant orientation and fitting clearances

The owner reported that PL2-UV1 faced the wall, Grundflow pump housing fasteners were too long and not hexagonal, and all four heat-exchanger valves clipped the adjacent elbows. They also asked whether the two overflow pipes in the concrete tank hall meant the lounge shared the Olympic tank.

The UV unit now faces north into the room from its existing position; the plan’s access remains clear. Turning it reverses the chamber’s inlet and outlet ends, so the dosing spool now leaves along the outlet’s real outward direction before turning back along the south wall. The model ports automatically reroute the power conduit to the inward-facing control panel and the treatment main to the opposite chamber end.

The exchanger’s routed port spools were 0.45 m long, putting valve centres 0.10 m from the nominal elbows. The insulated heating bends consume more of those lengths than bare pipes do. All four spools are now at least 0.8 m, keeping the existing tagged valve centres and service heights while making room for their flanges and the real curved, insulated elbows. Regression checks use the drawn route segments, not just corner points.

Pump casing heads are 8 mm high (from 12 mm), with six sides and their backs on the cover lip. The strainer lid’s ten-sided 60 mm studs become six-sided 12 mm heads, seated on its lid rather than sticking up. Tests check both head families’ lengths, sides and the lid contact.

The balance-tank hall is the Olympic’s PL2-T1; both overflow drops are Olympic returns, numbered 1 and 2, not returns from pools 1 and 2. The lounge schematic retains its own PL1-T1 and circulation loop. The hall labels now put OLYMPIC POOL above OVERFLOW RETURN 1 or 2.

The layout’s routing/scoring gates passed before and after: score 76 unchanged, no route clashes or missing lines, with estimated pipe/conduit cost falling from £62,931 to £62,900. Fresh Chrome component scenes rendered the real exchanger routes with valve geometry and the inward-facing UV panel with its rerouted conduit, without browser exceptions. Screenshots are in /tmp/pool-hx-elbow-clearance.png and /tmp/pool-uv-inward-facing.png.

Validation: typecheck, lint (existing warnings only), format check and production build passed. The full suite passed 2,354 tests with 10 optional tests skipped; 31 focused description and fitting checks also passed after distinguishing the penstock from butterfly valves. Production build advanced the local version to 0.1.350.

The follow-up tank-hall reports exposed a separate inspection omission: the hall never supplied the shared first-person inspector. It now does, and its working Trager-Feinstein ultrasonic level transmitter is registered as PL2-T1-LT1 (asset-0127), bound to the Olympic annex and showing the live measured depth. Its two-wire signal cable leaves the actual side gland, rises below the soffit, heads south and then west through the partition towards the pool controls, supported by overhead saddles. Both submerged elbows are identified as downward-facing pump suction bellmouths, continuing through the west wall; they are not disconnected pool returns.

The upstand overflow’s solid cylinder and pipe end were coplanar. An annular lathed flare now surrounds a recessed, shaded bore, with the route end below the rim. The two suction intakes use the same hollow flare facing down. The ladder access gate is now a component part using the existing pure spring-door mechanism and shared Use map, with its confined-space sign attached to the moving leaf, holding open while someone is near its sweep. The gantry’s existing pit boundary remains: normal ladder descent is a separate TODO rather than permitting an unsupported fall.

The tank has a grated floor sump and a manual penstock, PL2-T1-DV1 (valve-0107), with its extended spindle and handwheel on the east gantry. Its actual waste pipe leaves through the east wall below floor level. The registered valve drives the world water balance’s existing head-dependent gravity drain, even with circulation stopped; Dev28 demonstrates the same outlet locally. The saved world shape is unchanged: this is one extra key in the existing installed-valve dictionary, and older saves without the key read the registered normally-closed default. The Olympic annex records the instrument, level signal, drain connection and fitting.

Browser checks rendered the actual hall, picked PL2-T1-LT1 with its current depth, opened the gate to 90 degrees through its Use handler, and inspected the sump and revised overflow rim without JavaScript exceptions. Validation is recorded above.

The exact staged tree was exported separately from the shared workspace and passed typecheck, format checking and its full suite independently: 2,348 tests passed, 10 optional tests skipped. This confirms the change does not depend on the other sessions’ unfinished cabinet, sound, main-drain or gantry-conduit edits.
