# 2026 Electrical Design Guide (PWA)

An offline-first Progressive Web App with nine electrical design modules, each with engineering guidelines, reference tables/formulas and a working calculator. Built with plain HTML5, CSS3 and ES6+ JavaScript. There are no external CDNs, build steps or dependencies.

**Live URL (after deployment):** https://githubbest729.github.io/electricaldesign/

## Modules

1. Illumination Computation (Lumen Method, lux tables, LPD check)
2. General Electrical Design Considerations (voltage drop, 125 % continuous load, power factor, demand factors, derating, future-readiness)
3. Conduit Sizing (1-phase and 3-phase fill: PVC Sch 40/80, EMT, IMC, RSC)
4. Conductor Sizing (ampacity, derating, voltage-drop verified, AWG and mm²)
5. OCPD Sizing (lighting, receptacle, continuous, feeder/main, motor branch circuits)
6. Load Balancing in 3-Phase Systems
7. Electrical Equipment Sizing (transformer, generator, MDP/busbar, disconnect switch)
8. Ground Wire Sizing (EGC and GEC)
9. Instrument Transformers for Metering (CT and PT/VT)

Also included: global search, saved calculations (localStorage) with print/text export, a 2026 design review checklist with persistent progress, first-run onboarding, install button (plus iOS "Add to Home Screen" help), online/offline indicator and an update toast when a new service worker is ready.

## Deploy to GitHub Pages

1. Extract this archive into the root of your (empty) repository, so `index.html` sits at the top level.
2. Commit and push to the default branch:
   ```bash
   git add -A
   git commit -m "Add 2026 Electrical Design Guide PWA"
   git push origin main
   ```
3. In the repository go to **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. After the build completes, open https://githubbest729.github.io/electricaldesign/ and reload once while online so the service worker can cache everything.

`.nojekyll` is included so GitHub Pages serves dot-folders such as `.well-known/` untouched.

All internal paths are relative (`./…`), with `start_url` and `scope` set to `./`, so the app works under the `/electricaldesign/` sub-path. Absolute URLs are used only for the canonical link, Open Graph/Twitter tags, `robots.txt` and `sitemap.xml`.

## Releasing an update

1. Edit the files you need.
2. Change `VERSION` at the top of `sw.js` (for example `v1.0.1`). If you add or rename files, update the `PRECACHE` list too.
3. Push. Returning users see **"New version available — Reload"**.

## Test offline behaviour

Serve the folder over HTTP (service workers need `localhost` or HTTPS), for example `python3 -m http.server 8080`, open the page, then in browser DevTools → Application → Service Workers tick **Offline** and reload.

## Notes

- `.well-known/assetlinks.json` is an empty array on purpose. If you later wrap the app as an Android Trusted Web Activity, replace it with your package name and signing-certificate fingerprint. Note that Android verifies this file at the domain root of the host, not under the repository sub-path.
- Saved calculations live only in the browser's `localStorage` on the device. Clearing site data removes them. Use the print or text export for records.
- Screenshots, icons and the social image are rendered PNG files; replace them if you rebrand.

## Engineering disclaimer

This tool is an aid for preliminary design and checking. Tables and factors follow commonly published NEC/PEC-style values; code editions, local amendments and manufacturer data vary. A licensed professional electrical engineer must verify every result against the code edition adopted by the authority having jurisdiction before any construction use.
