# Methodik zur Schätzung des Umweltfußabdrucks der Inferenz von LLMs

## 1. Gegenstand, Umfang und Leitprinzip

### 1.1 Gegenstand

Schätzung der elektrischen Energie, der Treibhausgasemissionen (gCO₂e) und des Wasserverbrauchs durch eine **Konversation** mit einem Chatbot, berechnet **Austausch für Austausch** (ein Austausch = ein API-Aufruf, der den Verlauf und die neue Nachricht empfängt und ein sichtbares Reasoning sowie eine Antwort zurückgibt).

### 1.2 Einbezogener Umfang

* Energie der **Inferenz** (Nutzungsphase) des Rechenzentrums.
* Zugehörige Emissionen über die CO₂-Intensität des Stromnetzes des **Landes, in dem das Rechenzentrum gehostet wird**.
* Wasser **vor Ort** (Kühlung), über die WUE.
* CO₂-Äquivalent als Dauer einer elektrischen heißen Dusche.
* Vergleich des Stromverbrauchs als Einschaltdauer einer LED-Lampe.

### 1.3 Ausgeschlossener Umfang

Scope 3 (Herstellung und Abschreibung von GPUs, Servern, Gebäuden); Training des Modells; Wasser außerhalb des Standorts im Zusammenhang mit der Stromerzeugung; Metallgewinnung; Netzwerk und Endgeräte; unsichtbares Reasoning; Bild, Audio, Video; quantifizierte Unsicherheitsspanne.
Das Ergebnis ist ein **Nutzungsfußabdruck, eine Größenordnung**, kein Lebenszyklus-Fußabdruck.

### 1.4 Leitprinzip: physikalisch modellieren, was modellierbar ist, und sich für den Rest auf Beobachtbares stützen

Proprietäre Modelle (GPT, Claude, Gemini…) veröffentlichen weder aktivierte Parameter noch Hardware noch die tatsächliche GPU-Auslastung. Zwei Informationen bleiben zugänglich: eine Schätzung der Anzahl der Parameter (IKP-Arbeiten) und die Preislisten der APIs. Daher:

* Die Energie des **Output-Tokens** wird physikalisch anhand des Ecologits-Modells modelliert, da dies der Posten ist, der am stärksten mit der Modellgröße variiert, und der Decodierungsmodus öffentlich am besten charakterisiert ist.
* Die Energie der **Input- und Cache-Tokens** wird aus dem **Verhältnis der berechneten Preise** abgeleitet, da ein geeignetes physikalisches Modell für die Dynamik von Prefill und Encoding fehlt.

---

## 2. Berechnungskette

```text
Modell (P_tot, P_act, κ_in, κ_cache, S_tokens, Land/Anbieter)  + Texte des Austauschs i
   │
   ▼ [1] Token-Zählung: new_input(i), history(i), output(i)          (§5)
   ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, brutto IT]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(Land, Anbieter)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(Land)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(Land, Anbieter)   [L]
   ▼ [5] Aggregation: Σ über die bis dato ausgefüllten Austausche ; Äquivalenzen Dusche und LED  (§8, §9)
```

---

## 3. Notationen und Einheiten

| Symbol                     | Bedeutung                                      | Einheit        | Herkunft                                   |
| -------------------------- | ---------------------------------------------- | -------------- | ------------------------------------------ |
| `P_tot`                    | Gesamtparameter                                | Milliarden     | IKP-Schätzung (§4.2)                       |
| `P_act`                    | aktivierte Parameter (MoE)                     | Milliarden     | Regression auf offenen IKP-Modellen (§4.3) |
| `S_tokens`                 | Tokens des System-Prompts                      | tokens         | §4.4                                       |
| `κ_in`, `κ_cache`          | Preisverhältnisse Input/Output und Cache/Input | dimensionslos  | §4.5                                       |
| `EF(Land)`                 | CO₂-Intensität der Stromerzeugung              | gCO₂e/kWh      | §4.1                                       |
| `PUE(Land, Anbieter)`      | Energieeffizienz des Rechenzentrums            | Verhältnis ≥ 1 | §4.7                                       |
| `WUE(Land, Anbieter)`      | verbrauchtes Wasser pro kWh                    | L/kWh          | §4.8                                       |
| `r_out`, `r_in`, `r_cache` | IT-Energie pro Output-/Input-/Cache-Token      | Wh/token       | §6                                         |

---

## 4. Daten und ihre Erstellung

### 4.1 CO₂-Emissionsfaktoren `EF`

* **Quelle**: Ember-Datensatz „generation yearly global“ (`release_generation_yearly_global.csv`).
* **Filter**: `Area type = Country or economy`; Jahr **2025**; `Electricity source = Total generation` (Intensität des inländischen Erzeugungsmixes).
* **Variable**: `Emissions intensity (gCO2e/kWh)`; Beobachtungen ohne Wert werden ausgeschlossen.
* **Referenz Welt**: Zeile `World` = **473 gCO₂e/kWh**, weltweite Intensität **2024** (Ember, *Global Electricity Review 2025*).

### 4.2 Gesamtparameter `P_tot` der geschlossenen Modelle

Schätzungen aus dem Artikel [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration).

### 4.3 Aktivierte Parameter `P_act` der geschlossenen Modelle

1. Erstellung einer CSV (`model, params, params_activated`) aus `configs/all_models.json` des Repositories `19PINE-AI/ikp`, wobei nur Modelle berücksichtigt werden, bei denen `params` und `params_activated` **angegeben und unterschiedlich** sind (MoE-Modelle).
2. Hinzufügen von **20 Hugging-Face-Modellen**.
3. Entfernen von Duplikaten und von **gpt-4** (Anzahl der Parameter nicht überprüfbar).
4. **Regression** `P_act = f(P_tot)` in **exponentieller** Form, angepasst an diese offenen Modelle und anschließend auf die geschlossenen Modelle angewandt. Skripte: `ai-inf-calculator/data/analyze_moe_params.py` (Anpassung) und `visualize_closed_model_params.py` (Vorhersage).

### 4.4 Tokens des System-Prompts `S_tokens`

* Gezählt **mit dem Tokenizer des Rechners** auf den offengelegten System-Prompts aus dem Repository `asgeirtj/system_prompts_leaks`.
* Für ein Modell ohne entsprechenden Prompt wird nach Priorität (1) der Prompt des **nächstgelegenen Modells derselben Familie**, (2) andernfalls der **Median** aller Prompts zugewiesen. Der Median wird gewählt, weil er gegenüber Extremwerten und Sonderfällen unempfindlich ist (z. B. Claude Fable 5).
* `S_tokens` ist ein Katalogwert in tokens (keine Umrechnung über Wörter/token); es ist ein **vorgegebener und für den Benutzer verborgener** Parameter.

### 4.5 Preisverhältnisse `κ_in`, `κ_cache`

```text
κ_in(Modell, Anbieter)    = Preis_input / Preis_output
κ_cache(Modell, Anbieter) = Preis_input_en_cache / Preis_input
```

* Quellen: öffentliche Preise, insbesondere gesammelt über **OpenRouter**, auf dieselbe Währung und dieselbe Tokenmenge umgerechnet.
* Berechnet **pro Modell und Anbieter**, niemals als universelle Konstante festgelegt.
* Ein Kalibrierungsskript **außerhalb des Browsers** erfasst die Preise zum jeweiligen Datum und **speichert das Datum** zusammen mit den Verhältnissen und der genauen Preisquelle.
* **„Market-based“-Wahl**: einfacher Ansatz, der bewusst nicht die physischen Kosten abbildet und im Hinblick auf die anderen Unsicherheiten als ausgewogen betrachtet wird.

### 4.6 Standort der Rechenzentren (LLM-Anbieter → Cloud → Land)

| LLM-Anbieter                             | Verwendete Cloud                                         | Standardland (kostenlose Nutzer)                              |
| ---------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| OpenAI (Partnerschaft mit Microsoft)     | Azure                                                    | Vereinigte Staaten                                            |
| Mistral AI (Partnerschaft mit Microsoft) | Azure                                                    | souveräne Rechenzentren in Europa, wahrscheinlich **Schweiz** |
| Gemini                                   | Google Cloud (obligatorisch)                             | Vereinigte Staaten                                            |
| Anthropic                                | AWS (wettbewerbsfähigste Cloud unter den drei möglichen) | Vereinigte Staaten                                            |

Dies sind **Annahmen über wahrscheinliche Standorte**, die geändert werden können. Für den **Vergleich zwischen Modellen** wird vereinfachend angenommen, dass sich die Rechenzentren der Anbieter in den **Vereinigten Staaten** befinden; deshalb wurde der **Dürre-Risikoindikator entfernt** (er fügte Daten und Komplexität hinzu, ohne die Modelle unter dieser Annahme zu unterscheiden).

### 4.7 PUE nach Land und Anbieter

Kaskade mit vier Zuverlässigkeitsstufen in abnehmender Reihenfolge, mit Nachverfolgbarkeit der verwendeten Stufe:

1. **measured**: von AWS, Azure oder GCP veröffentlichter Wert für das genaue Land/die genaue Region;
2. **estimated**: regionale Interpolation (Land ohne bekannten Standort, in einer Zone mit veröffentlichtem PUE);
3. **regional**: aggregierter regionaler PUE (Asien-Pazifik, EMEA…);
4. **global**: globaler durchschnittlicher PUE des Anbieters (isolierte Länder).

Der generische Ecologits-PUE von 1,20 wird aus `r_out` **ausgeschlossen** und durch diesen geografischen PUE ersetzt, der einmalig angewendet wird (§2).

### 4.8 WUE nach Land und Anbieter

Die Anbieter veröffentlichen nur **regionale** WUE-Werte. Jedes Land wird der nächstgelegenen Cloud-Region zugeordnet; wenn der regionale Wert vorhanden ist (z. B. Singapur 1,57 L/kWh für AWS), wird er unverändert verwendet; andernfalls der **globale Durchschnitt des Anbieters**, ohne subjektive Anpassung. Die Imputation basiert ausschließlich auf veröffentlichten Daten, verbirgt jedoch die Variabilität innerhalb einer Region (Kühlungstechnologie, Design).

### 4.9 Modellkatalog

Ein lokaler Katalog je Modell/Anbieter: `P_tot`, `P_act`, `S_tokens`, Referenzland, `κ_in`, `κ_cache` sowie die Faktoren `PUE`, `EF`, `WUE`. Standardmäßig angebotene Modelle: ChatGPT → aktuelles kleines Modell (ohne Abonnement), aktuelles großes Modell (mit Abonnement); Mistral → kleines Modell (schnell), großes Modell (Reasoning).

---

## 5. Token-Zählung

### 5.1 Tokenisierung

* Standardmäßig: **Tiktoken**, lokal ausgeführt (Browser-Worker); kein Text wird übertragen.
* Fallback bei Fehler: `T(Text) = Anzahl_der_Wörter / Koeffizient`, Standardkoeffizient **0,75** Wort/token (OpenAI-Referenz), änderbar; Wörter werden an nicht alphanumerischen Zeichen segmentiert.
* `T(leerer Text) = 0`; nicht bereitgestelltes Reasoning = 0. Ein in eine Nachricht eingefügtes Tool-Ergebnis ist gewöhnlicher Text.

### 5.2 Bildung der Tokens eines Austauschs `i`

Die Indizes folgen der Reihenfolge der **ausgefüllten** Austausche (ein vollständig leerer Block wird ignoriert, auch beim System-Prompt). `M_i` Nachricht, `R_i` sichtbares Reasoning, `C_i` Antwort, `A_i` vollständige Version des beim Austausch `i` bereitgestellten Artifacts.

```text
A_prec(i) = letzte vollständige Version eines Artifacts, die vor i bereitgestellt wurde (leer, falls keine)
D_i       = hinzugefügte oder geänderte Passagen von A_i gegenüber A_prec(i)
            (A_i vollständig bei der ersten Version; leer, wenn kein Artifact)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

Zugehörige Regeln:

* `S_tokens` wird ab dem ersten Austausch zum Cache-Satz behandelt.
* Der Verlauf summiert weder frühere Artifact-Versionen noch deren Unterschiede: Nur die letzte vollständige Version zählt. Der Diff des aktuellen Austauschs geht in den **Output**; seine vollständige Version wird zur nächsten Referenz.
* Identische Versionen → 0 Artifact-Token im Output; eine reine Löschung fügt keine Output-Tokens hinzu, wodurch die endgültige Auswirkung unterschätzt wird.
* Der gesamte Verlauf wird als **100 % im Cache** angenommen.

---

## 6. IT-Energie pro Token

### 6.1 `r_out`: physikalisches Ecologits-Modell (ohne Scope 3, feste TPS/TTFT)

Öffentliche Regression auf realer Hardware; Batch und Rechenzeit pro Token werden als deterministische Funktionen der Konstanten behandelt (Annahme „feste TPS/TTFT“).

| Konstante                          |                         Wert | Rolle                                                       |
| ---------------------------------- | ---------------------------: | ----------------------------------------------------------- |
| `BATCH_SIZE`                       |                           64 | parallel bediente Anfragen                                  |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | GPUs pro Server                                             |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | Serverleistung ohne GPU (CPU, RAM, Netzteil, Belüftung), W  |
| `GPU_MEMORY_GB`                    |                           80 | VRAM pro GPU (Klasse A100/H100)                             |
| `QUANTIZATION_BITS`                |                           16 | Bits pro Gewicht                                            |
| `MEMORY_OVERHEAD`                  |                          1,2 | Speicheraufschlag (KV-Cache, Aktivierungen, Fragmentierung) |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1,17e-6 / −1,12e-2 / 4,05e-5 | Regression der GPU-Energie                                  |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6,78e-4 / 3,12e-4 / 1,94e-2 | Latenz-Regression                                           |

**Gleichungen:**

```text
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` und `r_cache`: Verankerung an `r_out` über die Preise

```text
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

Sie übernehmen damit die Abhängigkeit von `P_act`/`P_tot`, ohne eine unabhängige Neuschätzung (keine methodologische Heterogenität).

### 6.3 Begründung für price-based statt eines physikalischen Prefill-Modells (compute-bound vs memory-bound, erwogen und verworfen)

1. **Beobachtbarkeit**: MFU, Batch-Größe und Prefill-Hardware geschlossener Modelle sind nicht beobachtbar, während die Decodierungs-Latenz von außen messbar ist; ein physikalisches Prefill-Modell würde auf nicht überprüfbaren Annahmen beruhen, während der Preis öffentlich, datiert und modellspezifisch ist.
2. **Skalierbarkeit**: Der Katalog entwickelt sich kontinuierlich weiter; ein physikalisches Verhältnis würde erfordern, die Hardwareeffizienz für jedes Modell ohne Daten neu zu kalibrieren; der Preis wird mit jeder Ankündigung aktualisiert.
3. **Bewusst angenommene und nicht separat korrigierte gegenläufige Verzerrungen**:

   * Der Cache-Preis **überschätzt** wahrscheinlich seine Energiekosten (Speicherzugriff, Grenzkosten nahe null; der Preis spiegelt die Abschreibung der Infrastruktur und eine kommerzielle Logik wider) → Aufwärtsverzerrung bei `r_cache`;
   * `r_out` behandelt alle Output-Tokens mit gleichen Kosten, obwohl die tatsächlichen Kosten mit der Anzahl der Input-Tokens und der bereits erzeugten Tokens **steigen** (wachsender KV-Cache) → **Unterschätzung** langer Kontexte und langer Completions, Abwärtsverzerrung bei `r_in` und `r_out`.

   In einer Multi-Turn-Konversation enthält der gecachte Verlauf die vorherigen Outputs, sodass das zum „Cache“-Tarif abgerechnete Volumen wächst und sich die beiden Verzerrungen **näherungsweise** kompensieren. Dies ist eine Vereinfachung, keine Beseitigung des Fehlers.
4. **Konsistenz** mit dem Rest der Methode, die bereits einen beobachtbaren Proxy (öffentliche Regression) für `P_act` geschlossener Modelle verwendet.

---

## 7. Auswirkungen: Energie, CO₂, Wasser

```text
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(Hostingland, Anbieter)             [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(Hostingland)                    [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(Hostingland, Anbieter)      [L]
```

---

## 8. Äquivalenzen

### 8.1 Elektrische Dusche

Durchfluss 15 L/min; 18 → 38 °C (Temperaturerhöhung um 20 °C gemäß Thermodynamik); 0,0232 kWh/L ⇒ **0,348 kWh/min**. Standardparameter, änderbar.

```text
carbon_douche_min = Durchfluss × Energie_pro_Liter × EF_Nutzer      [gCO₂e/min]
Dauer_Minuten      = C / (0,348 × EF_Nutzer)
Dauer_Sekunden      = 60 × C / carbon_douche_min
```

* `EF_Nutzer` ist das Land des **Nutzers** (erkannt oder korrigiert).
* Vergleich **ausschließlich der CO₂-Emissionen**; kein entsprechendes Wasservolumen wird berechnet.

### 8.2 LED-Lampe

Vergleich der **Elektrizität** der Konversation, ausgedrückt als Einschaltdauer einer LED-Lampe.

```text
E_total   = Σ nrj_request(i)    [Wh]   bis dato ausgefüllte Austausche, PUE eingeschlossen
P_LED     = 5 W                 [W]    standardmäßig, änderbar
Dauer_LED = E_total / P_LED     [h]    (Sekunden: 3 600 × E_total / P_LED)
```

* `P_LED` muss strikt positiv sein; andernfalls ist die Dauer nicht berechenbar.
* CO₂ und Wasser sind nicht betroffen; `P_LED` geht in keine Wirkungsgleichung ein.
* Der Wert von 5 W ist eine Konvention zur Veranschaulichung, keine Messung.

---

## 9. Grenzen

### 9.1. Fehlende Unsicherheit

Das Ergebnis ist ein einzelner Punktwert, obwohl die Kette sehr stark verrauschte Schätzungen aneinanderreiht. Die Fehler vervielfachen sich daher; der Verzicht auf eine Unsicherheitsspanne bedeutet, eine Genauigkeit darzustellen, die die Methode nicht besitzt.
Diese Unsicherheit ist für die Nutzung des Rechners zu pädagogischen Zwecken kein Problem. Die zu vermittelnden Kompetenzen beruhen auf einem Vergleich der Praktiken, wobei alle dieselbe Messmethodik verwenden.

### 9.2. Regression P_act = f(P_tot)

Es wird angenommen, dass alle proprietären Modelle MoE sind, da dichte Modelle mit so vielen Parametern wenig wahrscheinlich sind. Wenn jedoch eines davon dicht ist, wird P_act deutlich unterschätzt.
Die exponentielle Form der Funktion divergiert außerhalb des Anpassungsbereichs. Die geschätzten geschlossenen Modelle liegen jedoch jenseits der meisten offenen Modelle.

### 9.3. Unsichtbares Reasoning ausgeschlossen

Bei „Reasoning“-Modellen können die verborgenen Reasoning-Tokens die sichtbare Antwort weit übersteigen. Ihr Ausschluss führt zu einer globalen Unterschätzung und begünstigt Reasoning-Modelle im Vergleich. Eine Erinnerung daran erfolgt bei den Best Practices.

### 9.4. Verankerung an den Preisen

`κ_in` ändert sich, wenn ein Anbieter seinen Preis senkt, möglicherweise ohne jede physische Änderung. Zuschläge für lange Kontexte und Batch- oder Priority-Tarife werfen dasselbe Problem auf. Die Preisgestaltung korreliert möglicherweise nicht mit dem Energieverbrauch bei der Verarbeitung.

### 9.5. Wahl von EF, PUE und WUE

Da der Standort der Modelle privater Anbieter nicht bekannt ist, ist es schwierig, diese Variablen zu schätzen.

---

## 10. Quellen

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`); *Global Electricity Review 2025* (Weltreferenz).
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp); Repository `19PINE-AI/ikp` (`configs/all_models.json`).
* Hugging Face – 20 zusätzliche Modelle zur Schätzung von `P_act` der IKP-Modelle.
* Ecologits — Schätzung der Energiekosten eines Tokens.
* OpenRouter und öffentliche Preislisten der Anbieter.
* Repository `asgeirtj/system_prompts_leaks` – System-Prompts.
* PUE/WUE-Veröffentlichungen von AWS (2025), Azure (FY25), Google Cloud (2024).
* Projektskripte: `analyze_moe_params.py`, `visualize_closed_model_params.py`.
