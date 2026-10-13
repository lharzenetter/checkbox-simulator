# LCD screen catalogue — Checkbox 5+1 USB V04

Research notes for the GitHub issue "Catalogue every Checkbox LCD screen from the manual".
This file lists every LCD screen of the Checkbox that the manual shows or describes, and which key leads from one screen to the next.
It is a research catalogue, not a specification: where the manual is silent or contradicts itself, the gap is listed and not decided here.

## Source and citation conventions

- **Only source:** `30784_BA_Checkbox-5u1_30158_30160_30936_de_2017_04_21.pdf`, the German manual (Bedienungsanleitung) in the repo root, 96 pages, © 2017 Industrieelektronik Pölz GmbH.
  It covers three variants: Checkbox 5+1 Seriell (30158), USB (30160) and USB V04 (30936) (p. 1, p. 90 §9.2).
  We target **V04 (30936)** only; where the manual separates the variants, this file says so.
- **Page numbers:** the printed page numbers equal the PDF page numbers (p. 3 prints "3", p. 21 prints "21", and so on), so each claim cites one page number, "p. N".
- **Figures:** the manual does not number its figures.
  A figure is cited by page, column and position (e.g. "p. 22, right column, lower figure").
- **Images:** the PNGs in [`lcd-screens/`](lcd-screens/) were cropped from the PDF with PyMuPDF at 4–5× zoom (script kept outside the repo).
  The embedded screen bitmaps are about 319 × 319 px, so the crops are upscaled and show no more detail than the manual does.
- **Notation in the transcriptions:**
  - `▓text▓` marks inverse video (light text on a dark bar).
  - `────` marks a horizontal rule drawn on the LCD.
  - `{…}` marks a pixel graphic that is not a character, e.g. `{BAT}` for the battery gauge, `{UHR}` for the clock icon, `{F}` for status glyph F.
  - `│` marks a vertical rule.
  - Column alignment is approximate (see [character grid](#character-grid)).

## Overview of the LCD

### Hardware and keys

![Front view of the Checkbox](lcd-screens/3-1-1-geraet-vorderseite.png)

*p. 9, §3.1.1, figure "Geräteübersicht Vorderseite".*

| No. on figure | Element | Function according to the manual (p. 9, §3.1.1) |
|---|---|---|
| ① | LED-Alarmanzeige (red) | shows Alarms |
| ② | LCD-Display | shows Einsätze, service and settings functions |
| ③ | **D** (Abbruchtaste, drawn as "C×") | "Funktion oder Eingabe abbrechen / in den Ausgangsmodus zurückkehren" |
| ④ | **A** (up) | "im Menü oder in Funktionen navigieren / Optionen wählen / Eingabemarke bewegen" |
| ⑤ | **C** (OK-Taste) | "Menü oder Funktionen aufrufen / Eingaben oder Auswahl bestätigen" |
| ⑥ | **B** (down) | same as A, downwards |
| ⑦ | **E** (Transponder-/Check-Taste, labelled "CHECK") | "Einschalten des Gerätes / Anmelden und Abmelden von Atemschutzträgern / Programmieren von Transpondern" |

The display texts call the Abbruchtaste **"X"** ("X = nicht abmelden", p. 30; "sonst die X Taste drücken", p. 32; "Abbruch: 'X'-Taste", p. 41).
They call the Transponder **"TALLY"** ("oder TALLY auflegen", p. 17; "TALLY Service:", p. 33).

### Display type

The LCD is a **monochrome graphic (dot-matrix) LCD**, not a character LCD.
The screens mix several font sizes, pixel graphics (battery gauge, clock icon, breathing-air cylinder, bar graph), horizontal and vertical rules, double-line frames and inverse bars (all figures, pp. 10–33).
The manual states neither the resolution nor a character grid; everything in the next subsection is measured from the figures.

### Character grid

Estimated from the figures; the manual does not state it.

- **Aspect:** square (front-view figure p. 9; every screen figure is about 1:1).
- **Resolution, estimated about 128 × 128 px.**
  In the embedded bitmap of p. 20 (left figure) the 1-pixel checkerboard of the cylinder fill repeats every ~4.8 bitmap px, i.e. ~2.4 bitmap px per LCD pixel.
  That gives ~133 LCD px across a 319 px bitmap that includes the bezel.
- **Standard font, about 6 px pitch → about 21 columns.**
  The longest standard-font lines are 21 characters and fill the width: "Neuen Trupp anmelden:" (p. 18), "Trupp OK Bereitschaft" (p. 19), "Zeit/Datum einstellen" (p. 17), "Attribute eintragen" (19, p. 26).
- **About 12–13 text lines** at the standard line pitch of roughly 10 px.
  The densest screen, Einsatzprotokoll (p. 32), shows 11 text lines plus 4 rules.
- **Glyph width varies.**
  Status glyphs F–M are wider than one character (they take about 3–5 character cells in the Einsatzliste, p. 10).
  The status-glyph legend (p. 11) uses a separate font, "Symbole_Poelz"; display texts quoted in body text use a font named "Displaytextuni" (both read from the PDF's font table).

### Status glyphs F–M (Einsatzstatus symbols)

![Status glyph legend](lcd-screens/3-2-2-status-glyphen.png)

*p. 11, §3.2.2 "Statusübersicht"; repeated on p. 26, §5.6.1.*

The manual names the glyphs by the letters of its symbol font.
Each status has a **pair**: the first glyph is used for Trupps of up to three members, the second for larger Trupps.
"Bis zu drei Truppmitglieder werden als Symbole angezeigt. Mehr als drei Truppmitglieder werden als Zahl angezeigt." (p. 11, also p. 20, p. 23, p. 26, p. 27, p. 30)

| Einsatzstatus | ≤ 3 members | > 3 members | Drawing (house = Einsatzziel) | Source |
|---|---|---|---|---|
| Bereitschaft | **G**: two figures standing *outside*, left of an empty house | **K**: `4×` + one figure + empty house | nobody has moved yet | p. 11, p. 26, p. 27 |
| Anmarsch ("Im Anmarsch") | **F**: one figure outside + one figure *entering* the house | **J**: `4×` + figure + arrow `→` into the house | entering | p. 11, p. 20, p. 26 |
| Einsatzziel erreicht | **H**: two figures *inside* the house | **L**: `4×` + one figure inside the house | inside | p. 11, p. 22, p. 23, p. 26 |
| Rückzug ("Rückzug" / "Rückmarsch") | **I**: one figure inside + one figure *leaving* on the right | **M**: `4×` + arrow `→` out of the house + figure outside right | leaving | p. 11, p. 26, p. 30 |
| Sicherungstrupp | the text **`SICHER`** alternates with the Trupp's status glyph | same | — | p. 11, p. 21 §5.3.1 step 4, p. 26 |

Notes:

- The `4×` in K/J/L/M is the member count. The legend shows "4×"; the Einsatzliste figure shows "05 4× {L}" for a "Vierertrupp" (p. 10 item ⑦).
  With V04 a Trupp has up to six members (p. 18 step 6), so `5×` and `6×` must also occur. The manual does not show them.
- The manual never draws a glyph for a **three-member** Trupp, although "up to three" members are drawn as figures. See [gaps](#gaps-and-ambiguities).
- If the **Rückzugsalarmmodus** is off, only Einsatzziel erreicht (H/L) is available.
  A new Trupp then starts in H/L instead of F/J, and Anmarsch and Rückzug times are not calculated (p. 11, p. 20, p. 22, p. 26, p. 29, p. 71).

### SICHER alternation

- A Sicherungstrupp is registered with "Sicherheitstrupp OK" in the Anmeldefenster ([S04](#s04-anmeldefenster-des-trupps)) (p. 21 §5.3.1 steps 2–3).
- In the Einsatzliste "erscheinen abwechselnd das Wort Sicher und der Status des Trupps" (p. 21 step 4).
  The figure on p. 10 (item ⑧, "Status und Schrift wechseln") shows the phase `06  SICHER  10:10:00`.
- The manual does not give the alternation period or duty cycle.
- V04 only: "Ein Sicherungstrupp kann erst ab V04 zum Einsatztrupp werden" (p. 19, p. 21).
  Parameter 89 "Sicherheitstrupp Revidierung" asks whether the Sicherungstrupp becomes a normal Trupp again after changing into the Einsatz (p. 73, p. 89). No screen for that question is shown.

### Restzeit and the negative Restzeit format

- Restzeit is shown as **`HH:MM:SS`**: "Anzeige 00:00:00" when the Einsatzzeit is used up (p. 24 §5.5.3), and "00:25:00" in the detail screens (pp. 20, 22, 26).
- After the Einsatzzeit is exceeded, "Die Zeitanzeige für den Trupp am Display der Checkbox wird als fortlaufende negative Zeit angezeigt" (p. 24 §5.5.3).
  The ALARM figure shows **`-00:00:10`**: a leading minus sign, 9 characters (p. 24, right column figure).
- The manual does not show a negative Restzeit in the Einsatzliste, where the time column is 8 characters wide (p. 10).
- According to the text, the Einsatzliste shows "die verbleibende Restzeit" (p. 14 §5.1.3, p. 26 §5.6).
  Example: "die Restzeit auf der Liste der Einsätze beträgt 20 Minuten" after one third of a 30-minute Einsatzzeit (p. 23 §5.5.1).
  The list figures, however, show values that look like **clock times** (see [S07](#s07-einsatzliste) and gap G1).

### Inverse, highlighting and blinking

The figures show these uses of inverse video:

- the **selection bar** in menus: [S02](#s02-service-menü-later), [S03](#s03-neuen-trupp-anmelden--einsatzzeit-wählen) and [S04](#s04-anmeldefenster-des-trupps)
- the **selected Trupp number** in the Einsatzliste (`▓01▓`, p. 10 item ③ "markiert"; p. 20)
- **logged-off members** in [S13](#s13-trupp-abmelden) ("Die Namen der Truppmitglieder, die sich abgemeldet haben, erscheinen markiert", p. 30 step 3)
- the **`Ansicht`** label in [S11](#s11-trupp-ansicht-grafische-detailansicht) (pp. 11, 29)
- the **`A C H T U N G !`** banner in [S14](#s14-notausschaltung--auswahl) (p. 31)
- the **`Testprogramm`** title in [S21](#s21-testprogramm-later) (p. 85)

The **only time-based alternation** the manual documents is SICHER ↔ status glyph.
No blinking cursor, blinking Restzeit or blinking alarm text is documented.

### Frequently used fields

- **Organisation name**, e.g. `FF-Musterstadt` (p. 10 item ①, "Name der Organisation/Feuerwehr bzw. Attribute"). It can be edited in the service menu ([S18](#s18-namens-editor-buchstabenfeld-later), "Feuerwehrname ändern", p. 34).
- **Battery and clock line**: `B1-{BAT}+ {UHR} 10:20:00` (p. 10 item ②, "Anzeige Batteriekapazität und aktuelle Uhrzeit").
  `B1` names the battery compartment in use; the Testprogramm shows both `B1` and `B2` (p. 85).
  "Am Display werden das aktuell verwendete Batteriefach und der Batteriekapazität angezeigt" (p. 84).
- **Atemschutzträger names** are shown as `*MUSTERMANN M`, with a leading `*` in every Trupp screen. The Einsatzprotokoll shows them without `*` (p. 32). The manual does not explain the `*`.

---

## Screens

Screen ids are stable handles for the navigation-model work.
**[later]** marks the service-menu screens (§5.10–5.13) and other screens outside the Einsatz flow.

### S00 Aus (display off)

- **Source:** p. 17 §5.2, p. 34 §5.12, p. 14 §5.1.2.
- **Display:** blank. "Im ausgeschaltet Zustand verbraucht das Gerät keinen Strom" (p. 34).
- **Keys:**
  - **E** pressed → [S01](#s01-startdisplay) (p. 17).
  - **Transponder held on E** → switches on and goes straight to [S03](#s03-neuen-trupp-anmelden--einsatzzeit-wählen): "Die Checkbox 5+1 muss nicht eingeschaltet sein, um einen Einsatz zu starten" (p. 14 §5.1.2, p. 18).
- **Automatic transitions into S00:**
  - from S01 after the Abschaltzeit (p. 17)
  - after the last Trupp logs off and the Abschaltzeit runs out (p. 34 §5.12)
  - when both battery compartments are empty, all displays switch off while time monitoring continues for about 2–5 min (p. 84)

### S01 Startdisplay

![Startdisplay](lcd-screens/5-2-startdisplay.png)

- **Source:** p. 17 §5.2, left figure; the same screen appears on the front view, p. 9.
- **Transcription:**

```
    FF-Musterstadt
╔═══════════════════╗
║      ⟨IEP⟩        ║
║ V04.02.23  #12345 ║
╚═══════════════════╝
    B1-{BAT}+ 88%
12.04.17     11:11:00
─────────────────────
OK für SERVICE
oder TALLY auflegen
sonst Ende in  >  25
```

- **Fields:**
  - `FF-Musterstadt`: organisation name.
  - `⟨IEP⟩`: manufacturer logo.
  - `V04.02.23`: firmware version (V04 variant); `#12345`: probably the serial number (inferred; the manual does not label it).
  - `B1-{BAT}+ 88%`: battery compartment in use with its capacity. "Die Anzeige zeigt die Batteriekapazität des aktuell verwendeten Batteriefaches" (p. 17).
  - `12.04.17  11:11:00`: date `DD.MM.YY` and time `HH:MM:SS`.
  - `OK für SERVICE / oder TALLY auflegen`: prompt.
  - `sonst Ende in > 25`: countdown to automatic power-off. The unit is not stated; seconds is likely.
- **Keys:**
  - **C** → [S02](#s02-service-menü-later) SERVICE menu (p. 17, "Drücken Sie die OK-Taste (C), um das Service- und Einstellungsmenü aufzurufen").
  - **Transponder on E** → [S03](#s03-neuen-trupp-anmelden--einsatzzeit-wählen) (p. 17).
  - A, B, D: not documented.
- **Automatic transitions:**
  - Countdown reaches 0 → [S00](#s00-aus-display-off): "Ohne Eingabe schaltet sich die Checkbox nach einer einstellbaren Abschaltzeit aus" (p. 17).
  - At power-on an Alarm sounds if a battery compartment is empty, acknowledged with C (p. 14, p. 17). Its screen is not shown.

### S02 SERVICE-Menü [later]

![SERVICE menu](lcd-screens/5-2-service-menue.png)

- **Source:** p. 17 §5.2, right figure; menu items named in §5.10 (p. 32), §5.11 (p. 33), §5.13.1–5.13.3 (pp. 34–35) and §8.2 (p. 85).
- **Transcription** (as drawn):

```
╔═══════════════════╗
║      SERVICE      ║
╚═══════════════════╝
▓Einsatzprotokoll    ▓
Zeit/Datum einstellen
Kontrast
Testprogramm
```

- **Menu items named in the text:**
  - `Einsatzprotokoll` (p. 32)
  - `NAME lesen/schreiben` (p. 33)
  - `Feuerwehrname ändern` (p. 34)
  - `Kontrast` (p. 35)
  - `Zeit/Datum einstellen` (p. 35)
  - `Testprogramm` (p. 85)
- The figure shows only four of the six items. Either the list scrolls, or some items are hidden, e.g. by parameter 44 "Service Menue" or the "Checkbox sperren" options (pp. 66–67, p. 69, p. 88). See gap G8.
- "Im Service- und Einstellungsmenü können Sie keinen Einsatz starten" (p. 17).
- **Keys:**
  - **A/B** move the selection bar.
  - **C** opens the selected function: `Einsatzprotokoll` → [S16](#s16-einsatzprotokoll-later); `NAME lesen/schreiben` → [S17](#s17-tally-service-later); `Feuerwehrname ändern` → [S18](#s18-namens-editor-buchstabenfeld-later); `Kontrast` → [S19](#s19-kontrast-later); `Zeit/Datum einstellen` → [S20](#s20-zeitdatum-einstellen-later); `Testprogramm` → [S21](#s21-testprogramm-later).
  - **D** → [S01](#s01-startdisplay) ("Drücken Sie die Abbruchtaste (D), um zum Startdisplay zurückzukehren", p. 17).
- **Timeout:** not documented.

### S03 Neuen Trupp anmelden – Einsatzzeit wählen

![Login: choose Einsatzzeit](lcd-screens/5-3-login-einsatzzeit.png)

- **Source:** p. 18 §5.3 steps 1–5, left figure.
- **Transcription:**

```
Neuen Trupp anmelden:
─────────────────────
Wähle Einsatzzeit für
Trupp Nr.: 01

*MUSTERMANN M



─────────────────────
▓Einsatzzeit  30 min?▓
Einsatzzeit  60 min?
Einsatzzeit  20 min?
```

- **Fields:**
  - `Trupp Nr.: 01`: automatically assigned Trupp number ("Die Truppnummer wird automatisch vergeben", p. 18 step 2).
  - `*MUSTERMANN M`: name stored on the first Transponder (p. 18 step 2).
  - The three `Einsatzzeit … min?` lines are Einsatzzeit #1–#3 (defaults 30 / 60 / 20 min).
    Einsatzzeit #4 (default 240 min, p. 70) is not visible, so the list presumably scrolls (gap G9).
- **Keys:**
  - **A/B** choose the Einsatzzeit (step 3).
  - **C** confirms (step 4) → [S04](#s04-anmeldefenster-des-trupps).
  - **Langzeiteinsatz:** "Bestätigen Sie alle Einsatzzeiten – außer Einsatzzeit 30 min – zusätzlich mit der OK-Taste (C)" (step 5). So any Einsatzzeit other than 30 min needs a **second C**; the screen for that is not shown.
  - **Further Transponders on E** add members. The manual places this at step 6, after the Einsatzzeit is chosen.
  - D: not documented for this screen.
- **Automatic transitions:**
  - Parameter 12 "Automatisches Anmelden": "Nach dieser Zeit erfolgt die automatische Anmeldung eines Truppmitgliedes beim Auflegen eines Transponders ohne Drücken der OK-Taste (C)" (1–650 s, p. 69).
  - Parameter 7: a Daueralarm sounds until the minimum number of members has logged in (p. 71–72).

### S04 Anmeldefenster des Trupps

![Anmeldefenster](lcd-screens/5-3-anmeldefenster.png)

- **Source:** p. 19 §5.3 steps 6–9, left figure; §5.3.1 (p. 21); §5.3.2 (p. 21).
- **Transcription:**

```
Trupp 01   30 min
─────────────────────
*MUSTERMANN M
*MUSTERMANN E




─────────────────────
▓Trupp OK Einsatz    ▓
Trupp OK Bereitschaft
Sicherheitstrupp OK
Druck ändern
```

- **Fields:**
  - header: Trupp number and the chosen Einsatzzeit
  - member list: up to 6 members on V04, up to 3 on the other variants ("mindestens zwei und max. drei oder sechs (V04) Truppmitglieder", p. 18 step 6)
  - action menu
- **Keys:**
  - **Transponder on E** adds a member (p. 18 step 6).
  - **A/B** choose the action (p. 19 step 7). The default cursor position comes from parameter 37: 0 = Einsatz, 1 = Bereitschaft (p. 69).
  - **C** on `Trupp OK Einsatz` → step 8, Attribute selection (not shown) → C (step 9) → [S05](#s05-druck-auswahl) or, if the cylinder type is fixed, [S06](#s06-anfangsdruckerfassung) or [S07](#s07-einsatzliste) (gap G4).
  - **C** on `Trupp OK Bereitschaft` → same chain. The Trupp enters the Einsatzliste in Bereitschaft (G/K). This is inferred; the manual does not show it explicitly.
  - **C** on `Sicherheitstrupp OK` → the Trupp becomes a Sicherungstrupp, SICHER alternates in the list (p. 21 §5.3.1 steps 2–4). Whether the pressure screens follow is not stated.
  - **C** on `Druck ändern` → [S08](#s08-druck-ändern-esz-zeit-ändern) (p. 21 §5.3.2 steps 2–4).
  - D: not documented.
- **Text vs. figure:** the display text says "Sicherheitstrupp OK", while the glossary and manual prose say "Sicherungstrupp" (p. 21).

### S05 DRUCK-AUSWAHL

![DRUCK-AUSWAHL](lcd-screens/5-3-druck-auswahl.png)

- **Source:** p. 19 §5.3 steps 10–11, right figure.
- **Transcription:**

```
┌───────────────────┐
│   DRUCK-AUSWAHL   │
└───────────────────┘
200 bar
300 bar
```

- **Fields:** cylinder types 1 and 2 (parameters 80 and 81, p. 73).
  No selection bar is drawn in the figure (gap G10).
- **Keys:**
  - **A/B** choose the cylinder type (step 10).
  - **C** → [S06](#s06-anfangsdruckerfassung) (steps 11–12).
- **Skipped** when parameter 14 / 53 / 54 ("Atemschutzflaschentyp", 0 = choose, 1 = 200 bar fixed, 2 = 300 bar fixed) fixes the type (p. 19 Hinweis, p. 70).

### S06 Anfangsdruckerfassung

![Anfangsdruckerfassung](lcd-screens/5-3-anfangsdruckerfassung.png)

- **Source:** p. 20 §5.3 steps 12–13, left figure.
- **Transcription** (graphic screen):

```
 Trupp Nr.:        01

 Flasche:  [ 300 bar]
     {CYL}
┌┐  ┌──────┐   Druck
││  │░░░░░░│ [ 250 bar]
││  │░░░░░░│┤1
││  │░░░░░░│   Restzeit
││  │░░░░░░│ [00:25:00]
└┘  └──────┘
```

- **Fields:**
  - `Flasche:` nominal cylinder pressure.
  - `Druck`: current pressure, editable.
  - `Restzeit`: the resulting Restzeit.
  - The cylinder graphic fills in proportion to the pressure; tick `1` marks the cylinder (count?).
  - The empty bar on the left is the time-split bar (see [S11](#s11-trupp-ansicht-grafische-detailansicht)).
- **Keys:**
  - **A/B** change the pressure (step 12). The step size is parameter 76 "Druck-Sprunggröße"; the limits are parameters 77 and 78 (±10 % of nominal by default) (pp. 72–73).
  - **C** → [S07](#s07-einsatzliste) (steps 13–14).
- **Skipped** when parameter 74 Anfangsdruckerfassung = 0.
  With value 2 the pressure is asked for **each member** (p. 72), so the screen can appear several times.

### S07 Einsatzliste

![Einsatzliste with six Trupps](lcd-screens/3-2-1-einsatzliste.png)
![Einsatzliste with one Trupp](lcd-screens/5-3-einsatzliste-ein-trupp.png)

- **Source:** p. 10 §3.2.1, right figure (six Trupps); p. 20 §5.3 step 14, right figure (one Trupp).
  The manual calls it "Liste der Einsätze"; the glossary term is **Einsatzliste**.
- **Transcription** (p. 10):

```
    FF-Musterstadt
═════════════════════
B1-{BAT}+ {UHR} 10:20:00
─────────────────────
▓01▓  {F}       09:52:00
─────────────────────
 02    {H}      09:57:00
─────────────────────
 03    {I}      09:55:00
─────────────────────
 04  {G}        10:03:00
─────────────────────
 05  4×{L}      10:07:00
─────────────────────
 06  SICHER     10:10:00
```

- **Fields** (p. 10, items ①–⑧):
  1. Organisation name or Attribute.
  2. Battery capacity and current time.
  3. Trupp 1, selected (`▓01▓`), Im Anmarsch (F).
  4. Trupp 2, Einsatzziel erreicht (H).
  5. Trupp 3, Im Rückzug (I).
  6. Trupp 4, In Bereitschaft (G).
  7. Trupp 5, Vierertrupp, Einsatzziel erreicht (`4×` + L).
  8. Trupp 6, Sicherungstrupp, with "Status und Schrift wechseln".
- There are six fixed rows separated by rules; empty rows stay as blank ruled rows (p. 20).
  The maximum number of Trupps is 6, set by parameter 72 (1–6) (p. 21 step 16, p. 72).
- **Right column:** according to the text, the **Restzeit** (p. 14, p. 23, p. 26). The figures conflict with this (gap G1).
- **Keys:**
  - **A/B** select a Trupp ("Markieren Sie mit den Navigationstasten (A/B) den Trupp in der Einsatzliste", p. 22, p. 26, p. 27, p. 28, p. 29).
  - **C** → [S09](#s09-trupp-menü-detailansicht) for the selected Trupp (p. 26 §5.6.2 step 2).
  - **Transponder on E**:
    - of an Atemschutzträger not yet in a Trupp → [S03](#s03-neuen-trupp-anmelden--einsatzzeit-wählen) for a new Trupp. This is inferred from p. 21 step 16, "Auf diese Weise können sich bis zu sechs Trupps … anmelden".
    - of a member of a running Trupp → [S13](#s13-trupp-abmelden) (p. 30 §5.8 step 1).
  - **D + E held ≈ 4 s** → [S14](#s14-notausschaltung--auswahl) (p. 31 §5.9 step 2).
  - **D** alone: not documented.
- **Automatic transitions:**
  - At each Alarmgrenze, at the Rückzugsalarm, when the Einsatzzeit runs out, and every 5 min in Bereitschaft or overrun, an Alarm sounds (pp. 23–25, p. 28). The screen presumably switches to [S12](#s12-trupp-alarm) (gap G5).
  - Display backlight switch-off (p. 17 Hinweis, p. 90).

### S08 Druck ändern ("Esz-Zeit ändern")

![Druck ändern](lcd-screens/5-3-2-druck-aendern.png)

- **Source:** p. 22 §5.3.2 step 4, left figure; the identical figure is on p. 28 §5.6.4 (right, lower).
- **Transcription:**

```
   Esz-Zeit ändern
 Flasche:  [ 300 bar]
     {CYL}
┌┐  ┌──────┐   Druck
││  │░░░░░░│ [ 250 bar]
││  │░░░░░░│┤1
││  │░░░░░░│   Restzeit
└┘  └──────┘ [00:25:00]
```

- **Fields:** like [S06](#s06-anfangsdruckerfassung), but titled `Esz-Zeit ändern` (Einsatzzeit ändern) instead of `Trupp Nr.:`.
  The title does not match the action "Druck ändern" (gap G11).
- **Keys:**
  - **A/B** change the pressure (p. 22 step 4; p. 29 step 5).
  - **C** confirms (p. 29 step 6) → back to S04 (during login) or to [S07](#s07-einsatzliste) (during an Einsatz). The return target is not stated.
- **Raising the pressure** during an Einsatz is allowed only if parameter 73 "Druck vergrößerbar" > 0 (p. 21, p. 28, p. 72).

### S09 Trupp-Menü (Detailansicht)

![Trupp menu, ANMARSCH](lcd-screens/5-4-trupp-menue-anmarsch.png)
![Trupp menu, EINSATZ](lcd-screens/5-6-2-trupp-menue-einsatz.png)

- **Source:**
  - variant "ANMARSCH": p. 22 §5.4 step 2, right upper figure; again on p. 27 §5.6.3
  - variant "EINSATZ": p. 26 §5.6.2 step 2; again on p. 28 §5.6.4 and p. 29 §5.7
- **Transcription, variant ANMARSCH:**

```
Trupp 01 ANMARSCH
*MUSTERMANN M
*MUSTERMANN E



─────────────────────
{UHR}  00:25:00
─────────────────────
Trupp -> Einsatz
Trupp -> Bereitschaft
Einsatzziel erreicht
Druck ändern
```

- **Transcription, variant EINSATZ:**

```
Trupp 01 EINSATZ
*MUSTERMANN M
*MUSTERMANN E



─────────────────────
{UHR}  00:25:00
─────────────────────
Trupp -> Einsatz
Trupp -> Bereitschaft
Druck ändern
Attribute eintragen
```

- **Fields:**
  - header: Trupp number and status word. Words seen: `ANMARSCH`, `EINSATZ`, `RÜCKMARSCH`, `ALARM`, `ABMELDEN`.
  - member list
  - Restzeit with the clock icon
  - action menu (4 lines visible; probably scrolls)
- **No selection bar is drawn** in any of the five copies of this figure (gap G10).
- **Menu items and their effects:**
  - `Trupp -> Einsatz`: resumes from Bereitschaft. "Die Überwachung der Einsatzzeit wird fortgesetzt, wenn der Trupp den Status EINSATZ erhält" (p. 27). The resulting status (Anmarsch?) is not stated.
  - `Trupp -> Bereitschaft`: the Trupp goes to Bereitschaft (G/K) and its Einsatzzeit stops (p. 27 §5.6.3 steps 3–5).
  - `Einsatzziel erreicht`: → [S10](#s10-esz-ziel-erreicht-druckeingabe) (p. 22 §5.4 steps 3–5).
  - `Rückzug antreten`: named in the text (p. 29 §5.7 step 3) but **not visible** in either figure → [S11](#s11-trupp-ansicht-grafische-detailansicht) (RÜCKMARSCH) / pressure entry (p. 29 step 5, p. 30 steps 6–7).
  - `Druck ändern`: → [S08](#s08-druck-ändern-esz-zeit-ändern) (p. 28 §5.6.4 steps 3–4).
  - `Attribute eintragen`: not documented further (Attribute: §6.12.2, p. 74).
- **Keys:**
  - **A/B** choose an item.
  - **C** executes it.
  - **D** back to S07. Inferred from the general D meaning, "in den Ausgangsmodus zurückkehren" (p. 9).
- **Timeout:** parameter 13 "Trupp Detailansicht": "Nach dieser Zeit wird die Detailansicht eines Trupps im Einsatz ausgeblendet und die Truppübersicht erscheint" (1–650 s, p. 69) → [S07](#s07-einsatzliste).

### S10 Esz-Ziel erreicht (Druckeingabe)

![Esz-Ziel erreicht](lcd-screens/5-4-einsatzziel-erreicht-druck.png)

- **Source:** p. 22 §5.4 step 5, right lower figure; steps 6–8 on p. 23.
- **Transcription:**

```
  Esz-Ziel erreicht
 Flasche:  [ 300 bar]
     {CYL}
┌┐  ┌──────┐   Druck
││  │░░░░░░│ [ 295 bar]
││  │░░░░░░│┤1
││  │░░░░░░│   Restzeit
└┘  └──────┘ [00:28:00]
```

- **Meaning:** "Die neuen Druck- und Zeitinformationen werden berechnet. Der Bediener der Checkbox kann die Werte an den Trupp melden" (p. 22 step 5).
  The Restzeit is recalculated from the pressure (295 bar → 00:28:00 in the example).
- **Keys:**
  - **A/B** change the pressure (p. 23 step 6).
  - **C** → [S07](#s07-einsatzliste); the Trupp is now in Einsatzziel erreicht (H/L) (p. 23 steps 7–8).

### S11 Trupp-Ansicht (grafische Detailansicht)

![Trupp-Ansicht with callouts](lcd-screens/3-2-3-trupp-ansicht.png)
![RÜCKMARSCH](lcd-screens/5-7-rueckmarsch-ansicht.png)

- **Source:** p. 11 §3.2.3 "Druck der Atemschutzflaschen ändern", right figure (callouts ①–⑨); p. 29 §5.7 step 5, right lower figure (`Trupp 01 RÜCKMARSCH`).
- **Transcription** (p. 11):

```
Trupp 01 EINSATZ
─────────────────────
*MUSTERMANN M
*MUSTERMANN E
─────────────────────
↓↑      {CYL}  │  {FLASCHE}
█       ┌────┐ │ [ 174 bar]
░       │░░░░│ │  {UHR}
░       │░░░░│┤1 [00:16:00]
█       │░░░░│ │   ↓↑
█       └────┘ │ [ 129 bar]
               │ ▓ Ansicht ▓
```

- **Fields** (p. 11, items ①–⑨):
  1. Trupp number and Einsatzstatus.
  2. Member list.
  3. Time-split bar, Anmarschzeit (top segment).
  4. Time-split bar, Einsatzziel erreicht (middle segment).
  5. Time-split bar, Rückmarschzeit ("doppelte Zeit des Anmarsches zuzüglich des eingestellten Reservedruckes").
  6. Cylinder graphic.
  7. Current Flaschendruck (editable).
  8. Remaining total Einsatzzeit (Restzeit).
  9. The Flaschendruck at which the Rückzugsalarm fires.
- `Ansicht` (inverse, bottom right) is an unexplained label. It may mark a view-only screen (gap G6).
- The pressure unit is bar by default and can be switched to PSI with parameter 79 (p. 11 Hinweis, p. 73).
- **RÜCKMARSCH example** (p. 29): `40 bar`, `00:02:00`, `120 bar`; bar segments filled for the Rückmarsch.
- **How it is reached** is not stated explicitly. The figure on p. 29 follows "Rückzug antreten" + C ("Die neuen Druck- und Zeitinformationen werden berechnet").
  After it, p. 30 steps 6–7 say "Ändern Sie – wenn nötig – … den aktuellen Flaschendruck … Bestätigen Sie mit der OK-Taste (C)", and the Trupp then gets Rückzug (I/M) (p. 30 step 8).
  §3.2.3's title also links this screen to changing the pressure.
- **Keys** (inferred from p. 30): **A/B** change the pressure; **C** → [S07](#s07-einsatzliste).
- **Timeout:** probably parameter 13 (p. 69).

### S12 Trupp ALARM

![ALARM with negative Restzeit](lcd-screens/5-5-3-alarm-negative-restzeit.png)

- **Source:** p. 24 §5.5.3, right figure.
- **Transcription:**

```
Trupp 01 ALARM
─────────────────────
*MUSTERMANN M
*MUSTERMANN E
─────────────────────
↓↑      {CYL}  │  {FLASCHE}
┌┐      ┌────┐ │ [  10 bar]
││      │    │ │  {UHR}
││      │    │┤1[-00:00:10]
││      │    │ │ ───↓↑───
││      │    │ │ [        ]
└┘      └────┘ │ Alarmende
               │  mit OK
```

- **Fields:** the layout of [S11](#s11-trupp-ansicht-grafische-detailansicht) with:
  - header status word `ALARM`
  - empty cylinder
  - **negative Restzeit `-00:00:10`**
  - empty Rückzug-pressure box
  - `Alarmende mit OK` instead of `Ansicht`
- **Keys:** **C** acknowledges ("Bestätigen Sie den Alarm mit der OK-Taste (C)", pp. 24, 25, 28) → presumably back to [S07](#s07-einsatzliste).
- **Triggers** (screen shown only for the overrun case):
  - Alarmgrenze 1 and 2 (33 % / 66 %; up to 4 Alarmgrenzen) (pp. 23–24)
  - Einsatzzeit used up, 00:00:00 (p. 24)
  - every 5 min after overrun, parameter 6 (p. 25)
  - Rückzugsalarm (p. 25)
  - percentage-mode alarms for EZ#4 (p. 25)
  - every 5 min in Bereitschaft, parameter 5 (p. 28)
  - Daueralarm when a member is missing at logoff or below the minimum number of members (p. 15, p. 31, p. 71)

### S13 Trupp ABMELDEN

![ABMELDEN](lcd-screens/5-8-abmelden.png)

- **Source:** p. 30 §5.8 steps 1–3, right figure; step 4 on p. 31.
- **Transcription:**

```
Trupp 01 ABMELDEN
▓*MUSTERMANN M       ▓
*MUSTERMANN E




─────────────────────

OK  =  abmelden
 X  =  nicht abmelden
```

- **Fields:** members who have already logged off are shown inverse (p. 30 step 3).
- **Keys:**
  - **Transponder on E** of further members marks them (p. 30 step 2).
  - **C** completes the logoff: "Der Einsatz wird aus der Liste der laufenden Einsätze gelöscht. Alle Einsatzdaten werden gespeichert" (p. 31 step 4) → [S07](#s07-einsatzliste), or the Abschaltzeit then [S00](#s00-aus-display-off) if it was the last Trupp (p. 34).
  - **D** ("X") → [S07](#s07-einsatzliste); the Trupp is not logged off (p. 31 step 4).
- **Alarm:** if a member does not log off, a Daueralarm sounds (p. 15, p. 31 §5.9 step 1). Whether C is blocked until all members are marked is not stated (gap G7).
- **Possible extra step:** parameter 75 "Enddruckerfassung" may add an end-pressure prompt at logoff (p. 72). It is not shown.

### S14 Notausschaltung – Auswahl

![Notausschaltung selection](lcd-screens/5-9-notausschaltung-auswahl.png)

- **Source:** p. 31 §5.9 steps 2–3, right figure.
- **Transcription:**

```
▓  A C H T U N G !   ▓

Einsatz-ABBRUCH
fuer . . .

-> markierten Trupp 01
-> alle Trupps
-> zurueck
```

- **Keys:**
  - Reached with **D + E held together for about 4 s** (p. 31 step 2).
  - **A/B** choose an option (p. 31 step 3). No selection bar is drawn (gap G10).
  - **C** on a Trupp option → [S15](#s15-notausschaltung--bestätigung) (p. 32 step 4).
  - **C** on `-> zurueck` cancels → S07. Inferred: "Wählen Sie zurueck, wenn Sie die Notausschaltung abbrechen möchten" (p. 31).
- "markierten Trupp" is the Trupp selected in the Einsatzliste.

### S15 Notausschaltung – Bestätigung

![Notausschaltung confirmation](lcd-screens/5-9-notausschaltung-bestaetigen.png)

- **Source:** p. 32 §5.9 steps 4–5, left figure.
- **Transcription:**

```
   A C H T U N G !
─────────────────────
     WOLLEN SIE
  WIRKLICH DEN/DIE
 TRUPP(S) LOESCHEN?

dann OK druecken

sonst die X Taste
drücken
```

- **Keys:**
  - **C** carries out the Notausschaltung; it is recorded in the Einsatzprotokoll (p. 31) → [S07](#s07-einsatzliste).
  - **Any other key** cancels: "Drücken Sie eine andere Taste, um die Notausschaltung abzubrechen" (p. 32 step 5). The screen text names only X.
- The text mixes ASCII transliteration (`druecken`, `LOESCHEN`) with an umlaut (`drücken`), verbatim from the figure.

### S16 Einsatzprotokoll [later]

![Einsatzprotokoll](lcd-screens/5-10-einsatzprotokoll.png)

- **Source:** p. 32 §5.10 steps 1–6, right figure.
- **Transcription:**

```
   Einsatzprotokoll
─────────────────────
 Einsatz Nr:    00321
     Datum:  01.01.14
TruppNr/EZT:   01/030
─────────────────────
Einsatzkräfte:
MUSTERMANN M
MUSTERMANN E
─────────────────────
 Einsatz von: 15:30:00
         bis: 15:45:00
 davon aktiv: 00:10:00
─────────────────────
Protokoll Ende
```

- **Fields:**
  - consecutive Einsatz number
  - date
  - Trupp number / Einsatzzeit in minutes (`EZT` = 030)
  - members
  - start and end time; "davon aktiv" is presumably the time not spent in Bereitschaft
- Up to 100 Einsatzprotokolle are stored; after that the oldest are overwritten (p. 15, p. 32).
- **Keys:**
  - **A/B** page through the Einsatzprotokolle (p. 32 step 5).
  - **D twice** → [S01](#s01-startdisplay) (p. 32 step 6). The first D presumably returns to S02.

### S17 TALLY Service [later]

![TALLY Service](lcd-screens/5-11-tally-service.png)

- **Source:** p. 33 §5.11 steps 1–7, right figure.
- **Transcription:**

```
   TALLY Service:
─────────────────────

Ser.Nr:  00123456
Name:  MUSTERMANN M

  OK  =  Name ändern
  X   =  Abbrechen
```

- **Keys:**
  - Before a Transponder is read, the screen waits for one on **E** (step 5). That waiting state is not shown.
  - **C** → [S18](#s18-namens-editor-buchstabenfeld-later) (step 7).
  - **D** → S02 (presumably).
  - "Drücken Sie zweimal die Abbruchtaste (D), um zum Startdisplay zurückzukehren" (p. 34 step 13).

### S18 Namens-Editor (Buchstabenfeld) [later]

- **No figure.**
- **Source:** p. 33 steps 8–10, p. 34 steps 11–12 (Transponder name); p. 34 §5.13.1 steps 5–8 and p. 35 (`Feuerwehrname ändern`).
- **Described content:** a character field ("Buchstabenfeld") with letters, digits and special characters, plus the entries `> weiter`, `< zurück`, `* übernehmen`, `x abbrechen`.
- **Keys** (verbatim): "Wählen Sie mit der Abbruchtaste (D) und den Navigationstasten (A/B) die gewünschten Buchstaben".
  - **C** confirms a letter.
  - `> weiter` / `< zurück` move to the next / previous letter.
  - `* übernehmen` accepts the input.
  - `x abbrechen` cancels.
  - For a Transponder, the new name is written by holding the Transponder on **E** (p. 34 step 12).
- The role of D in this editor is unclear (gap G12).

### S19 Kontrast [later]

- **No figure.**
- **Source:** p. 35 §5.13.2.
- **Keys:** **A/B** choose the contrast; **C** confirms.
- The range is 223–245 (parameter 51, p. 69).

### S20 Zeit/Datum einstellen [later]

- **No figure.**
- **Source:** pp. 35–36 §5.13.3.
- **Described content:** a sub-selection of Uhrzeit, Datum, or Sommer-/Winterzeit (p. 35 step 5), then a value editor.
- **Keys:**
  - **A/B** select the entry; **C** opens it.
  - In the editor, **A/B** change the value; each **C** moves the input mark to the next value; **C** after the last value accepts (p. 36 steps 7–9).
  - **D twice** → S01 (p. 36 step 10).
- Time and date are synchronised from the PC (p. 35). DST rule: parameter 90 (p. 90).

### S21 Testprogramm [later]

![Testprogramm](lcd-screens/8-2-testprogramm.png)

- **Source:** p. 85 §8.2, right figure (outside the requested chapters, included for completeness).
- **Transcription:**

```
▓    Testprogramm     ▓
┌───────────────────┐
│Batterie           │
│     B1-{BAT}+ 77% │
│     B2-{BAT}+ 85% │
├───────────────────┤
│TALLY  -  Test     │
│Ser.Nr:  00123456  │
│Name:  MUSTERMANN M│
├───────────────────┤
│Uhrzeit:   20:30:00│
├───────────────────┤
│ Alarmsirene Test  │
│ OK  =  Alarm Ein/Aus│
└───────────────────┘
```

- **Keys:**
  - **C** toggles the siren test (p. 85 steps 5–6).
  - **D twice** → S01 (step 7).
  - Placing a Transponder evidently fills the "TALLY - Test" box (inferred from the figure).

### S22 REMOTE [later]

![REMOTE](lcd-screens/6-4-remote.png)

- **Source:** p. 41 §6.4.1 (Seriell) and p. 42 §6.4.2 (USB), left figures.
- **Transcription:**

```
╔═══════════════════╗
║      REMOTE       ║
╚═══════════════════╝

Abbruch: 'X'-Taste
```

- **Meaning:** shown while the Workbench PC software is connected (p. 41, p. 42).
- **Keys:** **D** ends the connection (p. 41/42 Hinweis).
- Not needed for the simulator unless PC connection is simulated.

### Screens described but not depicted

These screens follow from the text but have no figure. The navigation model must invent their layout.

| Id | Situation | Source |
|---|---|---|
| X1 | Battery-empty Alarm at power-on (acknowledge with C) | p. 14, p. 17 |
| X2 | Second confirmation for non-30-min Einsatzzeit ("Langzeiteinsatz") | p. 18 step 5 |
| X3 | Attribute selection ("Zusatzinformationen … Einsatzart, Einsatzort, Funkrufname") | p. 19 step 8, p. 21 step 17 |
| X4 | Pressure entry after "Rückzug antreten", if it differs from S11 | p. 30 steps 6–7 |
| X5 | Sicherungstrupp Revidierung question (parameter 89) | p. 73 |
| X6 | Enddruckerfassung at logoff (parameter 75) | p. 72 |
| X7 | TALLY Service waiting for a Transponder | p. 33 step 5 |
| X8 | Login refused (G26 expired / not an Atemschutzträger) | p. 86 §8.5, p. 69 parameter 55 |
| X9 | Low-battery Alarm when the second compartment is nearly empty | p. 84 |

---

## Transition table

Keys: **A** up, **B** down, **C** OK, **D** Abbruch, **E** = Transponder-/Check-Taste.
"T@E" = a Transponder held on E.
**Bold** cells are stated in the manual; *italic* cells are inferred; "—" = not documented.

| Screen | A / B | C | D | E / T@E | Other / automatic |
|---|---|---|---|---|---|
| S00 Aus | — | — | — | **E → S01**; **T@E → S03** (p. 14, 17) | — |
| S01 Startdisplay | — | **→ S02** (p. 17) | — | **T@E → S03** (p. 17) | **countdown → S00** (p. 17); battery Alarm X1 (p. 17) |
| S02 SERVICE | **move bar** | **→ S16/S17/S18/S19/S20/S21** (pp. 32–35, 85) | **→ S01** (p. 17) | — | — |
| S03 Einsatzzeit | **choose Einsatzzeit** (p. 18) | **→ S04**; *non-30 min: extra C via X2* (p. 18) | — | *T@E adds member* (p. 18 step 6) | param 12 auto-login (p. 69) |
| S04 Anmeldefenster | **choose action** (p. 19) | **Einsatz/Bereitschaft → X3 → S05 / S06 / S07**; **Sicherheitstrupp OK** → *same chain*, SICHER; **Druck ändern → S08** (pp. 19–21) | — | **T@E adds member** (p. 18) | param 12 (p. 69); Daueralarm below min. members (p. 71) |
| S05 DRUCK-AUSWAHL | **choose 200/300 bar** | **→ S06** (p. 19–20) | — | — | skipped if param 14/53/54 ≠ 0 (p. 70) |
| S06 Anfangsdruck | **± pressure** | **→ S07** (p. 20) | — | — | skipped if param 74 = 0 (p. 72) |
| S07 Einsatzliste | **select Trupp** (p. 22, 26) | **→ S09** (p. 26) | — | **T@E (member) → S13** (p. 30); *T@E (new) → S03* (p. 21) | **D+E ≈4 s → S14** (p. 31); *Alarm → S12* |
| S08 Druck ändern | **± pressure** (p. 22, 29) | *→ S04 or S07* (p. 29) | — | — | — |
| S09 Trupp-Menü | **choose item** | **Einsatzziel erreicht → S10** (p. 22); **Rückzug antreten → S11/X4** (p. 29); **Bereitschaft → S07** (p. 27); **Druck ändern → S08** (p. 28); *Trupp -> Einsatz → S07* | *→ S07* (p. 9) | — | **param 13 timeout → S07** (p. 69) |
| S10 Esz-Ziel erreicht | **± pressure** (p. 23) | **→ S07**, status H/L (p. 23) | — | — | — |
| S11 Trupp-Ansicht | *± pressure* (p. 30) | *→ S07*, status I/M (p. 30) | — | — | *param 13 timeout* |
| S12 ALARM | — | **acknowledge** (p. 24–25) → *S07* | — | — | repeats every 5 min (p. 25, 28) |
| S13 ABMELDEN | — | **logoff → S07** (p. 31) | **→ S07, no logoff** (p. 31) | **T@E marks member** (p. 30) | Daueralarm if member missing (p. 31) |
| S14 Notaus Auswahl | **choose** (p. 31) | **Trupp/alle → S15**; **zurueck → *S07*** (p. 31–32) | — | — | — |
| S15 Notaus Bestätigung | **cancel** | **delete Trupp(s) → *S07*** (p. 32) | **cancel** (p. 32) | **cancel** (p. 32) | — |
| S16 Einsatzprotokoll | **page** (p. 32) | — | **×2 → S01** (p. 32) | — | — |
| S17 TALLY Service | — | **→ S18** (p. 33) | **×2 → S01** (p. 34) | **T@E reads Transponder** (p. 33) | — |
| S18 Namens-Editor | **choose character** | **confirm letter** (p. 33) | *selection?* (p. 33) | **T@E writes name** (p. 34) | — |
| S19 Kontrast | **contrast** | **confirm** (p. 35) | — | — | — |
| S20 Zeit/Datum | **select / value** | **next field / accept** (p. 36) | **×2 → S01** (p. 36) | — | — |
| S21 Testprogramm | — | **siren on/off** (p. 85) | **×2 → S01** (p. 85) | *T@E shows Transponder* | — |
| S22 REMOTE | — | — | **disconnect** (p. 41) | — | — |

---

## Gaps and ambiguities

These are points the manual does not settle. The navigation-model work must decide them.

- **G1 – Right column of the Einsatzliste.**
  The text says it shows the **Restzeit** (p. 14 §5.1.3, p. 23 §5.5.1, p. 26 §5.6).
  Both list figures show values that look like **clock times**, all at or before the current clock: `09:52:00 … 10:10:00` with the clock at `10:20:00` (p. 10), and `09:57:00` with the clock at `10:03:00` for a newly logged-in 30-min Trupp (p. 20).
  It is unclear whether it is a Restzeit, a login time or something else, and how a negative Restzeit (9 characters, `-00:00:10`) fits the 8-character column.
- **G2 – Status words and menu contents per Einsatzstatus.**
  The menu figures show only `ANMARSCH` (with `Einsatzziel erreicht`) and `EINSATZ` (with `Attribute eintragen`, no `Einsatzziel erreicht`).
  The header word and menu items for Bereitschaft, Einsatzziel erreicht (which must contain `Rückzug antreten`, p. 29), Rückzug and Sicherungstrupp are not shown.
  "EINSATZ" may be the status word when the Rückzugsalarmmodus is off, but the manual does not say so.
- **G3 – Glyph for a 3-member Trupp, and the `5×`/`6×` glyphs.**
  "Bis zu drei Truppmitglieder werden als Symbole angezeigt" (p. 11), but every glyph shows two figures or `4×`.
- **G4 – Login chain order and skips.**
  It is unclear when exactly further members log in (before or after choosing the Einsatzzeit), and whether S05, S06 and the Attribute step X3 also run for Bereitschaft and Sicherungstrupp.
  The text says the first new Trupp gets Anmarsch (p. 20 step 15), but the figure after it shows H (Einsatzziel erreicht) (p. 20 right figure).
  That fits the Rückzugsalarmmodus being off, whose factory default the parameter table does not give (p. 87–89).
- **G5 – Alarm presentation.**
  Only one ALARM screen is shown, for the overrun case (p. 24).
  It is unclear whether the 1/3, 2/3, Rückzugsalarm, Bereitschaft, Daueralarm and battery Alarms use the same screen, what happens when several Trupps alarm at once, and where C leads afterwards.
- **G6 – The two detail layouts and the `Ansicht` label.**
  It is unclear how the graphic Trupp-Ansicht (S11) is reached, compared with the menu (S09), and what `Ansicht` means.
  §3.2.3 calls it "Druck der Atemschutzflaschen ändern" (p. 11), but its layout differs from the pressure-entry screens S06, S08 and S10.
- **G7 – Logoff with missing members.**
  It is unclear whether C in S13 is allowed before all members are marked, or whether only the Daueralarm and the Notausschaltung are possible (p. 31).
- **G8 – SERVICE menu.**
  The figure shows four items; the text names six (p. 17 vs pp. 32–35).
  Order, scrolling and locking (parameter 44, "Checkbox sperren", p. 67) are open.
- **G9 – Einsatzzeit #4 in S03.**
  The fourth option (default 240 min, p. 70) is not visible; scrolling is presumed.
  The "Langzeiteinsatz" extra confirmation (p. 18 step 5) has no screen.
- **G10 – Selection highlight.**
  An inverse bar is drawn in S02, S03 and S04 but not in S05, S09 or S14.
  It is unclear whether those screens have a cursor and what it looks like.
- **G11 – Title `Esz-Zeit ändern` on the "Druck ändern" screen** (p. 22, p. 28).
  It may be a firmware label or related to parameter 11 "Einsatzzeit ändern" (p. 69).
- **G12 – D in the character editor.**
  "Wählen Sie mit der Abbruchtaste (D) und den Navigationstasten (A/B) die gewünschten Buchstaben" (p. 33, p. 34) gives D a navigation role; its exact meaning is unclear.
- **G13 – Undocumented keys.**
  The manual does not document D on S01, S03, S04, S07 and S09, or A/B on S01.
  The general rule, "Funktion oder Eingabe abbrechen / in den Ausgangsmodus zurückkehren" (p. 9), has to be turned into concrete targets.
- **G14 – Timing values.**
  The manual does not give the SICHER alternation period or the default values of the Startdisplay Abschaltzeit (only "25" in the figure), the display-backlight timeout, parameter 12 or parameter 13.
- **G15 – Meaning of the `*` before names** in Trupp screens (absent in the Einsatzprotokoll, p. 32).
- **G16 – Tick mark `1` and the left bar** on the cylinder graphic (pp. 11, 20, 22, 24, 29). The `1` may be the number of cylinders or a pressure mark.
- **G17 – Time-split bar segments** (p. 11 items ③–⑤): their pixel proportions and how they relate to the Einsatzzeit are not specified.

## Glossary candidates

Device terms found in the manual that are not in `GLOSSARY.md` and may deserve an entry.
`GLOSSARY.md` was not edited.

| Term | Meaning | Source |
|---|---|---|
| **Startdisplay** | The screen after power-on (S01) | p. 17 §5.2 |
| **Anmeldedisplay / Anmeldefenster** | Login screens for a new Trupp (S03/S04) | p. 14, p. 18, p. 21 |
| **Detailansicht** (eines Trupps) | Per-Trupp screen reached by C from the Einsatzliste | p. 26 §5.6.2, param 13 p. 69 |
| **Service- und Einstellungsmenü** (display: `SERVICE`) | Menu reached by C on the Startdisplay | p. 17 |
| **Statussymbol** | The F–M glyphs showing Einsatzstatus and member count | p. 11, p. 20 |
| **Anmarsch / Rückzug (Rückmarsch)** | The Einsatzstatus values themselves; the display uses `ANMARSCH`, `RÜCKMARSCH`, and the menu uses `Rückzug antreten` | pp. 22, 29 |
| **Einsatzziel erreicht** (display `Esz-Ziel erreicht`) | Einsatzstatus; the glossary lists it but `Esz` is a device abbreviation | p. 22 |
| **Rückzugsalarmmodus** | Per-Einsatzzeit switch; when off, only Einsatzziel erreicht exists | p. 11, params 41/69–71 |
| **Anfangsdruckerfassung / Enddruckerfassung** | Pressure prompt at login / logoff | p. 20, params 74/75 |
| **Atemschutzflaschentyp / Flasche** | 200 / 300 bar cylinder type chosen in DRUCK-AUSWAHL | p. 19, params 14/80/81 |
| **Regelzeit** | Used as a synonym of Einsatzzeit in "Alarm nach Überschreiten der Einsatzzeit/Regelzeit" | p. 25 |
| **Alarmstufe** | Synonym of Alarmgrenze in prose | p. 24 |
| **Prozentmodus** | Alarm mode for Einsatzzeit #4 (Langzeit-/Sondereinsatz) | p. 25, params 45–48 |
| **Langzeiteinsatz / Sondereinsatz** | Einsatzzeit #4 use case | p. 18, p. 25 |
| **Attribute** | Free-configurable extra info (Einsatzart, Einsatzort, Funkrufname); menu `Attribute eintragen` | p. 19, p. 26, §6.12.2 |
| **Truppnummer** (display `Trupp Nr.`) | Auto-assigned 2-digit number 01–06 | p. 18 |
| **Truppmitglied** | Member of a Trupp; the manual's word for an Atemschutzträger within a Trupp | passim |
| **Sicherheitstrupp** | The display's (and parameter 89's) spelling of Sicherungstrupp; the glossary lists it under *Avoid*, but it is the literal LCD text `Sicherheitstrupp OK` | p. 19, p. 21, p. 73 |
| **TALLY** | The display's word for Transponder (`TALLY auflegen`, `TALLY Service`); the glossary lists "Tally" under *Avoid*, but the simulator must show it verbatim | p. 17, p. 33 |
| **X-Taste** | The display's name for the Abbruchtaste D | p. 30, p. 32, p. 41 |
| **Batteriefach (B1/B2)** | The two redundant battery compartments shown on the LCD | p. 10, p. 84 |
| **Abschaltzeit** | Idle time until automatic power-off | p. 17, p. 34 |
| **Feuerwehrname / Name der Checkbox** | Organisation name in the top line | p. 10, p. 34 |
| **Einsatzkräfte** | Heading for the members in the Einsatzprotokoll screen | p. 32 |
| **Testprogramm** | Service function showing batteries, Transponder, clock and siren test | p. 85 |
