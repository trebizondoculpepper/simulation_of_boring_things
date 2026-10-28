"""Reference chloramine fixtures from the Jafvert & Valentine (1992) scheme.

A line-for-line Python port of `simulate_chloramine` in the US EPA's
Chlorine Breakpoint Curve Simulator (D. G. Wahman, USEPA, MIT licence,
https://github.com/USEPA/Chlorine_Breakpoint_Curve_Simulator, `app.R`,
version 0.25 of 2017-12-18; Jafvert & Valentine, ES&T 26:577, 1992, with
Vikesland et al., Water Res. 35:1766, 2001). As in the original, pH is held
constant (a buffered batch) and the stiff system is solved with LSODA.

It writes `src/game/water/fixtures/jafvert-valentine.json`, which the
TypeScript chemistry tests compare against. Offline only: run it with

    python3 -m venv /tmp/wr && /tmp/wr/bin/pip install numpy scipy
    /tmp/wr/bin/python -I scripts/water-reference/jafvert_valentine.py

Recorded in doc/reuse-inventory.md (ported, not copied, from the EPA app).
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.integrate import solve_ivp


def simulate(free_mg_l: float, totnh_mg_n: float, ph: float, alk: float,
             t_c: float, hours: list[float]) -> dict[str, list[float]]:
    """Free chlorine and ammonia mixed at time 0; species at each hour."""
    t_k = t_c + 273.15
    k_hocl = 10 ** -(1.18e-4 * t_k**2 - 7.86e-2 * t_k + 20.5)
    k_nh4 = 10 ** -(1.03e-4 * t_k**2 - 9.21e-2 * t_k + 27.6)
    k_h2co3 = 10 ** -(1.48e-4 * t_k**2 - 9.39e-2 * t_k + 21.2)
    k_hco3 = 10 ** -(1.19e-4 * t_k**2 - 7.99e-2 * t_k + 23.6)
    k_w = 10 ** -(1.5e-4 * t_k**2 - 1.23e-1 * t_k + 37.3)
    h = 10**-ph
    oh = k_w / h
    a0_cl = 1 / (1 + k_hocl / h)
    a1_cl = 1 / (1 + h / k_hocl)
    a1_nh = 1 / (1 + h / k_nh4)
    a0_co = 1 / (1 + k_h2co3 / h + k_h2co3 * k_hco3 / h**2)
    a1_co = 1 / (1 + h / k_h2co3 + k_hco3 / h)
    a2_co = 1 / (1 + h / k_hco3 + h**2 / (k_h2co3 * k_hco3))
    totco = (alk / 50000 + h - oh) / (a1_co + 2 * a2_co)
    h2co3, hco3, co3 = a0_co * totco, a1_co * totco, a2_co * totco
    k1 = 6.6e8 * math.exp(-1510 / t_k)
    k2 = 1.38e8 * math.exp(-8800 / t_k)
    k3 = 3.0e5 * math.exp(-2010 / t_k)
    k4 = 6.5e-7
    k5 = (1.05e7 * math.exp(-2169 / t_k) * h
          + 4.2e31 * math.exp(-22144 / t_k) * hco3
          + 8.19e6 * math.exp(-4026 / t_k) * h2co3)
    k6, k7, k8, k9, k10 = 6.0e4, 1.1e2, 2.8e4, 8.3e3, 1.5e-2
    k11p = 3.28e9 * oh + 6.0e6 * co3
    k11ocl, k12, k13, k14 = 9e4, 5.56e10, 1.39e9, 2.31e2

    def rhs(_t, y):
        totnh, totcl, nh2cl, nhcl2, ncl3, i = y
        r11 = (k11p + k11ocl * a1_cl * totcl) * a0_cl * totcl * nhcl2
        d_totnh = (-k1 * a0_cl * totcl * a1_nh * totnh + k2 * nh2cl
                   + k5 * nh2cl**2 - k6 * nhcl2 * a1_nh * totnh * h)
        d_totcl = (-k1 * a0_cl * totcl * a1_nh * totnh + k2 * nh2cl
                   - k3 * a0_cl * totcl * nh2cl + k4 * nhcl2 + k8 * i * nhcl2
                   - r11 + 2 * k12 * nhcl2 * ncl3 * oh + k13 * nh2cl * ncl3 * oh
                   - 2 * k14 * nhcl2 * a1_cl * totcl)
        d_nh2cl = (k1 * a0_cl * totcl * a1_nh * totnh - k2 * nh2cl
                   - k3 * a0_cl * totcl * nh2cl + k4 * nhcl2 - 2 * k5 * nh2cl**2
                   + 2 * k6 * nhcl2 * a1_nh * totnh * h - k9 * i * nh2cl
                   - k10 * nh2cl * nhcl2 - k13 * nh2cl * ncl3 * oh)
        d_nhcl2 = (k3 * a0_cl * totcl * nh2cl - k4 * nhcl2 + k5 * nh2cl**2
                   - k6 * nhcl2 * a1_nh * totnh * h - k7 * nhcl2 * oh
                   - k8 * i * nhcl2 - k10 * nh2cl * nhcl2 - r11
                   - k12 * nhcl2 * ncl3 * oh - k14 * nhcl2 * a1_cl * totcl)
        d_ncl3 = r11 - k12 * nhcl2 * ncl3 * oh - k13 * nh2cl * ncl3 * oh
        d_i = k7 * nhcl2 * oh - k8 * i * nhcl2 - k9 * i * nh2cl
        return [d_totnh, d_totcl, d_nh2cl, d_nhcl2, d_ncl3, d_i]

    y0 = [totnh_mg_n / 14000, free_mg_l / 71000, 0, 0, 0, 0]
    secs = [x * 3600 for x in hours]
    sol = solve_ivp(rhs, (0, secs[-1]), y0, method="LSODA", t_eval=secs,
                    atol=1e-14, rtol=1e-10)
    totnh, totcl, nh2cl, nhcl2, ncl3, _i = sol.y
    return {
        "hours": hours,
        "free": list(totcl * 71000),
        "mono": list(nh2cl * 71000),
        "di": list(nhcl2 * 71000 * 2),
        "tri": list(ncl3 * 71000 * 3),
        "combined": list((nh2cl + 2 * nhcl2 + 3 * ncl3) * 71000),
        "ammonia": list(totnh * 14000),
    }


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    out = root / "src/game/water/fixtures/jafvert-valentine.json"
    hours = [0, 0.05, 0.25, 0.5, 1, 2, 4, 8, 12, 24]
    pool_cases = [
        # (name, free mg/l Cl2, ammonia mg/l N, pH, alkalinity, °C)
        ("pool-light", 1.5, 0.1, 7.4, 120, 28),
        ("pool-heavy", 3.0, 0.3, 7.4, 120, 28),
        ("pool-low-ph", 2.0, 0.2, 7.0, 120, 28),
        ("pool-high-ph", 2.0, 0.2, 7.8, 120, 28),
        ("superchlorination", 10.0, 0.3, 7.4, 120, 28),
        ("spa-warm", 4.0, 0.3, 7.4, 120, 37),
    ]
    cases = {}
    for name, fc, nh, ph, alk, t in pool_cases:
        cases[name] = {"input": {"free": fc, "ammonia": nh, "ph": ph,
                                 "alkalinity": alk, "temperature": t},
                       **simulate(fc, nh, ph, alk, t, hours)}
    # The classic breakpoint curve (CBCS's own "chlorine" mode): 1 mg/l N,
    # chlorine added at a mass ratio, read after 2 hours, pH 7.5, 25 °C.
    curve = []
    for ratio in np.arange(1.0, 15.01, 0.5):
        r = simulate(ratio * 1.0, 1.0, 7.5, 150, 25, [0, 2])
        curve.append({"ratio": float(ratio), "total": r["free"][-1] + r["combined"][-1],
                      "free": r["free"][-1], "combined": r["combined"][-1]})
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "source": "Python port of USEPA Chlorine_Breakpoint_Curve_Simulator app.R v0.25 (MIT): "
                  "Jafvert & Valentine 1992 with Vikesland et al. 2001; pH held constant; LSODA",
        "generator": "scripts/water-reference/jafvert_valentine.py",
        "units": "mg/l as Cl2 (chlorine species), mg/l as N (ammonia), hours",
        "cases": cases,
        "breakpoint": curve,
    }, indent=1, default=float) + "\n")
    print(f"wrote {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
