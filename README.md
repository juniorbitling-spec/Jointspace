# Jointspace

Joint Space Physiotherapy — offline, single-file assessment apps (open in any browser, works on phone).

| File | What it is |
|------|------------|
| `JointSpace-Proforma.html` | **Detailed assessment proforma for every region in one app** |
| `JointSpace-Assessment-v2.html` | Earlier quick multi-joint assessment |

## Regions

Back (lumbar) · SI joint / pelvis · Neck (cervical) · Shoulder · Elbow & forearm · Wrist & hand · Hip & groin · Knee · Ankle & foot

Open a region directly with a hash, e.g. `JointSpace-Proforma.html#knee`.

## What every proforma contains

1. Patient details (auto BMI), chief complaint & history (with region-specific mechanism questions)
2. Pain profile — body-chart areas, NPRS sliders, 24-h behaviour, aggravating / easing
3. Region-specific red flags (urgent items flagged) & yellow flags; decision rules (Ottawa knee / ankle, Canadian C-spine)
4. Medical, drug & social history
5. Auto-scored outcome measures — ODI, STarT Back (back / SIJ), NDI (neck), SPADI + QuickDASH (shoulder), QuickDASH (elbow, wrist), Lysholm + LEFS (knee), LEFS (hip, ankle) — plus fields for other scales
6. Observation & posture (e.g. FPI-6, Q-angle, girth, carrying angle, scapular dyskinesis, pelvic landmarks)
7. ROM for each movement — left / right, active / passive, end feel (plus Schober, GIRD, lunge test, finger ROM …)
8. MMT for each muscle, left / right MRC grade with root / nerve, plus dynamometry with automatic LSI and ratios
9. Muscle length tests
10. Neurological exam — upper- or lower-limb dermatomes, peripheral nerves, myotomes, reflexes, UMN signs, neurodynamic tests
11. 24–44 special tests per region (POS / NEG / N/A each side) with automatic cluster scoring (Laslett, Wainner, Cook, Park, Lowery, Sutlive …)
12. Palpation (and PAIVMs for spine / SIJ)
13. Structure-by-structure MRI / ultrasound findings (level-by-level disc & canal tables for spine), X-ray, labs, image upload
14. Functional tests (hop tests, Y-balance, grip / pinch …) & PSFS
15. Diagnosis (ICF, pain mechanism, classification), goals, treatment plan, sign-off

Records are saved on the device (IndexedDB), can be edited or re-assessed, printed as a line-by-line report / PDF, and exported to CSV or JSON backup. Unsaved work is kept as a draft.

## Editing the app

Source lives in `src/` (`regions.js` = all proforma content, `engine.js` = app logic). After editing, rebuild the single file:

```
python3 src/build.py
```
