# Methodologie voor het schatten van de milieuvoetafdruk van LLM-inferentie

## 1. Doel, scope en leidend principe

### 1.1 Doel

De elektrische energie, de uitstoot van broeikasgassen (gCO₂e) en het waterverbruik van een **conversatie** met een chatbot schatten, berekend **uitwisseling per uitwisseling** (een uitwisseling = een API-call die de geschiedenis en het nieuwe bericht ontvangt en een zichtbaar redeneerproces en antwoord retourneert).

### 1.2 Opgenomen scope

* Energie voor **inferentie** (gebruiksfase) van het datacenter.
* Bijbehorende emissies, via de koolstofintensiteit van het elektriciteitsnet van het **land waar het datacenter wordt gehost**.
* **On-site** waterverbruik (koeling), via de WUE.
* Koolstofequivalent in duur van een elektrische warme douche.
* Vergelijking van elektriciteitsverbruik in brandduur van een LED-lamp.

### 1.3 Uitgesloten scope

Scope 3 (productie en afschrijving van GPU's, servers, gebouwen); training van het model; off-site waterverbruik gerelateerd aan elektriciteitsproductie; winning van metalen; netwerk en eindapparaten; onzichtbare reasoning; beeld, audio, video; gekwantificeerde onzekerheidsmarge.
Het resultaat is een **gebruiksvoetafdruk, een orde van grootte**, en geen levenscyclusvoetafdruk.

### 1.4 Leidend principe: fysiek modelleren wat modelleerbaar is, en voor de rest uitgaan van observeerbare gegevens

Proprietary modellen (GPT, Claude, Gemini…) publiceren noch geactiveerde parameters, noch hardware, noch de werkelijke GPU-utilization. Twee gegevens blijven toegankelijk: een schatting van het aantal parameters (IKP-onderzoek) en de prijsstructuren van de API's. Daarom:

* wordt de energie van **output**-tokens fysiek gemodelleerd op basis van het Ecologits-model, omdat dit de component is die het sterkst varieert met de modelgrootte en de decoding-regime publiek het best gekarakteriseerd is.
* wordt de energie van **input**- en **cache**-tokens afgeleid uit de **prijsverhouding**, bij gebrek aan een relevant fysiek model voor de dynamiek van prefill en encoding.

---

## 2. Berekeningsketen

```
Model (P_tot, P_act, κ_in, κ_cache, S_tokens, land/provider)  + teksten van uitwisseling i
   │
   ▼ [1] Token tellen: new_input(i), history(i), output(i)          (§5)
   ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, IT bruto]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(land, provider)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(land)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(land, provider)   [L]
   ▼ [5] Aggregatie: Σ over de bijgewerkte uitwisselingen; equivalenten voor douche en LED  (§8, §9)
```

---

## 3. Notaties en eenheden

| Symbool                    | Betekenis                                          | Eenheid      | Herkomst                                  |
| -------------------------- | -------------------------------------------------- | ------------ | ----------------------------------------- |
| `P_tot`                    | totale parameters                                  | miljarden    | IKP-schatting (§4.2)                      |
| `P_act`                    | geactiveerde parameters (MoE)                      | miljarden    | regressie op open modellen van IKP (§4.3) |
| `S_tokens`                 | tokens van de systeemprompt                        | tokens       | §4.4                                      |
| `κ_in`, `κ_cache`          | prijsverhoudingen input/output en cache/input      | dimensieloos | §4.5                                      |
| `EF(land)`                 | koolstofintensiteit van de elektriciteitsproductie | gCO₂e/kWh    | §4.1                                      |
| `PUE(land, provider)`      | energie-efficiëntie van het datacenter             | ratio ≥ 1    | §4.7                                      |
| `WUE(land, provider)`      | waterverbruik per kWh                              | L/kWh        | §4.8                                      |
| `r_out`, `r_in`, `r_cache` | IT-energie per output-/input-/cache-token          | Wh/token     | §6                                        |

---

## 4. Gegevens en hun constructie

### 4.1 Koolstofemissiefactoren `EF`

* **Bron**: Ember-dataset « generation yearly global » (`release_generation_yearly_global.csv`).
* **Filters**: `Area type = Country or economy`; jaar **2025**; `Electricity source = Total generation` (intensiteit van de binnenlandse productiemix).
* **Variabele**: `Emissions intensity (gCO2e/kWh)`; observaties zonder waarde worden uitgesloten.
* **Wereldreferentie**: regel `World` = **473 gCO₂e/kWh**, wereldwijde intensiteit **2024** (Ember, *Global Electricity Review 2025*).

### 4.2 Totale parameters `P_tot` van gesloten modellen

Schattingen afkomstig uit het artikel [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration).

### 4.3 Geactiveerde parameters `P_act` van gesloten modellen

1. Constructie van een CSV (`model, params, params_activated`) op basis van `configs/all_models.json` uit de repository `19PINE-AI/ikp`, waarbij alleen modellen worden behouden waarvan `params` en `params_activated` **ingevuld en verschillend** zijn (MoE-modellen).
2. Toevoeging van **20 Hugging Face-modellen**.
3. Verwijdering van duplicaten en van **gpt-4** (aantal parameters niet verifieerbaar).
4. **Regressie** `P_act = f(P_tot)` in de vorm van een **exponentiële** functie, aangepast op deze open modellen, en vervolgens toegepast op de gesloten modellen. Scripts: `ai-inf-calculator/data/analyze_moe_params.py` (aanpassing) en `visualize_closed_model_params.py` (voorspelling).

### 4.4 Tokens van de systeemprompt `S_tokens`

* Geteld **met de tokenizer van de calculator** op de openbaar gemaakte systeemprompts uit de repository `asgeirtj/system_prompts_leaks`.
* Voor een model zonder bijbehorende prompt wordt, in volgorde van prioriteit, (1) de prompt van het **dichtstbijzijnde model uit dezelfde familie** toegewezen, (2) bij gebrek daaraan de **mediaan** van alle prompts. De mediaan wordt gebruikt omdat deze ongevoelig is voor extreme waarden en bijzondere gevallen (bijv. Claude Fable 5).
* `S_tokens` is een cataloguswaarde, in tokens (niet omgerekend via woorden/token); het is een **opgelegde en voor de gebruiker verborgen** parameter.

### 4.5 Prijsverhoudingen `κ_in`, `κ_cache`

```
κ_in(model, provider)    = prijs_input / prijs_output
κ_cache(model, provider) = prijs_input_in_cache / prijs_input
```

* Bronnen: openbare prijzen, met name verzameld via **OpenRouter**, omgerekend naar **dezelfde valuta en dezelfde hoeveelheid tokens**.
* Berekend **per model en provider**, nooit als universele constante vastgezet.
* Een **offline** kalibratiescript verzamelt de tarieven op een bepaalde datum en **bewaart de datum** samen met de verhoudingen en de exacte tariefbron.
* **« market-based »-keuze**: eenvoudige aanpak, bewust niet representatief voor de fysieke kosten, die als evenwichtig wordt beschouwd gezien de andere onzekerheden.

### 4.6 Locatie van datacenters (LLM-provider → cloud → land)

| LLM-provider                        | Geselecteerde cloud                                          | Standaardland (gratis gebruikers)                                |
| ----------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| OpenAI (Microsoft-partnerschap)     | Azure                                                        | Verenigde Staten                                                 |
| Mistral AI (Microsoft-partnerschap) | Azure                                                        | soevereine datacenters in Europa, waarschijnlijk **Zwitserland** |
| Gemini                              | Google Cloud (verplicht)                                     | Verenigde Staten                                                 |
| Anthropic                           | AWS (meest concurrerende cloud van de drie mogelijke opties) | Verenigde Staten                                                 |

Dit zijn **aannames over waarschijnlijke locaties** en ze kunnen worden gewijzigd. Voor de **vergelijking tussen modellen** wordt als vereenvoudigende aanname gehanteerd dat de datacenters van de providers zich in de **Verenigde Staten** bevinden; daarom is de indicator voor **droogterisico verwijderd** (deze voegde gegevens en complexiteit toe zonder de modellen onder deze aanname van elkaar te onderscheiden).

### 4.7 PUE per land en provider

Een cascade met vier betrouwbaarheidsniveaus, met traceerbaarheid van het gebruikte niveau:

1. **measured**: waarde gepubliceerd door AWS, Azure of GCP voor het specifieke land/de specifieke regio;
2. **estimated**: regionale interpolatie (land zonder bekend datacenter, binnen een gebied met gepubliceerde PUE);
3. **regional**: geaggregeerde regionale PUE (Azië-Pacific, EMEA…);
4. **global**: gemiddelde wereldwijde PUE van de provider (afzonderlijke landen).

De generieke Ecologits-PUE van 1,20 wordt uitgesloten van `r_out` en vervangen door deze geografische PUE, die slechts één keer wordt toegepast (§2).

### 4.8 WUE per land en provider

Providers publiceren alleen **regionale** WUE-waarden. Elk land wordt gekoppeld aan de dichtstbijzijnde cloudregio; als de regionale waarde bestaat (bijv. Singapore 1,57 L/kWh voor AWS), wordt deze ongewijzigd gebruikt; anders wordt het **wereldwijde gemiddelde van de provider** gebruikt, zonder subjectieve aanpassing. De toewijzing is uitsluitend gebaseerd op gepubliceerde gegevens, maar verbergt de variabiliteit binnen regio's (koeltechnologie, ontwerp).

### 4.9 Modelcatalogus

Een lokale catalogus per model/provider: `P_tot`, `P_act`, `S_tokens`, referentieland, `κ_in`, `κ_cache`, en de factoren `PUE`, `EF`, `WUE`. Standaard aangeboden modellen: ChatGPT → huidig klein model (zonder abonnement), huidig groot model (met abonnement); Mistral → klein model (snel), groot model (reasoning).

---

## 5. Tokens tellen

### 5.1 Tokenisatie

* Standaard: **Tiktoken**, lokaal uitgevoerd (browser Worker); er wordt geen tekst verzonden.
* Fallback bij mislukking: `T(tekst) = aantal_woorden / coëfficiënt`, standaardcoëfficiënt **0,75** woord/token (OpenAI-referentie), aanpasbaar; woorden worden gesegmenteerd bij niet-alfanumerieke tekens.
* `T(lege tekst) = 0`; niet-aangeleverde reasoning = 0. Een toolresultaat dat in een bericht wordt geplakt, is gewone tekst.

### 5.2 Samenstelling van de tokens van een uitwisseling `i`

De indices volgen de volgorde van de **ingevulde** uitwisselingen (een volledig leeg blok wordt genegeerd, ook voor de systeemprompt). `M_i` bericht, `R_i` zichtbare reasoning, `C_i` antwoord, `A_i` volledige versie van het artifact dat bij uitwisseling `i` is aangeleverd.

```
A_prec(i) = laatste volledige versie van een artifact die vóór i is aangeleverd (leeg als geen)
D_i       = passages die aan A_i zijn toegevoegd of gewijzigd ten opzichte van A_prec(i)
            (A_i volledig bij de eerste versie; leeg als er geen artifact is)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

Bijbehorende regels:

* `S_tokens` wordt vanaf de eerste uitwisseling tegen het cache-tarief verwerkt.
* De geschiedenis cumuleert eerdere artifactversies en hun verschillen **niet**: alleen de laatste volledige versie telt mee. De diff van de huidige uitwisseling gaat naar **output**; de volledige versie ervan wordt de referentie voor de volgende uitwisseling.
* Identieke versies → 0 artifact-token in output; alleen een verwijdering voegt geen output-token toe, waardoor de uiteindelijke impact wordt onderschat.
* De volledige geschiedenis wordt verondersteld **100% in cache** te zijn.

---

## 6. IT-energie per token

### 6.1 `r_out`: fysiek Ecologits-model (exclusief Scope 3, vaste TPS/TTFT)

Openbare regressie op echte hardware; batch en rekentijd per token worden behandeld als deterministische functies van de constanten (aanname « vaste TPS/TTFT »).

| Constante                          |                       Waarde | Rol                                                          |
| ---------------------------------- | ---------------------------: | ------------------------------------------------------------ |
| `BATCH_SIZE`                       |                           64 | parallel bediende requests                                   |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | GPU's per server                                             |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | serververmogen zonder GPU (CPU, RAM, voeding, ventilatie), W |
| `GPU_MEMORY_GB`                    |                           80 | VRAM per GPU (A100/H100-klasse)                              |
| `QUANTIZATION_BITS`                |                           16 | bits per gewicht                                             |
| `MEMORY_OVERHEAD`                  |                          1,2 | geheugenmarge (KV cache, activaties, fragmentatie)           |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1,17e-6 / −1,12e-2 / 4,05e-5 | regressie GPU-energie                                        |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6,78e-4 / 3,12e-4 / 1,94e-2 | latentieregressie                                            |

**Vergelijkingen:**

```
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` en `r_cache`: verankering aan `r_out` via prijzen

```
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

Ze erven dus de afhankelijkheid van `P_act`/`P_tot` zonder onafhankelijke herschatting (geen methodologische heterogeniteit).

### 6.3 Rechtvaardiging van price-based in plaats van een fysiek prefill-model (compute-bound vs memory-bound, overwogen en verworpen)

1. **Observeerbaarheid**: MFU, batchgrootte en prefill-hardware van gesloten modellen zijn niet observeerbaar, terwijl de decoding-latentie extern meetbaar is; een fysiek prefill-model zou gebaseerd zijn op niet-verifieerbare aannames, terwijl de prijs publiek, gedateerd en modelspecifiek is.
2. **Schaalbaarheid**: de catalogus evolueert continu; een fysieke ratio zou vereisen dat het hardware-rendement voor elk model opnieuw wordt gekalibreerd zonder gegevens; de prijs wordt bij elke aankondiging bijgewerkt.
3. **Tegenovergestelde veronderstelde en niet afzonderlijk gecorrigeerde biases**:

   * de cacheprijs **overschat** waarschijnlijk de energieprijs (geheugenlezing, marginale kosten dicht bij nul; de prijs weerspiegelt de afschrijving van de infrastructuur en een commerciële logica) → opwaartse bias op `r_cache`;
   * `r_out` behandelt alle output-tokens als gelijk in kosten, terwijl de werkelijke kosten **toenemen** met het aantal input-tokens en reeds gegenereerde tokens (groeiende KV-cache) → **onderschatting** van lange contexten en lange completions, neerwaartse bias op `r_in` en `r_out`.

   In een conversatie met meerdere turns bevat de cachegeschiedenis de eerdere outputs, waardoor het volume dat tegen het « cache »-tarief wordt gefactureerd toeneemt en de twee biases, van dezelfde orde van grootte, elkaar **ongeveer** compenseren. Dit is een vereenvoudiging, geen eliminatie van de fout.
4. **Consistentie** met de rest van de methode, die al een observeerbare proxy (openbare regressie) gebruikt voor `P_act` van gesloten modellen.

---

## 7. Impact: energie, koolstof, water

```
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(hostingland, provider)             [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(hostingland)                    [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(hostingland, provider)      [L]
```

---

## 8. Equivalenten

### 8.1 Elektrische douche

Debiet 15 L/min; 18 → 38 °C (temperatuurstijging van 20 °C volgens de thermodynamica); 0,0232 kWh/L ⇒ **0,348 kWh/min**. Standaardparameters, aanpasbaar.

```
carbone_douche_min = débit × énergie_par_litre × EF_utilisateur      [gCO₂e/min]
durée_minutes      = C / (0,348 × EF_utilisateur)
durée_secondes     = 60 × C / carbone_douche_min
```

* `EF_utilisateur` is het land van de **gebruiker** (gedetecteerd of gecorrigeerd).
* Vergelijking **uitsluitend op koolstof**; er wordt geen equivalent watervolume berekend.

### 8.2 LED-lamp

Vergelijking van de **elektriciteit** van de conversatie, uitgedrukt als brandduur van een LED-lamp.

```
E_total   = Σ nrj_request(i)    [Wh]   bijgewerkte ingevulde uitwisselingen, PUE inbegrepen
P_LED     = 5 W                 [W]    standaard, aanpasbaar
durée_LED = E_total / P_LED     [h]    (seconden: 3 600 × E_total / P_LED)
```

* `P_LED` moet strikt positief zijn; anders kan de duur niet worden berekend.
* Koolstof en water worden niet beïnvloed; `P_LED` komt in geen enkele impactvergelijking voor.
* De waarde van 5 W is een illustratieve conventie, geen meting.

---

## 9. Beperkingen

### 9.1. Afwezigheid van onzekerheid

Het resultaat is één enkel punt, terwijl de keten zeer ruisrijke schattingen combineert. De fouten vermenigvuldigen zich dus; het uitsluiten van de onzekerheidsmarge komt neer op het weergeven van een precisie die de methode niet bezit.
Deze onzekerheid vormt geen probleem voor het gebruik van de calculator voor educatieve doeleinden. De aan te leren vaardigheden berusten op een vergelijking van praktijken, waarbij overal dezelfde meetmethodologie wordt gebruikt.

### 9.2. Regressie P_act = f(P_tot)

Er wordt aangenomen dat alle proprietary modellen MoE zijn, omdat dense modellen met zoveel parameters weinig waarschijnlijk zijn. Maar als één ervan dense is, wordt P_act sterk onderschat.
De exponentiële vorm van de functie divergeert buiten het aanpassingsbereik. De geschatte gesloten modellen bevinden zich echter buiten het bereik van de meeste open modellen.

### 9.3. Onzichtbare reasoning uitgesloten

Voor modellen voor « reasoning » kunnen verborgen reasoning-tokens veel groter zijn dan het zichtbare antwoord. Het uitsluiten ervan leidt tot een algemene onderschatting en bevoordeelt reasoning-modellen in de vergelijking. In de best practices wordt hieraan herinnerd.

### 9.4. Verankering aan prijzen

`κ_in` verandert wanneer een provider zijn prijs verlaagt, mogelijk zonder enige fysieke verandering. Toeslagen voor lange contexten en batch- of priority-tarieven leveren hetzelfde probleem op. Prijzen hebben mogelijk geen correlatie met het energieverbruik tijdens de verwerking.

### 9.5. Keuze van EF, PUE en WUE

Omdat de locatie van de modellen van private providers niet bekend is, is het moeilijk om deze variabelen te schatten.

---

## 10. Bronnen

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`); *Global Electricity Review 2025* (Wereldreferentie).
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp); repository `19PINE-AI/ikp` (`configs/all_models.json`).
* Hugging Face - 20 aanvullende modellen voor de schatting van `P_act` van de IKP-modellen.
* Ecologits — schatting van de energiekosten van een token.
* OpenRouter en openbare prijsstructuren van providers.
* Repository `asgeirtj/system_prompts_leaks` - systeemprompts.
* PUE/WUE-publicaties van AWS (2025), Azure (FY25), Google Cloud (2024).
* Projectscripts: `analyze_moe_params.py`, `visualize_closed_model_params.py`.
