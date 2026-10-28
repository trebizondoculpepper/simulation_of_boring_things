"""Reference carbonate-system fixtures from PHREEQC.

PHREEQC 3 (USGS, Parkhurst & Appelo; public domain, the USGS user-rights
notice) through the `phreeqc` Python bindings to IPhreeqc (PyPI `phreeqc`,
MIT, Haohan Yang), with its standard `phreeqc.dat` database. It writes
`src/game/water/fixtures/phreeqc-carbonate.json`, which the TypeScript
chemistry tests compare against: pool waters given as a test kit gives
them, their total carbonate and calcite saturation, and what each addition,
mixing and equilibrium with the hall's air does to their pH. Offline only:

    python3 -m venv /tmp/wr && /tmp/wr/bin/pip install phreeqc
    /tmp/wr/bin/python -I scripts/water-reference/phreeqc_carbonate.py
"""

import json
import sys
from pathlib import Path

import phreeqc

MG_PER_MOL = {"Na": 22990, "Cl": 35453, "Ca": 40078, "C(4)": 61017, "S(6)": 96060}


def solution(name: str, ph: float, alk: float, ch: float, na: float, t: float, so4: float = 0) -> str:
    return f"""
SOLUTION 1 {name}
  temp {t}
  units mg/l
  pH {ph}
  Alkalinity {alk} as CaCO3
  Ca {ch * 0.40043}
  Na {na}
  S(6) {so4} as SO4
  Cl 1 charge
END
"""


SELECTED = """
SELECTED_OUTPUT 1
  -reset false
  -pH true
  -alkalinity true
  -totals C(4) Ca Cl Na S(6)
  -si Calcite CO2(g)
  -ionic_strength true
END
"""


def run(p: phreeqc.Phreeqc, text: str) -> list[dict[str, float]]:
    if p.RunString(SELECTED + text):
        raise RuntimeError(p.GetErrorString())
    lines = [ln.split() for ln in p.GetSelectedOutputString().strip().splitlines()]
    head = lines[0]
    rows = []
    for ln in lines[1:]:
        r = dict(zip(head, (float(x) for x in ln)))
        tds = sum(r.get(k, 0) * m for k, m in MG_PER_MOL.items())
        rows.append({
            "ph": r["pH"],
            "alkalinity": r["Alk"] * 50044,
            "carbonate": r["C(4)"] * 1000,
            "hardness": r["Ca"] * 100087,
            "tds": tds,
            "calciteSi": r["si_Calcite"],
            "co2Si": r["si_CO2(g)"],
            "ionicStrength": r["mu"],
        })
    return rows


def main() -> None:
    p = phreeqc.Phreeqc()
    p.LoadBuiltInDatabase("phreeqc.dat")
    p.SetSelectedOutputStringOn(True)
    waters = {
        "nominal": (7.4, 120, 200, 250, 28),
        "soft": (7.2, 80, 100, 250, 28),
        "neglected": (7.0, 60, 60, 120, 28),
        "hard": (7.8, 180, 350, 400, 28),
        "spa": (7.4, 120, 200, 250, 37),
        "lounge": (7.3, 100, 150, 250, 30),
    }
    out = {"source": f"PHREEQC {p.GetVersionString()} (USGS, public domain), phreeqc.dat, via the MIT `phreeqc` bindings",
           "generator": "scripts/water-reference/phreeqc_carbonate.py",
           "units": "mg/l; alkalinity and hardness as CaCO3; carbonate mmol/l",
           "waters": {}, "changes": {}}
    for name, (ph, alk, ch, na, t) in waters.items():
        out["waters"][name] = {"input": {"ph": ph, "alkalinity": alk, "hardness": ch, "temperature": t},
                               **run(p, solution(name, ph, alk, ch, na, t))[-1]}
    base = solution("nominal", 7.4, 120, 200, 250, 28)
    # Each change per litre: moles added to 1 kg of water.
    changes = {
        "hcl-0.073meq": ("REACTION 1\n HCl 1\n 0.073e-3 moles\n", "hcl", 0.073e-3 * 36.461 * 1000),
        "hcl-0.5meq": ("REACTION 1\n HCl 1\n 0.5e-3 moles\n", "hcl", 0.5e-3 * 36.461 * 1000),
        "bicarbonate-0.2mmol": ("REACTION 1\n NaHCO3 1\n 0.2e-3 moles\n", "bicarbonate", 0.2e-3 * 84.007 * 1000),
        "soda-ash-0.1mmol": ("REACTION 1\n Na2CO3 1\n 0.1e-3 moles\n", "sodaAsh", 0.1e-3 * 105.988 * 1000),
        "co2-0.2272mmol": ("REACTION 1\n CO2 1\n 0.2272e-3 moles\n", "co2", 0.2272e-3 * 44.01 * 1000),
        "calcium-chloride-1mmol": ("REACTION 1\n CaCl2 1\n 1.0e-3 moles\n", "calciumChloride", 1.0e-3 * 110.98 * 1000),
    }
    for name, (rx, key, grams_per_m3) in changes.items():
        rows = run(p, base + "USE solution 1\n" + rx + "END\n")
        out["changes"][name] = {"water": "nominal", "added": {key: grams_per_m3}, **rows[-1]}
    # Equilibrium with the hall's air (800 ppm CO2) and with outdoor air (420 ppm).
    for name, ppm in (("air-800ppm", 800), ("air-420ppm", 420)):
        import math
        rows = run(p, base + f"USE solution 1\nEQUILIBRIUM_PHASES 1\n CO2(g) {math.log10(ppm * 1e-6)} 10\nEND\n")
        out["changes"][name] = {"water": "nominal", "airCo2": ppm, **rows[-1]}
    # A third of the pool replaced with mains water (10 °C water warmed to 28 °C).
    mains = solution("mains", 7.6, 150, 200, 30, 28).replace("SOLUTION 1", "SOLUTION 2")
    rows = run(p, base + mains + "MIX 1\n 1 0.6667\n 2 0.3333\nEND\n")
    out["waters"]["mains"] = {"input": {"ph": 7.6, "alkalinity": 150, "hardness": 200, "temperature": 28},
                              **run(p, mains)[-1]}
    out["changes"]["mix-third-mains"] = {"water": "nominal", "mixWith": "mains", "share": 1 / 3, **rows[-1]}
    root = Path(__file__).resolve().parents[2]
    dest = root / "src/game/water/fixtures/phreeqc-carbonate.json"
    dest.write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {dest}", file=sys.stderr)


if __name__ == "__main__":
    main()
