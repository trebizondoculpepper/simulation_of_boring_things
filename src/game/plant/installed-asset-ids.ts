/** Permanent installation IDs and explicit display tags for placed equipment.
 * A layout edit must update this register deliberately; it cannot renumber assets.
 *
 * Retired, never to be reused (043, 2026-10-24: the switch room keeps only
 * what works): asset-0064 SR-CP1 (the motor control centre), asset-0067
 * SR-DB3 (a distribution board) and asset-0068 SR-IS2 (sample rotary
 * isolators); asset-0055 AS-T1 (the acid IBC, 2026-10-27: its bulk
 * tank took its place, plan 085); asset-0061 (the hypochlorite fill
 * cabinet, 2026-10-27: one cabinet takes both deliveries, and the
 * generator's connection cabinet its place); asset-0070 SR-FX1 (the
 * switch room's generator connection point, 2026-10-27: a duplicate of
 * the loading bay's cabinet, prompt 089); asset-0144 WH-CP1 (the wet
 * hall's chemical distribution panel, 2026-10-28: replaced by the OT-216
 * terminals and the control box, prompt 091; kept working in dev44 as an
 * obsolete exhibit). */
export const INSTALLED_ASSET_IDS: Readonly<
  Record<string, { assetId: string; tag: string }>
> = {
  'plant_pool_01|balance-tank:3x2x2|Lounge pool balance tank': {
    assetId: 'asset-0001',
    tag: 'PL1-T1',
  },
  'plant_pool_01|pump-pair|Lounge pool circulation pumps, duty and standby, with strainers':
    { assetId: 'asset-0002', tag: 'PL1-P1' },
  'plant_pool_01|sand-filter:1.2|Lounge pool sand filter 1': {
    assetId: 'asset-0003',
    tag: 'PL1-F1',
  },
  'plant_pool_01|sand-filter:1.2|Lounge pool sand filter 2': {
    assetId: 'asset-0004',
    tag: 'PL1-F2',
  },
  'plant_pool_01|uv-unit|Lounge pool UV unit': {
    assetId: 'asset-0005',
    tag: 'PL1-UV1',
  },
  'plant_pool_01|pump-panel|Lounge pool local control panel': {
    assetId: 'asset-0006',
    tag: 'PL1-CP1',
  },
  'plant_pool_01|annunciator:pool_01|Lounge pool annunciator': {
    assetId: 'asset-0147',
    tag: 'PL1-CP3',
  },
  'plant_pool_01|heat-exchanger|Lounge pool plate heat exchanger': {
    assetId: 'asset-0007',
    tag: 'PL1-HX1',
  },
  'plant_pool_01|ozone-generator:plant_pool_01|Lounge pool ozone generator': {
    assetId: 'asset-0008',
    tag: 'PL1-OZ1',
  },
  'plant_pool_01|contact-tank|Lounge pool ozone contact tank': {
    assetId: 'asset-0009',
    tag: 'PL1-T2',
  },
  'plant_pool_01|dosing-controller|Lounge pool dosing controller and sample cells':
    { assetId: 'asset-0010', tag: 'PL1-CP2' },
  'plant_pool_01|hypo-pumps|Lounge pool hypochlorite dosing pumps': {
    assetId: 'asset-0011',
    tag: 'PL1-DP1',
  },
  'plant_pool_01|acid-pump|Lounge pool acid dosing pump': {
    assetId: 'asset-0012',
    tag: 'PL1-DP2',
  },
  'plant_pool_03|jacuzzi-pack|Packaged Jacuzzi plant cabinet': {
    assetId: 'asset-0028',
    tag: 'PL3-CAB1',
  },
  'plant_pool_04|spa-pack|Packaged spa set, footbath': {
    assetId: 'asset-0029',
    tag: 'PL4-CAB1',
  },
  // The spa cabinets' sand filters, outside them (the owner, 2026-10-25).
  'plant_pool_03|sand-filter:spa-jacuzzi|Jacuzzi sand filter': {
    assetId: 'asset-0119',
    tag: 'PL3-F1',
  },
  'plant_pool_04|sand-filter:spa-footSpa|Footbath sand filter': {
    assetId: 'asset-0120',
    tag: 'PL4-F1',
  },
  'wet_hall|break-tank|Make-up break tank (Category 5)': {
    assetId: 'asset-0030',
    tag: 'WH-T1',
  },
  'wet_hall|booster-set|Make-up booster set, duty and standby': {
    assetId: 'asset-0031',
    tag: 'WH-P1',
  },
  'wet_hall|water-meter|Make-up water meter': {
    assetId: 'asset-0032',
    tag: 'WH-G1',
  },
  'wet_hall|backwash-tank|Backwash holding tank': {
    assetId: 'asset-0033',
    tag: 'WH-T2',
  },
  'wet_hall|mimic-wet|Mimic: wet hall': {
    assetId: 'asset-0034',
    tag: 'WH-MP1',
  },
  // Our own make-up flowmeter, after the utility's meter (the owner, 2026-10-26).
  'wet_hall|make-up-flowmeter|Make-up flowmeter': {
    assetId: 'asset-0130',
    tag: 'WH-FT1',
  },
  // The make-up water's recorder (the owner, 2026-10-26).
  'wet_hall|make-up-recorder|Make-up water recorder': {
    assetId: 'asset-0129',
    tag: 'WH-FQR2',
  },
  // The sewer outfall's monitor (the owner, 2026-10-26).
  'wet_hall|sewer-monitor|Sewer outfall monitor': {
    assetId: 'asset-0128',
    tag: 'WH-FQR1',
  },
  'boiler_house|boiler-cascade:1|Condensing boilers, cascade 1': {
    assetId: 'asset-0035',
    tag: 'BH-B1',
  },
  'boiler_house|boiler-cascade:2|Condensing boilers, cascade 2': {
    assetId: 'asset-0036',
    tag: 'BH-B2',
  },
  'boiler_house|boiler-cascade:3|Condensing boilers, cascade 3': {
    assetId: 'asset-0037',
    tag: 'BH-B3',
  },
  'boiler_house|low-loss-header|Low-loss header': {
    assetId: 'asset-0038',
    tag: 'BH-HW1',
  },
  'boiler_house|lthw-pumps|Twin-head LTHW circulator': {
    assetId: 'asset-0039',
    tag: 'BH-P1',
  },
  'boiler_house|pressurisation|Pressurisation unit and expansion vessel': {
    assetId: 'asset-0040',
    tag: 'BH-T1',
  },
  'boiler_house|calorifier|Hot-water calorifier': {
    assetId: 'asset-0041',
    tag: 'BH-T2',
  },
  'boiler_house|gas-train|Gas train': { assetId: 'asset-0042', tag: 'BH-G1' },
  'boiler_house|dosing-pot|Dosing pot': {
    assetId: 'asset-0043',
    tag: 'BH-DP1',
  },
  'boiler_house|gas-safety|Gas detection and emergency stop': {
    assetId: 'asset-0044',
    tag: 'BH-CP1',
  },
  'boiler_house|mimic-gas|Mimic: boiler house gas': {
    assetId: 'asset-0045',
    tag: 'BH-MP1',
  },
  'boiler_house|mimic-boiler-heat|Mimic: boiler status and heat output': {
    assetId: 'asset-0046',
    tag: 'BH-MP2',
  },
  'boiler_house|combustion-panel|Combustion and ventilation panel': {
    assetId: 'asset-0047',
    tag: 'BH-CP2',
  },
  'hypo_store|chem-bulk:hypochlorite:1|Sodium hypochlorite bulk tank 1': {
    assetId: 'asset-0048',
    tag: 'HS-T1',
  },
  'hypo_store|chem-bulk:hypochlorite:2|Sodium hypochlorite bulk tank 2': {
    assetId: 'asset-0049',
    tag: 'HS-T2',
  },
  'hypo_store|chem-bulk:hypochlorite:3|Sodium hypochlorite bulk tank 3': {
    assetId: 'asset-0050',
    tag: 'HS-T3',
  },
  'hypo_store|safety-shower|Safety shower and eyewash': {
    assetId: 'asset-0051',
    tag: 'HS-FX1',
  },
  'hypo_store|spill-kit|Chemical spill kit': {
    assetId: 'asset-0052',
    tag: 'HS-FX2',
  },
  'hypo_store|ppe-cabinet|PPE cabinet': {
    assetId: 'asset-0053',
    tag: 'HS-FX3',
  },
  'hypo_store|store-extract:hypo_store|Extract and chlorine detection': {
    assetId: 'asset-0054',
    tag: 'HS-AHU1',
  },
  // The acid's IBC (asset-0055) retired for its bulk tank (plan 085).
  'acid_store|chem-bulk:acid:1|Hydrochloric acid bulk tank': {
    assetId: 'asset-0131',
    tag: 'AS-T1',
  },
  'acid_store|safety-shower|Safety shower and eyewash': {
    assetId: 'asset-0056',
    tag: 'AS-FX1',
  },
  'acid_store|spill-kit|Chemical spill kit': {
    assetId: 'asset-0057',
    tag: 'AS-FX2',
  },
  'acid_store|ppe-cabinet|PPE cabinet': {
    assetId: 'asset-0058',
    tag: 'AS-FX3',
  },
  'acid_store|store-extract:acid_store|Extract and chlorine detection': {
    assetId: 'asset-0059',
    tag: 'AS-AHU1',
  },
  'loading_bay|fill-cabinet|Delivery fill cabinet': {
    assetId: 'asset-0062',
    tag: 'LB-CAB1',
  },
  'loading_bay|generator-point|Generator connection cabinet': {
    assetId: 'asset-0145',
    tag: 'LB-FX1',
  },
  'switch_room|lv-switchboard|LV main switchboard': {
    assetId: 'asset-0063',
    tag: 'SR-DB1',
  },
  'switch_room|main-switch|Main incoming switch': {
    assetId: 'asset-0065',
    tag: 'SR-IS1',
  },
  'switch_room|central-battery|Emergency lighting central battery': {
    assetId: 'asset-0066',
    tag: 'SR-DB2',
  },
  'switch_room|lighting-board|Lighting distribution board DB-L1': {
    assetId: 'asset-0069',
    tag: 'SR-DB4',
  },
  'switch_room|changeover-switch|Mains/generator changeover switch': {
    assetId: 'asset-0146',
    tag: 'SR-IS3',
  },
  'switch_room|earthing-terminal|Main earthing terminal': {
    assetId: 'asset-0071',
    tag: 'SR-FX2',
  },
  'air_plant|ahu-stack:AHU-802+AHU-803+AHU-804|Air handling units AHU-802, AHU-803, AHU-804: OLYMPIC POOL HALL':
    { assetId: 'asset-0072', tag: 'AP-AHU1' },
  'air_plant|ahu-stack:AHU-805+AHU-806+AHU-807|Air handling units AHU-805, AHU-806, AHU-807: OLYMPIC POOL HALL':
    { assetId: 'asset-0073', tag: 'AP-AHU2' },
  'air_plant|ahu-stack:AHU-808+AHU-809+AHU-810|Air handling units AHU-808, AHU-809, AHU-810: OLYMPIC POOL HALL':
    { assetId: 'asset-0074', tag: 'AP-AHU3' },
  'air_plant|ahu-stack:AHU-801|Air handling unit AHU-801: LOUNGE POOL HALL': {
    assetId: 'asset-0075',
    tag: 'AP-AHU4',
  },
  'air_plant|ahu-stack:AHU-811|Air handling unit AHU-811: JACUZZI ROOM': {
    assetId: 'asset-0076',
    tag: 'AP-AHU5',
  },
  'air_plant|ahu-stack:AHU-812|Air handling unit AHU-812: FOOTBATH PASSAGE': {
    assetId: 'asset-0077',
    tag: 'AP-AHU6',
  },
  'air_plant|mimic-air|Mimic: air handling plant': {
    assetId: 'asset-0078',
    tag: 'AP-MP1',
  },
  "control_room|operator-desk|Operator's desk, POOLMON": {
    assetId: 'asset-0079',
    tag: 'CR-FX1',
  },
  'control_room|alarm-printer|Alarm printer': {
    assetId: 'asset-0080',
    tag: 'CR-CP1',
  },
  'control_room|water-test-kit|Water-test kit': {
    assetId: 'asset-0081',
    tag: 'CR-FX2',
  },
  'control_room|mimic-pool|Mimic: main pool circuit': {
    assetId: 'asset-0082',
    tag: 'CR-MP1',
  },
  'control_room|mimic-heating|Mimic: heating': {
    assetId: 'asset-0083',
    tag: 'CR-MP2',
  },
  'control_room|mimic-air|Mimic: air handling': {
    assetId: 'asset-0084',
    tag: 'CR-MP3',
  },
  'control_room|annunciator|Alarm annunciator': {
    assetId: 'asset-0085',
    tag: 'CR-CP2',
  },
  'control_room|annunciator:pool_01|Lounge pool annunciator': {
    assetId: 'asset-0148',
    tag: 'CR-CP7',
  },
  'control_room|annunciator:pool_02|Olympic pool annunciator': {
    assetId: 'asset-0149',
    tag: 'CR-CP8',
  },
  'control_room|annunciator:wet_hall|Wet hall annunciator': {
    assetId: 'asset-0150',
    tag: 'CR-CP9',
  },
  'control_room|chart-recorders|Chart recorders': {
    assetId: 'asset-0086',
    tag: 'CR-CP3',
  },
  'control_room|readout-board|Readout board': {
    assetId: 'asset-0087',
    tag: 'CR-CP4',
  },
  'control_room|bms-outstation|BMS outstation': {
    assetId: 'asset-0088',
    tag: 'CR-CP5',
  },
  'control_room|fire-repeater|Fire alarm repeater': {
    assetId: 'asset-0089',
    tag: 'CR-CP6',
  },
  'control_room|cctv|CCTV monitor': { assetId: 'asset-0090', tag: 'CR-FX3' },
  'engineers_office|scenario-simulator|Hyperplasc Scenario Simulator': {
    assetId: 'asset-0091',
    tag: 'EO-CP1',
  },
  // The Olympic pool's plant room, redone by the pipeline (prompt 033, 2026-10-23).
  'plant_pool_02|sand-filter:3|Olympic pool sand filter 1': {
    assetId: 'asset-0092',
    tag: 'PL2-F1',
  },
  'plant_pool_02|sand-filter:3|Olympic pool sand filter 2': {
    assetId: 'asset-0093',
    tag: 'PL2-F2',
  },
  'plant_pool_02|sand-filter:3|Olympic pool sand filter 3': {
    assetId: 'asset-0094',
    tag: 'PL2-F3',
  },
  'plant_pool_02|sand-filter:3|Olympic pool sand filter 4': {
    assetId: 'asset-0095',
    tag: 'PL2-F4',
  },
  'plant_pool_02|sand-filter:3|Olympic pool sand filter 5': {
    assetId: 'asset-0096',
    tag: 'PL2-F5',
  },
  'plant_pool_02|pump-pair|Olympic pool circulation pumps, duty and standby': {
    assetId: 'asset-0097',
    tag: 'PL2-P1',
  },
  'plant_pool_02|contact-tank|Olympic pool ozone contact tank': {
    assetId: 'asset-0098',
    tag: 'PL2-T2',
  },
  'plant_pool_02|uv-unit|Olympic pool UV unit': {
    assetId: 'asset-0099',
    tag: 'PL2-UV1',
  },
  'plant_pool_02|pump-panel|Olympic pool local control panel': {
    assetId: 'asset-0100',
    tag: 'PL2-CP1',
  },
  'plant_pool_02|ozone-generator:plant_pool_02|Olympic pool ozone generator': {
    assetId: 'asset-0101',
    tag: 'PL2-OZ1',
  },
  'plant_pool_02|heat-exchanger|Olympic pool heat exchanger': {
    assetId: 'asset-0102',
    tag: 'PL2-HX1',
  },
  'plant_pool_02|dosing-controller|Olympic pool dosing controller and sample cells':
    {
      assetId: 'asset-0103',
      tag: 'PL2-CP2',
    },
  'plant_pool_02|hypo-pumps|Olympic pool hypochlorite dosing pumps': {
    assetId: 'asset-0104',
    tag: 'PL2-DP1',
  },
  'plant_pool_02|acid-pump|Olympic pool acid dosing pump': {
    assetId: 'asset-0105',
    tag: 'PL2-DP2',
  },
  'plant_pool_02|balance-tank-panel|Olympic pool balance tank panel': {
    assetId: 'asset-0106',
    tag: 'PL2-CP3',
  },
  // The chemical distribution (plan 085).
  'hypo_store|chem-pump:hypochlorite|Hypochlorite transfer pump': {
    assetId: 'asset-0132',
    tag: 'HS-P1',
  },
  'acid_store|chem-pump:acid|Acid transfer pump': {
    assetId: 'asset-0133',
    tag: 'AS-P1',
  },
  'wet_hall|chem-selector:hypochlorite|Hypochlorite transfer selector': {
    assetId: 'asset-0134',
    tag: 'WH-XS1',
  },
  'wet_hall|chem-selector:acid|Acid transfer selector': {
    assetId: 'asset-0135',
    tag: 'WH-XS2',
  },
  'wet_hall|chem-terminal:hypochlorite|Hypochlorite transfer terminal': {
    assetId: 'asset-0152',
    tag: 'WH-OT1',
  },
  'wet_hall|chem-terminal:acid|Acid transfer terminal': {
    assetId: 'asset-0153',
    tag: 'WH-OT2',
  },
  'wet_hall|chem-control-box|Chemical transfer control box': {
    assetId: 'asset-0154',
    tag: 'WH-CP3',
  },
  'wet_hall|annunciator:wet_hall|Wet hall annunciator': {
    assetId: 'asset-0151',
    tag: 'WH-CP2',
  },
  'plant_pool_01|chem-day:hypochlorite:pool_01|Hypochlorite day tank': {
    assetId: 'asset-0136',
    tag: 'PL1-DT1',
  },
  'plant_pool_01|chem-day:acid:pool_01|Acid day tank': {
    assetId: 'asset-0137',
    tag: 'PL1-DT2',
  },
  'plant_pool_02|chem-day:hypochlorite:pool_02|Hypochlorite day tank': {
    assetId: 'asset-0138',
    tag: 'PL2-DT1',
  },
  'plant_pool_02|chem-day:acid:pool_02|Acid day tank': {
    assetId: 'asset-0139',
    tag: 'PL2-DT2',
  },
  'plant_pool_03|chem-day:hypochlorite:pool_03|Hypochlorite day tank': {
    assetId: 'asset-0140',
    tag: 'PL3-DT1',
  },
  'plant_pool_03|chem-day:acid:pool_03|Acid day tank': {
    assetId: 'asset-0141',
    tag: 'PL3-DT2',
  },
  'plant_pool_04|chem-day:hypochlorite:pool_04|Hypochlorite day tank': {
    assetId: 'asset-0142',
    tag: 'PL4-DT1',
  },
  'plant_pool_04|chem-day:acid:pool_04|Acid day tank': {
    assetId: 'asset-0143',
    tag: 'PL4-DT2',
  },
};

/** The tag of the machine `key` placed in `room`, from the register, if it has one. */
export function installedTagOf(room: string, key: string): string | undefined {
  const prefix = `${room}|${key}|`;
  for (const [k, v] of Object.entries(INSTALLED_ASSET_IDS))
    if (k.startsWith(prefix)) return v.tag;
  return undefined;
}
