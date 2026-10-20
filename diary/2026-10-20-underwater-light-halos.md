# Underwater light bloom

Added soft blue-white halos around dev11's five round underwater lights to suggest scattering from fine suspended particles. The halos are camera-facing quads drawn together with instancing, with a smooth radial falloff, very gentle moving texture and a fade below the waterline. They use no additional dynamic lights or shadow maps. Increased the lens radiance from 2.5 to 5 so the existing bloom pass catches the lenses at the owner's preferred settings. The existing BLOOM knob scales the halos; disabling bloom or water hides them. Copy settings includes the lens brightness and halo width.

Kept halos out of the ambient-occlusion pass, drew them before the transparent water, and included their GPU resources in room disposal. Checked the result in Chrome: the lenses show a soft local halo and there are no shader errors. No Encabulator files were copied. The project brief remains unavailable at its documented path.

Validation: typecheck, lint (existing warnings only), repository formatting, all 529 tests and production build passed. Build retains the existing large-chunk advisory.
