# Metodología de estimación de la huella ambiental de la inferencia de los LLM

## 1. Objeto, alcance y principio rector

### 1.1 Objeto

Estimar la energía eléctrica, las emisiones de gases de efecto invernadero (gCO₂e) y el agua consumida por una **conversación** con un chatbot, calculada **intercambio por intercambio** (un intercambio = una llamada API que recibe el historial y el nuevo mensaje, y devuelve un razonamiento visible y una respuesta).

### 1.2 Alcance incluido

* Energía de **inferencia** (fase de uso) del centro de datos.
* Emisiones asociadas, mediante la intensidad de carbono de la red del **país de alojamiento** del centro de datos.
* Agua **in situ** (refrigeración), mediante el WUE.
* Equivalencia de carbono en duración de ducha caliente eléctrica.
* Comparación de la electricidad en duración de encendido de una bombilla LED.

### 1.3 Alcance excluido

Scope 3 (fabricación y amortización de los GPU, servidores, edificios); entrenamiento del modelo; agua fuera del sitio relacionada con la producción de electricidad; extracción de metales; red y terminales; razonamiento invisible; imagen, audio, vídeo; intervalo de incertidumbre cuantificado.
El resultado es una **huella de uso, un orden de magnitud**, no una huella de ciclo de vida.

### 1.4 Principio rector: modelizar físicamente lo que se puede modelizar y apoyarse en lo observable para el resto

Los modelos propietarios (GPT, Claude, Gemini…) no publican ni los parámetros activados, ni el hardware, ni la tasa de utilización real de los GPU. Quedan accesibles dos informaciones: una estimación del número de parámetros (trabajos de IKP) y las tarifas de las API. De ahí:

* la energía del token de **salida** se modeliza físicamente a partir del modelo de Ecologits, ya que es el componente que más varía con el tamaño del modelo y el régimen de decodificación es el mejor caracterizado públicamente.
* la energía de los tokens de **entrada** y de **cache** se deriva de la **relación de precios** facturados, a falta de un modelo físico pertinente sobre las dinámicas del prefill y del encoding.

---

## 2. Cadena de cálculo

```
Modelo (P_tot, P_act, κ_in, κ_cache, S_tokens, país/proveedor)  +  textos del intercambio i
   │
   ▼ [1] Conteo de tokens: new_input(i), history(i), output(i)          (§5)
   ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, IT bruto]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(país, proveedor)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(país)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(país, proveedor)   [L]
   ▼ [5] Agregación: Σ sobre los intercambios hasta la fecha; equivalencias ducha y LED  (§8, §9)
```

---

## 3. Notaciones y unidades

| Símbolo                    | Significado                                            | Unidad            | Origen                                         |
| -------------------------- | ------------------------------------------------------ | ----------------- | ---------------------------------------------- |
| `P_tot`                    | parámetros totales                                     | miles de millones | estimación IKP (§4.2)                          |
| `P_act`                    | parámetros activados (MoE)                             | miles de millones | regresión sobre modelos abiertos de IKP (§4.3) |
| `S_tokens`                 | tokens del prompt del sistema                          | tokens            | §4.4                                           |
| `κ_in`, `κ_cache`          | relaciones de precios input/output y cache/input       | sin unidad        | §4.5                                           |
| `EF(país)`                 | intensidad de carbono de la producción eléctrica       | gCO₂e/kWh         | §4.1                                           |
| `PUE(país, proveedor)`     | eficiencia energética del centro de datos              | ratio ≥ 1         | §4.7                                           |
| `WUE(país, proveedor)`     | agua consumida por kWh                                 | L/kWh             | §4.8                                           |
| `r_out`, `r_in`, `r_cache` | energía IT por token de salida / de entrada / en cache | Wh/token          | §6                                             |

---

## 4. Datos y su construcción

### 4.1 Factores de emisión de carbono `EF`

* **Fuente**: conjunto de datos de Ember «generation yearly global» (`release_generation_yearly_global.csv`).
* **Filtros**: `Area type = Country or economy`; año **2025**; `Electricity source = Total generation` (intensidad del mix de producción nacional).
* **Variable**: `Emissions intensity (gCO2e/kWh)`; las observaciones sin valor se excluyen.
* **Referencia mundial**: fila `World` = **473 gCO₂e/kWh**, intensidad mundial **2024** (Ember, *Global Electricity Review 2025*).

### 4.2 Parámetros totales `P_tot` de los modelos cerrados

Estimaciones procedentes del artículo [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration).

### 4.3 Parámetros activados `P_act` de los modelos cerrados

1. Construcción de un CSV (`model, params, params_activated`) a partir de `configs/all_models.json` del repositorio `19PINE-AI/ikp`, conservando únicamente los modelos cuyos `params` y `params_activated` están **informados y son diferentes** (modelos MoE).
2. Adición de **20 modelos de Hugging Face**.
3. Eliminación de duplicados y de **gpt-4** (número de parámetros no verificable).
4. **Regresión** `P_act = f(P_tot)` de forma **exponencial** ajustada sobre estos modelos abiertos, y posteriormente aplicada a los modelos cerrados. Scripts: `ai-inf-calculator/data/analyze_moe_params.py` (ajuste) y `visualize_closed_model_params.py` (predicción).

### 4.4 Tokens del prompt del sistema `S_tokens`

* Contados **con el tokenizer de la calculadora** sobre los prompts del sistema divulgados del repositorio `asgeirtj/system_prompts_leaks`.
* Modelo sin prompt correspondiente: atribución, por orden de prioridad, (1) del prompt del **modelo más cercano de la misma familia**, (2) en su defecto, de la **mediana** de todos los prompts. Se utiliza la mediana porque es insensible a los valores extremos y a casos particulares (p. ej., Claude Fable 5).
* `S_tokens` es un valor del catálogo, en tokens (no convertido mediante palabras/token); es un parámetro **impuesto y oculto** al usuario.

### 4.5 Relaciones tarifarias `κ_in`, `κ_cache`

```
κ_in(modelo, proveedor)    = precio_input / precio_output
κ_cache(modelo, proveedor) = precio_input_en_cache / precio_input
```

* Fuentes: precios públicos, recopilados especialmente en **OpenRouter**, convertidos a la **misma divisa y a la misma cantidad de tokens**.
* Calculados **por modelo y proveedor**, nunca fijados como constante universal.
* Un script de calibración **fuera del navegador** recoge las tarifas en una fecha determinada y **conserva la fecha** junto con las relaciones y la fuente tarifaria exacta.
* **Elección «market-based»**: enfoque sencillo, deliberadamente no representativo del coste físico, considerado equilibrado frente a las demás incertidumbres.

### 4.6 Localización de los centros de datos (proveedor de LLM → cloud → país)

| Proveedor de LLM                      | Cloud seleccionado                               | País por defecto (usuarios gratuitos)                |
| ------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| OpenAI (asociación con Microsoft)     | Azure                                            | Estados Unidos                                       |
| Mistral AI (asociación con Microsoft) | Azure                                            | centros soberanos en Europa, probablemente **Suiza** |
| Gemini                                | Google Cloud (obligatorio)                       | Estados Unidos                                       |
| Anthropic                             | AWS (cloud más competitivo de los tres posibles) | Estados Unidos                                       |

Son **hipótesis de localización probable** y modificables. Para la **comparación entre modelos**, la hipótesis simplificadora adoptada es que los centros de datos de los proveedores están en **Estados Unidos**; por eso se ha eliminado el indicador de **riesgo de sequía** (añadía datos y complejidad sin diferenciar los modelos bajo esta hipótesis).

### 4.7 PUE por país y proveedor

Cascada de cuatro niveles de fiabilidad decreciente, con trazabilidad del nivel utilizado:

1. **measured**: valor publicado por AWS, Azure o GCP para el país/región concreto;
2. **estimated**: interpolación regional (país sin centro conocido, dentro de una zona con PUE publicada);
3. **regional**: PUE regional agregada (Asia-Pacífico, EMEA…);
4. **global**: PUE media mundial del proveedor (países aislados).

El PUE genérico de Ecologits de 1,20 queda **excluido** de `r_out` y se sustituye por este PUE geográfico, aplicado una sola vez (§2).

### 4.8 WUE por país y proveedor

Los proveedores solo publican WUE **regionales**. Cada país se asigna a la región cloud más cercana; si existe el valor regional (p. ej., Singapur 1,57 L/kWh para AWS), se utiliza tal cual; de lo contrario, se utiliza la **media global del proveedor**, sin ajuste subjetivo. La imputación se basa exclusivamente en datos publicados, pero oculta la variabilidad intrarregional (tecnología de refrigeración, diseño).

### 4.9 Catálogo de modelos

Un catálogo local por modelo/proveedor: `P_tot`, `P_act`, `S_tokens`, país de referencia, `κ_in`, `κ_cache`, y los factores `PUE`, `EF`, `WUE`. Modelos propuestos por defecto: ChatGPT → modelo pequeño actual (sin suscripción), modelo grande actual (con suscripción); Mistral → modelo pequeño (rápido), modelo grande (razonamiento).

---

## 5. Conteo de tokens

### 5.1 Tokenización

* Por defecto: **Tiktoken**, ejecutado localmente (Worker del navegador); no se envía ningún texto.
* En caso de fallo: `T(texte) = nombre_de_mots / coefficient`, coeficiente **0,75** palabra/token por defecto (referencia OpenAI), modificable; las palabras se segmentan en los caracteres no alfanuméricos.
* `T(texte vide) = 0`; razonamiento no proporcionado = 0. Un resultado de herramienta pegado en un mensaje es texto ordinario.

### 5.2 Constitución de los tokens de un intercambio `i`

Los índices siguen el orden de los intercambios **informados** (un bloque completamente vacío se ignora, también para el prompt del sistema). `M_i` mensaje, `R_i` razonamiento visible, `C_i` respuesta, `A_i` versión completa del artifact proporcionada en el intercambio `i`.

```
A_prec(i) = última versión completa de artifact proporcionada antes de i (vacía si no hay ninguna)
D_i       = fragmentos añadidos o modificados de A_i respecto a A_prec(i)
            (A_i completo en la primera versión; vacío si no hay artifact)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

Reglas asociadas:

* `S_tokens` se trata con la tarifa de cache **desde el primer intercambio**.
* El historial **no acumula** las versiones antiguas del artifact ni sus diferencias: solo cuenta la última versión completa. El diff del intercambio actual pasa a **salida**; su versión completa se convierte en la referencia siguiente.
* Versiones idénticas → 0 token de artifact en salida; una eliminación por sí sola no añade ningún token de salida, lo que subestima el impacto final.
* Se supone que todo el historial está **100 % en cache**.

---

## 6. Energía IT por token

### 6.1 `r_out`: modelo físico Ecologits (fuera de Scope 3, TPS/TTFT fijos)

Regresión pública sobre hardware real; batch y tiempo de cálculo por token tratados como funciones deterministas de las constantes (hipótesis «TPS/TTFT fijos»).

| Constante                          |                        Valor | Función                                                                |
| ---------------------------------- | ---------------------------: | ---------------------------------------------------------------------- |
| `BATCH_SIZE`                       |                           64 | solicitudes atendidas en paralelo                                      |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | GPU por servidor                                                       |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | potencia del servidor sin GPU (CPU, RAM, alimentación, ventilación), W |
| `GPU_MEMORY_GB`                    |                           80 | VRAM por GPU (clase A100/H100)                                         |
| `QUANTIZATION_BITS`                |                           16 | bits por peso                                                          |
| `MEMORY_OVERHEAD`                  |                          1,2 | margen de memoria (KV cache, activaciones, fragmentación)              |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1,17e-6 / −1,12e-2 / 4,05e-5 | regresión de energía del GPU                                           |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6,78e-4 / 3,12e-4 / 1,94e-2 | regresión de latencia                                                  |

**Ecuaciones:**

```
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` y `r_cache`: anclaje en `r_out` mediante los precios

```
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

Por tanto, heredan la dependencia de `P_act`/`P_tot` sin una reevaluación independiente (sin heterogeneidad metodológica).

### 6.3 Justificación del enfoque price-based frente a un modelo físico del prefill (compute-bound vs memory-bound, considerado y descartado)

1. **Observabilidad**: la MFU, el tamaño del batch y el hardware del prefill de los modelos cerrados no son observables, mientras que la latencia de decodificación se puede medir externamente; un modelo físico del prefill se basaría en hipótesis no verificables, mientras que el precio es público, fechado y específico del modelo.
2. **Escalabilidad**: el catálogo evoluciona continuamente; una relación física exigiría recalibrar el rendimiento del hardware para cada modelo sin datos; el precio se actualiza con cada anuncio.
3. **Sesgos opuestos asumidos y no corregidos por separado**:

   * el precio del cache **sobreestima** probablemente su coste energético (lectura de memoria, coste marginal cercano a cero; el precio refleja la amortización de la infraestructura y una lógica comercial) → sesgo al alza sobre `r_cache`;
   * `r_out` trata todos los tokens de salida con el mismo coste, mientras que el coste real **crece** con el número de tokens de entrada y ya generados (KV-cache creciente) → **subestimación** de los contextos largos y las completions largas, sesgo a la baja sobre `r_in` y `r_out`.

   En una conversación con múltiples turnos, el historial en cache integra las salidas anteriores, de modo que el volumen facturado con la tarifa «cache» aumenta y ambos sesgos, del mismo orden de magnitud, se compensan **aproximadamente**. Es una simplificación, no una eliminación del error.
4. **Coherencia** con el resto del método, que ya utiliza una proxy observable (regresión pública) para `P_act` de los modelos cerrados.

---

## 7. Impactos: energía, carbono, agua

```
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(país_de_alojamiento, proveedor)             [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(país_de_alojamiento)                    [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(país_de_alojamiento, proveedor)      [L]
```

---

## 8. Equivalencias

### 8.1 Ducha eléctrica

Caudal 15 L/min; 18 → 38 °C (incremento de 20 °C según la termodinámica); 0,0232 kWh/L ⇒ **0,348 kWh/min**. Parámetros por defecto, modificables.

```
carbone_douche_min = débit × énergie_par_litre × EF_utilisateur      [gCO₂e/min]
durée_minutes      = C / (0,348 × EF_utilisateur)
durée_secondes     = 60 × C / carbone_douche_min
```

* `EF_utilisateur` es el país del **usuario** (detectado o corregido).
* Comparación **únicamente de carbono**; no se calcula ningún volumen de agua equivalente.

### 8.2 Bombilla LED

Comparación de la **electricidad** de la conversación, expresada como duración de encendido de una bombilla LED.

```
E_total   = Σ nrj_request(i)    [Wh]   intercambios informados hasta la fecha, PUE incluido
P_LED     = 5 W                 [W]    por defecto, modificable
durée_LED = E_total / P_LED     [h]    (segundos: 3 600 × E_total / P_LED)
```

* `P_LED` debe ser estrictamente positiva; de lo contrario, la duración no es calculable.
* El carbono y el agua no se ven afectados; `P_LED` no interviene en ninguna ecuación de impacto.
* El valor de 5 W es una convención ilustrativa, no una medición.

---

## 9. Limitaciones

### 9.1. Ausencia de incertidumbre

El resultado es un único valor, mientras que la cadena encadena estimaciones muy ruidosas. Por tanto, los errores se multiplican y excluir el intervalo de incertidumbre equivale a mostrar una precisión que el método no posee.
Esta incertidumbre no supone un problema para el uso de la calculadora con fines pedagógicos. Las competencias que se deben transmitir se basan en una comparación de prácticas, utilizando todas la misma metodología de medición.

### 9.2. Regresión P_act = f(P_tot)

Se supone que todos los modelos propietarios son MoE porque los modelos densos con tantos parámetros son poco probables. Pero si alguno de ellos es denso, P_act queda ampliamente subestimado.
La forma exponencial de la función diverge fuera del rango de ajuste. Ahora bien, los modelos cerrados estimados se sitúan más allá de la mayoría de los modelos abiertos.

### 9.3. Razonamiento invisible excluido

Para los modelos de «razonamiento», los tokens de razonamiento ocultos pueden superar ampliamente la respuesta visible. Su exclusión produce una subestimación global y favorece a los modelos de razonamiento en la comparación. Se incluye un recordatorio en las buenas prácticas.

### 9.4. Anclaje en los precios

`κ_in` cambia cuando un proveedor baja su precio, quizá sin ningún cambio físico. Los recargos por contexto largo y las tarifas batch o prioritarias plantean el mismo problema. Es posible que la tarificación no tenga correlación con el consumo energético durante el procesamiento.

### 9.5. Elección de los FE, PUE y WUE

Dado que no se conoce la localización de los modelos de los proveedores privados, resulta difícil estimar estas variables.

---

## 10. Fuentes

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`); *Global Electricity Review 2025* (referencia mundial).
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp); repositorio `19PINE-AI/ikp` (`configs/all_models.json`).
* Hugging Face - 20 modelos adicionales para la estimación de `P_act` de los modelos de IKP.
* Ecologits — estimación del coste energético de un token.
* OpenRouter y tarifas públicas de los proveedores.
* Repositorio `asgeirtj/system_prompts_leaks` - prompts del sistema.
* Publicaciones sobre PUE/WUE de AWS (2025), Azure (FY25), Google Cloud (2024).
* Scripts del proyecto: `analyze_moe_params.py`, `visualize_closed_model_params.py`.
