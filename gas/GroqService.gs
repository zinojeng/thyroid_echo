/**
 * Groq API 服務
 * 用於 LLM 結構化處理（文字轉結構化 TI-RADS 報告）
 */

// Groq API 設定
const GROQ_CONFIG = {
  apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
  // 推薦模型（按速度排序）
  models: {
    fast: 'llama-3.1-8b-instant',      // 最快，適合簡單任務
    balanced: 'llama-3.1-70b-versatile', // 平衡速度與品質
    quality: 'mixtral-8x7b-32768'       // 最佳品質，支援長 context
  },
  defaultModel: 'llama-3.1-70b-versatile',
  maxTokens: 1024,
  temperature: 0.1  // 低溫度確保一致性
};

/**
 * 取得 API Key（優先使用傳入的 key，其次使用 Script Properties）
 * @param {string} apiKey - 使用者提供的 API Key（可選）
 * @returns {string} Groq API Key
 */
function getGroqApiKey(apiKey) {
  // 優先使用使用者提供的 API Key
  if (apiKey && apiKey.trim()) {
    return apiKey.trim();
  }

  // 備用：從 Script Properties 取得
  const props = PropertiesService.getScriptProperties();
  const storedKey = props.getProperty('GROQ_API_KEY');
  if (storedKey) {
    return storedKey;
  }

  throw new Error('Missing API Key. Please provide "api_key" in your request or set GROQ_API_KEY in Script Properties.');
}

/**
 * 呼叫 Groq API
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @param {Object} options - Optional settings (including api_key)
 * @returns {Object} Parsed JSON response
 */
function callGroqApi(systemPrompt, userMessage, options = {}) {
  const apiKey = getGroqApiKey(options.api_key);
  const model = options.model || GROQ_CONFIG.defaultModel;
  
  const payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: options.maxTokens || GROQ_CONFIG.maxTokens,
    temperature: options.temperature || GROQ_CONFIG.temperature,
    response_format: { type: 'json_object' }  // 強制 JSON 輸出
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
    const response = UrlFetchApp.fetch(GROQ_CONFIG.apiUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 200) {
      console.error(`Groq API error: ${statusCode} - ${responseText}`);
      throw new Error(`Groq API returned status ${statusCode}: ${responseText}`);
    }
    
    const result = JSON.parse(responseText);
    const content = result.choices[0].message.content;
    
    // 解析 JSON 回應
    return JSON.parse(content);
    
  } catch (error) {
    console.error('Groq API call failed:', error);
    throw error;
  }
}

/**
 * 結構化處理甲狀腺報告
 * @param {string} transcript - 輸入文字（數字模式或自然語言）
 * @param {Object} options - 選項
 * @returns {Object} 結構化報告
 */
function structureThyroidReport(transcript, options = {}) {
  const systemPrompt = getStructuringPrompt();
  const userMessage = `請將以下甲狀腺超音波口述內容轉換為結構化 JSON：\n\n${transcript}`;

  const result = callGroqApi(systemPrompt, userMessage, options);

  // 收集所有修正記錄
  const allCorrections = [];

  // 驗證並補充計算
  if (result.nodules && Array.isArray(result.nodules)) {
    result.nodules = result.nodules.map((nodule, index) => {
      // 確保有 id
      if (!nodule.id) nodule.id = index + 1;

      // 驗證並自動修正 TI-RADS 分數
      if (nodule.tirads) {
        const { C, E, S, M, F } = nodule.tirads;

        // 使用新的驗證與修正函數
        const validation = validateAndCorrectScores({ C, E, S, M, F }, true);

        // 記錄修正
        if (validation.corrections.length > 0) {
          allCorrections.push({
            nodule_id: nodule.id,
            corrections: validation.corrections
          });
        }

        // 使用修正後的分數
        nodule.tirads.C = validation.scores.C;
        nodule.tirads.E = validation.scores.E;
        nodule.tirads.S = validation.scores.S;
        nodule.tirads.M = validation.scores.M;
        nodule.tirads.F = validation.scores.F;

        // 重新計算 total 和 category
        nodule.tirads.total = calculateTotalScore(
          validation.scores.C,
          validation.scores.E,
          validation.scores.S,
          validation.scores.M,
          validation.scores.F
        );
        nodule.tirads.category = getTiRadsCategory(nodule.tirads.total);

        // 更新建議
        if (nodule.size_cm) {
          nodule.recommendation = getRecommendation(nodule.tirads.category, nodule.size_cm);
        }

        // 記錄警告
        if (validation.warnings && validation.warnings.length > 0) {
          nodule.warnings = validation.warnings;
        }
      }

      return nodule;
    });

    // 生成總結印象
    if (options.generateImpression !== false) {
      result.impression = generateImpression(result.nodules);
    }

    // 加入修正記錄（如果有的話）
    if (allCorrections.length > 0) {
      result.auto_corrections = allCorrections;
    }
  }

  return result;
}

/**
 * 生成報告印象
 * @param {Array} nodules - 結節列表
 * @returns {string} Impression text
 */
function generateImpression(nodules) {
  if (!nodules || nodules.length === 0) {
    return 'No thyroid nodules identified.';
  }
  
  const summaries = nodules.map(n => {
    const loc = n.location || 'unknown location';
    const size = n.size_cm ? `${n.size_cm}cm` : 'size unknown';
    const cat = n.tirads?.category || 'unclassified';
    return `${cat} nodule at ${loc} (${size})`;
  });
  
  return summaries.join('; ') + '.';
}

/**
 * 測試 Groq API 連線
 * @returns {Object} Test result
 */
function testGroqConnection() {
  try {
    const result = callGroqApi(
      'You are a test assistant. Respond with JSON.',
      'Say hello in JSON format with a "message" field.',
      { maxTokens: 50 }
    );
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
