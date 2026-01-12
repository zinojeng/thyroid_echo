/**
 * Thyroid Echo Report API
 * 甲狀腺超音波報告結構化 API
 *
 * 主要端點：doPost - 接收口述文字，回傳結構化 TI-RADS 報告
 */

// 版本號碼 - 每次更新時遞增
const APP_VERSION = '1.7.0';

// 版本歷史：
// 1.0.0 - 初始版本，支援數字模式和自然語言模式
// 1.1.0 - 新增 TIRADS 代碼模式
// 1.2.0 - 新增葉描述模式 (Lobe Mode)
// 1.3.0 - 新增混合模式 (Mixed Mode)，WebApp 顯示葉描述
// 1.3.1 - 修正葉描述分離邏輯，新增「血流過多」術語
// 1.3.2 - 改進 Impression 格式：Lobe(volume+echo/vascular), Nodule(max diameter+TI-RADS)
// 1.3.3 - 支援葉的兩維度尺寸解析 (只有長×寬時顯示尺寸不計算體積)
// 1.4.0 - 修正術語：echogenicity(明暗) vs echotexture(均勻度)；
//         更新 FNA 建議依據 ACR TI-RADS 2017 White Paper 標準
// 1.4.1 - WebApp 顯示區也使用新術語格式 (echogenicity/echotexture/vascularity)
// 1.5.0 - Impression 中每個結節顯示個別 FNA 建議 (依 ACR TI-RADS 2017)
// 1.5.1 - 移除多餘的整體 Recommendation（每個結節已有個別建議）
// 1.6.0 - 新增甲狀腺疾病診斷識別 (Autoimmune thyroid disease, Hashimoto's, Graves', etc.)
// 1.6.1 - 擴充甲狀腺疾病診斷字典 (新增 12 種常見疾病)
// 1.6.2 - 修正換行符號處理、引號字元統一、葉模式診斷解析
// 1.6.3 - 移除重複診斷顯示，診斷只保留在 Impression 中
// 1.6.4 - 擴充混合模式識別，支援「右側甲狀腺大小」「TI-RADS」等更多輸入格式
// 1.7.0 - 新增 Gemini Audio API 語音輸入功能：支援錄音和音訊檔案上傳

/**
 * 處理 GET 請求 - 顯示 Web App 頁面
 */
function doGet(e) {
  // 如果有 api 參數，返回 API 狀態（向後相容）
  if (e && e.parameter && e.parameter.api === 'status') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Thyroid Echo Report API is running',
      version: APP_VERSION,
      endpoints: {
        POST: '/exec - 結構化甲狀腺報告',
        GET: '/exec - Web App 頁面',
        GET_STATUS: '/exec?api=status - API 狀態'
      }
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 返回 Web App HTML 頁面
  return HtmlService.createHtmlOutputFromFile('WebApp')
    .setTitle('Thyroid Echo Report')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 從 Web App 處理報告（供 HTML 頁面呼叫）
 * @param {string} input - 輸入文字
 * @param {string} apiKey - API Key
 * @param {string} provider - Provider
 * @returns {Object} 結構化報告
 */
function processReportFromWeb(input, apiKey, provider) {
  try {
    const options = {
      api_key: apiKey,
      provider: provider !== 'auto' ? provider : undefined
    };

    return processReport(input, null, options);
  } catch (error) {
    console.error('Web App Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 處理 POST 請求
 * @param {Object} e - 請求物件
 * @returns {TextOutput} JSON 回應
 *
 * 請求格式：
 * {
 *   "input": "右上 1.2 2 2 3 0 0",  // 必填：輸入文字
 *   "mode": "numeric",              // 選填：'numeric'、'tirads_code'、'lobe'、'natural'（自動偵測）
 *   "api_key": "xai-xxx...",        // 自然語言模式必填：API Key
 *   "provider": "grok"              // 選填：'grok'、'openai'、'gemini'（自動偵測）
 * }
 *
 * 支援的模式：
 * - numeric: 數字快速模式 (右上 1.2 2 2 3 0 0)
 * - tirads_code: TIRADS 代碼模式 (右側甲狀腺結節2.1x1.2x2.3，TIRADS 12001)
 * - lobe: 甲狀腺葉描述模式 (右葉 4.5x1.8x1.5 均質 等回音 血流正常)
 * - natural: 自然語言模式（需要 API Key）
 *
 * 支援的 API Key 格式：
 * - xAI Grok: xai-xxx...（推薦，CP值最高）
 * - OpenAI: sk-xxx...（gpt-4o-mini，品質穩定）
 * - Gemini: AIxxx...（gemini-2.0-flash，免費額度高）
 */
function doPost(e) {
  try {
    // 解析請求內容
    const requestBody = JSON.parse(e.postData.contents);
    const { input, mode, api_key, provider, options = {} } = requestBody;

    if (!input) {
      return createErrorResponse('Missing required field: input');
    }

    // 將 api_key 和 provider 加入 options
    if (api_key) {
      options.api_key = api_key;
    }
    if (provider) {
      options.provider = provider;
    }

    // 處理報告
    const result = processReport(input, mode, options);

    return createSuccessResponse(result);

  } catch (error) {
    console.error('Error processing request:', error);
    return createErrorResponse(error.message);
  }
}

/**
 * 處理報告主邏輯
 * @param {string} input - 輸入文字
 * @param {string} mode - 模式 ('numeric', 'tirads_code', 'lobe', 'natural', 或 undefined 自動偵測)
 * @param {Object} options - 選項
 * @returns {Object} 結構化報告
 */
function processReport(input, mode, options) {
  // 自動偵測模式
  const detectedMode = mode || detectInputModeExtended(input);

  let result;

  if (detectedMode === 'numeric') {
    // 數字快速模式：本地解析，不需要呼叫 LLM
    result = processNumericMode(input);
  } else if (detectedMode === 'tirads_code') {
    // TIRADS 代碼模式：本地解析，不需要 LLM（最快！）
    result = processTiradsCodeMode(input);
  } else if (detectedMode === 'lobe') {
    // 葉描述模式：本地解析，不需要 LLM
    result = processLobeMode(input);
  } else if (detectedMode === 'mixed') {
    // 混合模式：葉描述 + 結節描述
    result = processMixedMode(input, options);
  } else {
    // 自然語言模式：使用 Groq LLM
    result = processNaturalMode(input, options);
  }

  // 加入元資料
  result.metadata = {
    mode: detectedMode,
    processed_at: new Date().toISOString(),
    api_version: APP_VERSION
  };

  return result;
}

/**
 * 擴展的輸入模式偵測（包含 lobe 模式和混合模式）
 * @param {string} input - 輸入文字
 * @returns {string} 'numeric', 'tirads_code', 'lobe', 'mixed', 或 'natural'
 */
function detectInputModeExtended(input) {
  // 先檢測是否為混合輸入（葉描述 + 結節描述）
  if (isMixedInput(input)) {
    return 'mixed';
  }
  // 檢測是否為純葉描述
  if (isLobeInput(input)) {
    return 'lobe';
  }
  // 使用原有的偵測邏輯
  return detectInputMode(input);
}

/**
 * 處理甲狀腺葉描述模式
 * @param {string} input - 輸入文字
 * @returns {Object} 結構化報告
 */
function processLobeMode(input) {
  const lobes = parseLobeInput(input);

  if (!lobes) {
    throw new Error('Unable to parse lobe description. Expected format: 右葉 4.5x1.8x1.5 均質 等回音 血流正常');
  }

  // 格式化輸出
  const formatted = formatLobeDescription(lobes);

  const result = {
    success: true,
    type: 'lobe_description',
    lobes: lobes,
    formatted: formatted
  };

  // 解析甲狀腺疾病診斷
  const diagnoses = parseThyroidDiagnoses(input);
  if (diagnoses.length > 0) {
    result.diagnoses = diagnoses;
  }

  // 生成印象（包含診斷）
  result.impression = generateLobeImpressionWithDiagnosis(lobes, diagnoses);

  return result;
}

/**
 * 處理混合模式（葉描述 + 結節描述）
 * @param {string} input - 輸入文字
 * @param {Object} options - 選項
 * @returns {Object} 結構化報告
 */
function processMixedMode(input, options) {
  // 分離葉描述和結節描述
  const { lobeInput, noduleInput } = separateMixedInput(input);

  const result = {
    success: true,
    type: 'mixed_report'
  };

  // 處理葉描述
  if (lobeInput && lobeInput.trim()) {
    const lobes = parseComplexLobeInput(lobeInput);
    if (lobes) {
      result.lobes = lobes;
      result.lobeFormatted = formatLobeDescription(lobes);
    }
  }

  // 處理結節描述
  if (noduleInput && noduleInput.trim()) {
    // 偵測結節輸入的模式
    const noduleMode = detectInputMode(noduleInput);

    let noduleResult;
    if (noduleMode === 'tirads_code') {
      noduleResult = processTiradsCodeMode(noduleInput);
    } else if (noduleMode === 'numeric') {
      noduleResult = processNumericMode(noduleInput);
    } else {
      // 自然語言模式需要 LLM
      noduleResult = processNaturalMode(noduleInput, options);
    }

    if (noduleResult && noduleResult.nodules) {
      result.nodules = noduleResult.nodules;
      // 不再設置整體 recommendation，因為每個結節已有個別建議
    }
  }

  // 解析甲狀腺疾病診斷
  const diagnoses = parseThyroidDiagnoses(input);
  if (diagnoses.length > 0) {
    result.diagnoses = diagnoses;
  }

  // 生成綜合印象
  result.impression = generateMixedImpression(result);

  return result;
}

/**
 * 生成混合報告的印象
 * @param {Object} result - 混合報告結果
 * @returns {string} 印象描述
 */
function generateMixedImpression(result) {
  const lines = [];
  let itemNum = 1;

  // 葉描述印象 (volume + echo/vascular)
  if (result.lobes) {
    if (result.lobes.rightLobe) {
      lines.push(`${itemNum}) ${formatLobeImpression(result.lobes.rightLobe, 'Right lobe')}`);
      itemNum++;
    }
    if (result.lobes.leftLobe) {
      lines.push(`${itemNum}) ${formatLobeImpression(result.lobes.leftLobe, 'Left lobe')}`);
      itemNum++;
    }
    if (result.lobes.isthmus) {
      lines.push(`${itemNum}) ${formatIsthmusImpression(result.lobes.isthmus)}`);
      itemNum++;
    }
  }

  // 結節印象 (max diameter + TI-RADS + 個別建議)
  if (result.nodules && result.nodules.length > 0) {
    const noduleLines = [];
    result.nodules.forEach((n, idx) => {
      const location = n.location || 'unknown';
      const locationText = location.includes('right') ? 'Right lobe' : location.includes('left') ? 'Left lobe' : location.includes('isthmus') ? 'Isthmus' : capitalizeFirst(location);
      const echoDesc = n.tirads?.echogenicity ? n.tirads.echogenicity.toLowerCase() + ' ' : '';
      const category = n.tirads?.category || 'N/A';

      // 計算最大徑
      let maxDiameter = 0;
      let sizeText = '';
      if (n.size_cm) {
        maxDiameter = n.size_cm;
        sizeText = `, max diameter ${n.size_cm} cm`;
      } else if (n.dimensions && n.dimensions.length && n.dimensions.width && n.dimensions.height) {
        maxDiameter = Math.max(n.dimensions.length, n.dimensions.width, n.dimensions.height);
        sizeText = `, max diameter ${maxDiameter} cm`;
      } else if (n.dimensions) {
        const d = n.dimensions;
        sizeText = d.height ? `, ${d.length} x ${d.width} x ${d.height} cm` : `, ${d.length} x ${d.width} cm`;
        // 嘗試取得最大值
        maxDiameter = Math.max(d.length || 0, d.width || 0, d.height || 0);
      }

      // 結節描述行
      noduleLines.push(`   - ${locationText}: ${echoDesc}nodule${sizeText}, ACR TI-RADS ${category}.`);

      // 個別建議行
      const recommendation = getRecommendation(category, maxDiameter);
      noduleLines.push(`     → ${recommendation}`);
    });
    lines.push(`${itemNum}) Nodules:`);
    lines.push(...noduleLines);
    itemNum++;
  }

  // 診斷印象
  if (result.diagnoses && result.diagnoses.length > 0) {
    lines.push(`${itemNum}) Diagnosis: ${result.diagnoses.join('; ')}.`);
  }

  return lines.join('\n') || 'No findings';
}

/**
 * 格式化單個葉的印象
 * @param {Object} lobe - 葉資料
 * @param {string} label - 標籤
 * @returns {string} 印象文字
 */
function formatLobeImpression(lobe, label) {
  const parts = [label + ':'];

  // Volume - 只有三個維度都有時才計算
  if (lobe.volume_ml) {
    parts.push(`volume ${lobe.volume_ml} mL;`);
  } else if (lobe.dimensions && lobe.dimensions.length && lobe.dimensions.width && lobe.dimensions.height) {
    const vol = Math.round(0.524 * lobe.dimensions.length * lobe.dimensions.width * lobe.dimensions.height * 100) / 100;
    parts.push(`volume ${vol} mL;`);
  } else if (lobe.dimensions) {
    // 只有兩個維度，顯示尺寸但不計算體積
    const d = lobe.dimensions;
    if (d.height) {
      parts.push(`${d.length} x ${d.width} x ${d.height} cm;`);
    } else {
      parts.push(`${d.length} x ${d.width} cm;`);
    }
  }

  // Echogenicity (明暗度: anechoic/hyperechoic/isoechoic/hypoechoic)
  if (lobe.echogenicity) {
    parts.push(`echogenicity: ${lobe.echogenicity};`);
  }

  // Echotexture (均勻度: homogeneous/heterogeneous)
  if (lobe.homogeneity) {
    parts.push(`echotexture: ${lobe.homogeneity};`);
  }

  // Vascularity
  if (lobe.vascularity) {
    parts.push(`vascularity ${lobe.vascularity}.`);
  }

  return parts.join(' ').replace(/;\s*\./g, '.').replace(/;$/, '.');
}

/**
 * 格式化峽部印象
 * @param {Object} isthmus - 峽部資料
 * @returns {string} 印象文字
 */
function formatIsthmusImpression(isthmus) {
  const parts = ['Isthmus:'];

  if (isthmus.thickness_cm) {
    parts.push(`thickness ${isthmus.thickness_cm} cm;`);
  }

  if (isthmus.echogenicity) {
    parts.push(`${isthmus.echogenicity} echogenicity;`);
  }

  if (isthmus.vascularity) {
    parts.push(`vascularity ${isthmus.vascularity}.`);
  }

  return parts.join(' ').replace(/;\s*\./g, '.').replace(/;$/, '.');
}

/**
 * 首字母大寫
 * @param {string} str - 字串
 * @returns {string} 首字母大寫的字串
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 生成葉描述的印象（純葉模式用）
 * @param {Object} lobes - 葉資料
 * @returns {string} 印象描述
 */
function generateLobeImpression(lobes) {
  const lines = [];
  let itemNum = 1;

  if (lobes.rightLobe) {
    lines.push(`${itemNum}) ${formatLobeImpression(lobes.rightLobe, 'Right lobe')}`);
    itemNum++;
  }

  if (lobes.leftLobe) {
    lines.push(`${itemNum}) ${formatLobeImpression(lobes.leftLobe, 'Left lobe')}`);
    itemNum++;
  }

  if (lobes.isthmus) {
    lines.push(`${itemNum}) ${formatIsthmusImpression(lobes.isthmus)}`);
  }

  return lines.join('\n') || 'No lobe information';
}

/**
 * 生成葉描述印象（包含診斷）
 * @param {Object} lobes - 葉資料
 * @param {string[]} diagnoses - 診斷列表
 * @returns {string} 印象描述
 */
function generateLobeImpressionWithDiagnosis(lobes, diagnoses) {
  const lines = [];
  let itemNum = 1;

  if (lobes.rightLobe) {
    lines.push(`${itemNum}) ${formatLobeImpression(lobes.rightLobe, 'Right lobe')}`);
    itemNum++;
  }

  if (lobes.leftLobe) {
    lines.push(`${itemNum}) ${formatLobeImpression(lobes.leftLobe, 'Left lobe')}`);
    itemNum++;
  }

  if (lobes.isthmus) {
    lines.push(`${itemNum}) ${formatIsthmusImpression(lobes.isthmus)}`);
    itemNum++;
  }

  // 診斷印象
  if (diagnoses && diagnoses.length > 0) {
    lines.push(`${itemNum}) Diagnosis: ${diagnoses.join('; ')}.`);
  }

  return lines.join('\n') || 'No lobe information';
}

/**
 * 處理 TIRADS 代碼模式（不需要 LLM，純本地解析）
 * 格式: "右側甲狀腺結節2.1x1.2x2.3，TIRADS 12001"
 * @param {string} input - 輸入文字
 * @returns {Object} 結構化報告
 */
function processTiradsCodeMode(input) {
  const nodules = parseTiradsCodeInput(input);

  if (!nodules || nodules.length === 0) {
    throw new Error('Unable to parse TIRADS code format. Expected format: 右側甲狀腺結節2.1x1.2x2.3，TIRADS 12001');
  }

  // 為每個結節加上 id
  nodules.forEach((nodule, index) => {
    nodule.id = index + 1;
  });

  const result = {
    success: true,
    nodules: nodules,
    impression: generateImpression(nodules)
  };

  // 每個結節已有個別建議，不再設置整體 recommendation

  return result;
}

/**
 * 處理數字快速模式
 * @param {string} input - 輸入文字
 * @returns {Object} 結構化報告
 */
function processNumericMode(input) {
  // 支援多個結節（以分號或換行分隔）
  const parts = input.split(/[;；\n]/).map(s => s.trim()).filter(s => s);
  
  const nodules = [];
  const errors = [];
  
  parts.forEach((part, index) => {
    const parsed = parseNumericInput(part);
    
    if (parsed) {
      try {
        const nodule = createNoduleAssessment({
          ...parsed,
          id: index + 1
        });
        nodule.id = index + 1;
        nodules.push(nodule);
      } catch (err) {
        errors.push({ input: part, error: err.message });
      }
    } else {
      errors.push({ input: part, error: 'Unable to parse numeric format' });
    }
  });
  
  if (nodules.length === 0 && errors.length > 0) {
    throw new Error('Failed to parse input: ' + errors.map(e => e.error).join('; '));
  }
  
  const result = {
    success: true,
    nodules: nodules,
    impression: generateImpression(nodules)
  };

  // 每個結節已有個別建議，不再設置整體 recommendation

  if (errors.length > 0) {
    result.warnings = errors;
  }

  return result;
}

/**
 * 處理自然語言模式
 * @param {string} input - 輸入文字
 * @param {Object} options - 選項
 * @returns {Object} 結構化報告
 */
function processNaturalMode(input, options) {
  // 標準化輸入
  const normalizedInput = normalizeInput(input);

  // 使用 structureThyroidReport（包含描述轉換）
  const result = structureThyroidReport(normalizedInput, options);

  // 確保有 success 欄位
  result.success = true;

  return result;
}

/**
 * 建立成功回應
 * @param {Object} data - 回應資料
 * @returns {TextOutput} JSON 回應
 */
function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 建立錯誤回應
 * @param {string} message - 錯誤訊息
 * @returns {TextOutput} JSON 回應
 */
function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 測試函數：處理範例輸入
 */
function testProcessReport() {
  // 測試數字模式
  const numericResult = processReport('右上 1.2 2 2 3 0 0', 'numeric', {});
  console.log('Numeric mode result:', JSON.stringify(numericResult, null, 2));

  // 測試多個結節
  const multiResult = processReport('右上 1.2 2 2 3 0 0; 左下 0.8 1 1 0 0 0', 'numeric', {});
  console.log('Multi-nodule result:', JSON.stringify(multiResult, null, 2));

  return { numericResult, multiResult };
}

/**
 * 完整數字模式測試套件
 * 測試所有數字模式的測試案例
 */
function runNumericModeTests() {
  const testCases = [
    // 基本測試
    { id: 1, input: '右上 1.2 2 2 3 0 0', expected: { total: 7, category: 'TR5' } },
    { id: 2, input: '左下 0.6公分 1 1 0 0 0', expected: { total: 2, category: 'TR2' } },
    { id: 6, input: '峽部 1.5 2 3 0 2 3', expected: { total: 10, category: 'TR5' } },
    { id: 7, input: '右中 1.0 2 2 0 0 0', expected: { total: 4, category: 'TR4' } },
    { id: 8, input: '左上 一點五 2 2 0 0 3', expected: { total: 7, category: 'TR5' } },
    { id: 9, input: '右下 0.8 0 0 0 0 0', expected: { total: 0, category: 'TR1' } },
    { id: 10, input: '左中 1.8 2 1 0 0 0', expected: { total: 3, category: 'TR3' } },
    { id: 11, input: '右上極 2.5 2 2 3 2 3', expected: { total: 12, category: 'TR5' } },
    { id: 16, input: '右葉上極 1.0 2 2 0 0 0', expected: { total: 4, category: 'TR4' } },
    { id: 17, input: 'RU 1.2 2 2 3 0 0', expected: { total: 7, category: 'TR5' } }
  ];

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  testCases.forEach(tc => {
    try {
      const result = processReport(tc.input, 'numeric', {});

      if (!result.nodules || result.nodules.length === 0) {
        results.failed++;
        results.errors.push({
          id: tc.id,
          input: tc.input,
          error: 'No nodules returned'
        });
        return;
      }

      const nodule = result.nodules[0];
      const actualTotal = nodule.tirads.total;
      const actualCategory = nodule.tirads.category;

      if (actualTotal === tc.expected.total && actualCategory === tc.expected.category) {
        results.passed++;
        console.log(`✓ Test ${tc.id} passed`);
      } else {
        results.failed++;
        results.errors.push({
          id: tc.id,
          input: tc.input,
          expected: tc.expected,
          actual: { total: actualTotal, category: actualCategory }
        });
        console.log(`✗ Test ${tc.id} failed: expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify({ total: actualTotal, category: actualCategory })}`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push({
        id: tc.id,
        input: tc.input,
        error: err.message
      });
      console.log(`✗ Test ${tc.id} error: ${err.message}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`========================================`);

  if (results.errors.length > 0) {
    console.log('\nFailed tests:');
    results.errors.forEach(e => console.log(JSON.stringify(e, null, 2)));
  }

  return results;
}

/**
 * 測試分數驗證與自動修正功能
 */
function testScoreValidation() {
  const testCases = [
    // 有效分數
    { scores: { C: 2, E: 2, S: 3, M: 0, F: 0 }, shouldBeValid: true },
    { scores: { C: 0, E: 0, S: 0, M: 0, F: 0 }, shouldBeValid: true },
    { scores: { C: 1, E: 1, S: 0, M: 2, F: 1 }, shouldBeValid: true },

    // 無效分數（應被自動修正）
    { scores: { C: 3, E: 2, S: 1, M: 1, F: 0 }, shouldBeValid: false, expectedCorrected: { C: 2, E: 2, S: 0, M: 0, F: 0 } },
    { scores: { C: 2, E: 2, S: 2, M: 2, F: 3 }, shouldBeValid: false, expectedCorrected: { C: 2, E: 2, S: 0, M: 2, F: 3 } }
  ];

  const results = { passed: 0, failed: 0, errors: [] };

  testCases.forEach((tc, index) => {
    const validation = validateTiRadsScores(tc.scores);

    if (tc.shouldBeValid) {
      if (validation.valid) {
        results.passed++;
        console.log(`✓ Validation test ${index + 1} passed (valid scores)`);
      } else {
        results.failed++;
        results.errors.push({ test: index + 1, expected: 'valid', errors: validation.errors });
      }
    } else {
      if (!validation.valid) {
        // 測試自動修正
        const correctionResult = validateAndCorrectScores(tc.scores, true);
        const corrected = correctionResult.scores;

        if (JSON.stringify(corrected) === JSON.stringify(tc.expectedCorrected)) {
          results.passed++;
          console.log(`✓ Validation test ${index + 1} passed (auto-corrected)`);
        } else {
          results.failed++;
          results.errors.push({
            test: index + 1,
            expected: tc.expectedCorrected,
            actual: corrected
          });
        }
      } else {
        results.failed++;
        results.errors.push({ test: index + 1, expected: 'invalid', actual: 'valid' });
      }
    }
  });

  console.log(`\n========================================`);
  console.log(`Validation Test Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`========================================`);

  return results;
}

/**
 * 測試多結節解析
 */
function testMultiNodule() {
  const input = '右上 1.0 2 2 0 0 0; 左下 0.5 0 0 0 0 0; 峽部 0.8 2 1 0 0 1';
  const result = processReport(input, 'numeric', {});

  console.log('Multi-nodule test:');
  console.log(`Input: ${input}`);
  console.log(`Nodules found: ${result.nodules.length}`);

  if (result.nodules.length !== 3) {
    console.log('✗ Failed: Expected 3 nodules');
    return { passed: false, error: 'Wrong nodule count' };
  }

  const expected = [
    { location: 'right upper', total: 4, category: 'TR4' },
    { location: 'left lower', total: 0, category: 'TR1' },
    { location: 'isthmus', total: 4, category: 'TR4' }
  ];

  let allPassed = true;
  result.nodules.forEach((n, i) => {
    const e = expected[i];
    if (n.location === e.location && n.tirads.total === e.total && n.tirads.category === e.category) {
      console.log(`✓ Nodule ${i + 1} correct`);
    } else {
      console.log(`✗ Nodule ${i + 1} incorrect: expected ${JSON.stringify(e)}, got location=${n.location}, total=${n.tirads.total}, category=${n.tirads.category}`);
      allPassed = false;
    }
  });

  return { passed: allPassed };
}

/**
 * 執行所有測試
 */
function runAllTests() {
  console.log('=== Running All Tests ===\n');

  console.log('--- Numeric Mode Tests ---');
  const numericResults = runNumericModeTests();

  console.log('\n--- Score Validation Tests ---');
  const validationResults = testScoreValidation();

  console.log('\n--- Multi-Nodule Tests ---');
  const multiResults = testMultiNodule();

  console.log('\n--- Lobe Parser Tests ---');
  const lobeResults = testLobeParser();

  console.log('\n--- Lobe Formatting Tests ---');
  const lobeFormattingResults = testLobeFormatting();

  const totalPassed = numericResults.passed + validationResults.passed + (multiResults.passed ? 1 : 0) + lobeResults.passed + (lobeFormattingResults.success ? 1 : 0);
  const totalFailed = numericResults.failed + validationResults.failed + (multiResults.passed ? 0 : 1) + lobeResults.failed + (lobeFormattingResults.success ? 0 : 1);

  console.log('\n========================================');
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('========================================');

  return {
    numeric: numericResults,
    validation: validationResults,
    multiNodule: multiResults,
    lobeParser: lobeResults,
    lobeFormatting: lobeFormattingResults,
    summary: { passed: totalPassed, failed: totalFailed }
  };
}

/**
 * 測試葉描述模式
 */
function testLobeMode() {
  console.log('=== Testing Lobe Mode ===\n');

  const testCases = [
    '右葉 4.5x1.8x1.5 均質 等回音 血流正常',
    '左葉 4.2x1.6x1.4 均勻 正常 血流正常',
    '峽部 0.3cm 正常 血流正常',
    '右葉 4.5x1.8x1.5 均質 等回音 血流正常; 左葉 4.2x1.6x1.4 均勻 正常 血流正常; 峽部 0.3cm 正常'
  ];

  testCases.forEach((input, index) => {
    console.log(`\nTest ${index + 1}: ${input}`);
    try {
      const result = processReport(input, 'lobe', {});
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
      console.log('Error:', err.message);
    }
  });
}

/**
 * 設定 API Key（在 Script Editor 中執行一次）
 */
function setApiKey() {
  const ui = SpreadsheetApp.getUi ? SpreadsheetApp.getUi() : null;
  
  if (ui) {
    const response = ui.prompt('Set Groq API Key', 'Enter your Groq API Key:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty('GROQ_API_KEY', response.getResponseText());
      ui.alert('API Key saved successfully!');
    }
  } else {
    // 如果沒有 UI，直接設定（替換為您的 API Key）
    // PropertiesService.getScriptProperties().setProperty('GROQ_API_KEY', 'YOUR_API_KEY_HERE');
    console.log('Please run this function from the Script Editor or set GROQ_API_KEY manually in Script Properties.');
  }
}

/**
 * 測試 LLM 連線（需要傳入 api_key）
 * @param {string} apiKey - API Key（可選，用於測試）
 */
function testConnection(apiKey) {
  // 如果沒有傳入 api_key，顯示使用說明
  if (!apiKey) {
    console.log('Usage: testConnection("your-api-key")');
    console.log('Supported API Keys:');
    console.log('  - xAI Grok: xai-xxx...');
    console.log('  - OpenAI: sk-xxx...');
    console.log('  - Gemini: AIxxx...');
    return { success: false, error: 'Please provide an API key as parameter' };
  }

  const result = testLLMConnection({ api_key: apiKey });
  console.log('Connection test:', JSON.stringify(result, null, 2));
  return result;
}

// ==================== Gemini Audio API 功能 ====================

/**
 * 從 Web App 處理音訊報告（供 HTML 頁面呼叫）
 * @param {string} audioBase64 - Base64 編碼的音訊資料
 * @param {string} mimeType - 音訊 MIME 類型 (audio/wav, audio/mp3, audio/webm 等)
 * @param {string} apiKey - Gemini API Key
 * @param {string} mode - 處理模式：'transcribe' (只轉錄) 或 'full' (轉錄+結構化)
 * @returns {Object} 處理結果
 */
function processAudioFromWeb(audioBase64, mimeType, apiKey, mode = 'full') {
  try {
    if (!audioBase64) {
      return { success: false, error: 'Missing audio data' };
    }
    if (!apiKey) {
      return { success: false, error: 'Missing Gemini API Key' };
    }

    const options = { api_key: apiKey };

    if (mode === 'transcribe') {
      // 只進行語音轉錄
      const transcript = transcribeWithGeminiAudio(audioBase64, mimeType, options);
      return {
        success: true,
        transcript: transcript,
        mode: 'transcribe'
      };
    } else {
      // 完整處理：語音轉錄 + 結構化
      const result = processAudioReport(audioBase64, mimeType, options);
      return result;
    }
  } catch (error) {
    console.error('Audio processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 處理音訊報告（語音轉錄 + 結構化）
 * @param {string} audioBase64 - Base64 編碼的音訊資料
 * @param {string} mimeType - 音訊 MIME 類型
 * @param {Object} options - 選項 (api_key)
 * @returns {Object} 結構化報告
 */
function processAudioReport(audioBase64, mimeType, options) {
  // 建立音訊處理提示
  const prompt = getAudioStructuringPrompt();

  // 呼叫 Gemini Audio API
  const audioResult = callGeminiAudioApi(audioBase64, mimeType, prompt, options);

  // 如果回傳包含 transcript 和 nodules，直接使用
  if (audioResult.nodules && Array.isArray(audioResult.nodules)) {
    // 驗證並補充 TI-RADS 資訊
    audioResult.nodules = audioResult.nodules.map((nodule, index) => {
      if (!nodule.id) nodule.id = index + 1;

      if (nodule.tirads) {
        const { C, E, S, M, F } = nodule.tirads;
        const validation = validateAndCorrectScores({ C, E, S, M, F }, true);

        nodule.tirads.C = validation.scores.C;
        nodule.tirads.E = validation.scores.E;
        nodule.tirads.S = validation.scores.S;
        nodule.tirads.M = validation.scores.M;
        nodule.tirads.F = validation.scores.F;

        nodule.tirads.total = calculateTotalScore(
          validation.scores.C, validation.scores.E, validation.scores.S,
          validation.scores.M, validation.scores.F
        );
        nodule.tirads.category = getTiRadsCategory(nodule.tirads.total);

        const desc = scoresToDescription(validation.scores);
        nodule.tirads.composition = desc.composition;
        nodule.tirads.echogenicity = desc.echogenicity;
        nodule.tirads.shape = desc.shape;
        nodule.tirads.margin = desc.margin;
        nodule.tirads.echogenicFoci = desc.echogenicFoci;

        if (nodule.size_cm) {
          nodule.recommendation = getRecommendation(nodule.tirads.category, nodule.size_cm);
        }
      }

      return nodule;
    });

    // 生成印象
    if (audioResult.nodules.length > 0) {
      audioResult.impression = generateImpression(audioResult.nodules);
    }

    audioResult.success = true;
    audioResult.metadata = {
      mode: 'audio',
      processed_at: new Date().toISOString(),
      api_version: APP_VERSION
    };

    return audioResult;
  }

  // 如果只有 transcript，使用現有的 processReport 處理
  if (audioResult.transcript) {
    const report = processReport(audioResult.transcript, null, options);
    report.transcript = audioResult.transcript;
    report.metadata.mode = 'audio';
    return report;
  }

  return {
    success: false,
    error: 'Unable to process audio content'
  };
}

/**
 * 取得音訊結構化處理的 Prompt
 * @returns {string} Prompt 文字
 */
function getAudioStructuringPrompt() {
  return `你是一個甲狀腺超音波報告 AI 助手。請執行以下任務：

1. **語音轉錄**：將音訊內容轉錄為文字
2. **結構化分析**：根據 ACR TI-RADS 2017 標準，將內容結構化

請以 JSON 格式回傳結果：

{
  "transcript": "原始語音轉錄文字",
  "nodules": [
    {
      "location": "位置 (right upper/right mid/right lower/left upper/left mid/left lower/isthmus)",
      "size_cm": 最大徑（公分），
      "dimensions": { "length": 長, "width": 寬, "height": 高 },
      "tirads": {
        "C": 成分分數 (0-2),
        "E": 回音性分數 (0-3),
        "S": 形狀分數 (0 或 3),
        "M": 邊緣分數 (0, 2, 或 3),
        "F": 回音點分數 (0-3)
      }
    }
  ],
  "lobes": {
    "rightLobe": {
      "type": "right",
      "dimensions": { "length": 長, "width": 寬, "height": 高 },
      "homogeneity": "homogeneous/heterogeneous",
      "echogenicity": "isoechoic/hypoechoic/hyperechoic",
      "vascularity": "normal/increased/decreased"
    },
    "leftLobe": { ... },
    "isthmus": { "type": "isthmus", "thickness_cm": 厚度 }
  },
  "diagnoses": ["診斷列表，如有的話"]
}

注意事項：
- Shape (S) 只能是 0 或 3（0 = 寬大於高，3 = 高大於寬）
- Margin (M) 只能是 0、2、3（沒有 1）
- 如果沒有結節，nodules 可以為空陣列
- 如果沒有葉描述，lobes 可以省略
- 中文數字請轉換為阿拉伯數字（如「一點二」→ 1.2）`;
}

/**
 * 測試 Gemini Audio API 連線
 * @param {string} apiKey - Gemini API Key
 * @returns {Object} 測試結果
 */
function testGeminiAudio(apiKey) {
  if (!apiKey) {
    console.log('Usage: testGeminiAudio("your-gemini-api-key")');
    console.log('Get your API key from: https://aistudio.google.com/apikey');
    return { success: false, error: 'Please provide a Gemini API key as parameter' };
  }

  try {
    // 測試用的簡單音訊（靜音 WAV）
    // 這是一個最小的 WAV 檔案 header + 靜音資料
    const testAudioBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

    const result = callGeminiAudioApi(testAudioBase64, 'audio/wav',
      '這是一個測試。請回傳 JSON: {"status": "ok", "message": "Gemini Audio API 連線成功"}',
      { api_key: apiKey }
    );

    console.log('Gemini Audio API test result:', JSON.stringify(result, null, 2));
    return { success: true, result };
  } catch (error) {
    console.error('Gemini Audio API test failed:', error);
    return { success: false, error: error.message };
  }
}
