# Human ladder plan, 2026-10-26

The owner clarified that cable ladders are cable containment, not routes for a person to climb, and asked for prompt 071 to be researched and fully planned. I inspected the ladder constructors, shared climb controls, balance tank hall, wet hall backwash pit, services exhibit and pool handrails. The architectural fixture named `ladder` is explicitly a Legrand cable ladder; two narrow calls to the pool-ladder constructor are handrails. Both are excluded from the human-ladder contract.

The plan keeps the existing Use/W/S movement and defines a single visual-and-logic helper for real pool, tank-access, caged and utility ladders. It calls out the work needed before tank and pit descent can function: lower walkable floors, correctly gated hatches, clear exits and guarded elevated destinations. The current open backwash hatch is still a collision solid, and the balance tank hall still reports gantry height as the only floor.

I checked the public scope of ISO 14122-4 and HSE guidance on hooped ladders, work at height and confined spaces. The plan treats cages as one design feature rather than complete fall protection, and makes entry into wet tanks conditional on access being open and water low enough for maintenance. It records that the cited 2016 ISO edition is a modern design reference for plant depicted as substantially older.
