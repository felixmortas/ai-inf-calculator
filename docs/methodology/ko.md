# LLM 추론의 환경 발자국 추정 방법론

## 1. 목적, 범위 및 기본 원칙

### 1.1 목적

**대화**를 통해 챗봇과 주고받는 대화의 전기 에너지, 온실가스 배출량(gCO₂e) 및 소비되는 물의 양을 추정한다. 계산은 **교환 단위**로 수행한다(교환 1회 = 대화 이력과 새 메시지를 수신하고, 가시적인 reasoning과 응답을 반환하는 API 호출).

### 1.2 포함 범위

* 데이터센터의 **추론**(사용 단계) 에너지.
* 데이터센터가 위치한 **호스팅 국가**의 전력망 탄소 집약도를 통한 관련 배출량.
* WUE를 통한 **현장(on-site)** 물 사용량(냉각).
* 전기식 온수 샤워 시간으로 환산한 탄소 등가량.
* LED 전구 점등 시간으로 환산한 전력 사용량 비교.

### 1.3 제외 범위

Scope 3(GPU, 서버, 건물의 제조 및 감가상각) ; 모델 학습 ; 전력 생산과 관련된 현장 외 물 사용량 ; 금속 채굴 ; 네트워크 및 단말기 ; 보이지 않는 reasoning ; 이미지, 오디오, 비디오 ; 수치화된 불확실성 범위.
결과는 **사용 단계의 발자국이며, 규모를 가늠하기 위한 값**이지, 전 생애주기(life cycle) 발자국이 아니다.

### 1.4 기본 원칙: 모델링 가능한 것은 물리적으로 모델링하고, 나머지는 관측 가능한 데이터에 의존한다

상용 모델(GPT, Claude, Gemini…)은 활성화된 파라미터, 하드웨어, 실제 GPU 사용률을 공개하지 않는다. 접근 가능한 정보는 두 가지로 남는다. 즉, 파라미터 수의 추정치(IKP 연구)와 API의 가격표이다. 따라서:

* **출력** token의 에너지는 Ecologits 모델을 기반으로 물리적으로 모델링한다. 이는 모델 크기에 따라 가장 크게 변하는 항목이며, decoding regime이 공개적으로 가장 잘 특성화되어 있기 때문이다.
* **입력** 및 **cache** token의 에너지는 prefill과 encoding의 동역학에 적합한 물리 모델이 없기 때문에 청구 가격의 **비율**로부터 도출한다.

---

## 2. 계산 체인

```
모델 (P_tot, P_act, κ_in, κ_cache, S_tokens, 국가/공급자) + 교환 i의 텍스트
   │
[L1]    ▼ [1] Token 수 계산: new_input(i), history(i), output(i)          (§5)
[L2]    ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
[L3]    ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, IT 총량]
[L4]    ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(국가, 공급자)          [Wh]
[L5]         ├─► co2_request(i)   = nrj_request/1000 × EF(국가)                 [gCO₂e]
[L6]         └─► water_request(i) = nrj_request/1000 × WUE(국가, 공급자)   [L]
[L7]    ▼ [5] 집계: 최신 상태의 교환에 대해 Σ ; 샤워 및 LED 등가량  (§8, §9)
```

---

## 3. 표기 및 단위

| 기호                         | 의미                               | 단위        | 출처                   |
| -------------------------- | -------------------------------- | --------- | -------------------- |
| `P_tot`                    | 총 파라미터                           | 십억 개      | IKP 추정 (§4.2)        |
| `P_act`                    | 활성화된 파라미터 (MoE)                  | 십억 개      | IKP의 공개 모델 회귀 (§4.3) |
| `S_tokens`                 | 시스템 prompt의 token                | tokens    | §4.4                 |
| `κ_in`, `κ_cache`          | input/output 및 cache/input 가격 비율 | 무차원       | §4.5                 |
| `EF(국가)`                   | 전력 생산의 탄소 집약도                    | gCO₂e/kWh | §4.1                 |
| `PUE(국가, 공급자)`             | 데이터센터의 에너지 효율                    | ratio ≥ 1 | §4.7                 |
| `WUE(국가, 공급자)`             | kWh당 소비되는 물                      | L/kWh     | §4.8                 |
| `r_out`, `r_in`, `r_cache` | 출력 / 입력 / cache token당 IT 에너지    | Wh/token  | §6                   |

---

## 4. 데이터 및 그 구성

### 4.1 탄소 배출 계수 `EF`

* **출처**: Ember의 « generation yearly global » 데이터셋 (`release_generation_yearly_global.csv`).
* **필터**: `Area type = Country or economy` ; **2025년** ; `Electricity source = Total generation` (국내 발전 믹스의 탄소 집약도).
* **변수**: `Emissions intensity (gCO2e/kWh)` ; 값이 없는 관측치는 제외한다.
* **세계 기준**: `World` 행 = **473 gCO₂e/kWh**, 세계 **2024년** 탄소 집약도(Ember, *Global Electricity Review 2025*).

### 4.2 폐쇄형 모델의 총 파라미터 `P_tot`

[Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration) 논문의 추정치를 사용한다.

### 4.3 폐쇄형 모델의 활성화된 파라미터 `P_act`

1. `19PINE-AI/ikp` 저장소의 `configs/all_models.json`을 기반으로 `model, params, params_activated` CSV를 구성한다. `params`와 `params_activated`가 **기재되어 있으며 서로 다른** 모델(MoE)만 유지한다.
2. **20개의 Hugging Face 모델**을 추가한다.
3. 중복 모델과 `gpt-4`(파라미터 수를 검증할 수 없음)를 제거한다.
4. 이러한 공개 모델에 대해 **지수 형태**의 `P_act = f(P_tot)` **회귀**를 수행한 후, 이를 폐쇄형 모델에 적용한다. 스크립트: `ai-inf-calculator/data/analyze_moe_params.py`(fitting) 및 `visualize_closed_model_params.py`(prediction).

### 4.4 시스템 prompt의 token `S_tokens`

* `asgeirtj/system_prompts_leaks` 저장소에서 공개된 시스템 prompt를 **계산기의 tokenizer로** 계산한다.
* 해당하는 prompt가 없는 모델에는 우선순위에 따라 (1) **동일한 family에서 가장 가까운 모델**의 prompt를 할당하고, (2) 그렇지 않으면 모든 prompt의 **median**을 사용한다. median은 극단값과 특수 사례(예: Claude Fable 5)에 영향을 덜 받기 때문에 선택한다.
* `S_tokens`는 token 단위의 카탈로그 값이며(단어/token을 통해 변환하지 않음), 사용자에게 **강제로 적용되지만 숨겨진** 파라미터이다.

### 4.5 가격 비율 `κ_in`, `κ_cache`

```
κ_in(모델, 공급자)    = price_input / price_output
κ_cache(모델, 공급자) = price_input_en_cache / price_input
```

* 출처: 공개 가격, 특히 **OpenRouter**에서 수집하고, **동일한 통화 및 동일한 token 수량**으로 환산한다.
* **모델 및 공급자별로** 계산하며, 보편적인 상수로 고정하지 않는다.
* **브라우저 외부** calibration 스크립트가 해당 날짜의 가격을 조회하며, 비율과 정확한 가격 출처와 함께 날짜를 **보존한다**.
* **« market-based » 선택**: 단순한 접근법이며, 물리적 비용을 대표하도록 의도적으로 설계하지 않았다. 다른 불확실성들과 균형을 이루는 것으로 판단한다.

### 4.6 데이터센터 위치 (LLM 공급자 → cloud → 국가)

| LLM 공급자                     | 선택된 Cloud                            | 기본 국가 (무료 사용자)                     |
| --------------------------- | ------------------------------------ | ---------------------------------- |
| OpenAI (Microsoft 파트너십)     | Azure                                | 미국                                 |
| Mistral AI (Microsoft 파트너십) | Azure                                | 유럽의 sovereign centers, 아마도 **스위스** |
| Gemini                      | Google Cloud (필수)                    | 미국                                 |
| Anthropic                   | AWS (세 가지 가능한 선택지 중 가장 경쟁력 있는 cloud) | 미국                                 |

이는 **가능성이 높은 위치에 대한 가정**이며 수정할 수 있다. **모델 간 비교**에서는 공급자의 데이터센터가 **미국**에 있다고 단순화하여 가정한다. 따라서 **가뭄 위험 지표는 제거**했다. 이 가정에서는 모델 간 차이를 만들지 못하면서 데이터와 복잡성만 추가하기 때문이다.

### 4.7 국가 및 공급자별 PUE

신뢰도가 낮아지는 순서에 따른 네 단계의 cascade를 사용하며, 사용된 수준을 추적할 수 있도록 한다:

1. **measured**: AWS, Azure 또는 GCP가 특정 국가/지역에 대해 공개한 값;
2. **estimated**: 지역 간 interpolation(알려진 PUE가 공개된 구역에 속하지만 데이터센터가 알려지지 않은 국가);
3. **regional**: 지역별로 집계된 PUE(아시아-태평양, EMEA…);
4. **global**: 고립된 국가에 적용하는 공급자의 전 세계 평균 PUE.

Ecologits의 일반적인 PUE 1.20은 `r_out`에서 **제외**하고, 이 지리적 PUE로 대체하여 §2에 따라 **한 번만** 적용한다.

### 4.8 국가 및 공급자별 WUE

공급자들은 **지역별** WUE만 공개한다. 각 국가는 가장 가까운 cloud region에 연결한다. 지역 값이 존재하면(예: AWS의 싱가포르 1.57 L/kWh) 해당 값을 그대로 사용하고, 그렇지 않으면 **공급자의 글로벌 평균**을 주관적인 조정 없이 사용한다. 이 귀속은 공개된 데이터에만 기반하지만 지역 내 변동성(냉각 기술, 설계)을 숨긴다.

### 4.9 모델 카탈로그

모델/공급자별 로컬 카탈로그: `P_tot`, `P_act`, `S_tokens`, 기준 국가, `κ_in`, `κ_cache`, 그리고 `PUE`, `EF`, `WUE` 계수. 기본으로 제공되는 모델: ChatGPT → 현재 소형 모델(구독 없음), 현재 대형 모델(구독 있음) ; Mistral → 소형 모델(빠른 모델), 대형 모델(reasoning).

---

## 5. Token 수 계산

### 5.1 Tokenization

* 기본값: **Tiktoken**, 로컬에서 실행(브라우저 Worker) ; 어떤 텍스트도 전송되지 않는다.
* 실패 시 fallback: `T(텍스트) = 단어 수 / coefficient`, 기본 coefficient는 **0.75** word/token(OpenAI 기준)이며 수정 가능하다. 단어는 영숫자가 아닌 문자에서 분할된다.
* `T(빈 텍스트) = 0` ; reasoning이 제공되지 않으면 = 0. 메시지에 붙여 넣은 도구 결과는 일반 텍스트로 취급한다.

### 5.2 교환 `i`의 token 구성

인덱스는 **입력된 교환**의 순서를 따른다(완전히 비어 있는 블록은 시스템 prompt의 경우를 포함하여 무시한다). `M_i`는 메시지, `R_i`는 가시적인 reasoning, `C_i`는 응답, `A_i`는 교환 `i`에 제공된 artifact의 전체 버전이다.

```
A_prec(i) = i 이전에 제공된 artifact의 마지막 전체 버전 (없으면 비어 있음)
D_i       = A_prec(i)에 비해 A_i에서 추가되거나 수정된 부분
            (첫 번째 버전에서는 A_i 전체 ; artifact가 없으면 비어 있음)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

연관 규칙:

* `S_tokens`는 첫 번째 교환부터 **cache rate**로 처리한다.
* history는 이전 artifact 버전이나 그 차이를 누적하지 않는다. 마지막 전체 버전만 계산한다. 현재 교환의 diff는 **출력**으로 들어가며, 그 전체 버전이 다음 교환의 reference가 된다.
* 동일한 버전 → 출력 artifact token 0 ; 삭제만 있는 경우 출력 token을 추가하지 않으며, 이는 최종 영향을 과소평가한다.
* 전체 history는 **100% cache** 상태라고 가정한다.

---

## 6. Token당 IT 에너지

### 6.1 `r_out`: Ecologits 물리 모델 (Scope 3, 고정 TPS/TTFT 제외)

실제 하드웨어를 기반으로 한 공개 회귀 모델이다. batch와 token당 계산 시간은 상수의 결정론적 함수로 처리한다(« TPS/TTFT fixed » 가정).

| 상수                                 |                            값 | 역할                                                  |
| ---------------------------------- | ---------------------------: | --------------------------------------------------- |
| `BATCH_SIZE`                       |                           64 | 병렬로 처리되는 요청 수                                       |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | 서버당 GPU 수                                           |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | GPU 외 서버 전력(CPU, RAM, 전원공급장치, ventilation), W       |
| `GPU_MEMORY_GB`                    |                           80 | GPU당 VRAM(A100/H100 class)                          |
| `QUANTIZATION_BITS`                |                           16 | weight당 bit 수                                       |
| `MEMORY_OVERHEAD`                  |                          1,2 | memory margin(KV cache, activations, fragmentation) |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1,17e-6 / −1,12e-2 / 4,05e-5 | GPU energy regression                               |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6,78e-4 / 3,12e-4 / 1,94e-2 | latency regression                                  |

**방정식:**

```
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` 및 `r_cache`: 가격을 통한 `r_out` 기준 설정

```
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

따라서 이들은 `P_act`/`P_tot`에 대한 의존성을 그대로 상속하며, 독립적인 재추정은 하지 않는다(방법론적 이질성을 방지).

### 6.3 물리적인 prefill 모델 대신 price-based 방식을 사용하는 이유 (compute-bound vs memory-bound, 검토 후 제외)

1. **관측 가능성**: 폐쇄형 모델의 MFU, batch size 및 prefill 하드웨어는 관측할 수 없는 반면, decoding latency는 외부에서 측정할 수 있다. 따라서 prefill의 물리 모델은 검증할 수 없는 가정에 의존하게 되지만, 가격은 공개되어 있고 날짜가 명확하며 모델별로 구체적이다.
2. **확장성**: 카탈로그는 지속적으로 변화한다. 물리적 비율을 사용하려면 데이터 없이 각 모델마다 하드웨어 효율을 다시 calibration해야 하지만, 가격은 새로운 발표가 있을 때마다 업데이트된다.
3. **상반되는 편향을 인정하며 별도로 보정하지 않는다**:

   * cache 가격은 **에너지 비용을 과대평가**할 가능성이 높다(메모리 read, 거의 0에 가까운 marginal cost ; 가격은 infrastructure amortization과 commercial logic을 반영) → `r_cache`에 대한 상승 편향;
   * `r_out`은 모든 출력 token의 비용이 동일하다고 처리하지만 실제 비용은 input token 수와 이미 생성된 token 수(KV-cache 증가)에 따라 **증가**한다 → 긴 context와 긴 completion을 **과소평가**, `r_in` 및 `r_out`에 대한 하락 편향.
     대화가 여러 turn으로 이어질 경우, cache의 history에는 이전 출력이 포함되므로 « cache » 요율로 청구되는 volume이 증가하고, 두 편향은 같은 정도로 **대략적으로 상쇄**된다. 이는 단순화이지 오류가 제거되는 것은 아니다.
4. `P_act`에 대해 이미 공개 회귀(proxy)를 사용하는 방법론의 나머지 부분과의 **일관성**.

---

## 7. 영향: 에너지, 탄소, 물

```
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(호스팅_국가, 공급자)                       [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(호스팅_국가)                        [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(호스팅_국가, 공급자)               [L]
```

---

## 8. 등가량

### 8.1 전기식 샤워

유량 15 L/min ; 18 → 38 °C(열역학에 따른 20 °C 상승) ; 0.0232 kWh/L ⇒ **0.348 kWh/min**. 기본값이며 수정 가능하다.

```
carbone_douche_min = débit × énergie_par_litre × EF_utilisateur      [gCO₂e/min]
durée_minutes      = C / (0,348 × EF_utilisateur)
durée_secondes     = 60 × C / carbone_douche_min
```

* `EF_utilisateur`는 **사용자**가 있는 국가(감지 또는 수정)이다.
* **탄소만** 비교하며, 이에 상응하는 물의 양은 계산하지 않는다.

### 8.2 LED 전구

대화에 사용된 **전력**을 LED 전구의 점등 시간으로 표현하여 비교한다.

```
E_total   = Σ nrj_request(i)    [Wh]   최신 상태로 입력된 교환, PUE 포함
P_LED     = 5 W                 [W]    기본값, 수정 가능
durée_LED = E_total / P_LED     [h]    (초: 3 600 × E_total / P_LED)
```

* `P_LED`는 엄격하게 양수여야 한다. 그렇지 않으면 시간은 계산할 수 없다.
* 탄소와 물에는 해당하지 않는다. `P_LED`는 영향 계산의 어떤 방정식에도 사용되지 않는다.
* 5 W 값은 측정값이 아니라 예시를 위한 convention이다.

---

## 9. 한계

### 9.1 불확실성 부재

결과는 단일 값이지만, 계산 체인은 매우 큰 noise를 가진 추정치를 연속해서 사용한다. 따라서 오류가 누적되므로 불확실성 범위를 제외하는 것은 방법론이 실제로 가지고 있지 않은 정밀도를 표시하는 것과 같다.
이러한 불확실성은 교육 목적으로 계산기를 사용하는 데에는 문제가 되지 않는다. 전달하고자 하는 역량은 모두 동일한 측정 방법론을 사용하는 관행의 비교에 기반한다.

### 9.2 회귀 P_act = f(P_tot)

모든 proprietary 모델이 MoE라고 가정한다. 이 정도로 많은 파라미터를 가진 dense 모델은 가능성이 낮기 때문이다. 그러나 그중 하나가 dense 모델이라면 P_act는 크게 과소평가된다.
함수의 지수 형태는 fitting 범위를 벗어나면 발산한다. 그런데 추정된 폐쇄형 모델은 대부분의 공개 모델보다 그 범위를 넘어선다.

### 9.3 보이지 않는 reasoning 제외

« reasoning » 모델의 경우 숨겨진 reasoning token이 가시적인 응답보다 훨씬 많을 수 있다. 이를 제외하면 전체적인 과소평가가 발생하며, 비교에서 reasoning 모델에 유리하게 작용한다. 모범 사례에서 이에 대한 주의를 환기한다.

### 9.4 가격 기준 설정

공급자가 가격을 인하하면 물리적인 변화가 전혀 없더라도 `κ_in`이 변한다. 긴 context에 대한 surcharge와 batch 또는 priority 요금도 동일한 문제를 제기한다. 가격 정책은 처리 과정의 에너지 소비와 상관관계가 없을 수도 있다.

### 9.5 FE, PUE 및 WUE의 선택

민간 공급자의 모델 위치를 알 수 없기 때문에 이러한 변수를 추정하기 어렵다.

---

## 10. 출처

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`) ; *Global Electricity Review 2025* (세계 기준).
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp) ; 저장소 `19PINE-AI/ikp` (`configs/all_models.json`).
* Hugging Face — IKP 모델의 `P_act` 추정을 위해 추가된 20개 모델.
* Ecologits — token의 에너지 비용 추정.
* OpenRouter 및 공급자의 공개 가격표.
* 저장소 `asgeirtj/system_prompts_leaks` — 시스템 prompt.
* AWS(2025), Azure(FY25), Google Cloud(2024)의 PUE/WUE publications.
* 프로젝트 스크립트: `analyze_moe_params.py`, `visualize_closed_model_params.py`.
