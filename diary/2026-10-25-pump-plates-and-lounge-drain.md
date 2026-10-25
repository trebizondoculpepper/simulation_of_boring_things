# Pump plates, drainage and ozone identification

The owner reported a floating yellow pump identification label, asked for a gully at “PLT-T1-DV1”, and reported z-fighting on PL1-CP2’s top. The registered valve is PL1-T1-DV1, the lounge balance-tank drain; that interpretation was stated while working.

The pump pair now has branded engraved brass duty/standby plates, with solid backing and four screw heads, flush on each pump’s fabricated base channel. Each plate is a child of its pump, preserving the component identity. Both lounge and Olympic pairs use the shared drawing.

The lounge drain now ends 100 mm above a 300 mm Certikind grated gully instead of disappearing through the floor. The gully binds to the existing schematic waste node. Its visible falling stream follows the tank-drain contribution returned by loungeValveFlows, including actual valve travel and the existing circulation condition; the simulation’s drain calculation is unchanged. No saved world shape changed.

PL1-CP2’s controller body and contrasting lid both ended at y=0.595 m, producing coplanar top faces. The body now stops at the lid’s underside, retaining the original overall bounds and front controls. The fix is in the shared controller drawing.

The owner also supplied a lounge view showing the Warden ozone detector with no reference number and two unsupported ACCEPT/RESET buttons. The schematic already has ozone-monitor nodes, but the separate installations were missing from the catalogue. Installed fixtures PL1-GD1 and PL2-GD1 now have permanent asset ids, the Warden maker and an ozone-monitor kind. Their scene identities retain the existing model nodes and gain tags, so inspection, clipboard copying, inventory and console status agree. A Penfold enclosure supports the existing working buttons on the post and carries its engraved asset plate. Existing unrelated ozone contact-tank drawing edits were preserved.

Validation: typecheck, lint, formatting, all 2,218 tests (8 skipped), and production build passed; build advanced to 0.1.305. Existing lint and bundle-size warnings remain. Geometry regressions verify both pump plate mounts and the non-overlapping controller lid; pipe-layout tests check the drain’s air gap, flow tests separate tank drainage from filter waste, registration checks cover both monitors, and the whole-scene model audit passes. A fresh headless Chrome component scene confirmed the pump plates, controller lid, live gully and the actual lounge ozone station together without browser exceptions (`/tmp/pool-pump-gully-controller-fixed.png`).
