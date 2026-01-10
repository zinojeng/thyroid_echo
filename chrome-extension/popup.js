/**
 * Thyroid Echo Report - Chrome Extension
 * 語音輸入甲狀腺超音波報告
 */

// API 端點（寫死）
const API_URL = 'https://script.google.com/macros/s/AKfycbyEZoSW4SlFTnCoFJBTUBUOfuzwUw2pzRito5STgk9dnK9P_NfEzxc_39MLabowbEaa/exec';

// DOM 元素
let elements = {};

// 狀態
let isRecording = false;
let recognition = null;
let currentResult = null;

// 初始化
document.addEventListener('DOMContentLoaded', init);

function init() {
  // 取得 DOM 元素
  elements = {
    settingsSection: document.getElementById('settings-section'),
    inputSection: document.getElementById('input-section'),
    resultSection: document.getElementById('result-section'),
    apiKey: document.getElementById('api-key'),
    provider: document.getElementById('provider'),
    saveSettings: document.getElementById('save-settings'),
    recordBtn: document.getElementById('record-btn'),
    recordStatus: document.getElementById('record-status'),
    recordingIndicator: document.getElementById('recording-indicator'),
    transcript: document.getElementById('transcript'),
    analyzeBtn: document.getElementById('analyze-btn'),
    resultContainer: document.getElementById('result-container'),
    insertBtn: document.getElementById('insert-btn'),
    copyBtn: document.getElementById('copy-btn'),
    clearBtn: document.getElementById('clear-btn'),
    errorMessage: document.getElementById('error-message'),
    loading: document.getElementById('loading'),
    toggleSettings: document.getElementById('toggle-settings')
  };

  // 載入設定
  loadSettings();

  // 綁定事件
  elements.saveSettings.addEventListener('click', saveSettings);
  elements.recordBtn.addEventListener('click', toggleRecording);
  elements.analyzeBtn.addEventListener('click', analyzeReport);
  elements.insertBtn.addEventListener('click', insertToPage);
  elements.copyBtn.addEventListener('click', copyReport);
  elements.clearBtn.addEventListener('click', clearResult);
  elements.toggleSettings.addEventListener('click', toggleSettingsPanel);

  // 初始化語音識別
  initSpeechRecognition();
}

// 載入設定
function loadSettings() {
  chrome.storage.local.get(['apiKey', 'provider'], (result) => {
    if (result.apiKey) {
      elements.apiKey.value = result.apiKey;
      elements.settingsSection.classList.add('hidden');
    }
    if (result.provider) {
      elements.provider.value = result.provider;
    }
  });
}

// 儲存設定
function saveSettings() {
  const apiKey = elements.apiKey.value.trim();
  const provider = elements.provider.value;

  if (!apiKey) {
    showError('請輸入 API Key');
    return;
  }

  chrome.storage.local.set({ apiKey, provider }, () => {
    elements.settingsSection.classList.add('hidden');
    showSuccess('設定已儲存');
  });
}

// 切換設定面板
function toggleSettingsPanel() {
  elements.settingsSection.classList.toggle('hidden');
}

// 初始化語音識別
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    elements.recordBtn.disabled = true;
    elements.recordStatus.textContent = '瀏覽器不支援語音輸入';
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'zh-TW';

  recognition.onstart = () => {
    isRecording = true;
    elements.recordBtn.classList.add('recording');
    elements.recordStatus.textContent = '錄音中，點擊停止';
    elements.recordingIndicator.classList.remove('hidden');
  };

  recognition.onend = () => {
    isRecording = false;
    elements.recordBtn.classList.remove('recording');
    elements.recordStatus.textContent = '點擊開始錄音';
    elements.recordingIndicator.classList.add('hidden');
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      elements.transcript.value += finalTranscript;
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showError('請允許麥克風權限');
    } else {
      showError('語音識別錯誤: ' + event.error);
    }
  };
}

// 切換錄音
function toggleRecording() {
  if (!recognition) {
    showError('語音識別未初始化');
    return;
  }

  if (isRecording) {
    recognition.stop();
  } else {
    elements.transcript.value = '';
    recognition.start();
  }
}

// 分析報告
async function analyzeReport() {
  const input = elements.transcript.value.trim();

  if (!input) {
    showError('請先輸入或錄音口述內容');
    return;
  }

  // 取得 API Key
  const settings = await chrome.storage.local.get(['apiKey', 'provider']);

  if (!settings.apiKey) {
    showError('請先設定 API Key');
    elements.settingsSection.classList.remove('hidden');
    return;
  }

  // 顯示載入中
  showLoading(true);
  hideError();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: input,
        api_key: settings.apiKey,
        provider: settings.provider !== 'auto' ? settings.provider : undefined
      })
    });

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.error || '分析失敗');
    }

    currentResult = result;
    displayResult(result);

  } catch (error) {
    console.error('API Error:', error);
    showError('分析失敗: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// 顯示結果
function displayResult(result) {
  elements.resultSection.classList.remove('hidden');

  let html = '';

  if (result.nodules && result.nodules.length > 0) {
    result.nodules.forEach((nodule, index) => {
      const categoryClass = getCategoryClass(nodule.tirads?.category);

      html += `
        <div class="nodule-card ${categoryClass}">
          <div class="nodule-header">
            <span class="nodule-id">結節 ${nodule.id || index + 1}</span>
            <span class="nodule-category">${nodule.tirads?.category || 'N/A'}</span>
          </div>
          <div class="nodule-body">
            <div class="nodule-info">
              <span class="label">位置：</span>
              <span class="value">${nodule.location || 'N/A'}</span>
            </div>
            <div class="nodule-info">
              <span class="label">大小：</span>
              <span class="value">${nodule.size_cm || 'N/A'} cm</span>
            </div>
            <div class="nodule-scores">
              <span class="score">C:${nodule.tirads?.C ?? '-'}</span>
              <span class="score">E:${nodule.tirads?.E ?? '-'}</span>
              <span class="score">S:${nodule.tirads?.S ?? '-'}</span>
              <span class="score">M:${nodule.tirads?.M ?? '-'}</span>
              <span class="score">F:${nodule.tirads?.F ?? '-'}</span>
              <span class="score total">= ${nodule.tirads?.total ?? '-'}</span>
            </div>
          </div>
          <div class="nodule-recommendation">
            ${nodule.recommendation || ''}
          </div>
        </div>
      `;
    });
  }

  if (result.impression) {
    html += `
      <div class="impression">
        <strong>Impression:</strong> ${result.impression}
      </div>
    `;
  }

  if (result.recommendation) {
    html += `
      <div class="overall-recommendation">
        <strong>建議：</strong> ${result.recommendation}
      </div>
    `;
  }

  elements.resultContainer.innerHTML = html;
}

// 取得分類顏色 class
function getCategoryClass(category) {
  const classes = {
    'TR1': 'category-tr1',
    'TR2': 'category-tr2',
    'TR3': 'category-tr3',
    'TR4': 'category-tr4',
    'TR5': 'category-tr5'
  };
  return classes[category] || '';
}

// 插入到網頁
async function insertToPage() {
  if (!currentResult) {
    showError('沒有可插入的報告');
    return;
  }

  const reportText = formatReportText(currentResult);

  // 發送訊息給 content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'insertReport',
      text: reportText
    });
    showSuccess('報告已插入');
  } catch (error) {
    // 如果 content script 沒有載入，嘗試注入
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // 再次嘗試發送
      await chrome.tabs.sendMessage(tab.id, {
        action: 'insertReport',
        text: reportText
      });
      showSuccess('報告已插入');
    } catch (e) {
      showError('無法插入到此頁面');
    }
  }
}

// 複製報告
function copyReport() {
  if (!currentResult) {
    showError('沒有可複製的報告');
    return;
  }

  const reportText = formatReportText(currentResult);

  navigator.clipboard.writeText(reportText).then(() => {
    showSuccess('已複製到剪貼簿');
  }).catch(() => {
    showError('複製失敗');
  });
}

// 格式化報告文字
function formatReportText(result) {
  let text = '';

  if (result.nodules && result.nodules.length > 0) {
    result.nodules.forEach((nodule, index) => {
      text += `Nodule ${nodule.id || index + 1}: `;
      text += `${nodule.location || ''}, ${nodule.size_cm || ''} cm, `;
      text += `TI-RADS ${nodule.tirads?.category || ''} `;
      text += `(C${nodule.tirads?.C ?? ''} E${nodule.tirads?.E ?? ''} S${nodule.tirads?.S ?? ''} M${nodule.tirads?.M ?? ''} F${nodule.tirads?.F ?? ''} = ${nodule.tirads?.total ?? ''})\n`;
    });
  }

  if (result.impression) {
    text += `\nImpression: ${result.impression}\n`;
  }

  if (result.recommendation) {
    text += `Recommendation: ${result.recommendation}\n`;
  }

  return text.trim();
}

// 清除結果
function clearResult() {
  currentResult = null;
  elements.resultContainer.innerHTML = '';
  elements.resultSection.classList.add('hidden');
  elements.transcript.value = '';
}

// 顯示錯誤
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  setTimeout(() => {
    elements.errorMessage.classList.add('hidden');
  }, 5000);
}

// 隱藏錯誤
function hideError() {
  elements.errorMessage.classList.add('hidden');
}

// 顯示成功
function showSuccess(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.errorMessage.classList.add('success');
  setTimeout(() => {
    elements.errorMessage.classList.add('hidden');
    elements.errorMessage.classList.remove('success');
  }, 3000);
}

// 顯示/隱藏載入中
function showLoading(show) {
  if (show) {
    elements.loading.classList.remove('hidden');
    elements.analyzeBtn.disabled = true;
  } else {
    elements.loading.classList.add('hidden');
    elements.analyzeBtn.disabled = false;
  }
}
