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

    return JSON.parse(content);

  } catch (error) {
    console.error(`${provider.name} API call failed:`, error);
    throw error;
  }
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

    // 嘗試解析 JSON
    try {
      return JSON.parse(content);
    } catch (e) {
      // Gemini 有時會在 JSON 前後加入 markdown 標記
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // 嘗試直接解析
      const cleanContent = content.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanContent);
    }

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

    // 嘗試解析 JSON
    return parseGeminiJsonResponse(content);

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
  const result = callGeminiAudioApi(audioBase64, mimeType, prompt, options);
  return result.transcript || '';
}

/**
 * 取得語音轉錄的 Prompt（包含醫學術語提示）
 * @returns {string} Prompt 文字
 */
function getTranscriptionPrompt() {
  return `你是一個甲狀腺超音波報告的語音轉錄助手。請將音訊內容轉錄為文字。

## 常見醫學術語詞彙表（請優先識別這些術語）：

### 回音性 (Echogenicity)
- hypoechoic（低回音）
- hyperechoic（高回音）
- isoechoic（等回音）
- anechoic（無回音）
- very hypoechoic（極低回音）

### 成分 (Composition)
- solid（實質）
- cystic（囊性）
- spongiform（海綿狀）
- mixed（混合）

### 形狀 (Shape)
- taller than wide（高大於寬）
- wider than tall（寬大於高）

### 邊緣 (Margin)
- smooth（光滑）
- irregular（不規則）
- lobulated（分葉狀）
- extrathyroidal extension（甲狀腺外延伸）

### 鈣化 (Calcification)
- microcalcification（微鈣化）
- macrocalcification（粗鈣化）
- peripheral calcification（邊緣鈣化）
- punctate echogenic foci（點狀回音灶）

### TI-RADS 相關
- TIRADS / TI-RADS
- TR1, TR2, TR3, TR4, TR5
- ACR TI-RADS

### 位置
- right lobe（右葉）
- left lobe（左葉）
- isthmus（峽部）
- upper pole（上極）
- lower pole（下極）
- mid（中段）

### 血流 (Vascularity)
- normal vascularity（正常血流）
- increased vascularity（血流增加）
- hypervascular（血流豐富）

### 其他
- nodule（結節）
- homogeneous（均質）
- heterogeneous（不均質）
- FNA（細針抽吸）

## 轉錄規則：
1. 保持原始語言（中文或英文）
2. 數字使用阿拉伯數字（如 1.2 cm）
3. 尺寸格式：長 x 寬 x 高（如 2.1x1.5x1.8）
4. 醫學術語盡量使用上述標準拼寫

請以 JSON 格式回傳結果：
{
  "transcript": "轉錄的文字內容"
}`;
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
