/**
 * LLM 服務提供者
 * 支援 xAI Grok、OpenAI、Google Gemini
 */

// 各服務提供者設定（三個主要提供者）
const LLM_PROVIDERS = {
  // xAI Grok（推薦：速度快、推理能力強、CP值最高）
  grok: {
    name: 'xAI Grok',
    apiUrl: 'https://api.x.ai/v1/chat/completions',
    models: {
      default: 'grok-4-1-fast-reasoning',  // 快速推理，CP值最高
      fast: 'grok-4-1-fast-reasoning',
      quality: 'grok-4'
    },
    keyPrefix: 'xai-'
  },
  // OpenAI（品質穩定）
  openai: {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    models: {
      default: 'gpt-4o-mini',      // 最經濟：$0.15/1M input
      fast: 'gpt-4o-mini',
      quality: 'gpt-4o'
    },
    keyPrefix: 'sk-'
  },
  // Google Gemini（免費額度最高）
  gemini: {
    name: 'Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    models: {
      default: 'gemini-3-flash-preview',  // 最新版本
      fast: 'gemini-3-flash-preview',
      quality: 'gemini-2.0-pro'
    },
    keyPrefix: 'AI'
  }
};

/**
 * 自動偵測 API Key 對應的服務提供者
 * @param {string} apiKey - API Key
 * @returns {string} 服務提供者名稱 ('grok', 'openai', 'gemini')
 */
function detectProvider(apiKey) {
  if (!apiKey) return null;

  if (apiKey.startsWith('xai-')) return 'grok';
  if (apiKey.startsWith('sk-')) return 'openai';
  if (apiKey.startsWith('AI')) return 'gemini';

  // 預設使用 Grok（CP值最高）
  return 'grok';
}

/**
 * 呼叫 LLM API（統一介面）
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @param {Object} options - 選項 (api_key, provider, model)
 * @returns {Object} Parsed JSON response
 */
function callLLMApi(systemPrompt, userMessage, options = {}) {
  const apiKey = options.api_key;
  if (!apiKey) {
    throw new Error('Missing API Key. Please provide "api_key" in your request.');
  }

  // 自動偵測或使用指定的服務提供者
  const providerName = options.provider || detectProvider(apiKey);
  const provider = LLM_PROVIDERS[providerName];

  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}. Supported: grok, openai, gemini`);
  }

  // 根據服務提供者呼叫對應的 API
  switch (providerName) {
    case 'grok':
    case 'openai':
      return callOpenAICompatibleApi(provider, apiKey, systemPrompt, userMessage, options);
    case 'gemini':
      return callGeminiApi(provider, apiKey, systemPrompt, userMessage, options);
    default:
      throw new Error(`Provider ${providerName} not implemented`);
  }
}

/**
 * 呼叫 OpenAI 相容 API（Groq, OpenAI）
 */
function callOpenAICompatibleApi(provider, apiKey, systemPrompt, userMessage, options) {
  const model = options.model || provider.models.default;

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature || 0.1,
    response_format: { type: 'json_object' }
  };

  const requestOptions = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(provider.apiUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode !== 200) {
      console.error(`${provider.name} API error: ${statusCode} - ${responseText}`);
      throw new Error(`${provider.name} API returned status ${statusCode}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    const content = result.choices[0].message.content;

    // 使用強健的 JSON 解析
    return robustJsonParse(content);

  } catch (error) {
    console.error(`${provider.name} API call failed:`, error);
    throw error;
  }
}

/**
 * 強健的 JSON 解析函數（處理 LLM 回傳的各種格式問題）
 * @param {string} content - LLM 回傳的文字內容
 * @returns {Object} 解析後的 JSON 物件
 */
function robustJsonParse(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Empty or invalid content');
  }

  const errors = [];

  // 1. 先嘗試直接解析
  try {
    return JSON.parse(content);
  } catch (e) {
    errors.push(`Direct parse: ${e.message}`);
  }

  // 2. 移除 markdown 代碼區塊標記和前後空白
  let cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    errors.push(`After markdown removal: ${e.message}`);
  }

  // 3. 找到最外層的 JSON 物件（使用括號配對）
  const jsonStr = extractJsonObject(cleaned);
  if (jsonStr) {
    // 3a. 嘗試直接解析提取的 JSON
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      errors.push(`Extracted JSON: ${e.message}`);
    }

    // 3b. 嘗試修復並解析
    const fixed = fixJsonString(jsonStr);
    try {
      return JSON.parse(fixed);
    } catch (e) {
      errors.push(`Fixed JSON: ${e.message}`);
    }
  }

  // 4. 嘗試處理截斷的 JSON（補上缺失的括號）
  const completed = tryCompleteJson(cleaned);
  if (completed) {
    try {
      return JSON.parse(completed);
    } catch (e) {
      errors.push(`Completed JSON: ${e.message}`);
    }
  }

  // 5. 最後嘗試：清理特殊字元
  const sanitized = cleaned
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')  // 移除控制字元（保留換行和tab）
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const sanitizedJson = extractJsonObject(sanitized);
  if (sanitizedJson) {
    try {
      return JSON.parse(fixJsonString(sanitizedJson));
    } catch (e) {
      errors.push(`Sanitized JSON: ${e.message}`);
    }
  }

  // 記錄所有錯誤以便除錯
  console.error('robustJsonParse failed. Errors:', errors.join('; '));
  console.error('Original content length:', content.length);
  console.error('Content preview:', content.substring(0, 500));

  throw new Error(`Unable to parse JSON. Errors: ${errors.slice(-2).join('; ')}. Content preview: ${content.substring(0, 100)}...`);
}

/**
 * 使用括號配對提取最外層的 JSON 物件
 * @param {string} str - 輸入字串
 * @returns {string|null} 提取的 JSON 字串
 */
function extractJsonObject(str) {
  const start = str.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < str.length; i++) {
    const char = str[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          return str.substring(start, i + 1);
        }
      }
    }
  }

  // 如果沒有找到配對的結束括號，返回從開始到結尾
  return str.substring(start);
}

/**
 * 修復常見的 JSON 格式問題
 * @param {string} jsonStr - JSON 字串
 * @returns {string} 修復後的 JSON 字串
 */
function fixJsonString(jsonStr) {
  let fixed = jsonStr;

  // 移除尾部逗號
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // 為未加引號的屬性名加上引號（更精確的正則）
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

  // 修復單引號（只在不在雙引號內時）
  // 這個比較複雜，簡單處理：如果整個字串沒有雙引號，則轉換單引號
  if (!fixed.includes('"')) {
    fixed = fixed.replace(/'/g, '"');
  }

  return fixed;
}

/**
 * 嘗試補完截斷的 JSON
 * @param {string} str - 可能不完整的 JSON 字串
 * @returns {string|null} 補完的 JSON 字串
 */
function tryCompleteJson(str) {
  const start = str.indexOf('{');
  if (start === -1) return null;

  let jsonStr = str.substring(start);

  // 計算缺少的括號
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
  }

  // 如果在字串內結束，先關閉字串
  if (inString) {
    jsonStr += '"';
  }

  // 補上缺少的括號
  while (bracketCount > 0) {
    jsonStr += ']';
    bracketCount--;
  }
  while (braceCount > 0) {
    jsonStr += '}';
    braceCount--;
  }

  return jsonStr;
}

/**
 * 呼叫 Gemini API
 */
function callGeminiApi(provider, apiKey, systemPrompt, userMessage, options) {
  const model = options.model || provider.models.default;
  const apiUrl = provider.apiUrl.replace('{model}', model) + `?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `${systemPrompt}\n\n---\n\n${userMessage}` }
        ]
      }
    ],
    generationConfig: {
      temperature: options.temperature || 0.1,
      maxOutputTokens: options.maxTokens || 1024,
      responseMimeType: 'application/json'
    }
  };

  const requestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode !== 200) {
      console.error(`Gemini API error: ${statusCode} - ${responseText}`);
      throw new Error(`Gemini API returned status ${statusCode}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    const content = result.candidates[0].content.parts[0].text;

    // 使用強健的 JSON 解析
    return robustJsonParse(content);

  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

/**
 * 呼叫 Gemini Audio API（語音轉文字 + 結構化）
 * @param {string} audioBase64 - Base64 編碼的音訊資料
 * @param {string} mimeType - 音訊 MIME 類型 (audio/wav, audio/mp3, audio/webm 等)
 * @param {string} prompt - 處理提示
 * @param {Object} options - 選項 (api_key, model)
 * @returns {Object} 結果 { transcript, structured }
 */
function callGeminiAudioApi(audioBase64, mimeType, prompt, options = {}) {
  const apiKey = options.api_key;
  if (!apiKey) {
    throw new Error('Missing Gemini API Key for audio processing.');
  }

  const model = options.model || 'gemini-2.0-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 建立音訊處理請求（不使用 responseMimeType，改用手動解析）
  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: audioBase64
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };

  const requestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode !== 200) {
      console.error(`Gemini Audio API error: ${statusCode} - ${responseText}`);
      throw new Error(`Gemini Audio API returned status ${statusCode}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    const content = result.candidates[0].content.parts[0].text;

    // 使用強健的 JSON 解析
    return robustJsonParse(content);

  } catch (error) {
    console.error('Gemini Audio API call failed:', error);
    throw error;
  }
}

/**
 * 解析 Gemini 回傳的 JSON 內容（處理各種格式）
 * @param {string} content - Gemini 回傳的文字內容
 * @returns {Object} 解析後的 JSON 物件
 */
function parseGeminiJsonResponse(content) {
  if (!content || typeof content !== 'string') {
    return { transcript: '' };
  }

  // 1. 先嘗試直接解析
  try {
    return JSON.parse(content);
  } catch (e) {
    // 繼續嘗試其他方法
  }

  // 2. 移除 markdown 代碼區塊標記
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 繼續嘗試其他方法
  }

  // 3. 嘗試提取 JSON 物件 {...}
  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch (e) {
      // 繼續嘗試其他方法
    }
  }

  // 4. 嘗試提取 transcript 欄位
  const transcriptMatch = content.match(/"transcript"\s*:\s*"([^"]*)"/);
  if (transcriptMatch) {
    return { transcript: transcriptMatch[1] };
  }

  // 5. 如果都失敗，將整個內容作為 transcript
  // 移除 JSON 相關的格式標記
  const plainText = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/^\s*\{\s*"transcript"\s*:\s*"/i, '')
    .replace(/"\s*\}\s*$/i, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .trim();

  return { transcript: plainText || content };
}

/**
 * 使用 Gemini Audio API 進行純語音轉錄（不進行結構化）
 * @param {string} audioBase64 - Base64 編碼的音訊資料
 * @param {string} mimeType - 音訊 MIME 類型
 * @param {Object} options - 選項 (api_key, model)
 * @returns {string} 轉錄文字
 */
function transcribeWithGeminiAudio(audioBase64, mimeType, options = {}) {
  const prompt = getTranscriptionPrompt();
  const result = callGeminiAudioApiPlainText(audioBase64, mimeType, prompt, options);
  return result;
}

/**
 * 呼叫 Gemini Audio API（回傳純文字，不要求 JSON）
 * @param {string} audioBase64 - Base64 編碼的音訊資料
 * @param {string} mimeType - 音訊 MIME 類型
 * @param {string} prompt - 處理提示
 * @param {Object} options - 選項 (api_key, model)
 * @returns {string} 轉錄的純文字
 */
function callGeminiAudioApiPlainText(audioBase64, mimeType, prompt, options = {}) {
  const apiKey = options.api_key;
  if (!apiKey) {
    throw new Error('Missing Gemini API Key for audio processing.');
  }

  const model = options.model || 'gemini-2.0-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: audioBase64
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };

  const requestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode !== 200) {
      console.error(`Gemini Audio API error: ${statusCode} - ${responseText}`);
      throw new Error(`Gemini Audio API returned status ${statusCode}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    const content = result.candidates[0].content.parts[0].text;

    // 直接回傳文字，不嘗試解析 JSON
    return content.trim();

  } catch (error) {
    console.error('Gemini Audio API call failed:', error);
    throw error;
  }
}

/**
 * 取得語音轉錄的 Prompt（包含醫學術語提示）
 * @returns {string} Prompt 文字
 */
function getTranscriptionPrompt() {
  return `你是一個甲狀腺超音波報告的語音轉錄助手。請將音訊內容轉錄為純文字。

## 醫學術語詞彙表（請優先識別這些術語）：

**回音性**: hypoechoic, hyperechoic, isoechoic, anechoic, very hypoechoic
**成分**: solid, cystic, spongiform, mixed
**形狀**: taller than wide, wider than tall
**邊緣**: smooth, irregular, lobulated, extrathyroidal extension
**鈣化**: microcalcification, macrocalcification, peripheral calcification, punctate echogenic foci
**TI-RADS**: TIRADS, TI-RADS, TR1, TR2, TR3, TR4, TR5
**位置**: right lobe, left lobe, isthmus, upper pole, lower pole, mid
**血流**: normal vascularity, increased vascularity, hypervascular, isovascularity, hypervascularity
**其他**: nodule, homogeneous, heterogeneous, FNA

## 轉錄規則：
1. 直接輸出轉錄的文字，不要加任何格式標記
2. 保持原始語言（中文或英文混用皆可）
3. 數字使用阿拉伯數字（如 1.2）
4. 尺寸用 x 連接（如 2.1x1.5x1.8）
5. 醫學術語使用標準拼寫

請直接輸出轉錄文字，不要包含任何 JSON 格式或其他標記。`;
}

/**
 * 取得支援的服務提供者資訊
 */
function getSupportedProviders() {
  return {
    grok: {
      name: 'xAI Grok',
      models: LLM_PROVIDERS.grok.models,
      pricing: 'grok-4-1-fast-reasoning: CP值最高，推理能力強',
      getKey: 'https://console.x.ai/'
    },
    openai: {
      name: 'OpenAI',
      models: LLM_PROVIDERS.openai.models,
      pricing: 'gpt-4o-mini: $0.15/1M input tokens',
      getKey: 'https://platform.openai.com/api-keys'
    },
    gemini: {
      name: 'Google Gemini',
      models: LLM_PROVIDERS.gemini.models,
      pricing: 'gemini-3-flash-preview: 最新版本，免費額度高',
      getKey: 'https://aistudio.google.com/apikey'
    }
  };
}
