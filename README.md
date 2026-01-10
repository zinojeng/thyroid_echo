# Thyroid Echo Report AI

甲狀腺超音波報告 AI 結構化系統 - 將口述內容自動轉換為 ACR TI-RADS 2017 標準格式

## 功能特色

- **數字快速輸入模式**：`右上 1.2 2 2 3 0 0` → 結構化 JSON
- **自然語言模式**：支援中英文口語描述，透過 Groq LLM 解析
- **完整 TI-RADS 計分**：自動計算總分、分類、FNA 建議
- **Google Apps Script API**：可整合到任何系統

## 專案結構

```
Thyroid_echo/
├── gas/                          # Google Apps Script 專案
│   ├── Code.gs                   # 主 API 端點
│   ├── GroqService.gs            # Groq LLM API 整合
│   ├── TiRadsSchema.gs           # TI-RADS 計分邏輯
│   ├── PromptTemplates.gs        # LLM Prompt 模板
│   ├── MedicalDictionary.gs      # 醫學術語字典
│   └── appsscript.json           # GAS 設定檔
├── schemas/
│   └── tirads-report.schema.json # JSON Schema 定義
├── examples/
│   └── sample-transcripts.json   # 測試範例
└── docs/
    └── API.md                    # 完整 API 文件
```

## 快速開始

### 1. 部署到 Google Apps Script

1. 前往 [script.google.com](https://script.google.com)
2. 建立新專案
3. 將 `gas/` 目錄下所有 `.gs` 檔案內容複製到專案中
4. 設定 Groq API Key（專案設定 → 指令碼屬性 → `GROQ_API_KEY`）
5. 部署為網頁應用程式

### 2. 使用 API

**數字快速模式：**
```bash
curl -X POST "YOUR_DEPLOYMENT_URL" \
  -H "Content-Type: application/json" \
  -d '{"input": "右上 1.2 2 2 3 0 0"}'
```

**回應：**
```json
{
  "success": true,
  "nodules": [{
    "location": "right upper",
    "size_cm": 1.2,
    "tirads": {"C": 2, "E": 2, "S": 3, "M": 0, "F": 0, "total": 7, "category": "TR5"}
  }],
  "recommendation": "FNA recommended (TR5, ≥1cm)"
}
```

## 輸入格式

### 數字快速模式（推薦）

```
位置 尺寸 C E S M F
```

| 欄位 | 說明 | 範例 |
|------|------|------|
| 位置 | 右上/右中/右下/左上/左中/左下/峽部 | 右上 |
| 尺寸 | 公分 | 1.2 |
| C | Composition: 0/1/2 | 2 |
| E | Echogenicity: 0/1/2/3 | 2 |
| S | Shape: 0/3 | 3 |
| M | Margin: 0/2/3 | 0 |
| F | Foci: 0/1/2/3 | 0 |

### 多個結節

```
右上 1.2 2 2 3 0 0; 左下 0.8 1 1 0 0 0
```

## ACR TI-RADS 2017 計分表

| 項目 | 0分 | 1分 | 2分 | 3分 |
|------|-----|-----|-----|-----|
| C 成分 | 囊性/海綿狀 | 混合 | 實質 | - |
| E 回音 | 無回音 | 等/高回音 | 低回音 | 極低回音 |
| S 形狀 | 寬>高 | - | - | 高>寬 |
| M 邊緣 | 光滑/模糊 | - | 分葉/不規則 | 甲狀腺外延伸 |
| F 鈣化 | 無 | 粗鈣化 | 邊緣鈣化 | 點狀鈣化 |

**分類**：TR1(0分), TR2(2分), TR3(3分), TR4(4-6分), TR5(≥7分)

## 整合 Typeless/Voquill

1. 語音輸入軟體輸出文字
2. 傳送到此 API
3. 接收結構化 JSON

## 技術架構

```
Typeless/Voquill → 文字 → Google Apps Script → Groq LLM → JSON
```

## 授權

MIT License
