# LLMの推論における環境フットプリント推定の方法論

## 1. 目的、対象範囲、基本原則

### 1.1 目的

チャットボットとの**会話**による電力エネルギー、温室効果ガス排出量（gCO₂e）、および消費水量を、**交換ごと**に算出して推定する（1つの交換 = 履歴と新しいメッセージを受け取り、可視の推論と回答を返す1回のAPI呼び出し）。

### 1.2 含まれる範囲

* データセンターにおける**推論**（使用フェーズ）のエネルギー。
* データセンターの**ホスティング国**の電力網の炭素強度を介した、関連する排出量。
* WUEによる、**オンサイト**の水（冷却）。
* 電気式温水シャワーの時間による炭素排出量の換算。
* LED電球の点灯時間による電力消費量との比較。

### 1.3 除外される範囲

Scope 3（GPU、サーバー、建物の製造および償却）；モデルのトレーニング；電力生産に関連するオフサイトの水；金属の採掘；ネットワークおよび端末；不可視の推論；画像、音声、動画；数値化された不確実性の範囲。
結果は**使用時のフットプリント、オーダー・オブ・マグニチュード**であり、ライフサイクル・フットプリントではない。

### 1.4 基本原則：モデル化可能なものは物理的にモデル化し、それ以外は観測可能な情報に依拠する

プロプライエタリモデル（GPT、Claude、Gemini…）は、アクティブなパラメータ数、ハードウェア、GPUの実際の利用率を公開していない。利用可能な情報は2つある：パラメータ数の推定値（IKPの研究）とAPIの料金表である。したがって：

* **出力** token のエネルギーはEcologitsのモデルを基に物理的にモデル化する。これはモデルサイズによって最も大きく変化する項目であり、デコード時の動作も公開情報によって最もよく特徴付けられているためである。
* **入力**および**cache** tokenのエネルギーは、prefillおよびencodingのダイナミクスについて適切な物理モデルがないため、請求価格の**比率**から導出する。

---

## 2. 計算フロー

```
モデル（P_tot, P_act, κ_in, κ_cache, S_tokens, 国/プロバイダー） + 交換 i のテキスト
   │
[L1]    ▼ [1] Tokenのカウント：new_input(i), history(i), output(i)          (§5)
[L2]    ▼ [2] r_out（Ecologits）；r_in = κ_in·r_out；r_cache = κ_cache·r_in    (§6)
[L3]    ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, IT総量]
[L4]    ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(国, プロバイダー)          [Wh]
[L5]         ├─► co2_request(i)   = nrj_request/1000 × EF(国)                 [gCO₂e]
[L6]         └─► water_request(i) = nrj_request/1000 × WUE(国, プロバイダー)   [L]
[L7]    ▼ [5] 集計：最新の交換について Σ；シャワーおよびLEDによる換算  (§8, §9)
```

---

## 3. 表記と単位

| 記号                         | 意味                               | 単位        | 出典                      |
| -------------------------- | -------------------------------- | --------- | ----------------------- |
| `P_tot`                    | 総パラメータ数                          | 10億       | IKPの推定（§4.2）            |
| `P_act`                    | アクティブなパラメータ数（MoE）                | 10億       | IKPのオープンモデルに対する回帰（§4.3） |
| `S_tokens`                 | システムプロンプトのtoken数                 | tokens    | §4.4                    |
| `κ_in`, `κ_cache`          | input/outputおよびcache/inputの価格比   | 無次元       | §4.5                    |
| `EF(国)`                    | 発電電力の炭素強度                        | gCO₂e/kWh | §4.1                    |
| `PUE(国, プロバイダー)`           | データセンターのエネルギー効率                  | 比率 ≥ 1    | §4.7                    |
| `WUE(国, プロバイダー)`           | kWhあたりの消費水量                      | L/kWh     | §4.8                    |
| `r_out`, `r_in`, `r_cache` | 出力 / 入力 / cache tokenあたりのITエネルギー | Wh/token  | §6                      |

---

## 4. データとその構築

### 4.1 炭素排出係数 `EF`

* **出典**：Emberの「generation yearly global」データセット（`release_generation_yearly_global.csv`）。
* **フィルター**：`Area type = Country or economy`；年は**2025**；`Electricity source = Total generation`（国内発電ミックスの強度）。
* **変数**：`Emissions intensity (gCO2e/kWh)`；値のない観測値は除外する。
* **世界基準**：`World` 行 = **473 gCO₂e/kWh**、世界の**2024年**の強度（Ember, *Global Electricity Review 2025*）。

### 4.2 クローズドモデルの総パラメータ数 `P_tot`

[Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration) の論文による推定値。

### 4.3 クローズドモデルのアクティブなパラメータ数 `P_act`

1. `19PINE-AI/ikp` リポジトリの `configs/all_models.json` から、`params` と `params_activated` が**記入済みかつ異なる**モデル（MoEモデル）のみを対象として、CSV（`model, params, params_activated`）を構築する。
2. **20のHugging Faceモデル**を追加。
3. 重複および**gpt-4**（パラメータ数を検証できない）を削除。
4. これらのオープンモデルに対して、指数型の**回帰** `P_act = f(P_tot)` を適合させ、その後クローズドモデルに適用する。スクリプト：`ai-inf-calculator/data/analyze_moe_params.py`（適合）および `visualize_closed_model_params.py`（予測）。

### 4.4 システムプロンプトのtoken数 `S_tokens`

* `asgeirtj/system_prompts_leaks` リポジトリで公開されたシステムプロンプトを、**計算機のtokenizerを使用して**カウントする。
* 対応するプロンプトがないモデルには、優先順位に従って、(1) **同じファミリーの最も近いモデル**のプロンプト、(2) それがない場合はすべてのプロンプトの**中央値**を割り当てる。中央値を採用するのは、外れ値や特殊ケース（例：Claude Fable 5）の影響を受けにくいためである。
* `S_tokens` はcatalogue上の値であり、token単位（words/tokenによる変換はしない）；ユーザーに**強制され、隠されている**パラメータである。

### 4.5 料金比 `κ_in`, `κ_cache`

```
κ_in(モデル, プロバイダー)    = price_input / price_output
κ_cache(モデル, プロバイダー) = price_input_en_cache / price_input
```

* 出典：公開価格、特に**OpenRouter**などから収集し、**同じ通貨および同じtoken量**に換算。
* **モデルおよびプロバイダーごと**に計算し、普遍的な定数として固定しない。
* **ブラウザ外**のcalibrationスクリプトが、その時点の料金を取得し、比率と正確な料金ソースの日付を保存する。
* **「market-based」方式**：単純なアプローチであり、物理的コストを意図的に代表するものではない。他の不確実性とのバランスが取れていると判断した。

### 4.6 データセンターの所在地（LLMプロバイダー → cloud → 国）

| LLMプロバイダー                 | 採用するCloud                  | デフォルトの国（無料ユーザー）           |
| ------------------------- | -------------------------- | ------------------------- |
| OpenAI（Microsoftとの提携）     | Azure                      | 米国                        |
| Mistral AI（Microsoftとの提携） | Azure                      | 欧州の主権型データセンター、おそらく**スイス** |
| Gemini                    | Google Cloud（必須）           | 米国                        |
| Anthropic                 | AWS（3つの候補の中で最も競争力のあるcloud） | 米国                        |

これらは**想定される所在地に関する仮定**であり、変更可能である。**モデル間の比較**では、プロバイダーのデータセンターが**米国**にあるという簡略化した仮定を採用する。そのため、**干ばつリスクの指標は削除した**（この仮定の下ではモデル間の差別化につながらず、データと複雑性だけが増加するため）。

### 4.7 国およびプロバイダー別のPUE

信頼性が低下する4段階のカスケードを使用し、使用したレベルを追跡可能にする：

1. **measured**：AWS、Azure、GCPが特定の国/地域について公開している値。
2. **estimated**：地域間の補間（既知のPUEが公開されている地域内で、既知のデータセンターがない国）。
3. **regional**：集約された地域PUE（Asia-Pacific、EMEA…）。
4. **global**：プロバイダーの世界平均PUE（孤立した国）。

Ecologitsの一般的なPUE 1.20は `r_out` から**除外**し、この地理的PUEに置き換え、§2に従って1回だけ適用する。

### 4.8 国およびプロバイダー別のWUE

プロバイダーは**地域別**のWUEしか公開していない。各国を最も近いcloud地域に紐付ける；地域値が存在する場合（例：AWSのシンガポール 1.57 L/kWh）はそのまま使用し、存在しない場合は、**プロバイダーの世界平均**を主観的な調整なしで使用する。代入は公開データのみに基づくが、地域内の変動（冷却技術、設計）を隠してしまう。

### 4.9 モデルcatalogue

モデル/プロバイダーごとのローカルcatalogue：`P_tot`、`P_act`、`S_tokens`、基準国、`κ_in`、`κ_cache`、および `PUE`、`EF`、`WUE` の各係数。デフォルトで提案されるモデル：ChatGPT → 現在の小型モデル（サブスクリプションなし）、現在の大型モデル（サブスクリプションあり）；Mistral → 小型モデル（高速）、大型モデル（推論）。

---

## 5. Tokenのカウント

### 5.1 Tokenization

* デフォルト：**Tiktoken**をローカル（ブラウザWorker）で実行；テキストは送信されない。
* 失敗時のfallback：`T(テキスト) = 単語数 / 係数`、デフォルトの係数は**0.75** word/token（OpenAIを参照）、変更可能；単語は英数字以外の文字で分割する。
* `T(空テキスト) = 0`；推論が提供されない場合 = 0。メッセージに貼り付けられたtoolの結果は通常のテキストとして扱う。

### 5.2 交換 `i` のtoken構成

インデックスは**入力済みの交換**の順序に従う（完全に空のブロックは、システムプロンプトの場合も含めて無視する）。`M_i` はメッセージ、`R_i` は可視の推論、`C_i` は回答、`A_i` は交換 `i` に提供されたartifactの完全版。

```
A_prec(i) = i より前に提供されたartifactの最後の完全版（なければ空）
D_i       = A_i と A_prec(i) の差分において追加または変更された部分
            （最初のバージョンでは A_i 全体；artifactがない場合は空）

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

関連するルール：

* `S_tokens` は**最初の交換から**cacheのレートで処理される。
* 履歴には以前のartifactのバージョンやその差分は累積されない：最後の完全版のみがカウントされる。現在の交換のdiffは**出力**に入り、その完全版が次の参照となる。
* 同一バージョン → 出力のartifact tokenは0；削除だけの場合は出力tokenを追加しないため、最終的な影響を過小評価する。
* すべての履歴は**100% cache**にあると仮定する。

---

## 6. TokenあたりのITエネルギー

### 6.1 `r_out`：Ecologitsの物理モデル（Scope 3、固定TPS/TTFTを除外）

実際のハードウェアに基づく公開回帰；batchおよびtokenあたりの計算時間は、定数の決定論的関数として扱う（「固定TPS/TTFT」仮定）。

| 定数                                 |                            値 | 役割                                       |
| ---------------------------------- | ---------------------------: | ---------------------------------------- |
| `BATCH_SIZE`                       |                           64 | 並列で処理されるリクエスト                            |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | サーバーあたりのGPU                              |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | GPU以外のサーバー電力（CPU、RAM、電源、換気）、W            |
| `GPU_MEMORY_GB`                    |                           80 | GPUあたりのVRAM（A100/H100クラス）                |
| `QUANTIZATION_BITS`                |                           16 | weightあたりのbit数                           |
| `MEMORY_OVERHEAD`                  |                          1.2 | メモリ余裕（KV cache、activation、fragmentation） |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1.17e-6 / −1.12e-2 / 4.05e-5 | GPUエネルギー回帰                               |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6.78e-4 / 3.12e-4 / 1.94e-2 | latency回帰                                |

**方程式：**

```
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` および `r_cache`：価格による `r_out` へのアンカリング

```
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

したがって、これらは独立した再推定を行うことなく `P_act`/`P_tot` への依存性を引き継ぐ（方法論上の不均一性がない）。

### 6.3 物理的なprefillモデルではなくprice-basedを採用する理由（compute-bound vs memory-bound、検討後に除外）

1. **観測可能性**：クローズドモデルのprefillにおけるMFU、batchサイズ、ハードウェアは観測できない一方、decodingのlatencyは外部から測定できる；prefillの物理モデルは検証不能な仮定に依存することになるが、価格は公開され、日付があり、モデル固有である。
2. **スケーラビリティ**：catalogueは継続的に変化する；物理的な比率では、データがないままモデルごとにハードウェア効率を再calibrateする必要があるが、価格は発表ごとに更新される。
3. **反対方向のbiasを仮定し、個別には補正しない**：

   * cacheの価格は、おそらくそのエネルギーコストを**過大評価**する（memoryの読み出し、限界コストはほぼゼロ；価格はインフラの償却と商業的ロジックを反映する）→ `r_cache` に対する上方bias；
   * `r_out` はすべての出力tokenを同じコストとして扱うが、実際のコストはinputおよびすでに生成されたtokenの数（増大するKV-cache）とともに**増加**する → 長いcontextおよび長いcompletionを**過小評価**し、`r_in` および `r_out` に下方bias。

   multi-turn会話では、cache内の履歴に以前の出力が含まれるため、「cache」料金で課金される量が増加し、同程度の大きさの2つのbiasが**おおむね相殺**される。これは簡略化であり、誤差を排除するものではない。
4. クローズドモデルの `P_act` に対して、すでに観測可能なproxy（公開回帰）を使用しているという、この方法全体との**整合性**。

---

## 7. 影響：エネルギー、炭素、水

```
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(ホスティング国, プロバイダー)             [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(ホスティング国)                    [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(ホスティング国, プロバイダー)      [L]
```

---

## 8. 換算

### 8.1 電気式シャワー

流量15 L/min；18 → 38 °C（熱力学に基づく20 °Cの温度上昇）；0.0232 kWh/L ⇒ **0.348 kWh/min**。デフォルトパラメータ、変更可能。

```
carbon_shower_min = 流量 × 1リットルあたりのエネルギー × ユーザーのEF      [gCO₂e/min]
duration_minutes  = C / (0.348 × ユーザーのEF)
duration_seconds  = 60 × C / carbon_shower_min
```

* `EF_utilisateur` は**ユーザー**の国（検出または修正）。
* **炭素のみ**の比較；同等の水量は算出しない。

### 8.2 LED電球

会話による**電力消費量**を、LED電球の点灯時間として表現して比較する。

```
E_total   = Σ nrj_request(i)    [Wh]   最新の入力済み交換、PUEを含む
P_LED     = 5 W                 [W]    デフォルト、変更可能
duration_LED = E_total / P_LED     [h]    （秒：3 600 × E_total / P_LED）
```

* `P_LED` は厳密に正でなければならない；それ以外の場合、時間は計算できない。
* 炭素と水は対象外；`P_LED` は影響に関するいかなる方程式にも関与しない。
* 5 Wという値は説明用の慣例であり、測定値ではない。

---

## 9. 限界

### 9.1. 不確実性の欠如

結果は単一の点であるが、計算フローには非常にノイズの多い推定が連続している。そのため誤差が積み重なり、不確実性の範囲を除外することは、方法論が持っていない精度を表示することになる。
この不確実性は、教育目的で計算機を使用する場合には問題ではない。伝達すべきスキルは、すべて同じ測定方法を使用した実践の比較に基づいている。

### 9.2. 回帰 `P_act = f(P_tot)`

すべてのプロプライエタリモデルがMoEであると仮定している。これは、これほど多くのパラメータを持つdenseモデルは可能性が低いためである。しかし、そのうちの1つがdenseであれば、`P_act` は大幅に過小評価される。
この関数の指数型は、適合範囲外では発散する。一方、推定されたクローズドモデルは、ほとんどのオープンモデルよりも適合範囲を超えた位置にある。

### 9.3. 不可視の推論を除外

「reflection」モデルでは、隠された推論tokenが可視の回答を大幅に上回る可能性がある。それらを除外すると全体的な過小評価が生じ、比較において推論モデルが有利になる。ベストプラクティスでは注意喚起を行う。

### 9.4. 価格へのアンカリング

プロバイダーが価格を引き下げると `κ_in` が変化するが、物理的な変化はまったくない可能性がある。長いcontextに対する追加料金やbatch料金、priority料金も同じ問題を引き起こす。料金体系は、処理時のエネルギー消費量と相関していない可能性がある。

### 9.5. EF、PUE、WUEの選択

プライベートプロバイダーのモデルの所在地が不明であるため、これらの変数を推定することは困難である。

---

## 10. 出典

* Ember — Electricity generation yearly（`release_generation_yearly_global.csv`）；*Global Electricity Review 2025*（世界基準）。
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity*（01.me/research/ikp）；リポジトリ `19PINE-AI/ikp`（`configs/all_models.json`）。
* Hugging Face - IKPモデルの `P_act` 推定用の追加20モデル。
* Ecologits — 1 tokenのエネルギーコスト推定。
* OpenRouterおよびプロバイダーの公開料金表。
* リポジトリ `asgeirtj/system_prompts_leaks` - システムプロンプト。
* AWS（2025）、Azure（FY25）、Google Cloud（2024）のPUE/WUEに関する公開資料。
* プロジェクトのスクリプト：`analyze_moe_params.py`、`visualize_closed_model_params.py`。
