# Pump drive rotary isolator

Replaced the development pump room drive's hand-built red handle and yellow plate with the existing rotary `disconnectHandle` part, retaining its Voltara enclosure at true size. The component supplies the standard handle, animation, operating state and isolator click sound; switching off blanks the drive display and switching on restores it. Assembly lives in `components/plant/parts/pump-drive.ts`, while the room only places the exhibit. No files were copied from Encabulator.

Added an interaction regression to the pump/balance exhibit tests covering supply isolation, display restoration and handle movement. The owner brief was unavailable at the documented `/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md` path; the change follows the repository guidance and existing component design.

Validation: typecheck, lint (three existing warnings), all 514 tests and production build passed. Repository format checking reported an existing issue in the untouched `doc/research/benfield-mimic-annunciator-reference.md`; formatting passed for all changed TypeScript files. Build reports the existing large-chunk advisory.
