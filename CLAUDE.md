# CLAUDE.md - Thyroid Echo Report AI

## 專案概述

這是一個甲狀腺超音波報告 AI 結構化系統，將口述內容自動轉換為 ACR TI-RADS 2017 標準格式的 JSON 報告。

**核心功能**：語音輸入（Typeless/Voquill）→ 文字 → Google Apps Script API → Groq LLM → 結構化 JSON

## 技術架構

```
Frontend: Typeless / Voquill（外部語音輸入軟體）
Backend: Google Apps Script
LLM: Groq API (llama-3.1-70b-versatile / mixtral-8x7b-32768)
Output: JSON (ACR TI-RADS 2017 格式)
```

## 專案結構

```
Thyroid_echo/
├── gas/                          # Google Apps Script 專案（主要程式碼）
│   ├── Code.gs                   # 主 API 端點 (doGet/doPost)
│   ├── GroqService.gs            # Groq LLM API 整合
│   ├── TiRadsSchema.gs           # TI-RADS 計分邏輯與驗證
│   ├── PromptTemplates.gs        # LLM Prompt 模板與 Few-shot 範例
│   ├── MedicalDictionary.gs      # 醫學術語字典（中英對照）
│   └── appsscript.json           # GAS 設定檔
├── schemas/
│   └── tirads-report.schema.json # JSON Schema 定義
├── examples/
│   └── sample-transcripts.json   # 測試範例（8 個案例）
└── docs/
    └── API.md                    # 完整 API 文件
```

## ACR TI-RADS 2017 快速參考

### 計分項目
| 項目 | 代碼 | 有效分數 |
|------|------|----------|
| Composition | C | 0, 1, 2 |
| Echogenicity | E | 0, 1, 2, 3 |
| Shape | S | 0, 3 |
| Margin | M | 0, 2, 3 |
| Echogenic Foci | F | 0, 1, 2, 3 |

### 分類對照
- TR1: 0分 | TR2: 2分 | TR3: 3分 | TR4: 4-6分 | TR5: ≥7分

## 輸入格式

### 數字快速模式（推薦，不需 LLM）
```
右上 1.2 2 2 3 0 0
位置 尺寸 C E S M F
```

### 多結節（分號分隔）
```
右上 1.2 2 2 3 0 0; 左下 0.8 1 1 0 0 0
```

### 自然語言模式（需要 Groq LLM）
```
右側甲狀腺上極一點二公分結節，實質低回聲，高比寬，邊緣光滑，無鈣化
```

## 開發指南

### 程式碼規範
- Google Apps Script (V8 runtime)
- 使用 `const` 定義常數
- 函數使用 JSDoc 註解
- 錯誤處理使用 try-catch

### 重要函數
- `doPost(e)` - 主 API 端點
- `processNumericMode(input)` - 數字模式解析（本地，快速）
- `processNaturalMode(input)` - 自然語言模式（需 Groq API）
- `createNoduleAssessment(params)` - 建立結節評估結果
- `callGroqApi(systemPrompt, userMessage)` - 呼叫 Groq API

### 測試
- 執行 `testProcessReport()` 測試數字模式
- 執行 `testGroqConnection()` 測試 Groq API 連線

## 部署步驟

1. 複製 `gas/` 目錄下所有檔案到 Google Apps Script 專案
2. 設定 Script Properties: `GROQ_API_KEY`
3. 部署為網頁應用程式（執行身分：我，存取：任何人）

## 常見任務

### 新增術語對照
編輯 `MedicalDictionary.gs` 中的對照表：
- `ECHOGENICITY_TERMS` - 回音性
- `COMPOSITION_TERMS` - 成分
- `SHAPE_TERMS` - 形狀
- `MARGIN_TERMS` - 邊緣
- `ECHOGENIC_FOCI_TERMS` - 回音點

### 修改 Prompt
編輯 `PromptTemplates.gs`：
- `getStructuringPrompt()` - 主要結構化 Prompt
- `getFewShotExamples()` - Few-shot 範例

### 調整計分邏輯
編輯 `TiRadsSchema.gs`：
- `TIRADS_CATEGORIES` - 分類對照
- `getRecommendation()` - FNA 建議邏輯

## 使用 Ralph Loop 迭代優化

```bash
/ralph-loop "測試 sample-transcripts.json 中的所有範例，確保輸出符合預期。如有錯誤，修正 PromptTemplates.gs 或 MedicalDictionary.gs。輸出 <promise>COMPLETE</promise> 當所有測試通過。" --max-iterations 20 --completion-promise "COMPLETE"
```

## 注意事項

1. **Shape 分數只能是 0 或 3**（不是 1 或 2）
2. **Margin 分數只能是 0, 2, 3**（沒有 1）
3. 數字模式不需要 Groq API，可離線使用
4. 中文數字需經過 `normalizeInput()` 轉換
5. Groq API Key 儲存在 Script Properties，不要寫死在程式碼中

## 相關資源

- [ACR TI-RADS White Paper](https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/TI-RADS)
- [Groq API Documentation](https://console.groq.com/docs)
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [Voquill](https://github.com/josiahsrc/voquill) - 開源語音輸入軟體
