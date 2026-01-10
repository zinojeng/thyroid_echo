/**
 * Thyroid Echo Report API
 * 甲狀腺超音波報告結構化 API
 * 
 * 主要端點：doPost - 接收口述文字，回傳結構化 TI-RADS 報告
 */

/**
 * 處理 GET 請求（用於測試連線）
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Thyroid Echo Report API is running',
    version: '1.0.0',
    endpoints: {
      POST: '/exec - 結構化甲狀腺報告',
      GET: '/exec - 測試連線'
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 POST 請求
 * @param {Object} e - 請求物件
 * @returns {TextOutput} JSON 回應
 */
function doPost(e) {
  try {
    // 解析請求內容
    const requestBody = JSON.parse(e.postData.contents);
    const { input, mode, options = {} } = requestBody;
    
    if (!input) {
      return createErrorResponse('Missing required field: input');
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
 * @param {string} mode - 模式 ('numeric', 'natural', 或 undefined 自動偵測)
 * @param {Object} options - 選項
 * @returns {Object} 結構化報告
 */
function processReport(input, mode, options) {
  // 自動偵測模式
  const detectedMode = mode || detectInputMode(input);
  
  let result;
  
  if (detectedMode === 'numeric') {
    // 數字快速模式：本地解析，不需要呼叫 LLM
    result = processNumericMode(input);
  } else {
    // 自然語言模式：使用 Groq LLM
    result = processNaturalMode(input, options);
  }
  
  // 加入元資料
  result.metadata = {
    mode: detectedMode,
    processed_at: new Date().toISOString(),
    api_version: '1.0.0'
  };
  
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
  
  // 取得整體建議（以最嚴重的為準）
  if (nodules.length > 0) {
    const mostSevere = nodules.reduce((prev, curr) => 
      (curr.tirads?.total || 0) > (prev.tirads?.total || 0) ? curr : prev
    );
    result.recommendation = mostSevere.recommendation;
  }
  
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
  
  // 建立 prompt
  const { systemPrompt, userMessage } = buildPromptWithExamples(normalizedInput);
  
  // 呼叫 Groq API
  const result = callGroqApi(systemPrompt, userMessage, {
    model: options.model,
    temperature: 0.1
  });
  
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

  const totalPassed = numericResults.passed + validationResults.passed + (multiResults.passed ? 1 : 0);
  const totalFailed = numericResults.failed + validationResults.failed + (multiResults.passed ? 0 : 1);

  console.log('\n========================================');
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('========================================');

  return {
    numeric: numericResults,
    validation: validationResults,
    multiNodule: multiResults,
    summary: { passed: totalPassed, failed: totalFailed }
  };
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
 * 測試 Groq 連線
 */
function testConnection() {
  const result = testGroqConnection();
  console.log('Connection test:', JSON.stringify(result, null, 2));
  return result;
}
