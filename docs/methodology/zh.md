# LLM 推理环境影响估算方法

## 1. 目标、范围和指导原则

### 1.1 目标

估算与聊天机器人进行一次**对话**所产生的电力、温室气体排放（gCO₂e）和用水量，按**逐轮交互**计算（一次交互 = 一次 API 调用，接收历史记录和新消息，并返回可见的推理过程和回答）。

### 1.2 包含范围

* 数据中心**推理**阶段（使用阶段）的能源消耗。
* 相关排放，通过数据中心**所在国家**的电网碳强度计算。
* **现场**用水（冷却），通过 WUE 计算。
* 以电热水淋浴持续时间表示的碳排放等效值。
* 以 LED 灯开启持续时间表示的用电量比较。

### 1.3 排除范围

Scope 3（GPU、服务器、建筑物的制造和折旧）；模型训练；与发电相关的非现场用水；金属开采；网络和终端设备；不可见的推理过程；图像、音频、视频；数值化的不确定性范围。
结果是一个**使用阶段足迹，即数量级估算**，而不是全生命周期足迹。

### 1.4 指导原则：对可建模部分进行物理建模，其余部分依赖可观测数据

专有模型（GPT、Claude、Gemini……）不会公开激活的参数数量、硬件以及 GPU 的实际利用率。目前仍可获得两类信息：参数数量的估计值（IKP 工作）以及 API 的价格表。因此：

* **输出 token** 的能耗基于 Ecologits 模型进行物理建模，因为这是随模型规模变化最大的部分，而且解码阶段的运行机制是目前公开资料中刻画得最充分的。
* **输入 token** 和 **cache token** 的能耗根据计费**价格比**推导，因为缺乏一个能够合理描述 prefill 和 encoding 动态过程的物理模型。

---

## 2. 计算链

```text
模型（P_tot、P_act、κ_in、κ_cache、S_tokens、国家/供应商） + 第 i 次交互的文本
   │
   ▼ [1] token 计数：new_input(i)、history(i)、output(i)          (§5)
   ▼ [2] r_out（Ecologits）；r_in = κ_in·r_out；r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh，IT 原始值]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(国家、供应商)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(国家)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(国家、供应商)   [L]
   ▼ [5] 聚合：Σ 当前已填写的交互；淋浴和 LED 等效值  (§8、§9)
```

---

## 3. 符号和单位

| 符号                       | 含义                                      | 单位        | 来源                   |
| ------------------------ | --------------------------------------- | --------- | -------------------- |
| `P_tot`                  | 总参数量                                    | 十亿        | IKP 估算（§4.2）         |
| `P_act`                  | 激活参数量（MoE）                              | 十亿        | 基于 IKP 开源模型的回归（§4.3） |
| `S_tokens`               | system prompt 的 tokens                  | tokens    | §4.4                 |
| `κ_in`、`κ_cache`         | input/output 和 cache/input 的价格比         | 无单位       | §4.5                 |
| `EF(国家)`                 | 发电碳强度                                   | gCO₂e/kWh | §4.1                 |
| `PUE(国家、供应商)`            | 数据中心能源效率                                | ratio ≥ 1 | §4.7                 |
| `WUE(国家、供应商)`            | 每 kWh 的用水量                              | L/kWh     | §4.8                 |
| `r_out`、`r_in`、`r_cache` | 每个 output / input / cache token 的 IT 能耗 | Wh/token  | §6                   |

---

## 4. 数据及其构建方法

### 4.1 碳排放因子 `EF`

* **来源**：Ember 数据集「generation yearly global」(`release_generation_yearly_global.csv`)。
* **筛选条件**：`Area type = Country or economy`；年份为 **2025**；`Electricity source = Total generation`（国内发电结构的碳强度）。
* **变量**：`Emissions intensity (gCO2e/kWh)`；没有数值的观测值被排除。
* **全球参考值**：`World` 行 = **473 gCO₂e/kWh**，全球 **2024** 年碳强度（Ember，*Global Electricity Review 2025*）。

### 4.2 封闭模型的总参数量 `P_tot`

估算来自文章 [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration)。

### 4.3 封闭模型的激活参数量 `P_act`

1. 基于 `19PINE-AI/ikp` 仓库中的 `configs/all_models.json` 构建 CSV（`model, params, params_activated`），仅保留 `params` 和 `params_activated` **均已填写且彼此不同**的模型（MoE 模型）。
2. 加入 **20 个 Hugging Face 模型**。
3. 删除重复项以及 **gpt-4**（参数数量无法验证）。
4. 基于这些开源模型进行 `P_act = f(P_tot)` 的**指数回归**，然后应用于封闭模型。脚本：`ai-inf-calculator/data/analyze_moe_params.py`（拟合）和 `visualize_closed_model_params.py`（预测）。

### 4.4 system prompt 的 tokens `S_tokens`

* 使用计算器的 tokenizer 对 `asgeirtj/system_prompts_leaks` 仓库中披露的 system prompt 进行计数。
* 对于没有对应 prompt 的模型，按以下优先级分配：(1) 同一模型家族中**最接近的模型**的 prompt；(2) 若无，则使用所有 prompt 的**中位数**。选择中位数是因为它不受极端值和特殊情况影响（例如 Claude Fable 5）。
* `S_tokens` 是目录中的一个值，单位为 tokens（不通过 words/token 进行转换）；它是一个**强制施加且对用户隐藏**的参数。

### 4.5 价格比 `κ_in`、`κ_cache`

```text
κ_in(模型、供应商)    = price_input / price_output
κ_cache(模型、供应商) = price_input_en_cache / price_input
```

* 来源：公开价格，主要从 **OpenRouter** 收集，并统一到**相同货币和相同 token 数量**。
* 按**模型和供应商分别计算**，从不固定为通用常数。
* 一个**浏览器外部的校准脚本**会在指定日期读取价格，并保存该日期、价格比以及确切的价格来源。
* **「market-based」选择**：一种简单的方法，并不刻意代表物理成本；考虑到其他不确定性，该方法被认为是较为平衡的。

### 4.6 数据中心位置（LLM 供应商 → cloud → 国家）

| LLM 供应商                  | 选定的 Cloud                | 默认国家（免费用户）         |
| ------------------------ | ------------------------ | ------------------ |
| OpenAI（Microsoft 合作）     | Azure                    | 美国                 |
| Mistral AI（Microsoft 合作） | Azure                    | 欧洲主权数据中心，可能为**瑞士** |
| Gemini                   | Google Cloud（强制）         | 美国                 |
| Anthropic                | AWS（三个可能选项中最具竞争力的 Cloud） | 美国                 |

这些是**可能的数据中心位置假设**，并且可以修改。对于**模型之间的比较**，采用的简化假设是各供应商的数据中心均位于**美国**；因此删除了**干旱风险**指标（在该假设下，它只会增加数据和复杂性，却无法区分模型）。

### 4.7 按国家和供应商划分的 PUE

采用四级可靠性递减的层级，并记录实际使用的级别：

1. **measured**：AWS、Azure 或 GCP 针对具体国家/地区公布的值；
2. **estimated**：区域插值（没有已知数据中心的国家，位于已有 PUE 公布值的区域内）；
3. **regional**：聚合区域 PUE（亚太地区、EMEA……）；
4. **global**：供应商全球平均 PUE（孤立国家）。

Ecologits 通用的 1.20 PUE **不纳入** `r_out`，而由该地理位置对应的 PUE 替代，并且只应用一次（§2）。

### 4.8 按国家和供应商划分的 WUE

供应商仅公布**区域级别**的 WUE。每个国家被关联到距离最近的 Cloud 区域；如果存在区域值（例如 AWS 新加坡为 1.57 L/kWh），则直接使用该值；否则使用**供应商全球平均值**，不进行主观调整。归因完全基于已公布的数据，但无法反映区域内部的差异（冷却技术、设计）。

### 4.9 模型目录

每个模型/供应商均有一个本地目录：`P_tot`、`P_act`、`S_tokens`、参考国家、`κ_in`、`κ_cache`，以及 `PUE`、`EF`、`WUE` 因子。默认提供的模型：ChatGPT → 当前小模型（无订阅）、当前大模型（有订阅）；Mistral → 小模型（快速）、大模型（推理）。

---

## 5. Token 计数

### 5.1 Tokenization

* 默认：**Tiktoken**，在本地运行（浏览器 Worker）；不会发送任何文本。
* 如果失败则回退：`T(文本) = 单词数量 / 系数`，默认系数为 **0.75** word/token（OpenAI 参考值），可修改；单词按非字母数字字符进行分割。
* `T(空文本) = 0`；未提供的推理 = 0。粘贴在消息中的工具结果属于普通文本。

### 5.2 一次交互 `i` 的 tokens 构成

索引按照**已填写的交互**顺序排列（完全为空的块会被忽略，包括 system prompt）。`M_i` 为 message，`R_i` 为可见推理，`C_i` 为回答，`A_i` 为在第 `i` 次交互中提供的 artifact 完整版本。

```text
A_prec(i) = 在 i 之前提供的 artifact 的最后一个完整版本（如果没有则为空）
D_i       = A_i 相对于 A_prec(i) 新增或修改的部分
            （第一版时为完整的 A_i；没有 artifact 时为空）

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

相关规则：

* `S_tokens` 从第一次交互开始就按 cache 费率处理。
* history **不会累计**旧版 artifact 及其差异：只有最后一个完整版本计入。当前交互的 diff 计入**输出**；其完整版本成为下一次交互的参考。
* 版本相同 → 输出中的 artifact token 数为 0；仅删除内容不会增加任何输出 token，因此会低估最终影响。
* 假设整个 history **100% 处于 cache**。

---

## 6. 每个 Token 的 IT 能耗

### 6.1 `r_out`：Ecologits 物理模型（不含 Scope 3，TPS/TTFT 固定）

基于真实硬件的公开回归模型；batch 和每 token 的计算时间被视为常数的确定性函数（「TPS/TTFT 固定」假设）。

| 常数                                 |                            值 | 作用                                       |
| ---------------------------------- | ---------------------------: | ---------------------------------------- |
| `BATCH_SIZE`                       |                           64 | 并行处理的请求数                                 |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | 每台服务器的 GPU 数                             |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | 不含 GPU 的服务器功率（CPU、RAM、电源、通风），W           |
| `GPU_MEMORY_GB`                    |                           80 | 每个 GPU 的 VRAM（A100/H100 级别）              |
| `QUANTIZATION_BITS`                |                           16 | 每个权重的 bit 数                              |
| `MEMORY_OVERHEAD`                  |                          1.2 | 内存裕量（KV cache、activations、fragmentation） |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1.17e-6 / −1.12e-2 / 4.05e-5 | GPU 能耗回归                                 |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6.78e-4 / 3.12e-4 / 1.94e-2 | latency 回归                               |

**公式：**

```text
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` 和 `r_cache`：通过价格锚定到 `r_out`

```text
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

因此，它们继承了对 `P_act`/`P_tot` 的依赖，而无需独立重新估算（避免方法学上的异质性）。

### 6.3 采用基于 price 的方法，而不是 prefill 的物理模型（compute-bound vs memory-bound，曾考虑后排除）

1. **可观测性**：封闭模型的 MFU、batch size 和 prefill 硬件无法观测，而 decoding latency 可以从外部测量；prefill 的物理模型需要依赖无法验证的假设，而价格是公开的、有日期的，并且具体到模型。
2. **可扩展性**：模型目录持续变化；基于物理的 ratio 要求在没有数据的情况下针对每个模型重新校准硬件效率，而价格会随着每次公告更新。
3. **有意保留且不单独修正的相反偏差**：

   * cache 的价格可能**高估**其能源成本（memory read、边际成本接近零；价格反映基础设施折旧和商业逻辑）→ `r_cache` 存在向上的偏差；
   * `r_out` 将所有输出 token 视为成本相同，而实际成本会随着输入 token 数量和已生成 token 数量增加而**上升**（KV-cache 增长）→ 对长上下文和长 completion 产生**低估**，`r_in` 和 `r_out` 存在向下的偏差。
     在多轮对话中，cache 中的 history 包含之前的输出，因此按「cache」费率计费的量会增长，这两个量级相近的偏差会**近似**相互抵消。这是一种简化，而不是消除误差。
4. 与方法的其余部分保持**一致**：对于封闭模型的 `P_act`，同样已经采用了可观测 proxy（公开回归）。

---

## 7. 影响：能源、碳排放和水

```text
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(托管国家、供应商)             [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(托管国家)                    [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(托管国家、供应商)      [L]
```

---

## 8. 等效值

### 8.1 电热水淋浴

流量 15 L/min；18 → 38 °C（根据热力学升高 20 °C）；0.0232 kWh/L ⇒ **0.348 kWh/min**。默认参数，可修改。

```text
carbone_douche_min = 流量 × 每升能耗 × EF_用户      [gCO₂e/min]
durée_minutes      = C / (0.348 × EF_用户)
durée_secondes     = 60 × C / carbone_douche_min
```

* `EF_用户` 为**用户所在国家**（自动检测或修正）。
* 仅进行**碳排放**比较；不计算等效用水量。

### 8.2 LED 灯泡

将对话的**电力消耗**表示为 LED 灯泡开启的持续时间。

```text
E_total   = Σ nrj_request(i)    [Wh]   当前已填写的交互，包含 PUE
P_LED     = 5 W                 [W]    默认值，可修改
durée_LED = E_total / P_LED     [h]    （秒：3 600 × E_total / P_LED）
```

* `P_LED` 必须严格为正；否则无法计算持续时间。
* 碳排放和水资源不受影响；`P_LED` 不参与任何影响计算公式。
* 5 W 是用于说明的约定值，并非测量值。

---

## 9. 局限性

### 9.1 缺乏不确定性

结果是一个单一数值，而计算链由一系列噪声很大的估计构成。因此误差会不断累积，不提供不确定性范围就等于展示该方法并不具备的精度。
这种不确定性并不妨碍将计算器用于教学目的。需要传达的能力建立在实践比较之上，并且所有实践均使用相同的测量方法。

### 9.2 回归 `P_act = f(P_tot)`

假设所有 proprietary 模型都是 MoE，因为具有如此多参数的 dense 模型不太可能存在。但如果其中一个是 dense 模型，`P_act` 将被大幅低估。
该函数的指数形式在拟合范围之外会发散。而所估算的封闭模型位于大多数开源模型的范围之外。

### 9.3 排除不可见的推理过程

对于「reflection」模型，隐藏的 reasoning tokens 可能远远超过可见回答。排除它们会导致整体低估，并使 reasoning 模型在比较中占据优势。最佳实践中会对此进行提醒。

### 9.4 基于价格的锚定

供应商降低价格时，`κ_in` 会发生变化，即使物理过程可能完全没有变化。长上下文附加费用以及 batch 或 priority 价格也存在同样的问题。价格与处理过程中的能源消耗可能并无相关性。

### 9.5 FE、PUE 和 WUE 的选择

由于私有供应商的模型实际部署位置未知，因此很难估算这些变量。

---

## 10. 来源

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`)；*Global Electricity Review 2025*（全球参考值）。
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity*（01.me/research/ikp）；`19PINE-AI/ikp` 仓库（`configs/all_models.json`）。
* Hugging Face — 用于估算 IKP 模型 `P_act` 的 20 个附加模型。
* Ecologits — token 能耗估算。
* OpenRouter 以及供应商公开价格表。
* `asgeirtj/system_prompts_leaks` 仓库 — system prompt。
* AWS（2025）、Azure（FY25）、Google Cloud（2024）的 PUE/WUE 发布数据。
* 项目脚本：`analyze_moe_params.py`、`visualize_closed_model_params.py`。
