# Knight Sprite Technical Table

## Class Variant Map

- `archer`: `humn_v00`
- `knight`: `humn_v01`
- `druid`: `humn_v09`
- `assassin`: `humn_v10`

## Direction Row Order (all relevant atlases)

- Row 0: Sul (S)
- Row 1: Norte (N)
- Row 2: Leste (L)
- Row 3: Oeste (O)

## Active Files and Usage

| File | Purpose | Modules in Use Now | Rows | Frames Used |
|---|---|---|---|---|
| `assets/animacoes/char_a_p1/char_a_p1_0bas_humn_v01.png` | Base sem arma | `stand`, `walk` | `stand` rows top: S,N,L,O; `walk` rows bottom (+4): S,N,L,O | `stand`: col 0; `walk`: cols 0..5 |
| `assets/animacoes/char_a_pONE2/char_a_pONE2_0bas_humn_v00.png` | Base com arma equipada (fora de ataque) | `stand`, `walk` | mesmas 4 rows direcionais: S,N,L,O | `stand`: cols 0..3; `walk`: cols 4..7 |
| `assets/animacoes/char_a_pONE2/6tla/char_a_pONE2_6tla_sw01_v01.png` | Sword layer com arma equipada (fora de ataque) | `stand`, `walk` overlay | mesmas rows da base pONE2 | `stand`: cols 0..3; `walk`: cols 4..7 |
| `assets/animacoes/char_a_pONE2/7tlb/char_a_pONE2_7tlb_sh01_v01.png` | Shield layer com arma equipada (fora de ataque) | `stand`, `walk` overlay | mesmas rows da base pONE2 | `stand`: cols 0..3; `walk`: cols 4..7 |
| `assets/animacoes/char_a_pONE1/char_a_pONE1_0bas_humn_v01.png` | Attack-only base when attacking | Combat slash | Top rows: S,N,L,O | cols 0..5 |
| `assets/animacoes/char_a_pONE1/6tla/char_a_pONE1_6tla_sw01_v01.png` | Sword layer during attack | Attack overlay | Top rows: S,N,L,O | cols 0..5 |
| `assets/animacoes/char_a_pONE1/7tlb/char_a_pONE1_7tlb_sh01_v01.png` | Shield layer during attack | Attack overlay | Top rows: S,N,L,O | cols 0..5 |

## Runtime Rules (current)

- Without weapon equipped:
  - Uses `p1` base (`stand`/`walk`).
  - No weapon visual.
- With weapon equipped and NOT attacking:
  - Uses `pONE2` base (`stand`/`walk`) + sword/shield layers from `pONE2`.
  - No procedural legacy weapon draw.
- With weapon equipped and attacking:
  - Uses `pONE1` attack frames (0..5) with sword+shield layers.

## Discarded Modules for Now

- `push`: not used (no push mechanic).
- `pull`: not used (no pull mechanic).
- `jump`: not used (no jump mechanic).
- `run`: not used (game currently uses only walk speed/animation).
- death frames in combat sheets: not used now.

## Notes

- Diagonal facings are mapped to cardinals for these atlases:
  - `se/sw -> S`
  - `ne/nw -> N`
- This keeps atlas row selection consistent with available directional rows.
