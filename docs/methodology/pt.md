# Metodologia de estimativa da pegada ambiental da inferência de LLM

## 1. Objetivo, âmbito e princípio orientador

### 1.1 Objetivo

Estimar a energia elétrica, as emissões de gases com efeito de estufa (gCO₂e) e a água consumida por uma **conversa** com um chatbot, calculada **troca a troca** (uma troca = uma chamada API que recebe o histórico e a nova mensagem, e devolve um raciocínio visível e uma resposta).

### 1.2 Âmbito incluído

* Energia de **inferência** (fase de utilização) do centro de dados.
* Emissões associadas, através da intensidade carbónica da rede do **país de alojamento** do centro de dados.
* Água **no local** (arrefecimento), através do WUE.
* Equivalência de carbono em duração de duche quente elétrico.
* Comparação da eletricidade em duração de acendimento de uma lâmpada LED.

### 1.3 Âmbito excluído

Scope 3 (fabrico e amortização dos GPU, servidores, edifícios); treino do modelo; água fora do local associada à produção de eletricidade; extração de metais; rede e terminais; raciocínio invisível; imagem, áudio, vídeo; intervalo de incerteza quantificado.
O resultado é uma **pegada de utilização, uma ordem de grandeza**, não uma pegada de ciclo de vida.

### 1.4 Princípio orientador: modelizar fisicamente o que é modelizável, apoiar-se no observável para o resto

Os modelos proprietários (GPT, Claude, Gemini…) não publicam nem os parâmetros ativados, nem o hardware, nem a taxa de utilização real dos GPU. Duas informações permanecem acessíveis: uma estimativa do número de parâmetros (trabalhos IKP) e as tabelas de preços das API. Daí:

* a energia do token de **saída** é modelizada fisicamente a partir do modelo da Ecologits, pois é a componente que mais varia com a dimensão do modelo e o regime de descodificação é o mais bem caracterizado publicamente.
* a energia dos tokens de **entrada** e de **cache** é derivada do **rácio dos preços** cobrados, na ausência de um modelo físico pertinente sobre as dinâmicas do prefill e da encoding.

---

## 2. Cadeia de cálculo

```
Modelo (P_tot, P_act, κ_in, κ_cache, S_tokens, país/fornecedor)  +  textos da troca i
   │
   ▼ [1] Contagem de tokens: new_input(i), history(i), output(i)          (§5)
   ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, IT bruto]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(país, fornecedor)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(país)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(país, fornecedor)   [L]
   ▼ [5] Agregação: Σ sobre as trocas atualizadas; equivalências duche e LED  (§8, §9)
```

---

## 3. Notações e unidades

| Símbolo                    | Significado                                        | Unidade             | Origem                                        |
| -------------------------- | -------------------------------------------------- | ------------------- | --------------------------------------------- |
| `P_tot`                    | parâmetros totais                                  | milhares de milhões | estimativa IKP (§4.2)                         |
| `P_act`                    | parâmetros ativados (MoE)                          | milhares de milhões | regressão sobre modelos abertos da IKP (§4.3) |
| `S_tokens`                 | tokens do prompt de sistema                        | tokens              | §4.4                                          |
| `κ_in`, `κ_cache`          | rácios de preço input/output e cache/input         | sem unidade         | §4.5                                          |
| `EF(país)`                 | intensidade carbónica da produção elétrica         | gCO₂e/kWh           | §4.1                                          |
| `PUE(país, fornecedor)`    | eficiência energética do centro de dados           | rácio ≥ 1           | §4.7                                          |
| `WUE(país, fornecedor)`    | água consumida por kWh                             | L/kWh               | §4.8                                          |
| `r_out`, `r_in`, `r_cache` | energia IT por token de saída / entrada / em cache | Wh/token            | §6                                            |

---

## 4. Dados e sua construção

### 4.1 Fatores de emissão de carbono `EF`

* **Fonte**: conjunto de dados Ember «generation yearly global» (`release_generation_yearly_global.csv`).
* **Filtros**: `Area type = Country or economy` ; ano **2025** ; `Electricity source = Total generation` (intensidade do mix de produção doméstico).
* **Variável**: `Emissions intensity (gCO2e/kWh)` ; As observações sem valor são excluídas.
* **Referência Mundial**: linha `World` = **473 gCO₂e/kWh**, intensidade mundial **2024** (Ember, *Global Electricity Review 2025*).

### 4.2 Parâmetros totais `P_tot` dos modelos fechados

Estimativas provenientes do artigo [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration).

### 4.3 Parâmetros ativados `P_act` dos modelos fechados

1. Construção de um CSV (`model, params, params_activated`) a partir de `configs/all_models.json` do repositório `19PINE-AI/ikp`, retendo apenas os modelos cujos `params` e `params_activated` estão **preenchidos e são diferentes** (modelos MoE).
2. Adição de **20 modelos Hugging Face**.
3. Remoção dos duplicados e de **gpt-4** (número de parâmetros não verificável).
4. **Regressão** `P_act = f(P_tot)` de forma **exponencial**, ajustada sobre estes modelos abertos, e depois aplicada aos modelos fechados. Scripts: `ai-inf-calculator/data/analyze_moe_params.py` (ajuste) e `visualize_closed_model_params.py` (previsão).

### 4.4 Tokens do prompt de sistema `S_tokens`

* Contados **com o tokenizer do calculador** nos prompts de sistema divulgados do repositório `asgeirtj/system_prompts_leaks`.
* Modelo sem prompt correspondente: atribuição, por ordem de prioridade, (1) do prompt do **modelo mais próximo da mesma família**, (2) na ausência deste, da **mediana** de todos os prompts. A mediana é utilizada por ser insensível a valores extremos e casos particulares (por ex., Claude Fable 5).
* `S_tokens` é um valor do catálogo, em tokens (não convertido através de palavras/token); é um parâmetro **imposto e oculto** ao utilizador.

### 4.5 Rácios tarifários `κ_in`, `κ_cache`

```
κ_in(modelo, fornecedor)    = preço_input / preço_output
κ_cache(modelo, fornecedor) = preço_input_em_cache / preço_input
```

* Fontes: preços públicos, recolhidos nomeadamente no **OpenRouter**, convertidos para a **mesma moeda e a mesma quantidade de tokens**.
* Calculados **por modelo e fornecedor**, nunca fixados como constante universal.
* Um script de calibração **fora do navegador** recolhe as tarifas na data correspondente e **conserva a data** com os rácios e a fonte tarifária exata.
* **Escolha «market-based»**: abordagem simples, deliberadamente não representativa do custo físico, considerada equilibrada face às restantes incertezas.

### 4.6 Localização dos centros de dados (fornecedor de LLM → cloud → país)

| Fornecedor de LLM               | Cloud selecionada                                    | País por defeito (utilizadores gratuitos)            |
| ------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| OpenAI (parceria Microsoft)     | Azure                                                | Estados Unidos                                       |
| Mistral AI (parceria Microsoft) | Azure                                                | centros soberanos na Europa, provavelmente **Suíça** |
| Gemini                          | Google Cloud (obrigatório)                           | Estados Unidos                                       |
| Anthropic                       | AWS (cloud mais competitiva entre as três possíveis) | Estados Unidos                                       |

Estas são **hipóteses de localização provável** e modificáveis. Para a **comparação entre modelos**, a hipótese simplificadora adotada é que os centros de dados dos fornecedores estão nos **Estados Unidos**; é por isso que o indicador de **risco de seca foi eliminado** (adicionava dados e complexidade sem diferenciar os modelos sob esta hipótese).

### 4.7 PUE por país e fornecedor

Cascata de quatro níveis de fiabilidade decrescente, com rastreabilidade do nível utilizado:

1. **measured**: valor publicado pela AWS, Azure ou GCP para o país/região específico;
2. **estimated**: interpolação regional (país sem centro conhecido, numa zona com PUE publicada);
3. **regional**: PUE regional agregada (Ásia-Pacífico, EMEA…);
4. **global**: PUE mundial média do fornecedor (países isolados).

O PUE genérico da Ecologits de 1,20 é **excluído** de `r_out` e substituído por este PUE geográfico, aplicado uma única vez (§2).

### 4.8 WUE por país e fornecedor

Os fornecedores apenas publicam WUE **regionais**. Cada país é associado à região cloud mais próxima; se o valor regional existir (ex. Singapura 1,57 L/kWh para a AWS), é utilizado tal como está; caso contrário, utiliza-se a **média global do fornecedor**, sem ajustamento subjetivo. A imputação baseia-se exclusivamente em dados publicados, mas oculta a variabilidade intrarregional (tecnologia de arrefecimento, conceção).

### 4.9 Catálogo de modelos

Um catálogo local por modelo/fornecedor: `P_tot`, `P_act`, `S_tokens`, país de referência, `κ_in`, `κ_cache` e os fatores `PUE`, `EF`, `WUE`. Modelos propostos por defeito: ChatGPT → modelo pequeno atual (sem subscrição), modelo grande atual (com subscrição); Mistral → modelo pequeno (rápido), modelo grande (reflexão).

---

## 5. Contagem dos tokens

### 5.1 Tokenização

* Por defeito: **Tiktoken**, executado localmente (Worker do navegador); nenhum texto é enviado.
* Recurso de fallback em caso de falha: `T(texto) = número_de_palavras / coeficiente`, coeficiente **0,75** palavra/token por defeito (referência OpenAI), modificável; as palavras são segmentadas nos caracteres não alfanuméricos.
* `T(texto vazio) = 0`; raciocínio não fornecido = 0. Um resultado de ferramenta colado numa mensagem é texto normal.

### 5.2 Constituição dos tokens de uma troca `i`

Os índices seguem a ordem das trocas **preenchidas** (um bloco totalmente vazio é ignorado, incluindo para o prompt de sistema). `M_i` mensagem, `R_i` raciocínio visível, `C_i` resposta, `A_i` versão completa do artifact fornecida à troca `i`.

```
A_prec(i) = última versão completa de artifact fornecida antes de i (vazia se nenhuma)
D_i       = passagens adicionadas ou modificadas de A_i em relação a A_prec(i)
            (A_i completo na primeira versão; vazio se não houver artifact)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

Regras associadas:

* `S_tokens` é tratado à taxa do cache **desde a primeira troca**.
* O histórico **não acumula** as versões antigas de artifact nem as suas diferenças: apenas a última versão completa conta. O diff da troca atual entra na **saída**; a sua versão completa torna-se a referência seguinte.
* Versões idênticas → 0 token de artifact na saída; uma eliminação isolada não adiciona nenhum token de saída, o que subestima o impacto final.
* Todo o histórico é considerado **100 % em cache**.

---

## 6. Energia IT por token

### 6.1 `r_out`: modelo físico Ecologits (fora do Scope 3, TPS/TTFT fixos)

Regressão pública sobre hardware real; batch e tempo de cálculo por token tratados como funções determinísticas das constantes (hipótese «TPS/TTFT fixos»).

| Constante                          |                        Valor | Função                                                              |
| ---------------------------------- | ---------------------------: | ------------------------------------------------------------------- |
| `BATCH_SIZE`                       |                           64 | pedidos processados em paralelo                                     |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | GPU por servidor                                                    |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | potência do servidor sem GPU (CPU, RAM, alimentação, ventilação), W |
| `GPU_MEMORY_GB`                    |                           80 | VRAM por GPU (classe A100/H100)                                     |
| `QUANTIZATION_BITS`                |                           16 | bits por peso                                                       |
| `MEMORY_OVERHEAD`                  |                          1,2 | margem de memória (KV cache, ativações, fragmentação)               |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1,17e-6 / −1,12e-2 / 4,05e-5 | regressão da energia GPU                                            |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6,78e-4 / 3,12e-4 / 1,94e-2 | regressão da latência                                               |

**Equações:**

```
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` e `r_cache`: ancoragem em `r_out` pelos preços

```
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

Herdam, portanto, a dependência de `P_act`/`P_tot` sem reestimação independente (sem heterogeneidade metodológica).

### 6.3 Justificação do price-based em vez de um modelo físico do prefill (compute-bound vs memory-bound, considerado e posteriormente rejeitado)

1. **Observabilidade**: MFU, dimensão do batch e hardware do prefill dos modelos fechados não são observáveis, enquanto a latência de descodificação é mensurável externamente; um modelo físico do prefill assentaria em hipóteses não verificáveis, enquanto o preço é público, datado e específico do modelo.
2. **Escalabilidade**: o catálogo evolui continuamente; um rácio físico exigiria recalibrar o rendimento do hardware para cada modelo sem dados; o preço é atualizado a cada anúncio.
3. **Vieses opostos assumidos e não corrigidos separadamente**:

   * o preço do cache **sobrestima** provavelmente o seu custo energético (leitura da memória, custo marginal próximo de zero; o preço reflete a amortização da infraestrutura e uma lógica comercial) → viés de alta em `r_cache`;
   * `r_out` trata todos os tokens de saída com o mesmo custo, enquanto o custo real **aumenta** com o número de tokens no input e já gerados (KV-cache crescente) → **subestimação** dos contextos longos e das conclusões longas, viés de baixa em `r_in` e `r_out`.
     Numa conversa multi-turnos, o histórico em cache integra as saídas anteriores, pelo que o volume faturado à tarifa «cache» aumenta e os dois vieses, da mesma ordem de grandeza, compensam-se **aproximadamente**. Trata-se de uma simplificação, não de uma eliminação do erro.
4. **Coerência** com o resto do método, que já utiliza uma proxy observável (regressão pública) para `P_act` dos modelos fechados.

---

## 7. Impactos: energia, carbono, água

```
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(país_de_alojamento, fornecedor)             [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(país_de_alojamento)                    [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(país_de_alojamento, fornecedor)      [L]
```

---

## 8. Equivalências

### 8.1 Duche elétrico

Caudal 15 L/min; 18 → 38 °C (aumento de 20 °C segundo a termodinâmica); 0,0232 kWh/L ⇒ **0,348 kWh/min**. Parâmetros por defeito, modificáveis.

```
carbone_duche_min = caudal × energia_por_litro × EF_utilizador      [gCO₂e/min]
duração_minutos   = C / (0,348 × EF_utilizador)
duração_segundos  = 60 × C / carbono_duche_min
```

* `EF_utilizador` é o país do **utilizador** (detetado ou corrigido).
* Comparação **apenas de carbono**; não é calculado nenhum volume de água equivalente.

### 8.2 Lâmpada LED

Comparação da **eletricidade** da conversa, expressa em duração de acendimento de uma lâmpada LED.

```
E_total   = Σ nrj_request(i)    [Wh]   trocas preenchidas atualizadas, PUE incluído
P_LED     = 5 W                 [W]    por defeito, modificável
duração_LED = E_total / P_LED     [h]    (segundos: 3 600 × E_total / P_LED)
```

* `P_LED` deve ser estritamente positivo; caso contrário, a duração não é calculável.
* O carbono e a água não são afetados; `P_LED` não intervém em nenhuma equação de impacto.
* O valor de 5 W é uma convenção de ilustração, não uma medição.

---

## 9. Limitações

### 9.1. Ausência de incerteza

O resultado é um único valor, enquanto a cadeia encadeia estimativas muito ruidosas. Os erros multiplicam-se, pelo que excluir o intervalo de incerteza equivale a apresentar uma precisão que o método não possui.
Esta incerteza não constitui um problema para a utilização do calculador para fins pedagógicos. As competências a transmitir baseiam-se numa comparação das práticas, utilizando todas a mesma metodologia de medição.

### 9.2. Regressão P_act = f(P_tot)

Assume-se que todos os modelos proprietários são MoE, uma vez que modelos densos com tantos parâmetros são pouco prováveis. Contudo, se um deles for denso, P_act é amplamente subestimado.
A forma exponencial da função diverge fora do intervalo de ajuste. Ora, os modelos fechados estimados situam-se para além da maioria dos modelos abertos.

### 9.3. Raciocínio invisível excluído

Para os modelos de «reflexão», os tokens de raciocínio ocultos podem exceder largamente a resposta visível. A sua exclusão produz uma subestimação global e favorece os modelos de raciocínio na comparação. É feito um lembrete nas boas práticas.

### 9.4. Ancoragem nos preços

`κ_in` muda quando um fornecedor reduz o seu preço, talvez sem qualquer alteração física. As sobretaxas de contexto longo e as tarifas batch ou prioritárias colocam o mesmo problema. A tarifação pode não ter qualquer correlação com o consumo energético durante o processamento.

### 9.5. Escolha dos FE, PUE e WUE

Como a localização dos modelos dos fornecedores privados não é conhecida, é difícil estimar estas variáveis.

---

## 10. Fontes

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`); *Global Electricity Review 2025* (referência Mundial).
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp); repositório `19PINE-AI/ikp` (`configs/all_models.json`).
* Hugging Face - 20 modelos adicionais para estimativa de `P_act` dos modelos da IKP.
* Ecologits — estimativa do custo energético de um token.
* OpenRouter e tabelas de preços públicas dos fornecedores.
* Repositório `asgeirtj/system_prompts_leaks` - prompts de sistema.
* Publicações PUE/WUE da AWS (2025), Azure (FY25), Google Cloud (2024).
* Scripts do projeto: `analyze_moe_params.py`, `visualize_closed_model_params.py`.
