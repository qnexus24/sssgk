/**
 * practice/js/ui/components.js
 * Safe DOM creation helpers and accessible modal dialogs.
 * Enforces textContent escaping to prevent XSS.
 */

/**
 * Creates an element with attributes, class names, and textContent.
 * @param {string} tag
 * @param {object} [attrs={}]
 * @param {string|Node|Node[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = null) {
  const elem = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className' || key === 'class') {
      elem.className = val;
    } else if (key.startsWith('on') && typeof val === 'function') {
      elem.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'dataset' && typeof val === 'object') {
      for (const [dKey, dVal] of Object.entries(val)) {
        elem.dataset[dKey] = dVal;
      }
    } else if (val !== false && val !== null && val !== undefined) {
      elem.setAttribute(key, val === true ? '' : val);
    }
  }

  if (children !== null && children !== undefined) {
    if (Array.isArray(children)) {
      for (const child of children) {
        if (typeof child === 'string' || typeof child === 'number') {
          elem.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
          elem.appendChild(child);
        }
      }
    } else if (typeof children === 'string' || typeof children === 'number') {
      elem.textContent = String(children);
    } else if (children instanceof Node) {
      elem.appendChild(children);
    }
  }

  return elem;
}

/**
 * Displays an accessible modal dialog.
 * @param {object} options
 * @param {string} options.title
 * @param {HTMLElement|string} options.body
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.cancelText='Cancel']
 * @param {() => void} [options.onConfirm]
 * @param {() => void} [options.onCancel]
 * @returns {{ close: () => void }}
 */
export function showModal({ title, body, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
  const overlay = el('div', { className: 'modal-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' });
  const box = el('div', { className: 'modal-box' });

  const header = el('div', { className: 'modal-header' }, [
    el('h3', { id: 'modal-title' }, title)
  ]);

  const bodyEl = el('div', { className: 'modal-body' }, typeof body === 'string' ? body : [body]);

  const cancelBtn = el('button', {
    className: 'btn btn-outline',
    type: 'button',
    onClick: () => {
      close();
      if (typeof onCancel === 'function') onCancel();
    }
  }, cancelText);

  const confirmBtn = el('button', {
    className: 'btn btn-gold',
    type: 'button',
    onClick: () => {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    }
  }, confirmText);

  const footer = el('div', { className: 'modal-footer' }, [cancelBtn, confirmBtn]);

  box.appendChild(header);
  box.appendChild(bodyEl);
  box.appendChild(footer);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      close();
      if (typeof onCancel === 'function') onCancel();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  function close() {
    window.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  confirmBtn.focus();

  return { close };
}

/**
 * Formats seconds into MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

