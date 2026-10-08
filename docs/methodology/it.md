# Metodologia di stima dell'impronta ambientale dell'inferenza degli LLM

## 1. Obiettivo, perimetro e principio guida

### 1.1 Obiettivo

Stimare l'energia elettrica, le emissioni di gas a effetto serra (gCO₂e) e l'acqua consumata da una **conversazione** con un chatbot, calcolata **scambio per scambio** (uno scambio = una chiamata API che riceve lo storico e il nuovo messaggio, e restituisce un ragionamento visibile e una risposta).

### 1.2 Perimetro incluso

* Energia di **inferenza** (fase di utilizzo) del data center.
* Emissioni associate, tramite l'intensità di carbonio della rete del **paese di hosting** del data center.
* Acqua **on-site** (raffreddamento), tramite il WUE.
* Equivalenza in termini di carbonio con la durata di una doccia calda elettrica.
* Confronto dell'elettricità in termini di durata di accensione di una lampadina LED.

### 1.3 Perimetro escluso

Scope 3 (produzione e ammortamento di GPU, server, edifici); training del modello; acqua off-site legata alla produzione di elettricità; estrazione dei metalli; rete e terminali; ragionamento invisibile; immagini, audio, video; intervallo di incertezza quantificato.
Il risultato è un'**impronta di utilizzo, un ordine di grandezza**, non un'impronta del ciclo di vita.

### 1.4 Principio guida: modellare fisicamente ciò che è modellabile, basarsi sull'osservabile per il resto

I modelli proprietari (GPT, Claude, Gemini…) non pubblicano né i parametri attivati, né l'hardware, né il tasso di utilizzo effettivo delle GPU. Restano accessibili due informazioni: una stima del numero di parametri (lavori IKP) e i listini tariffari delle API. Da qui:

* l'energia del token di **output** è modellata fisicamente a partire dal modello Ecologits, perché è la voce che varia maggiormente con la dimensione del modello e il regime di decoding è quello meglio caratterizzato pubblicamente.
* l'energia dei token di **input** e di **cache** è derivata dal **rapporto tra i prezzi** fatturati, in assenza di un modello fisico pertinente per le dinamiche del prefill e dell'encoding.

---

## 2. Catena di calcolo

```text
Modello (P_tot, P_act, κ_in, κ_cache, S_tokens, paese/fornitore)  +  testi dello scambio i
   │
   ▼ [1] Conteggio dei token: new_input(i), history(i), output(i)          (§5)
   ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, IT lordo]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(paese, fornitore)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(paese)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(paese, fornitore)   [L]
   ▼ [5] Aggregazione: Σ sugli scambi aggiornati; equivalenze doccia e LED  (§8, §9)
```

---

## 3. Notazioni e unità

| Simbolo                    | Significato                                      | Unità        | Origine                                      |
| -------------------------- | ------------------------------------------------ | ------------ | -------------------------------------------- |
| `P_tot`                    | parametri totali                                 | miliardi     | stima IKP (§4.2)                             |
| `P_act`                    | parametri attivati (MoE)                         | miliardi     | regressione sui modelli aperti di IKP (§4.3) |
| `S_tokens`                 | token del prompt di sistema                      | token        | §4.4                                         |
| `κ_in`, `κ_cache`          | rapporti di prezzo input/output e cache/input    | senza unità  | §4.5                                         |
| `EF(paese)`                | intensità di carbonio della produzione elettrica | gCO₂e/kWh    | §4.1                                         |
| `PUE(paese, fornitore)`    | efficienza energetica del data center            | rapporto ≥ 1 | §4.7                                         |
| `WUE(paese, fornitore)`    | acqua consumata per kWh                          | L/kWh        | §4.8                                         |
| `r_out`, `r_in`, `r_cache` | energia IT per token di output / input / cache   | Wh/token     | §6                                           |

---

## 4. Dati e loro costruzione

### 4.1 Fattori di emissione di carbonio `EF`

* **Fonte**: dataset Ember «generation yearly global» (`release_generation_yearly_global.csv`).
* **Filtri**: `Area type = Country or economy`; anno **2025**; `Electricity source = Total generation` (intensità del mix di produzione nazionale).
* **Variabile**: `Emissions intensity (gCO2e/kWh)`; le osservazioni senza valore sono escluse.
* **Riferimento Mondo**: riga `World` = **473 gCO₂e/kWh**, intensità mondiale **2024** (Ember, *Global Electricity Review 2025*).

### 4.2 Parametri totali `P_tot` dei modelli chiusi

Stime tratte dall'articolo [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration).

### 4.3 Parametri attivati `P_act` dei modelli chiusi

1. Costruzione di un CSV (`model, params, params_activated`) a partire da `configs/all_models.json` del repository `19PINE-AI/ikp`, mantenendo solo i modelli per i quali `params` e `params_activated` sono **compilati e differenti** (modelli MoE).
2. Aggiunta di **20 modelli Hugging Face**.
3. Rimozione dei duplicati e di **gpt-4** (numero di parametri non verificabile).
4. **Regressione** `P_act = f(P_tot)` di forma **esponenziale** adattata su questi modelli aperti, quindi applicata ai modelli chiusi. Script: `ai-inf-calculator/data/analyze_moe_params.py` (adattamento) e `visualize_closed_model_params.py` (previsione).

### 4.4 Token del prompt di sistema `S_tokens`

* Conteggiati **con il tokenizer del calcolatore** sui prompt di sistema divulgati del repository `asgeirtj/system_prompts_leaks`.
* Modello senza prompt corrispondente: assegnazione, in ordine di priorità, (1) del prompt del **modello più vicino della stessa famiglia**, (2) in mancanza, della **mediana** di tutti i prompt. La mediana è scelta perché insensibile ai valori estremi e ai casi particolari (ad es. Claude Fable 5).
* `S_tokens` è un valore del catalogo, in token (non convertito tramite parole/token); è un parametro **imposto e nascosto** all'utente.

### 4.5 Rapporti tariffari `κ_in`, `κ_cache`

```text
κ_in(modello, fornitore)    = prezzo_input / prezzo_output
κ_cache(modello, fornitore) = prezzo_input_in_cache / prezzo_input
```

* Fonti: prezzi pubblici, raccolti in particolare su **OpenRouter**, riportati alla **stessa valuta e alla stessa quantità di token**.
* Calcolati **per modello e fornitore**, mai fissati come costante universale.
* Uno script di calibrazione **fuori dal browser** rileva le tariffe alla data e **conserva la data** insieme ai rapporti e alla fonte tariffaria esatta.
* **Scelta «market-based»**: approccio semplice, volutamente non rappresentativo del costo fisico, ritenuto equilibrato rispetto alle altre incertezze.

### 4.6 Localizzazione dei data center (fornitore LLM → cloud → paese)

| Fornitore LLM                      | Cloud selezionato                               | Paese predefinito (utenti gratuiti)                  |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| OpenAI (partnership Microsoft)     | Azure                                           | Stati Uniti                                          |
| Mistral AI (partnership Microsoft) | Azure                                           | centri sovrani in Europa, probabilmente **Svizzera** |
| Gemini                             | Google Cloud (obbligatorio)                     | Stati Uniti                                          |
| Anthropic                          | AWS (cloud più competitivo tra i tre possibili) | Stati Uniti                                          |

Si tratta di **ipotesi di localizzazione probabile** e modificabili. Per il **confronto tra modelli**, l'ipotesi semplificatrice adottata è che i data center dei fornitori si trovino negli **Stati Uniti**; per questo l'indicatore di **rischio di siccità è stato eliminato** (aggiungeva dati e complessità senza differenziare i modelli in base a questa ipotesi).

### 4.7 PUE per paese e fornitore

Cascata a quattro livelli di affidabilità decrescente, con tracciabilità del livello utilizzato:

1. **measured**: valore pubblicato da AWS, Azure o GCP per il paese/regione specifico;
2. **estimated**: interpolazione regionale (paese senza centro noto, in una zona con PUE pubblicato);
3. **regional**: PUE regionale aggregato (Asia-Pacifico, EMEA…);
4. **global**: PUE medio globale del fornitore (paesi isolati).

Il PUE generico Ecologits di 1,20 è **escluso** da `r_out` e sostituito da questo PUE geografico, applicato una sola volta (§2).

### 4.8 WUE per paese e fornitore

I fornitori pubblicano solo WUE **regionali**. Ogni paese viene associato alla regione cloud più vicina; se il valore regionale esiste (ad es. Singapore 1,57 L/kWh per AWS), viene utilizzato così com'è; altrimenti, **media globale del fornitore**, senza aggiustamento soggettivo. L'imputazione si basa esclusivamente su dati pubblicati, ma nasconde la variabilità intra-regionale (tecnologia di raffreddamento, progettazione).

### 4.9 Catalogo dei modelli

Un catalogo locale per modello/fornitore: `P_tot`, `P_act`, `S_tokens`, paese di riferimento, `κ_in`, `κ_cache`, e i fattori `PUE`, `EF`, `WUE`. Modelli proposti per impostazione predefinita: ChatGPT → modello piccolo attuale (senza abbonamento), modello grande attuale (con abbonamento); Mistral → modello piccolo (veloce), modello grande (ragionamento).

---

## 5. Conteggio dei token

### 5.1 Tokenizzazione

* Per impostazione predefinita: **Tiktoken**, eseguito localmente (Worker del browser); nessun testo viene inviato.
* Fallback in caso di errore: `T(testo) = numero_di_parole / coefficiente`, coefficiente **0,75** parole/token per impostazione predefinita (riferimento OpenAI), modificabile; le parole sono segmentate sui caratteri non alfanumerici.
* `T(testo vuoto) = 0`; ragionamento non fornito = 0. Un risultato di uno strumento incollato in un messaggio è testo ordinario.

### 5.2 Costituzione dei token di uno scambio `i`

Gli indici seguono l'ordine degli scambi **compilati** (un blocco interamente vuoto viene ignorato, anche per il prompt di sistema). `M_i` messaggio, `R_i` ragionamento visibile, `C_i` risposta, `A_i` versione completa dell'artifact fornita allo scambio `i`.

```text
A_prec(i) = ultima versione completa dell'artifact fornita prima di i (vuoto se nessuna)
D_i       = passaggi aggiunti o modificati di A_i rispetto ad A_prec(i)
            (A_i completo alla prima versione; vuoto se nessun artifact)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

Regole associate:

* `S_tokens` viene trattato alla tariffa cache **fin dal primo scambio**.
* Lo storico **non accumula** le vecchie versioni dell'artifact né le relative differenze: conta solo l'ultima versione completa. Il diff dello scambio corrente va nell'**output**; la sua versione completa diventa il riferimento successivo.
* Versioni identiche → 0 token di artifact in output; una sola eliminazione non aggiunge alcun token di output, il che sottostima l'impatto finale.
* Tutto lo storico è considerato **100% in cache**.

---

## 6. Energia IT per token

### 6.1 `r_out`: modello fisico Ecologits (fuori Scope 3, TPS/TTFT fissi)

Regressione pubblica su hardware reale; batch e tempo di calcolo per token trattati come funzioni deterministiche delle costanti (ipotesi «TPS/TTFT fissi»).

| Costante                           |                       Valore | Ruolo                                                                   |
| ---------------------------------- | ---------------------------: | ----------------------------------------------------------------------- |
| `BATCH_SIZE`                       |                           64 | richieste servite in parallelo                                          |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | GPU per server                                                          |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | potenza del server senza GPU (CPU, RAM, alimentazione, ventilazione), W |
| `GPU_MEMORY_GB`                    |                           80 | VRAM per GPU (classe A100/H100)                                         |
| `QUANTIZATION_BITS`                |                           16 | bit per peso                                                            |
| `MEMORY_OVERHEAD`                  |                          1,2 | margine di memoria (KV cache, attivazioni, frammentazione)              |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1,17e-6 / −1,12e-2 / 4,05e-5 | regressione dell'energia GPU                                            |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6,78e-4 / 3,12e-4 / 1,94e-2 | regressione della latenza                                               |

**Equazioni:**

```text
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` e `r_cache`: ancoraggio a `r_out` tramite i prezzi

```text
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

Ereditano quindi la dipendenza da `P_act`/`P_tot` senza una nuova stima indipendente (nessuna eterogeneità metodologica).

### 6.3 Giustificazione del price-based rispetto a un modello fisico del prefill (compute-bound vs memory-bound, considerato e poi scartato)

1. **Osservabilità**: MFU, dimensione del batch e hardware del prefill dei modelli chiusi non sono osservabili, mentre la latenza di decoding è misurabile dall'esterno; un modello fisico del prefill si baserebbe su ipotesi non verificabili, mentre il prezzo è pubblico, datato e specifico per modello.
2. **Scalabilità**: il catalogo evolve continuamente; un rapporto fisico richiederebbe di ricalibrare l'efficienza hardware a ogni modello senza dati; il prezzo viene aggiornato a ogni annuncio.
3. **Bias opposti assunti e non corretti separatamente**:

   * il prezzo della cache **sovrastima** probabilmente il suo costo energetico (lettura della memoria, costo marginale vicino a zero; il prezzo riflette l'ammortamento dell'infrastruttura e una logica commerciale) → bias al rialzo su `r_cache`;
   * `r_out` tratta tutti i token di output allo stesso costo, mentre il costo reale **cresce** con il numero di token già presenti in input e già generati (KV-cache in crescita) → **sottostima** dei contesti lunghi e delle completion lunghe, bias al ribasso su `r_in` e `r_out`.

   In una conversazione multi-turno, lo storico in cache integra gli output precedenti, per cui il volume fatturato alla tariffa «cache» cresce e i due bias, dello stesso ordine di grandezza, si compensano **approssimativamente**. È una semplificazione, non un'eliminazione dell'errore.
4. **Coerenza** con il resto del metodo, che utilizza già una proxy osservabile (regressione pubblica) per `P_act` dei modelli chiusi.

---

## 7. Impatti: energia, carbonio, acqua

```text
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(paese_hosting, fornitore)                  [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(paese_hosting)                       [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(paese_hosting, fornitore)           [L]
```

---

## 8. Equivalenze

### 8.1 Doccia elettrica

Portata 15 L/min; 18 → 38 °C (aumento di 20 °C secondo la termodinamica); 0,0232 kWh/L ⇒ **0,348 kWh/min**. Parametri predefiniti, modificabili.

```text
carbonio_doccia_min = portata × energia_per_litro × EF_utente      [gCO₂e/min]
durata_minuti       = C / (0,348 × EF_utente)
durata_secondi      = 60 × C / carbonio_doccia_min
```

* `EF_utente` è il paese dell'**utente** (rilevato o corretto).
* Confronto **solo in termini di carbonio**; non viene calcolato alcun volume d'acqua equivalente.

### 8.2 Lampadina LED

Confronto dell'**elettricità** della conversazione, espressa in durata di accensione di una lampadina LED.

```text
E_total   = Σ nrj_request(i)    [Wh]   scambi compilati aggiornati, PUE incluso
P_LED     = 5 W                 [W]    per impostazione predefinita, modificabile
durata_LED = E_total / P_LED     [h]    (secondi: 3 600 × E_total / P_LED)
```

* `P_LED` deve essere strettamente positiva; altrimenti la durata non è calcolabile.
* Il carbonio e l'acqua non sono interessati; `P_LED` non interviene in alcuna equazione di impatto.
* Il valore di 5 W è una convenzione illustrativa, non una misurazione.

---

## 9. Limiti

### 9.1. Assenza di incertezza

Il risultato è un unico valore, mentre la catena concatena stime molto rumorose. Gli errori quindi si moltiplicano: escludere l'intervallo di incertezza equivale a mostrare una precisione che il metodo non possiede.
Questa incertezza non è un problema per l'utilizzo del calcolatore a fini didattici. Le competenze da trasmettere si basano su un confronto delle pratiche, che utilizzano tutte la stessa metodologia di misurazione.

### 9.2. Regressione P_act = f(P_tot)

Si presume che tutti i modelli proprietari siano MoE perché modelli densi con un numero così elevato di parametri sono poco probabili. Tuttavia, se uno di essi fosse denso, `P_act` sarebbe ampiamente sottostimato.
La forma esponenziale della funzione diverge al di fuori dell'intervallo di adattamento. Ora, i modelli chiusi stimati si trovano oltre la maggior parte dei modelli aperti.

### 9.3. Ragionamento invisibile escluso

Per i modelli di «reasoning», i token del ragionamento nascosto possono superare ampiamente la risposta visibile. La loro esclusione produce una sottostima globale e favorisce i modelli di reasoning nel confronto. Un richiamo viene effettuato nelle buone pratiche.

### 9.4. Ancoraggio ai prezzi

`κ_in` cambia quando un fornitore riduce il proprio prezzo, forse senza alcun cambiamento fisico. Le maggiorazioni per i contesti lunghi e le tariffe batch o prioritarie pongono lo stesso problema. La tariffazione potrebbe non avere alcuna correlazione con il consumo energetico durante il trattamento.

### 9.5. Scelta di EF, PUE e WUE

Poiché la localizzazione dei modelli dei fornitori privati non è nota, è difficile stimare queste variabili.

---

## 10. Fonti

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`); *Global Electricity Review 2025* (riferimento Mondo).
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp); repository `19PINE-AI/ikp` (`configs/all_models.json`).
* Hugging Face — 20 modelli aggiuntivi per la stima di `P_act` dei modelli IKP.
* Ecologits — stima del costo energetico di un token.
* OpenRouter e listini tariffari pubblici dei fornitori.
* Repository `asgeirtj/system_prompts_leaks` — prompt di sistema.
* Pubblicazioni PUE/WUE di AWS (2025), Azure (FY25), Google Cloud (2024).
* Script di progetto: `analyze_moe_params.py`, `visualize_closed_model_params.py`.
