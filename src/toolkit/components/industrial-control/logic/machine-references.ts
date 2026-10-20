import type { MachineComponentKind } from './machine-components';

/** Physical references, shared by the gallery plaques and production parts. */
export const MACHINE_REFERENCES: Record<
  MachineComponentKind,
  { model: string; source: string }
> = {
  capacitor: {
    model: 'Chemi-Con KMQ, 680 µF / 400 V, 35 × 45 mm',
    source:
      'https://www.chemi-con.co.jp/en/products/detail-condenser.php?part_number=EKMQ401VSN681MA45S',
  },
  backplane: {
    model: 'Custom PCB / Allen-Bradley 1771 card format',
    source:
      'https://support.rockwellautomation.com/cc/okcsFattachCustom/get/778895_4',
  },
  breaker: {
    model: 'Schneider ComPacT NSX100, 3-pole',
    source: 'https://www.se.com/ie/en/faqs/FA246758/',
  },
  contactor: {
    model: 'Schneider TeSys Deca LC1D09',
    source: 'https://iportal.se.com/Contents/docs/SQD-LC1D09D7.PDF',
  },
  overload: {
    model: 'Schneider TeSys LRD08',
    source:
      'https://eshop.se.com/sg/lrd08-tesys-deca-thermal-overload-relay-690vac-3p-2-5-to-4a-1no-1nc-class-10a-screw-clamp.html',
  },
  fuse: {
    model: 'Eaton Bussmann KTK-R, 2 A',
    source:
      'https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/bussmann-series-branch-circuit-fuses/class-cc/bus-ele-ds-1015-ktk-r.pdf',
  },
  capacitors: {
    model: 'TDK B43544, 680 µF / 400 V',
    source: 'https://www.tdk-electronics.tdk.com/inf/20/30/db/aec/B43544.pdf',
  },
  relay: {
    model: 'Finder 40.52, 24 V DC',
    source: 'https://cdn.findernet.com/app/uploads/ZDPFRXX4052.pdf',
  },
  terminal: {
    model: 'Phoenix Contact UK 5 N',
    source:
      'https://www.phoenixcontact.com/en-us/products/feed-through-terminal-block-uk-5-n-3004362',
  },
  'plc-power': {
    model: 'Allen-Bradley 1771-P4S',
    source:
      'https://support.rockwellautomation.com/cc/okcsFattachCustom/get/675973_14',
  },
  'plc-cpu': {
    model: 'Allen-Bradley PLC-5/20 (1785-L20B)',
    source:
      'https://support.rockwellautomation.com/cc/okcsFattachCustom/get/675973_14',
  },
  'plc-input': {
    model: 'Allen-Bradley 1771-IBD',
    source:
      'https://support.rockwellautomation.com/cc/okcsFattachCustom/get/675973_14',
  },
  'plc-output': {
    model: 'Allen-Bradley 1771-OBD',
    source:
      'https://support.rockwellautomation.com/cc/okcsFattachCustom/get/675973_14',
  },
  'plc-analog': {
    model: 'Allen-Bradley 1771-IFE',
    source:
      'https://support.rockwellautomation.com/cc/okcsFattachCustom/get/675973_14',
  },
  'plc-comms': {
    model: 'Allen-Bradley 1771-KE',
    source:
      'https://support.rockwellautomation.com/cc/okcsFattachCustom/get/675973_14',
  },
  'drive-power': {
    model: 'Infineon FF100R12RT4 half bridge',
    source:
      'https://www.infineon.com/assets/row/public/documents/non-assigned/49/infineon-ff100r12rt4-datasheet-en.pdf',
  },
  'rack-unit': {
    model: 'Hammond RM2U1913VBK / EIA rails',
    source: 'https://www.hammfg.com/part/RM2U1913VBK',
  },
  'motor-unit': {
    model: 'Allen-Bradley CENTERLINE 2100 bucket',
    source:
      'https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/2100-sg003_-en-p.pdf',
  },
  motor: {
    model: 'ABB M2BAX, IEC 90 frame',
    source: 'https://www.abb.com/global/en/products/3gba092510-adt',
  },
};
