# Plant identification catalogue, 2026-10-22

Continued the plant-identification pilot after a repository review. The review identified a real distinction between naming an asset and making its control affect the process. We kept permanent installed IDs separate from room-first display tags, and made the web and PDF schedules say whether an entry is a modeled part, a saved control awaiting circuit effects, or placed equipment awaiting model migration.

The placed-equipment register covers the current authored equipment layouts. The room-pipework register covers 43 valves in PL1, PL2, the wet hall and boiler house. Those valves now have labels in their views and save their position in `World` under their permanent IDs. The three footbath service valves remain in the earlier working water-model pilot; they have not been duplicated in the new position table. The packaged spa cabinet's inside door cover now closes the same door that its outside latch opens.

The audit at `doc/reports/plant-identification-gap-audit.md` lists unbound valves inside machine models and the missing process consequences for the 43 room-pipework valves. The owner clarified the target: every visible installed valve is a child of its containing machine or pipework, is labeled, is catalogued, has one World state and affects the simulated circuit. Dotted paths such as `PL1.P1.SUCTION` can identify typed ports, while `PL1.P1.RUN_LAMP` identifies an indicator child; neither path is a save key.

Typecheck, lint and the full test suite passed; the operator's PDF manual rebuilt with the expanded schedule. The remaining machine valves and circuit topology were left explicit in the audit rather than reported as complete.
