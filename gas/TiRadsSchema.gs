/**
 * ACR TI-RADS 2017 計分邏輯
 * 定義五項評分標準與分類規則
 */

const TIRADS_SCHEMA = {
  // Composition (成分)
  composition: {
    code: 'C',
    options: {
      0: { label: 'cystic', labelZh: '囊性/海綿狀', description: 'Cystic or almost completely cystic / Spongiform' },
      1: { label: 'mixed', labelZh: '混合', description: 'Mixed cystic and solid' },
      2: { label: 'solid', labelZh: '實質', description: 'Solid or almost completely solid' }
    }
  },
  
  // Echogenicity (回音性)
  echogenicity: {
    code: 'E',
    options: {
      0: { label: 'anechoic', labelZh: '無回音', description: 'Anechoic' },
      1: { label: 'hyperechoic', labelZh: '等/高回音', description: 'Hyperechoic or isoechoic' },
      2: { label: 'hypoechoic', labelZh: '低回音', description: 'Hypoechoic' },
      3: { label: 'very_hypoechoic', labelZh: '極低回音', description: 'Very hypoechoic' }
    }
  },
  
  // Shape (形狀)
  shape: {
    code: 'S',
    options: {
      0: { label: 'wider_than_tall', labelZh: '寬>高', description: 'Wider-than-tall' },
      3: { label: 'taller_than_wide', labelZh: '高>寬', description: 'Taller-than-wide' }
    }
  },
  
  // Margin (邊緣)
  margin: {
    code: 'M',
    options: {
      0: { label: 'smooth', labelZh: '光滑/模糊', description: 'Smooth or ill-defined' },
      2: { label: 'irregular', labelZh: '分葉/不規則', description: 'Lobulated or irregular' },
      3: { label: 'extrathyroidal', labelZh: '甲狀腺外延伸', description: 'Extra-thyroidal extension' }
    }
  },
  
  // Echogenic Foci (回音點)
  echogenicFoci: {
    code: 'F',
    options: {
      0: { label: 'none', labelZh: '無', description: 'None or large comet-tail artifacts' },
      1: { label: 'macrocalcification', labelZh: '粗鈣化', description: 'Macrocalcifications' },
      2: { label: 'peripheral', labelZh: '邊緣鈣化', description: 'Peripheral (rim) calcifications' },
      3: { label: 'punctate', labelZh: '點狀鈣化', description: 'Punctate echogenic foci' }
    }
  }
};

// TI-RADS 分類對照表
const TIRADS_CATEGORIES = {
  TR1: { minPoints: 0, maxPoints: 0, name: 'Benign', recommendation: 'No FNA' },
  TR2: { minPoints: 2, maxPoints: 2, name: 'Not Suspicious', recommendation: 'No FNA' },
  TR3: { minPoints: 3, maxPoints: 3, name: 'Mildly Suspicious', recommendation: 'FNA if ≥2.5cm, follow if ≥1.5cm' },
  TR4: { minPoints: 4, maxPoints: 6, name: 'Moderately Suspicious', recommendation: 'FNA if ≥1.5cm, follow if ≥1cm' },
  TR5: { minPoints: 7, maxPoints: 14, name: 'Highly Suspicious', recommendation: 'FNA if ≥1cm, follow if ≥0.5cm' }
};

// 位置對照表
const LOCATION_MAP = {
  '右上': 'right upper',
  '右中': 'right mid', 
  '右下': 'right lower',
  '左上': 'left upper',
  '左中': 'left mid',
  '左下': 'left lower',
  '峽部': 'isthmus',
  'RU': 'right upper',
  'RM': 'right mid',
  'RL': 'right lower',
  'LU': 'left upper',
  'LM': 'left mid',
  'LL': 'left lower',
  'IS': 'isthmus'
};

/**
 * 計算 TI-RADS 總分
 * @param {number} c - Composition score
 * @param {number} e - Echogenicity score
 * @param {number} s - Shape score
 * @param {number} m - Margin score
 * @param {number} f - Echogenic Foci score
 * @returns {number} Total score
 */
function calculateTotalScore(c, e, s, m, f) {
  return c + e + s + m + f;
}

/**
 * 根據總分判定 TI-RADS 分類
 * @param {number} totalScore - 總分
 * @returns {string} TI-RADS category (TR1-TR5)
 */
function getTiRadsCategory(totalScore) {
  if (totalScore === 0) return 'TR1';
  if (totalScore === 2) return 'TR2';
  if (totalScore === 3) return 'TR3';
  if (totalScore >= 4 && totalScore <= 6) return 'TR4';
  if (totalScore >= 7) return 'TR5';
  return 'TR1'; // 預設
}

/**
 * ACR TI-RADS 風險等級描述
 */
const TIRADS_SUSPICION_LEVELS = {
  TR1: 'Benign',
  TR2: 'Not Suspicious',
  TR3: 'Mildly Suspicious',
  TR4: 'Moderately Suspicious',
  TR5: 'Highly Suspicious'
};

/**
 * 根據 TI-RADS 分類和大小給出建議
 * 依據 ACR TI-RADS 2017 White Paper 標準
 * @param {string} category - TI-RADS category
 * @param {number} sizeCm - Nodule size in cm (max diameter)
 * @returns {string} Recommendation
 */
function getRecommendation(category, sizeCm) {
  // ACR TI-RADS 2017 尺寸閾值
  const thresholds = {
    TR1: { fna: Infinity, follow: Infinity, suspicion: 'Benign' },
    TR2: { fna: Infinity, follow: Infinity, suspicion: 'Not Suspicious' },
    TR3: { fna: 2.5, follow: 1.5, suspicion: 'Mildly Suspicious' },
    TR4: { fna: 1.5, follow: 1.0, suspicion: 'Moderately Suspicious' },
    TR5: { fna: 1.0, follow: 0.5, suspicion: 'Highly Suspicious' }
  };

  const t = thresholds[category];
  if (!t) return 'Unable to determine recommendation';

  // 沒有尺寸時，只返回風險等級
  if (!sizeCm || sizeCm <= 0) {
    return `${category} (${t.suspicion}) - Size needed for FNA recommendation`;
  }

  // TR1/TR2：不需要 FNA
  if (category === 'TR1' || category === 'TR2') {
    return `No FNA (${category}: ${t.suspicion})`;
  }

  // TR5 特殊情況：5-9mm 可能需要考慮微小乳頭癌
  if (category === 'TR5' && sizeCm >= 0.5 && sizeCm < 1.0) {
    return `Follow-up recommended; consider FNA for papillary microcarcinoma if concerning features (${category}, 0.5-0.9cm)`;
  }

  // 標準建議
  if (sizeCm >= t.fna) {
    return `FNA recommended (${category}: ${t.suspicion}, ≥${t.fna}cm)`;
  } else if (sizeCm >= t.follow) {
    return `Follow-up ultrasound recommended (${category}: ${t.suspicion}, ${t.follow}-${t.fna}cm)`;
  } else {
    return `No FNA or follow-up needed (${category}: ${t.suspicion}, <${t.follow}cm)`;
  }
}

/**
 * 取得 TI-RADS 風險等級描述
 * @param {string} category - TI-RADS category
 * @returns {string} Suspicion level description
 */
function getSuspicionLevel(category) {
  return TIRADS_SUSPICION_LEVELS[category] || 'Unknown';
}

/**
 * 驗證 TI-RADS 分數是否有效
 * @param {Object} scores - {C, E, S, M, F}
 * @returns {Object} {valid: boolean, errors: string[], warnings: string[]}
 */
function validateTiRadsScores(scores) {
  const errors = [];
  const warnings = [];

  // 確保所有分數都是數字
  const c = Number(scores.C);
  const e = Number(scores.E);
  const s = Number(scores.S);
  const m = Number(scores.M);
  const f = Number(scores.F);

  if (isNaN(c) || ![0, 1, 2].includes(c)) {
    errors.push(`Invalid Composition score: ${scores.C}. Must be 0, 1, or 2.`);
  }
  if (isNaN(e) || ![0, 1, 2, 3].includes(e)) {
    errors.push(`Invalid Echogenicity score: ${scores.E}. Must be 0, 1, 2, or 3.`);
  }
  if (isNaN(s) || ![0, 3].includes(s)) {
    errors.push(`Invalid Shape score: ${scores.S}. Must be 0 or 3. (Note: 1 and 2 are NOT valid Shape scores!)`);
  }
  if (isNaN(m) || ![0, 2, 3].includes(m)) {
    errors.push(`Invalid Margin score: ${scores.M}. Must be 0, 2, or 3. (Note: 1 is NOT a valid Margin score!)`);
  }
  if (isNaN(f) || ![0, 1, 2, 3].includes(f)) {
    errors.push(`Invalid Echogenic Foci score: ${scores.F}. Must be 0, 1, 2, or 3.`);
  }

  // 檢查不可能的組合
  const total = c + e + s + m + f;
  if (total === 1) {
    warnings.push(`Total score of 1 is unusual (no standard TI-RADS category). Check if scores are correct.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 自動修正常見的 LLM 輸出錯誤
 * @param {Object} scores - {C, E, S, M, F}
 * @returns {Object} {corrected: {C, E, S, M, F}, corrections: string[]}
 */
function sanitizeTiRadsScores(scores) {
  const corrections = [];
  const corrected = {
    C: Number(scores.C),
    E: Number(scores.E),
    S: Number(scores.S),
    M: Number(scores.M),
    F: Number(scores.F)
  };

  // 修正 Composition (C): 只能是 0, 1, 2
  if (corrected.C === 3) {
    corrections.push(`Composition corrected from 3 to 2 (maximum valid value)`);
    corrected.C = 2;
  } else if (corrected.C < 0 || corrected.C > 2) {
    corrections.push(`Composition corrected from ${corrected.C} to 2 (defaulting to solid)`);
    corrected.C = 2;
  }

  // 修正 Echogenicity (E): 只能是 0, 1, 2, 3
  if (corrected.E < 0) {
    corrections.push(`Echogenicity corrected from ${corrected.E} to 0`);
    corrected.E = 0;
  } else if (corrected.E > 3) {
    corrections.push(`Echogenicity corrected from ${corrected.E} to 3`);
    corrected.E = 3;
  }

  // 修正 Shape (S): 只能是 0 或 3
  if (corrected.S === 1 || corrected.S === 2) {
    // LLM 常見錯誤：將 Shape 設為 1 或 2
    // 如果是 1 或 2，可能是想表示「有點高」，修正為 3
    corrections.push(`Shape corrected from ${corrected.S} to 0 (Shape can only be 0 or 3)`);
    corrected.S = 0; // 保守起見，預設為 0（寬大於高）
  } else if (corrected.S < 0) {
    corrections.push(`Shape corrected from ${corrected.S} to 0`);
    corrected.S = 0;
  } else if (corrected.S > 3) {
    corrections.push(`Shape corrected from ${corrected.S} to 3`);
    corrected.S = 3;
  }

  // 修正 Margin (M): 只能是 0, 2, 3
  if (corrected.M === 1) {
    // LLM 常見錯誤：將 Margin 設為 1
    corrections.push(`Margin corrected from 1 to 0 (Margin can only be 0, 2, or 3)`);
    corrected.M = 0; // 保守起見，1 → 0
  } else if (corrected.M < 0) {
    corrections.push(`Margin corrected from ${corrected.M} to 0`);
    corrected.M = 0;
  } else if (corrected.M > 3) {
    corrections.push(`Margin corrected from ${corrected.M} to 3`);
    corrected.M = 3;
  }

  // 修正 Echogenic Foci (F): 只能是 0, 1, 2, 3
  if (corrected.F < 0) {
    corrections.push(`Echogenic Foci corrected from ${corrected.F} to 0`);
    corrected.F = 0;
  } else if (corrected.F > 3) {
    corrections.push(`Echogenic Foci corrected from ${corrected.F} to 3`);
    corrected.F = 3;
  }

  // 處理 NaN
  if (isNaN(corrected.C)) { corrected.C = 2; corrections.push('Composition was NaN, defaulted to 2'); }
  if (isNaN(corrected.E)) { corrected.E = 1; corrections.push('Echogenicity was NaN, defaulted to 1'); }
  if (isNaN(corrected.S)) { corrected.S = 0; corrections.push('Shape was NaN, defaulted to 0'); }
  if (isNaN(corrected.M)) { corrected.M = 0; corrections.push('Margin was NaN, defaulted to 0'); }
  if (isNaN(corrected.F)) { corrected.F = 0; corrections.push('Echogenic Foci was NaN, defaulted to 0'); }

  return { corrected, corrections };
}

/**
 * 驗證並自動修正 TI-RADS 分數
 * @param {Object} scores - {C, E, S, M, F}
 * @param {boolean} autoCorrect - 是否自動修正錯誤（預設 true）
 * @returns {Object} {valid: boolean, scores: {C, E, S, M, F}, errors: string[], corrections: string[]}
 */
function validateAndCorrectScores(scores, autoCorrect = true) {
  // 先驗證
  const validation = validateTiRadsScores(scores);

  if (validation.valid) {
    return {
      valid: true,
      scores: {
        C: Number(scores.C),
        E: Number(scores.E),
        S: Number(scores.S),
        M: Number(scores.M),
        F: Number(scores.F)
      },
      errors: [],
      corrections: [],
      warnings: validation.warnings || []
    };
  }

  // 如果無效且允許自動修正
  if (autoCorrect) {
    const { corrected, corrections } = sanitizeTiRadsScores(scores);
    const revalidation = validateTiRadsScores(corrected);

    return {
      valid: revalidation.valid,
      scores: corrected,
      errors: revalidation.errors,
      corrections: corrections,
      warnings: revalidation.warnings || []
    };
  }

  // 不自動修正，直接返回錯誤
  return {
    valid: false,
    scores: scores,
    errors: validation.errors,
    corrections: [],
    warnings: validation.warnings || []
  };
}

/**
 * 將數字分數轉換為英文描述文字
 * @param {Object} scores - {C, E, S, M, F}
 * @returns {Object} 包含各項描述的物件
 */
function scoresToDescription(scores) {
  const { C, E, S, M, F } = scores;

  return {
    composition: TIRADS_SCHEMA.composition.options[C]?.description || 'Unknown',
    echogenicity: TIRADS_SCHEMA.echogenicity.options[E]?.description || 'Unknown',
    shape: TIRADS_SCHEMA.shape.options[S]?.description || 'Unknown',
    margin: TIRADS_SCHEMA.margin.options[M]?.description || 'Unknown',
    echogenicFoci: TIRADS_SCHEMA.echogenicFoci.options[F]?.description || 'Unknown'
  };
}

/**
 * 將分數轉換為報告文字
 * @param {Object} scores - {C, E, S, M, F}
 * @returns {string} 英文描述文字
 */
function scoresToReportText(scores) {
  const desc = scoresToDescription(scores);
  const total = calculateTotalScore(scores.C, scores.E, scores.S, scores.M, scores.F);
  const category = getTiRadsCategory(total);

  return `${desc.composition}, ${desc.echogenicity}, ` +
         `${desc.shape}, ${desc.margin}, ` +
         `${desc.echogenicFoci}. ` +
         `Total: ${total} points, ${category}`;
}

// 預設 TI-RADS 分數
const DEFAULT_TIRADS_SCORES = {
  C: 2,  // Solid
  E: 0,  // Anechoic
  S: 0,  // Wider-than-tall
  M: 0,  // Smooth
  F: 0   // None
};

/**
 * 建立完整的 TI-RADS 評估結果
 * @param {Object} params - {location, sizeCm, C, E, S, M, F}
 * @returns {Object} Complete nodule assessment
 */
function createNoduleAssessment(params) {
  const { location, sizeCm } = params;

  // 使用預設值填充未提供的分數
  const C = params.C ?? DEFAULT_TIRADS_SCORES.C;
  const E = params.E ?? DEFAULT_TIRADS_SCORES.E;
  const S = params.S ?? DEFAULT_TIRADS_SCORES.S;
  const M = params.M ?? DEFAULT_TIRADS_SCORES.M;
  const F = params.F ?? DEFAULT_TIRADS_SCORES.F;

  // 驗證分數
  const validation = validateTiRadsScores({ C, E, S, M, F });
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  const total = calculateTotalScore(C, E, S, M, F);
  const category = getTiRadsCategory(total);
  const recommendation = getRecommendation(category, sizeCm);

  // 標準化位置
  const normalizedLocation = LOCATION_MAP[location] || location;

  // 取得描述文字
  const desc = scoresToDescription({ C, E, S, M, F });

  return {
    location: normalizedLocation,
    size_cm: sizeCm,
    tirads: {
      composition: desc.composition,
      echogenicity: desc.echogenicity,
      shape: desc.shape,
      margin: desc.margin,
      echogenicFoci: desc.echogenicFoci,
      total,
      category
    },
    recommendation
  };
}

/**
 * 測試葉描述解析功能
 */
function testLobeParser() {
  const testCases = [
    // 右葉測試
    { input: '右葉 4.5x1.8x1.5 均質 等回音 血流正常', expected: { type: 'right', hasVolume: true } },
    { input: 'Right lobe 5.0x2.0x1.8 heterogeneous hypoechoic increased vascularity', expected: { type: 'right', homogeneity: 'heterogeneous' } },

    // 左葉測試
    { input: '左葉 4.2x1.6x1.4 均勻 正常 血流正常', expected: { type: 'left', hasVolume: true } },
    { input: 'Left 4.0x1.5x1.2 homogeneous isoechoic normal', expected: { type: 'left', echogenicity: 'isoechoic' } },

    // 峽部測試
    { input: '峽部 0.3cm 正常', expected: { type: 'isthmus', thickness_cm: 0.3 } },
    { input: 'Isthmus 0.4 normal vascularity normal', expected: { type: 'isthmus', thickness_cm: 0.4 } }
  ];

  const results = { passed: 0, failed: 0, errors: [] };

  testCases.forEach((tc, index) => {
    try {
      const parsed = parseSingleLobeInput(tc.input);

      if (!parsed) {
        results.failed++;
        results.errors.push({ test: index + 1, input: tc.input, error: 'Parse returned null' });
        console.log(`✗ Test ${index + 1} failed: parse returned null`);
        return;
      }

      let passed = true;

      if (tc.expected.type && parsed.type !== tc.expected.type) {
        passed = false;
      }
      if (tc.expected.hasVolume && !parsed.volume_ml) {
        passed = false;
      }
      if (tc.expected.homogeneity && parsed.homogeneity !== tc.expected.homogeneity) {
        passed = false;
      }
      if (tc.expected.echogenicity && parsed.echogenicity !== tc.expected.echogenicity) {
        passed = false;
      }
      if (tc.expected.thickness_cm && parsed.thickness_cm !== tc.expected.thickness_cm) {
        passed = false;
      }

      if (passed) {
        results.passed++;
        console.log(`✓ Test ${index + 1} passed`);
      } else {
        results.failed++;
        results.errors.push({ test: index + 1, input: tc.input, expected: tc.expected, actual: parsed });
        console.log(`✗ Test ${index + 1} failed`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ test: index + 1, input: tc.input, error: err.message });
      console.log(`✗ Test ${index + 1} error: ${err.message}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`Lobe Parser Test Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`========================================`);

  return results;
}

/**
 * 測試完整葉描述輸出
 */
function testLobeFormatting() {
  // 測試多葉輸入
  const multiLobeInput = '右葉 4.5x1.8x1.5 均質 等回音 血流正常; 左葉 4.2x1.6x1.4 均勻 正常 血流正常; 峽部 0.3cm 正常 血流正常';

  const lobes = parseLobeInput(multiLobeInput);
  console.log('Parsed lobes:', JSON.stringify(lobes, null, 2));

  if (lobes) {
    const formatted = formatLobeDescription(lobes);
    console.log('Formatted output:', JSON.stringify(formatted, null, 2));

    // 驗證
    if (lobes.rightLobe && lobes.leftLobe && lobes.isthmus) {
      console.log('✓ All three lobes parsed successfully');
      return { success: true, lobes, formatted };
    }
  }

  console.log('✗ Failed to parse all lobes');
  return { success: false };
}
