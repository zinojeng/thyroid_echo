/**
 * 醫學術語字典
 * 中英對照、口語變體、縮寫展開
 */

// 回音性術語對照（擴充版 - 涵蓋口語、拼寫變體）
const ECHOGENICITY_TERMS = {
  // 0 分：無回音 (anechoic)
  '無回音': 0,
  '無回聲': 0,
  '無迴音': 0,
  '無迴聲': 0,
  '完全無回音': 0,
  '純無回音': 0,
  '全無回音': 0,
  '無echo': 0,
  'anechoic': 0,
  'an-echoic': 0,
  'echo-free': 0,
  'echo free': 0,
  'no echo': 0,
  'without echo': 0,

  // 1 分：等回音或高回音 (hyperechoic/isoechoic)
  '等回音': 1,
  '等回聲': 1,
  '等迴音': 1,
  '等迴聲': 1,
  '高回音': 1,
  '高回聲': 1,
  '高迴音': 1,
  '高迴聲': 1,
  '等回音性': 1,
  '高回音性': 1,
  '回音與周圍相同': 1,
  '回音與甲狀腺相同': 1,
  '與周圍等回音': 1,
  '與甲狀腺等回音': 1,
  '正常回音': 1,
  '回音正常': 1,
  '均勻回音': 1,
  '回音均勻': 1,
  'isoechoic': 1,
  'hyperechoic': 1,
  'iso-echoic': 1,
  'hyper-echoic': 1,
  'iso echoic': 1,
  'hyper echoic': 1,
  'echogenic': 1,
  'normal echogenicity': 1,
  'isointense': 1,
  'hyperintense': 1,

  // 2 分：低回音 (hypoechoic)
  '低回音': 2,
  '低回聲': 2,
  '低迴音': 2,
  '低迴聲': 2,
  '低回音性': 2,
  '減低回音': 2,
  '稍低回音': 2,
  '輕度低回音': 2,
  '略低回音': 2,
  '偏低回音': 2,
  '回音偏低': 2,
  '回音減低': 2,
  '低於周圍': 2,
  '比周圍低': 2,
  'hypoechoic': 2,
  'hypo-echoic': 2,
  'hypo echoic': 2,
  'low echogenicity': 2,
  'low echo': 2,
  'decreased echogenicity': 2,
  'reduced echogenicity': 2,
  'hypointense': 2,
  'mildly hypoechoic': 2,
  'slightly hypoechoic': 2,

  // 3 分：極低回音 (very hypoechoic)
  '極低回音': 3,
  '極低回聲': 3,
  '極低迴音': 3,
  '非常低回音': 3,
  '明顯低回音': 3,
  '顯著低回音': 3,
  '重度低回音': 3,
  '嚴重低回音': 3,
  '很低回音': 3,
  '特別低回音': 3,
  '接近無回音': 3,
  '近無回音': 3,
  '幾乎無回音': 3,
  'very hypoechoic': 3,
  'markedly hypoechoic': 3,
  'very low echogenicity': 3,
  'marked hypoechogenicity': 3,
  'marked hypoechoic': 3,
  'severely hypoechoic': 3,
  'profoundly hypoechoic': 3,
  'extremely hypoechoic': 3,
  'near anechoic': 3,
  'almost anechoic': 3
};

// 成分術語對照（擴充版）
const COMPOSITION_TERMS = {
  // 0 分：囊性或海綿狀 (cystic/spongiform)
  '囊性': 0,
  '囊狀': 0,
  '囊腫': 0,
  '純囊性': 0,
  '完全囊性': 0,
  '海綿狀': 0,
  '海綿樣': 0,
  '蜂窩狀': 0,
  '多囊': 0,
  '囊': 0,
  '水囊': 0,
  '液性': 0,
  '全囊性': 0,
  '純液性': 0,
  '無迴音囊性': 0,
  '膠質囊腫': 0,
  'cystic': 0,
  'purely cystic': 0,
  'pure cyst': 0,
  'simple cyst': 0,
  'spongiform': 0,
  'sponge-like': 0,
  'sponge like': 0,
  'honeycomb': 0,
  'honeycomb appearance': 0,
  'completely cystic': 0,
  'almost completely cystic': 0,
  'fluid-filled': 0,
  'fluid filled': 0,

  // 1 分：混合性 (mixed cystic and solid)
  '混合': 1,
  '混合性': 1,
  '囊實性': 1,
  '囊實混合': 1,
  '部分囊性': 1,
  '部分實質': 1,
  '實囊性': 1,
  '以囊為主': 1,
  '以實質為主': 1,
  '囊實': 1,
  '實囊': 1,
  '混合型': 1,
  '部分囊': 1,
  '部分實': 1,
  '半實半囊': 1,
  '實性為主': 1,
  '囊性為主': 1,
  'mixed': 1,
  'mixed cystic and solid': 1,
  'mixed solid and cystic': 1,
  'predominantly cystic': 1,
  'predominantly solid': 1,
  'partially cystic': 1,
  'partially solid': 1,
  'solid and cystic': 1,
  'cystic and solid': 1,
  'complex': 1,
  'complex cyst': 1,
  'mixed composition': 1,
  'part solid part cystic': 1,

  // 2 分：實質性 (solid)
  '實質': 2,
  '實質性': 2,
  '實心': 2,
  '純實質': 2,
  '完全實質': 2,
  '固體': 2,
  '實': 2,
  '全實質': 2,
  '實性': 2,
  '均質實性': 2,
  '實質結節': 2,
  '固實': 2,
  '固態': 2,
  'solid': 2,
  'purely solid': 2,
  'pure solid': 2,
  'almost completely solid': 2,
  'solid composition': 2,
  'completely solid': 2,
  'entirely solid': 2,
  'homogeneous solid': 2,
  'solid nodule': 2
};

// 形狀術語對照（擴充版）
// ⚠️ 注意：Shape 只有 0 分和 3 分，沒有 1 或 2 分！
const SHAPE_TERMS = {
  // 0 分：寬大於高 (wider-than-tall) - 良性傾向
  '寬大於高': 0,
  '寬比高': 0,
  '寬>高': 0,
  '寬＞高': 0,
  '橫向': 0,
  '橫長': 0,
  '扁平': 0,
  '扁圓': 0,
  '平躺': 0,
  '橫置': 0,
  '橢圓': 0,
  '橢圓形': 0,
  '平行': 0,
  '平行於皮膚': 0,
  '橫徑大於前後徑': 0,
  '寬度大於高度': 0,
  '橫比縱': 0,
  '橫軸': 0,
  '橫切面': 0,
  '平臥': 0,
  '水平': 0,
  '正常形狀': 0,
  '形狀正常': 0,
  '無高比寬': 0,
  'wider than tall': 0,
  'wider-than-tall': 0,
  'wider than high': 0,
  'horizontal': 0,
  'oval': 0,
  'ovoid': 0,
  'parallel': 0,
  'flat': 0,
  'oblate': 0,
  'parallel orientation': 0,
  'horizontal orientation': 0,
  'width greater than height': 0,
  'transverse': 0,
  'not taller than wide': 0,
  'wider': 0,
  'round': 0,

  // 3 分：高大於寬 (taller-than-wide) - 惡性傾向
  '高大於寬': 3,
  '高比寬': 3,
  '高>寬': 3,
  '高＞寬': 3,
  '縱向': 3,
  '直立': 3,
  '豎立': 3,
  '立起': 3,
  '垂直': 3,
  '垂直於皮膚': 3,
  '縱長': 3,
  '前後徑大於橫徑': 3,
  '高度大於寬度': 3,
  '縱比橫': 3,
  '縱軸': 3,
  '豎直': 3,
  '站立': 3,
  '非平行': 3,
  '垂直生長': 3,
  '向上生長': 3,
  'taller than wide': 3,
  'taller-than-wide': 3,
  'taller than high': 3,
  'vertical': 3,
  'upright': 3,
  'nonparallel': 3,
  'non-parallel': 3,
  'non parallel': 3,
  'perpendicular': 3,
  'antiparallel': 3,
  'vertical orientation': 3,
  'height greater than width': 3,
  'taller': 3,
  'longitudinal': 3
};

// 邊緣術語對照（擴充版）
// ⚠️ 注意：Margin 只有 0, 2, 3 分，沒有 1 分！
const MARGIN_TERMS = {
  // 0 分：光滑或模糊 (smooth/ill-defined) - 良性傾向
  '光滑': 0,
  '平滑': 0,
  '圓滑': 0,
  '規則': 0,
  '邊緣規則': 0,
  '邊緣清楚': 0,
  '邊緣清晰': 0,
  '清楚': 0,
  '清晰': 0,
  '界限清楚': 0,
  '模糊': 0,
  '邊緣模糊': 0,
  '界限不清': 0,
  '不清楚': 0,
  '邊界不清': 0,
  '暈環': 0,
  '有暈環': 0,
  '邊緣光滑': 0,
  '邊界清楚': 0,
  '邊界清晰': 0,
  '界線清楚': 0,
  '邊界規則': 0,
  '輪廓清楚': 0,
  '輪廓清晰': 0,
  '輪廓光滑': 0,
  '完整邊緣': 0,
  '邊緣完整': 0,
  '圓形邊緣': 0,
  '無毛刺': 0,
  'smooth': 0,
  'well-defined': 0,
  'well defined': 0,
  'well-demarcated': 0,
  'well demarcated': 0,
  'ill-defined': 0,
  'ill defined': 0,
  'poorly defined': 0,
  'indistinct': 0,
  'halo': 0,
  'smooth margin': 0,
  'regular': 0,
  'regular margin': 0,
  'circumscribed': 0,
  'clear margin': 0,
  'distinct margin': 0,
  'sharp margin': 0,
  'intact capsule': 0,

  // 2 分：分葉狀或不規則 (lobulated/irregular) - 可疑
  '分葉': 2,
  '分葉狀': 2,
  '分葉邊緣': 2,
  '不規則': 2,
  '邊緣不規則': 2,
  '不規則邊緣': 2,
  '鋸齒狀': 2,
  '鋸齒': 2,
  '毛刺': 2,
  '毛刺狀': 2,
  '棘狀': 2,
  '角狀': 2,
  '多角': 2,
  '多角形': 2,
  '不整齊': 2,
  '邊緣不整齊': 2,
  '星狀': 2,
  '尖刺狀': 2,
  '尖角': 2,
  '多葉': 2,
  '多葉狀': 2,
  '波浪狀': 2,
  '凹凸不平': 2,
  '不平整': 2,
  'lobulated': 2,
  'irregular': 2,
  'irregular margin': 2,
  'spiculated': 2,
  'jagged': 2,
  'angulated': 2,
  'lobular': 2,
  'microlobulated': 2,
  'micro-lobulated': 2,
  'infiltrative': 2,
  'serrated': 2,
  'scalloped': 2,
  'rough': 2,
  'uneven': 2,
  'notched': 2,
  'stellate': 2,

  // 3 分：甲狀腺外延伸 (extra-thyroidal extension) - 高度可疑
  '甲狀腺外延伸': 3,
  '甲狀腺外侵犯': 3,
  '甲外延伸': 3,
  '侵犯': 3,
  '外侵': 3,
  '突破': 3,
  '突破被膜': 3,
  '被膜侵犯': 3,
  '包膜侵犯': 3,
  '突出甲狀腺': 3,
  '超出甲狀腺': 3,
  '甲外侵犯': 3,
  '腺外延伸': 3,
  '侵犯周圍': 3,
  '外侵犯': 3,
  '突破包膜': 3,
  '穿透被膜': 3,
  '侵入周圍組織': 3,
  '侵及周圍': 3,
  '累及周圍': 3,
  'extrathyroidal': 3,
  'extra-thyroidal extension': 3,
  'extrathyroidal extension': 3,
  'extra-thyroidal': 3,
  'ETE': 3,
  'invasion': 3,
  'capsular invasion': 3,
  'capsule invasion': 3,
  'capsular breach': 3,
  'extracapsular': 3,
  'extracapsular extension': 3,
  'beyond capsule': 3,
  'through capsule': 3,
  'invading': 3,
  'invasive': 3
};

// 回音點/鈣化術語對照
const ECHOGENIC_FOCI_TERMS = {
  // 0 分：無或大彗星尾徵 (none/comet-tail)
  '無': 0,
  '無鈣化': 0,
  '沒有鈣化': 0,
  '無明顯鈣化': 0,
  '無回音點': 0,
  '無echogenic foci': 0,
  '彗星尾': 0,
  '彗星尾徵': 0,
  '大彗星尾': 0,
  '彗尾徵': 0,
  '膠質': 0,
  '膠質結節': 0,
  'none': 0,
  'no calcification': 0,
  'comet-tail': 0,
  'comet tail': 0,
  'comet-tail artifact': 0,
  'colloid': 0,

  // 1 分：粗鈣化 (macrocalcifications)
  '粗鈣化': 1,
  '大鈣化': 1,
  '粗大鈣化': 1,
  '巨鈣化': 1,
  '大型鈣化': 1,
  '鈣化斑': 1,
  '鈣化塊': 1,
  'macrocalcification': 1,
  'macrocalcifications': 1,
  'macro-calcification': 1,
  'coarse calcification': 1,
  'large calcification': 1,

  // 2 分：邊緣鈣化 (peripheral/rim calcifications)
  '邊緣鈣化': 2,
  '環狀鈣化': 2,
  '周邊鈣化': 2,
  '蛋殼鈣化': 2,
  '環形鈣化': 2,
  '圓周鈣化': 2,
  '包膜鈣化': 2,
  '被膜鈣化': 2,
  'peripheral': 2,
  'peripheral calcification': 2,
  'rim calcification': 2,
  'rim': 2,
  'eggshell calcification': 2,
  'curvilinear calcification': 2,

  // 3 分：點狀回音灶 (punctate echogenic foci)
  '點狀鈣化': 3,
  '微鈣化': 3,
  '細鈣化': 3,
  '小鈣化': 3,
  '砂粒體': 3,
  '砂礫樣鈣化': 3,
  '散在鈣化點': 3,
  '多發鈣化點': 3,
  '點狀強回音': 3,
  '點狀高回音': 3,
  '微小鈣化': 3,
  '針尖樣鈣化': 3,
  'punctate': 3,
  'punctate echogenic foci': 3,
  'microcalcification': 3,
  'microcalcifications': 3,
  'micro-calcification': 3,
  'psammoma bodies': 3,
  'small echogenic foci': 3,
  'tiny calcifications': 3
};

// 縮寫展開
const ABBREVIATIONS = {
  'FNA': 'Fine Needle Aspiration (細針抽吸)',
  'US': 'Ultrasound (超音波)',
  'TI-RADS': 'Thyroid Imaging Reporting and Data System',
  'ACR': 'American College of Radiology',
  'TR1': 'TI-RADS 1 (良性)',
  'TR2': 'TI-RADS 2 (不可疑)',
  'TR3': 'TI-RADS 3 (輕度可疑)',
  'TR4': 'TI-RADS 4 (中度可疑)',
  'TR5': 'TI-RADS 5 (高度可疑)'
};

// 中文數字對照
const CHINESE_NUMBERS = {
  '零': 0, '〇': 0,
  '一': 1, '壹': 1,
  '二': 2, '貳': 2, '兩': 2,
  '三': 3, '參': 3,
  '四': 4, '肆': 4,
  '五': 5, '伍': 5,
  '六': 6, '陸': 6,
  '七': 7, '柒': 7,
  '八': 8, '捌': 8,
  '九': 9, '玖': 9,
  '十': 10, '拾': 10
};

/**
 * 將中文數字轉換為阿拉伯數字
 * @param {string} text - 包含中文數字的文字
 * @returns {string} 轉換後的文字
 */
function convertChineseNumbers(text) {
  let result = text;
  
  // 處理「X點Y」格式 (例如：一點二 → 1.2)
  const decimalPattern = /([零一二三四五六七八九十]+)點([零一二三四五六七八九]+)/g;
  result = result.replace(decimalPattern, (match, intPart, decPart) => {
    const intNum = chineseToNumber(intPart);
    const decNum = decPart.split('').map(c => CHINESE_NUMBERS[c] || c).join('');
    return `${intNum}.${decNum}`;
  });
  
  // 處理單獨的中文數字
  for (const [chinese, arabic] of Object.entries(CHINESE_NUMBERS)) {
    result = result.replace(new RegExp(chinese, 'g'), arabic.toString());
  }
  
  return result;
}

/**
 * 將中文數字字串轉為數字
 * @param {string} chinese - 中文數字字串
 * @returns {number} 對應的數字
 */
function chineseToNumber(chinese) {
  if (!chinese) return 0;
  
  let result = 0;
  let temp = 0;
  
  for (const char of chinese) {
    const num = CHINESE_NUMBERS[char];
    if (num === undefined) continue;
    
    if (num === 10) {
      if (temp === 0) temp = 1;
      result += temp * 10;
      temp = 0;
    } else {
      temp = num;
    }
  }
  
  return result + temp;
}

/**
 * 查詢術語對應的分數
 * @param {string} term - 術語
 * @param {string} category - 類別 (C/E/S/M/F)
 * @returns {number|null} 對應的分數，找不到返回 null
 */
function lookupTermScore(term, category) {
  const normalizedTerm = term.toLowerCase().trim();
  
  const dictionaries = {
    'C': COMPOSITION_TERMS,
    'E': ECHOGENICITY_TERMS,
    'S': SHAPE_TERMS,
    'M': MARGIN_TERMS,
    'F': ECHOGENIC_FOCI_TERMS
  };
  
  const dict = dictionaries[category];
  if (!dict) return null;
  
  // 直接匹配
  if (normalizedTerm in dict) {
    return dict[normalizedTerm];
  }
  
  // 部分匹配
  for (const [key, value] of Object.entries(dict)) {
    if (normalizedTerm.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedTerm)) {
      return value;
    }
  }
  
  return null;
}

/**
 * 標準化輸入文字
 * @param {string} text - 原始輸入
 * @returns {string} 標準化後的文字
 */
function normalizeInput(text) {
  let result = text;
  
  // 轉換中文數字
  result = convertChineseNumbers(result);
  
  // 統一單位
  result = result.replace(/公分|cm|CM|厘米/g, 'cm');
  
  // 移除多餘空白
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

// 擴展位置對照表
const LOCATION_ALIASES = {
  // 右側
  '右上': 'right upper',
  '右上極': 'right upper',
  '右上方': 'right upper',
  '右葉上極': 'right upper',
  '右側上極': 'right upper',
  '右甲狀腺上極': 'right upper',
  'RU': 'right upper',
  'right upper': 'right upper',
  'right upper pole': 'right upper',

  '右中': 'right mid',
  '右中段': 'right mid',
  '右葉中段': 'right mid',
  '右側中段': 'right mid',
  'RM': 'right mid',
  'right mid': 'right mid',
  'right middle': 'right mid',

  '右下': 'right lower',
  '右下極': 'right lower',
  '右下方': 'right lower',
  '右葉下極': 'right lower',
  '右側下極': 'right lower',
  '右甲狀腺下極': 'right lower',
  'RL': 'right lower',
  'right lower': 'right lower',
  'right lower pole': 'right lower',

  // 左側
  '左上': 'left upper',
  '左上極': 'left upper',
  '左上方': 'left upper',
  '左葉上極': 'left upper',
  '左側上極': 'left upper',
  '左甲狀腺上極': 'left upper',
  'LU': 'left upper',
  'left upper': 'left upper',
  'left upper pole': 'left upper',

  '左中': 'left mid',
  '左中段': 'left mid',
  '左葉中段': 'left mid',
  '左側中段': 'left mid',
  'LM': 'left mid',
  'left mid': 'left mid',
  'left middle': 'left mid',

  '左下': 'left lower',
  '左下極': 'left lower',
  '左下方': 'left lower',
  '左葉下極': 'left lower',
  '左側下極': 'left lower',
  '左甲狀腺下極': 'left lower',
  'LL': 'left lower',
  'left lower': 'left lower',
  'left lower pole': 'left lower',

  // 峽部
  '峽部': 'isthmus',
  '峽': 'isthmus',
  '中間': 'isthmus',
  'IS': 'isthmus',
  'isthmus': 'isthmus'
};

/**
 * 標準化位置名稱
 * @param {string} location - 原始位置
 * @returns {string} 標準化位置
 */
function normalizeLocation(location) {
  const normalized = location.trim();
  return LOCATION_ALIASES[normalized] || LOCATION_ALIASES[normalized.toUpperCase()] || normalized.toLowerCase();
}

/**
 * 解析數字快速輸入格式
 * @param {string} input - 輸入文字 (例如: "右上 1.2 2 2 3 0 0")
 * @returns {Object|null} 解析結果或 null
 */
function parseNumericInput(input) {
  const normalized = normalizeInput(input);

  // 擴展位置匹配模式，支援更多變體
  const locationPattern = '(右上極?|右中段?|右下極?|左上極?|左中段?|左下極?|峽部?|右葉上極|右葉中段|右葉下極|左葉上極|左葉中段|左葉下極|RU|RM|RL|LU|LM|LL|IS|right\\s*upper|right\\s*mid|right\\s*lower|left\\s*upper|left\\s*mid|left\\s*lower|isthmus)';

  // 嘗試匹配數字模式: 位置 尺寸 C E S M F
  const pattern = new RegExp(`^${locationPattern}\\s+(\\d+\\.?\\d*)\\s*(?:cm|公分)?\\s+(\\d)\\s+(\\d)\\s+(\\d)\\s+(\\d)\\s+(\\d)$`, 'i');

  const match = normalized.match(pattern);
  if (!match) return null;

  const [, location, size, c, e, s, m, f] = match;

  return {
    location: normalizeLocation(location),
    size_cm: parseFloat(size),
    C: parseInt(c),
    E: parseInt(e),
    S: parseInt(s),
    M: parseInt(m),
    F: parseInt(f)
  };
}

/**
 * 檢測輸入模式
 * @param {string} input - 輸入文字
 * @returns {string} 'numeric', 'tirads_code', 或 'natural'
 */
function detectInputMode(input) {
  const normalized = normalizeInput(input);

  // 檢測 TIRADS XXXXX 格式（5位數字代碼）
  if (/TIRADS\s*\d{5}/i.test(normalized) || /\d+[x×\*]\d+[x×\*]\d+.*\d{5}/.test(normalized)) {
    return 'tirads_code';
  }

  // 使用更寬鬆的模式檢測數字輸入
  const locationPattern = '(右上極?|右中段?|右下極?|左上極?|左中段?|左下極?|峽部?|右葉上極|右葉中段|右葉下極|左葉上極|左葉中段|左葉下極|RU|RM|RL|LU|LM|LL|IS|right\\s*upper|right\\s*mid|right\\s*lower|left\\s*upper|left\\s*mid|left\\s*lower|isthmus)';
  const numericPattern = new RegExp(`^${locationPattern}\\s+[\\d.]+\\s*(?:cm|公分)?\\s+\\d\\s+\\d\\s+\\d\\s+\\d\\s+\\d$`, 'i');
  return numericPattern.test(normalized) ? 'numeric' : 'natural';
}

/**
 * 解析 TIRADS 代碼格式
 * 格式: "右側甲狀腺結節2.1x1.2x2.3，TIRADS 12001"
 * 或: "左側甲狀腺結節4.1x2.3x5.3，TIRADS 23033"
 *
 * TIRADS 5位數字代表: C E S M F
 * @param {string} input - 輸入文字
 * @returns {Object|null} 解析結果
 */
function parseTiradsCodeInput(input) {
  const normalized = normalizeInput(input);

  // 支援多個結節（以分號、換行分隔）
  const parts = normalized.split(/[;；\n]/).map(s => s.trim()).filter(s => s);
  const nodules = [];

  for (const part of parts) {
    const nodule = parseSingleTiradsCode(part);
    if (nodule) {
      nodules.push(nodule);
    }
  }

  return nodules.length > 0 ? nodules : null;
}

/**
 * 解析單個 TIRADS 代碼輸入
 * @param {string} input - 單個結節描述
 * @returns {Object|null} 解析結果
 */
function parseSingleTiradsCode(input) {
  // 提取位置（右側/左側/峽部）
  let location = 'unknown';
  if (/右側|右葉|右甲/.test(input)) {
    if (/上極|上/.test(input)) location = 'right upper';
    else if (/下極|下/.test(input)) location = 'right lower';
    else location = 'right mid';
  } else if (/左側|左葉|左甲/.test(input)) {
    if (/上極|上/.test(input)) location = 'left upper';
    else if (/下極|下/.test(input)) location = 'left lower';
    else location = 'left mid';
  } else if (/峽部|峽/.test(input)) {
    location = 'isthmus';
  }

  // 提取尺寸（支援多種格式）
  let dimensions = null;
  let size_cm = null;
  let volume_ml = null;

  // 格式: 2.1x1.2x2.3 或 2.1×1.2×2.3 或 2.1*1.2*2.3
  const dimMatch = input.match(/(\d+\.?\d*)\s*[x×\*]\s*(\d+\.?\d*)\s*[x×\*]\s*(\d+\.?\d*)/i);
  if (dimMatch) {
    const [, l, w, h] = dimMatch;
    dimensions = {
      length: parseFloat(l),
      width: parseFloat(w),
      height: parseFloat(h)
    };
    size_cm = Math.max(dimensions.length, dimensions.width, dimensions.height);
    // 計算體積: V = 0.524 × L × W × H
    volume_ml = Math.round(0.524 * dimensions.length * dimensions.width * dimensions.height * 100) / 100;
  } else {
    // 格式: 2.1x1.2 或單一尺寸 2.3cm
    const dim2Match = input.match(/(\d+\.?\d*)\s*[x×\*]\s*(\d+\.?\d*)/i);
    if (dim2Match) {
      const [, l, w] = dim2Match;
      dimensions = {
        length: parseFloat(l),
        width: parseFloat(w)
      };
      size_cm = Math.max(dimensions.length, dimensions.width);
    } else {
      const sizeMatch = input.match(/(\d+\.?\d*)\s*(?:cm|公分)/i);
      if (sizeMatch) {
        size_cm = parseFloat(sizeMatch[1]);
      }
    }
  }

  // 提取 TIRADS 代碼（5位數字）
  const tiradsMatch = input.match(/TIRADS\s*(\d{5})/i) || input.match(/(\d{5})$/);
  if (!tiradsMatch) return null;

  const code = tiradsMatch[1];
  const C = parseInt(code[0]);
  const E = parseInt(code[1]);
  const S = parseInt(code[2]);
  const M = parseInt(code[3]);
  const F = parseInt(code[4]);

  // 驗證並修正分數
  const validation = validateAndCorrectScores({ C, E, S, M, F }, true);
  const scores = validation.scores;

  // 計算總分和分類
  const total = calculateTotalScore(scores.C, scores.E, scores.S, scores.M, scores.F);
  const category = getTiRadsCategory(total);

  // 取得描述文字
  const desc = scoresToDescription(scores);

  // 取得建議
  const recommendation = size_cm ? getRecommendation(category, size_cm) : null;

  const result = {
    location,
    size_cm,
    tirads: {
      C: scores.C,
      E: scores.E,
      S: scores.S,
      M: scores.M,
      F: scores.F,
      total,
      category,
      composition: desc.composition,
      echogenicity: desc.echogenicity,
      shape: desc.shape,
      margin: desc.margin,
      echogenicFoci: desc.echogenicFoci
    }
  };

  if (dimensions) {
    result.dimensions = dimensions;
  }
  if (volume_ml) {
    result.volume_ml = volume_ml;
  }
  if (recommendation) {
    result.recommendation = recommendation;
  }
  if (validation.corrections && validation.corrections.length > 0) {
    result.auto_corrections = validation.corrections;
  }

  return result;
}
