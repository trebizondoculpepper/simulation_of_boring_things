# 078: Ordering supplies through Splashonomics

Status: incomplete, for planning (opened 2026-10-26 with the owner, from [073](073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

## The idea

The computer in the manager's or the engineer's office runs Splashonomics (the brand in `brands.ts`: pool operating-cost metering, software and audits), and through it the centre orders what it needs to run (the owner, 2026-10-26): chemical tankers, engineering supplies, anything; it is delivered through the loading dock.

## Running costs (the owner, 2026-10-26)

Splashonomics also costs the centre's running (its maker's own trade: operating-cost metering and audits): it reads the site's three utility meters in the goods yard (`world.intake.meters`, prompt 083: water m³, gas m³, electricity kWh, each counting the plant's actual use), prices them at tariff rates (a standing charge and unit rates, electricity perhaps by time of day), and shows the cost of running the centre by the hour, day and month, and what each part of the plant costs (the site load model's consumers, the boilers' gas).

## To settle

- Which office and which computer; its period (the game spans the 1980s to the late 2020s), its interface, and how the game simulates it without a screen taking over the instruments.
- What can be ordered, lead times, costs and budgets.
- How an order becomes a delivery (074, 076) and the order book and delivery log in the bay.

## A second opinion (Codex, 2026-10-26; not yet adopted)

- A small order lifecycle in the world: requested, approved, due, arrived, accepted or rejected, delivered quantity, closed. Stock rises on measured delivery (076), not on ordering. Wrong product, no room in the store, the bay occupied, no lorry: each a clear outcome and a delivery-log entry.
- A finite catalogue; the pallets of goods either inventory with state and use, or plainly scenery. The terminal for ordering and audit; the instruments stay the way the plant is run.
- Build after 074 and 076 so orders call their actions; an urgent generator call-out a separate, priority route used by 079, with its delay.
- Questions: which office, and does money constrain orders or only appear in the costs?
- Acceptance: an order survives reload, makes exactly one delivery, moves stock only on acceptance, and records cancellations and rejections.
