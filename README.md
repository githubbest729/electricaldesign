# 2026 Electrical Design Guide (PWA)

An offline-first Progressive Web App engineered for **2026 electrical design** workflows, featuring 9 interactive 1-phase and 3-phase engineering calculators, design guides, reference tables, saved calculation sheets, and a 2026 QA design review checklist.

Live URL: **https://githubbest729.github.io/electricaldesign/**

## Included 2026 Electrical Design Modules

1. **Illumination Computation** — Lumen Method, Room Index, fixture layout, Spacing-to-Height Ratio (SHR), achieved lux, and LED Lighting Power Density (LPD).
2. **General Electrical Design Considerations** — Voltage drop checker (3% branch / 5% total), power factor breakdown, 125% continuous load & thermal/bundling derating, and 2026 EV/PV/SPD readiness.
3. **Conduit Sizing (1-Phase & 3-Phase)** — THHN/THWN-2 conduit fill calculator across PVC Sch 40, PVC Sch 80, EMT, IMC, and RSC enforcing 53% / 31% / 40% fill limits.
4. **Conductor Sizing (1-Phase & 3-Phase)** — Combined ampacity, thermal/bundling derating, and voltage-drop-verified sizing in AWG/kcmil and metric mm².
5. **OCPD Sizing for Main & Branch Circuits** — Standard circuit breaker and fuse sizing for general circuits, continuous feeders, and motor branch circuits.
6. **Load Balancing in 3-Phase Systems** — Interactive panelboard circuit schedule, phase totals, % unbalance assessment, neutral current calculation, and one-click auto-rebalancing.
7. **Electrical Equipment Sizing** — Distribution transformer kVA, standby generator kVA/kW (with motor starting step), and MDP busbar / disconnect switch sizing.
8. **Ground Wire Sizing (EGC & GEC)** — Equipment Grounding Conductor (with voltage-drop proportional upsizing check) and Grounding Electrode Conductor sizing.
9. **Instrument Transformers for Metering (CT & PT/VT)** — Standard CT ratio selection, lead + meter VA burden verification, PT ratio helper, accuracy classes, and secondary shorting-block safety guidance.

## Deploying to GitHub Pages (`githubbest729/electricaldesign`)

1. Extract `2026-electrical-design-guide-pwa.zip`.
2. Upload **all extracted files and folders** directly into the root of `githubbest729/electricaldesign` (keep `css/`, `js/`, `icons/`, `images/`, `screenshots/`, and `.well-known/` intact).
3. In GitHub, open **Settings → Pages**, choose **Deploy from a branch** → `main` → `/ (root)` and click **Save**.
4. Open `https://githubbest729.github.io/electricaldesign/`.
