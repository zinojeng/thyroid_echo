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
