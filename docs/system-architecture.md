# Thyroid Echo Report 系統架構說明

## 一、系統概述

**Thyroid Echo Report** 是一個將甲狀腺超音波口述報告自動轉換為 ACR TI-RADS 2017 標準格式的 AI 系統。

### 核心價值
- 將非結構化的語音/文字描述轉換為結構化 JSON 報告
- 自動計算 TI-RADS 分數與分類 (TR1-TR5)
- 依據 ACR 標準提供 FNA 建議
- 支援多種輸入格式，無需學習特定語法

---

## 二、系統架構圖

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              使用者介面層                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │   Typeless  │    │   Voquill   │    │  Web Speech │                    │
│   │  (語音輸入)  │    │  (語音輸入)  │    │    API      │                    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│          │                  │                  │                            │
│          └──────────────────┼──────────────────┘                            │
│                             ▼                                               │
│                    ┌─────────────────┐                                      │
│                    │   文字輸入框     │                                      │
│                    │  (WebApp.html)  │                                      │
│                    └────────┬────────┘                                      │
│                             │                                               │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Google Apps Script 後端                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        Code.gs - 主控制器                            │   │
│   │                                                                     │   │
│   │   doGet(e) ──────► 返回 WebApp.html                                 │   │
│   │   doPost(e) ─────► 處理 API 請求                                    │   │
│   │   processReportFromWeb() ──► 處理 WebApp 請求                       │   │
│   │                                                                     │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    detectInputModeExtended()                        │   │
│   │                        輸入模式偵測器                                 │   │
│   │                                                                     │   │
│   │   輸入文字 ──────────────────────────────────────────────────────►  │   │
│   │                              │                                      │   │
│   │              ┌───────────────┼───────────────┐                      │   │
│   │              ▼               ▼               ▼                      │   │
│   │         isMixedInput    isLobeInput    detectInputMode              │   │
│   │              │               │               │                      │   │
│   │              ▼               ▼               ▼                      │   │
│   │           mixed           lobe      numeric/tirads_code/natural     │   │
│   │                                                                     │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         模式處理器                                   │   │
│   │                                                                     │   │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │   │
│   │   │ Numeric   │  │ TIRADS    │  │   Lobe    │  │    Mixed      │   │   │
│   │   │  Mode     │  │Code Mode  │  │   Mode    │  │    Mode       │   │   │
│   │   │           │  │           │  │           │  │               │   │   │
│   │   │ 右上 1.2  │  │ TIRADS    │  │ 右葉大小  │  │ 葉描述 +      │   │   │
│   │   │ 2 2 3 0 0 │  │ 20033     │  │ 2x1x3     │  │ 結節描述      │   │   │
│   │   │           │  │           │  │ 均質 正常 │  │               │   │   │
│   │   │ 本地解析  │  │ 本地解析  │  │ 本地解析  │  │ 本地解析      │   │   │
│   │   │ 無需 LLM  │  │ 無需 LLM  │  │ 無需 LLM  │  │ 可能需 LLM    │   │   │
│   │   └───────────┘  └───────────┘  └───────────┘  └───────────────┘   │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                     Natural Mode                             │   │   │
│   │   │                                                             │   │   │
│   │   │   「右側甲狀腺上極一點二公分結節，實質低回聲...」            │   │   │
│   │   │                                                             │   │   │
│   │   │   需要 LLM API (Groq/OpenAI/Gemini)                         │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                   MedicalDictionary.gs - 醫學術語字典                │   │
│   │                                                                     │   │
│   │   ECHOGENICITY_TERMS ──► 回音性 (anechoic/hypoechoic/isoechoic)    │   │
│   │   COMPOSITION_TERMS ───► 成分 (cystic/solid/mixed)                 │   │
│   │   SHAPE_TERMS ─────────► 形狀 (taller-than-wide/wider-than-tall)   │   │
│   │   MARGIN_TERMS ────────► 邊緣 (smooth/irregular/extrathyroidal)    │   │
│   │   ECHOGENIC_FOCI_TERMS ► 鈣化 (none/comet-tail/macrocalcification) │   │
│   │   THYROID_DIAGNOSIS_TERMS ► 疾病 (Hashimoto's/Graves'/etc.)        │   │
│   │                                                                     │   │
│   │   normalizeInput() ────► 正規化輸入（數字轉換、單位統一）           │   │
│   │   normalizeApostrophe() ► 統一引號字元                              │   │
│   │   parseThyroidDiagnoses() ► 解析疾病診斷                            │   │
│   │                                                                     │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                   TiRadsSchema.gs - TI-RADS 計分邏輯                 │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                    ACR TI-RADS 計分表                        │   │   │
│   │   │                                                             │   │   │
│   │   │   Composition (C): 0=cystic/spongiform, 1=mixed, 2=solid    │   │   │
│   │   │   Echogenicity(E): 0=anechoic, 1=hyper/iso, 2=hypo, 3=very  │   │   │
│   │   │   Shape (S):       0=wider-than-tall, 3=taller-than-wide    │   │   │
│   │   │   Margin (M):      0=smooth, 2=irregular, 3=extrathyroidal  │   │   │
│   │   │   Echogenic Foci:  0=none, 1=comet-tail, 2=macro, 3=punctate│   │   │
│   │   │                                                             │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                    TI-RADS 分類對照                          │   │   │
│   │   │                                                             │   │   │
│   │   │   TR1 (Benign):      0 分                                   │   │   │
│   │   │   TR2 (Not Suspicious): 2 分                                │   │   │
│   │   │   TR3 (Mildly Suspicious): 3 分                             │   │   │
│   │   │   TR4 (Moderately Suspicious): 4-6 分                       │   │   │
│   │   │   TR5 (Highly Suspicious): ≥7 分                            │   │   │
│   │   │                                                             │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   │   getRecommendation(category, size_cm) ──► FNA 建議                 │   │
│   │                                                                     │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                   GroqService.gs - LLM API 整合                      │   │
│   │                                                                     │   │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │   │
│   │   │    Groq     │    │   OpenAI    │    │   Gemini    │            │   │
│   │   │  (xai-xxx)  │    │  (sk-xxx)   │    │  (AIxxx)    │            │   │
│   │   │             │    │             │    │             │            │   │
│   │   │ llama-3.1   │    │ gpt-4o-mini │    │gemini-2.0   │            │   │
│   │   │ -70b        │    │             │    │-flash       │            │   │
│   │   └─────────────┘    └─────────────┘    └─────────────┘            │   │
│   │                                                                     │   │
│   │   callGroqApi(systemPrompt, userMessage) ──► 呼叫 LLM               │   │
│   │   detectProvider(apiKey) ──► 自動偵測 API 提供者                    │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              輸出結果                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         JSON 結構化報告                              │   │
│   │                                                                     │   │
│   │   {                                                                 │   │
│   │     "success": true,                                                │   │
│   │     "type": "mixed_report",                                         │   │
│   │     "lobes": {                                                      │   │
│   │       "rightLobe": { dimensions, echogenicity, vascularity },       │   │
│   │       "leftLobe": { dimensions, echogenicity, vascularity }         │   │
│   │     },                                                              │   │
│   │     "nodules": [                                                    │   │
│   │       {                                                             │   │
│   │         "id": 1,                                                    │   │
│   │         "location": "right",                                        │   │
│   │         "size_cm": 1.2,                                             │   │
│   │         "dimensions": { length, width, height },                    │   │
│   │         "tirads": {                                                 │   │
│   │           "composition": { score: 2, description: "Solid" },        │   │
│   │           "echogenicity": { score: 2, description: "Hypoechoic" },  │   │
│   │           "shape": { score: 0, description: "Wider-than-tall" },    │   │
│   │           "margin": { score: 0, description: "Smooth" },            │   │
│   │           "echogenicFoci": { score: 3, description: "Punctate" },   │   │
│   │           "total": 7,                                               │   │
│   │           "category": "TR5"                                         │   │
│   │         },                                                          │   │
│   │         "recommendation": "FNA recommended (≥1.0 cm)"               │   │
│   │       }                                                             │   │
│   │     ],                                                              │   │
│   │     "diagnoses": ["Graves' disease"],                               │   │
│   │     "impression": "1) Right lobe: ... 2) Nodule 1: TR5 ..."         │   │
│   │   }                                                                 │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、資料處理流程

### 3.1 輸入模式識別流程

```
輸入文字
    │
    ▼
┌─────────────────┐
│ isMixedInput()  │ ─── 同時包含葉描述 + 結節描述？
└────────┬────────┘
         │
    Yes  │  No
    ┌────┴────┐
    ▼         ▼
 mixed    ┌─────────────────┐
          │  isLobeInput()  │ ─── 只有葉描述？
          └────────┬────────┘
                   │
              Yes  │  No
              ┌────┴────┐
              ▼         ▼
           lobe    ┌─────────────────┐
                   │ detectInputMode │
                   └────────┬────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
      TIRADS XXXXX?    數字模式?        自然語言
           │                │                │
           ▼                ▼                ▼
      tirads_code       numeric          natural
```

### 3.2 TI-RADS 計分流程

```
結節特徵輸入
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                    特徵評分                              │
│                                                         │
│   Composition ───────────────────────────────► C分數    │
│   (成分：囊性/混合/實質)                      (0/1/2)   │
│                                                         │
│   Echogenicity ──────────────────────────────► E分數    │
│   (回音性：無回音/等回音/低回音/極低回音)    (0/1/2/3)  │
│                                                         │
│   Shape ─────────────────────────────────────► S分數    │
│   (形狀：寬>高/高>寬)                        (0/3)      │
│                                                         │
│   Margin ────────────────────────────────────► M分數    │
│   (邊緣：光滑/不規則/甲狀腺外侵犯)           (0/2/3)    │
│                                                         │
│   Echogenic Foci ────────────────────────────► F分數    │
│   (鈣化：無/彗星尾/粗鈣化/微鈣化)            (0/1/2/3)  │
│                                                         │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
                 總分 = C + E + S + M + F
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    TI-RADS 分類                          │
│                                                         │
│   總分 0   ──────────────────────────────► TR1 (良性)   │
│   總分 2   ──────────────────────────────► TR2 (不疑)   │
│   總分 3   ──────────────────────────────► TR3 (輕疑)   │
│   總分 4-6 ──────────────────────────────► TR4 (中疑)   │
│   總分 ≥7  ──────────────────────────────► TR5 (高疑)   │
│                                                         │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    FNA 建議                              │
│                                                         │
│   TR1 ─────────────────────────────────► 不需 FNA       │
│   TR2 ─────────────────────────────────► 不需 FNA       │
│   TR3 + ≥2.5cm ────────────────────────► FNA 建議       │
│   TR4 + ≥1.5cm ────────────────────────► FNA 建議       │
│   TR5 + ≥1.0cm ────────────────────────► FNA 建議       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 四、輸入格式範例

### 4.1 數字快速模式 (Numeric Mode)
```
格式：位置 尺寸 C E S M F

範例：
右上 1.2 2 2 3 0 0
│    │   │ │ │ │ └── F: 無回音點 (0分)
│    │   │ │ │ └──── M: 邊緣光滑 (0分)
│    │   │ │ └────── S: 高比寬 (3分)
│    │   │ └──────── E: 低回音 (2分)
│    │   └────────── C: 實質 (2分)
│    └────────────── 尺寸: 1.2 cm
└─────────────────── 位置: 右上極

總分: 2+2+3+0+0 = 7 → TR5
```

### 4.2 TIRADS 代碼模式 (TIRADS Code Mode)
```
格式：位置描述，尺寸，TIRADS CESΜF

範例：
右側甲狀腺結節 1.2x1.0x0.8，TIRADS 22300
                              │││││
                              ││││└── F: 無回音點 (0分)
                              │││└─── M: 邊緣光滑 (0分)
                              ││└──── S: 高比寬 (3分)
                              │└───── E: 低回音 (2分)
                              └────── C: 實質 (2分)
```

### 4.3 葉描述模式 (Lobe Mode)
```
範例：
右葉大小：2 × 1 × 3 cm，Homogeneous，血流正常
左葉大小：1.8 × 0.9 × 2.5 cm，Heterogeneous，血流過多

輸出：
- 右葉: 3.14 mL, Homogeneous echotexture, Normal vascularity
- 左葉: 2.12 mL, Heterogeneous echotexture, Increased vascularity
```

### 4.4 混合模式 (Mixed Mode)
```
範例：
右側甲狀腺大小是 2 × 1 × 3，Hypoechoic，血流很高
左側甲狀腺大小也是 2 × 1 × 3，Isoechoic，血流正常
右側有一顆結節，大小為 1x2x3，TI-RADS 20033
左側也有一個結節，大小是 1x2x3，TI-RADS 20001
Graves' disease

輸出：
- 葉描述 (Right/Left lobe)
- 結節 TI-RADS 評估
- 疾病診斷
- 綜合 Impression
```

### 4.5 自然語言模式 (Natural Mode)
```
範例：
右側甲狀腺上極一點二公分結節，實質成分，低回音，高比寬，
邊緣光滑，可見點狀鈣化

系統會使用 LLM 解析並轉換為結構化報告
```

---

## 五、支援的疾病診斷

| 中文名稱 | 英文名稱 |
|---------|---------|
| 橋本氏甲狀腺炎 | Hashimoto's thyroiditis |
| 葛瑞夫氏病 | Graves' disease |
| 亞急性甲狀腺炎 | Subacute (de Quervain) thyroiditis |
| 無痛性甲狀腺炎 | Painless (silent) thyroiditis |
| 產後甲狀腺炎 | Postpartum thyroiditis |
| 急性化膿性甲狀腺炎 | Acute suppurative thyroiditis |
| 多結節性甲狀腺腫 | Multinodular goiter |
| 瀰漫性甲狀腺腫 | Diffuse goiter |
| 原發性甲狀腺淋巴瘤 | Primary thyroid lymphoma |
| Riedel 甲狀腺炎 | Riedel's thyroiditis |
| 甲狀腺膿瘍 | Thyroid abscess |
| 藥物性甲狀腺炎 | Drug-induced thyroiditis |

---

## 六、檔案結構

```
Thyroid_echo/
├── gas/                           # Google Apps Script 專案
│   ├── Code.gs                    # 主控制器、API 端點
│   ├── MedicalDictionary.gs       # 醫學術語字典、輸入解析
│   ├── TiRadsSchema.gs            # TI-RADS 計分邏輯
│   ├── GroqService.gs             # LLM API 整合
│   ├── LLMProviders.gs            # 多 LLM 提供者支援
│   ├── PromptTemplates.gs         # LLM Prompt 模板
│   ├── WebApp.html                # 前端介面
│   └── appsscript.json            # GAS 設定
├── chrome-extension/              # Chrome 擴充功能
│   └── popup.js                   # 擴充功能邏輯
├── schemas/                       # JSON Schema 定義
│   └── tirads-report.schema.json
├── examples/                      # 測試範例
│   └── sample-transcripts.json
└── docs/                          # 文件
    ├── API.md
    ├── v1.6-development-log.md
    └── system-architecture.md     # 本文件
```

---

## 七、部署資訊

- **GitHub**: https://github.com/zinojeng/thyroid_echo
- **GAS Web App**: https://script.google.com/macros/s/AKfycby43fc-LNWdWaiVKLNzV6FbfZRg1nUA0rVBBUjzXZxg03Nc94O2ppm_J3L_s6lPVZwD/exec
- **目前版本**: v1.6.4

---

## 八、技術規格

| 項目 | 規格 |
|------|------|
| 後端 | Google Apps Script (V8 Runtime) |
| 前端 | HTML5 + Vanilla JavaScript |
| 語音識別 | Web Speech API |
| LLM 支援 | Groq (Llama 3.1), OpenAI (GPT-4o-mini), Google Gemini |
| 輸出格式 | JSON |
| 標準規範 | ACR TI-RADS 2017 |
