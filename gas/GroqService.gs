/**
 * 結構化處理服務
 * 用於將口述內容轉換為結構化 TI-RADS 報告
 */

/**
 * 結構化處理甲狀腺報告
 * @param {string} transcript - 輸入文字（數字模式或自然語言）
 * @param {Object} options - 選項（包含 api_key, provider）
 * @returns {Object} 結構化報告
 */
function structureThyroidReport(transcript, options = {}) {
  const systemPrompt = getStructuringPrompt();
  const userMessage = `請將以下甲狀腺超音波口述內容轉換為結構化 JSON：\n\n${transcript}`;

  // 使用統一的 LLM API 呼叫（支援 Grok、OpenAI、Gemini）
  const result = callLLMApi(systemPrompt, userMessage, options);

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

        // 使用驗證與修正函數
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

        // 加入描述文字
        const desc = scoresToDescription(validation.scores);
        nodule.tirads.composition = desc.composition;
        nodule.tirads.echogenicity = desc.echogenicity;
        nodule.tirads.shape = desc.shape;
        nodule.tirads.margin = desc.margin;
        nodule.tirads.echogenicFoci = desc.echogenicFoci;

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
    const cat = n.tirads?.category || 'unclassified';

    // 格式化尺寸
    let sizeStr = '';
    if (n.dimensions && n.dimensions.length && n.dimensions.width && n.dimensions.height) {
      sizeStr = `${n.dimensions.length}x${n.dimensions.width}x${n.dimensions.height}cm`;
      if (n.volume_ml) {
        sizeStr += `, ${n.volume_ml}mL`;
      }
    } else if (n.size_cm) {
      sizeStr = `${n.size_cm}cm`;
    } else {
      sizeStr = 'size unknown';
    }

    return `${cat} nodule at ${loc} (${sizeStr})`;
  });

  return summaries.join('; ') + '.';
}

/**
 * 測試 LLM API 連線
 * @param {Object} options - 選項（必須包含 api_key）
 * @returns {Object} Test result
 */
function testLLMConnection(options = {}) {
  if (!options.api_key) {
    return { success: false, error: 'API Key is required for testing connection.' };
  }

  try {
    const result = callLLMApi(
      'You are a test assistant. Respond with JSON.',
      'Say hello in JSON format with a "message" field.',
      { ...options, maxTokens: 50 }
    );
    return { success: true, result, provider: detectProvider(options.api_key) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
