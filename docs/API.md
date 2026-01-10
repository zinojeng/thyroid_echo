# Thyroid Echo Report API 文件

## 概述

此 API 將甲狀腺超音波口述內容轉換為結構化的 ACR TI-RADS 2017 格式 JSON 報告。

## 端點

### GET /exec

測試 API 連線狀態。

**回應範例：**
```json
{
  "status": "ok",
  "message": "Thyroid Echo Report API is running",
  "version": "1.0.0"
}
```

### POST /exec

將口述文字轉換為結構化報告。

**請求格式：**
```json
{
  "input": "右上 1.2 2 2 3 0 0",
  "mode": "numeric",
  "options": {
    "model": "llama-3.1-70b-versatile"
  }
}
```

**參數說明：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| input | string | 是 | 口述文字內容 |
| mode | string | 否 | "numeric" 或 "natural"，不指定則自動偵測 |
| options.model | string | 否 | Groq 模型名稱（自然語言模式使用） |

## 輸入格式

### 數字快速模式（推薦）

格式：`位置 尺寸 C E S M F`

**位置代碼：**
- 右上、右中、右下、左上、左中、左下、峽部
- RU、RM、RL、LU、LM、LL、IS

**範例：**
```
右上 1.2 2 2 3 0 0
左下 0.8公分 1 1 0 0 0
峽部 1.5 2 3 0 2 3
```

**多個結節（以分號分隔）：**
```
右上 1.2 2 2 3 0 0; 左下 0.8 1 1 0 0 0
```

### 自然語言模式

直接使用口語描述，系統會透過 LLM 解析。

**範例：**
```
右側甲狀腺上極有一個一點二公分的結節，實質性，低回聲，高比寬，邊緣光滑，無鈣化
```

## ACR TI-RADS 2017 計分表

### Composition (C) - 成分
| 分數 | 描述 |
|------|------|
| 0 | 囊性/海綿狀 |
| 1 | 混合性 |
| 2 | 實質性 |

### Echogenicity (E) - 回音性
| 分數 | 描述 |
|------|------|
| 0 | 無回音 |
| 1 | 等/高回音 |
| 2 | 低回音 |
| 3 | 極低回音 |

### Shape (S) - 形狀
| 分數 | 描述 |
|------|------|
| 0 | 寬 > 高 |
| 3 | 高 > 寬 |

### Margin (M) - 邊緣
| 分數 | 描述 |
|------|------|
| 0 | 光滑/模糊 |
| 2 | 分葉/不規則 |
| 3 | 甲狀腺外延伸 |

### Echogenic Foci (F) - 回音點
| 分數 | 描述 |
|------|------|
| 0 | 無/彗星尾 |
| 1 | 粗鈣化 |
| 2 | 邊緣鈣化 |
| 3 | 點狀鈣化 |

## TI-RADS 分類與建議

| 分類 | 總分 | FNA 建議 | 追蹤建議 |
|------|------|----------|----------|
| TR1 | 0 | 不需要 | 不需要 |
| TR2 | 2 | 不需要 | 不需要 |
| TR3 | 3 | ≥2.5cm | ≥1.5cm |
| TR4 | 4-6 | ≥1.5cm | ≥1.0cm |
| TR5 | ≥7 | ≥1.0cm | ≥0.5cm |

## 回應格式

**成功回應：**
```json
{
  "success": true,
  "nodules": [
    {
      "id": 1,
      "location": "right upper",
      "size_cm": 1.2,
      "tirads": {
        "C": 2,
        "E": 2,
        "S": 3,
        "M": 0,
        "F": 0,
        "total": 7,
        "category": "TR5"
      },
      "recommendation": "FNA recommended (TR5, ≥1cm)"
    }
  ],
  "impression": "TR5 nodule at right upper (1.2cm).",
  "recommendation": "FNA recommended (TR5, ≥1cm)",
  "metadata": {
    "mode": "numeric",
    "processed_at": "2026-01-10T12:00:00.000Z",
    "api_version": "1.0.0"
  }
}
```

**錯誤回應：**
```json
{
  "success": false,
  "error": "Invalid Shape score: 4. Must be 0 or 3."
}
```

## 部署步驟

1. 在 Google Apps Script 建立新專案
2. 將 `gas/` 目錄下的所有 `.gs` 檔案複製到專案中
3. 設定 Groq API Key：
   - 執行 `setApiKey()` 函數
   - 或在「專案設定」→「指令碼屬性」中新增 `GROQ_API_KEY`
4. 部署為網頁應用程式：
   - 「部署」→「新增部署」→「網頁應用程式」
   - 執行身分：「我」
   - 存取權限：「任何人」

## 使用 curl 測試

```bash
# 測試連線
curl -X GET "YOUR_DEPLOYMENT_URL"

# 數字模式
curl -X POST "YOUR_DEPLOYMENT_URL" \
  -H "Content-Type: application/json" \
  -d '{"input": "右上 1.2 2 2 3 0 0"}'

# 自然語言模式
curl -X POST "YOUR_DEPLOYMENT_URL" \
  -H "Content-Type: application/json" \
  -d '{"input": "右側甲狀腺上極一點二公分結節，實質低回聲，高比寬"}'
```

## 整合 Typeless/Voquill

1. 設定語音輸入軟體輸出文字
2. 透過 HTTP POST 傳送到此 API
3. 接收結構化 JSON 回應

**整合範例（JavaScript）：**
```javascript
async function structureReport(transcript) {
  const response = await fetch('YOUR_DEPLOYMENT_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: transcript })
  });
  return await response.json();
}
```

## 版本歷史

- **1.0.0** (2026-01-10): 初始版本
  - 支援數字快速模式
  - 支援自然語言模式（Groq LLM）
  - ACR TI-RADS 2017 完整計分邏輯
