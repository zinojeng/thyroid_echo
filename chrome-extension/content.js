/**
 * Thyroid Echo Report - Content Script
 * 負責將報告插入到當前網頁
 */

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertReport') {
    const success = insertTextToPage(request.text);
    sendResponse({ success });
  }
  return true;
});

/**
 * 插入文字到當前頁面的可編輯元素
 * @param {string} text - 要插入的文字
 * @returns {boolean} 是否成功
 */
function insertTextToPage(text) {
  // 嘗試找到當前聚焦的元素
  let target = document.activeElement;

  // 如果不是可編輯元素，嘗試找到頁面上的第一個可編輯元素
  if (!isEditable(target)) {
    target = findEditableElement();
  }

  if (!target) {
    // 如果找不到可編輯元素，嘗試建立一個通知
    showNotification('找不到可編輯的輸入框，報告已複製到剪貼簿');
    copyToClipboard(text);
    return false;
  }

  // 插入文字
  insertText(target, text);
  return true;
}

/**
 * 檢查元素是否可編輯
 * @param {Element} element
 * @returns {boolean}
 */
function isEditable(element) {
  if (!element) return false;

  const tagName = element.tagName?.toLowerCase();
  const contentEditable = element.contentEditable === 'true';
  const isInput = tagName === 'input' && ['text', 'search', 'url', 'tel', 'email', 'password'].includes(element.type);
  const isTextarea = tagName === 'textarea';

  return isInput || isTextarea || contentEditable;
}

/**
 * 找到頁面上的可編輯元素
 * @returns {Element|null}
 */
function findEditableElement() {
  // 優先順序：textarea > input[type=text] > contenteditable

  // 1. 找 textarea
  const textareas = document.querySelectorAll('textarea:not([readonly]):not([disabled])');
  for (const ta of textareas) {
    if (isVisible(ta)) return ta;
  }

  // 2. 找 input[type=text]
  const inputs = document.querySelectorAll('input[type="text"]:not([readonly]):not([disabled]), input:not([type]):not([readonly]):not([disabled])');
  for (const input of inputs) {
    if (isVisible(input)) return input;
  }

  // 3. 找 contenteditable
  const editables = document.querySelectorAll('[contenteditable="true"]');
  for (const el of editables) {
    if (isVisible(el)) return el;
  }

  return null;
}

/**
 * 檢查元素是否可見
 * @param {Element} element
 * @returns {boolean}
 */
function isVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0' &&
         element.offsetParent !== null;
}

/**
 * 插入文字到元素
 * @param {Element} element
 * @param {string} text
 */
function insertText(element, text) {
  const tagName = element.tagName?.toLowerCase();

  if (tagName === 'input' || tagName === 'textarea') {
    // 對於 input 和 textarea
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const value = element.value;

    // 在游標位置插入文字
    element.value = value.substring(0, start) + text + value.substring(end);

    // 移動游標到插入文字後面
    const newPosition = start + text.length;
    element.setSelectionRange(newPosition, newPosition);

    // 觸發事件讓 React/Vue 等框架知道值已改變
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

  } else if (element.contentEditable === 'true') {
    // 對於 contenteditable 元素
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    // 刪除選中的內容（如果有）
    range.deleteContents();

    // 插入新文字
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // 移動游標到插入文字後面
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    // 觸發事件
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 聚焦元素
  element.focus();
}

/**
 * 複製到剪貼簿
 * @param {string} text
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy:', err);
  });
}

/**
 * 顯示通知
 * @param {string} message
 */
function showNotification(message) {
  // 建立通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  // 加入動畫樣式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // 3 秒後移除
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 3000);
}
