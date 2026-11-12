/* साहित्य सूत्रधार — चुने हुए अंश का चित्र शेयर सुधार
   2026-11-12 | Load this file AFTER app.js on index.html and mobile-app.html.
*/
(() => {
  'use strict';

  const FIX_KEY = '__SS_EXCERPT_SHARE_DIALOG_FIX_20261112__';
  if (window[FIX_KEY]) return;
  window[FIX_KEY] = true;

  let savedSelection = { workId: '', text: '' };
  let activeObjectUrl = '';

  const workIdNow = () => {
    try {
      return typeof currentReaderId !== 'undefined' && currentReaderId != null
        ? String(currentReaderId)
        : '';
    } catch (_) {
      return '';
    }
  };

  const notify = (message) => {
    try {
      if (typeof toast === 'function') toast(message);
      else window.alert(message);
    } catch (_) {
      window.alert(message);
    }
  };

  function getStory() {
    try {
      if (typeof state === 'undefined' || !Array.isArray(state.stories)) return null;
      const id = workIdNow();
      return state.stories.find((item) => String(item.id) === id) || null;
    } catch (_) {
      return null;
    }
  }

  function readSelectionInsideReader() {
    const body = document.getElementById('readerBody');
    const selection = window.getSelection?.();
    if (!body || !selection || selection.isCollapsed || !selection.toString().trim()) return '';
    if (!selection.anchorNode || !selection.focusNode) return '';
    if (!body.contains(selection.anchorNode) || !body.contains(selection.focusNode)) return '';
    return selection.toString().trim();
  }

  function captureSelection() {
    const text = readSelectionInsideReader();
    if (!text) return;
    savedSelection = { workId: workIdNow(), text };
  }

  document.addEventListener('selectionchange', captureSelection, { passive: true });
  document.addEventListener('pointerdown', (event) => {
    if (event.target?.closest?.('#shareExcerptImage')) captureSelection();
  }, true);
  document.addEventListener('touchstart', (event) => {
    if (event.target?.closest?.('#shareExcerptImage')) captureSelection();
  }, { capture: true, passive: true });
  document.addEventListener('mousedown', (event) => {
    if (event.target?.closest?.('#shareExcerptImage')) captureSelection();
  }, true);

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || '').split(/\s+/u).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);

    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
      let last = visible[visible.length - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) {
        last = Array.from(last).slice(0, -1).join('');
      }
      visible[visible.length - 1] = `${last}…`;
    }
    visible.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
    return visible.length;
  }

  function addPreviewStyles() {
    if (document.getElementById('ssExcerptPreviewStyles')) return;
    const style = document.createElement('style');
    style.id = 'ssExcerptPreviewStyles';
    style.textContent = `
      dialog.ss-excerpt-preview-dialog { border:0; padding:0; margin:auto; width:min(520px,calc(100vw - 24px)); max-width:calc(100vw - 24px); max-height:92dvh; overflow:visible; background:transparent; color:#321b1c; }
      dialog.ss-excerpt-preview-dialog::backdrop { background:rgba(12,8,10,.88); backdrop-filter:blur(3px); }
      .ss-excerpt-preview-panel { box-sizing:border-box; max-height:92dvh; overflow:auto; padding:16px; border-radius:18px; background:#fffaf0; color:#321b1c; box-shadow:0 12px 48px #0008; text-align:center; }
      .ss-excerpt-preview-panel h2 { margin:4px 0 12px; font:700 20px/1.4 system-ui,sans-serif; }
      .ss-excerpt-preview-image { display:block; width:auto; max-width:100%; max-height:66dvh; object-fit:contain; margin:0 auto 14px; border-radius:8px; }
      .ss-excerpt-preview-actions { display:flex; flex-wrap:wrap; gap:9px; justify-content:center; }
      .ss-excerpt-preview-actions button { min-height:44px; border:0; border-radius:10px; padding:11px 15px; background:#641f2b; color:#fff; font:600 15px/1.3 system-ui,sans-serif; }
      .ss-excerpt-preview-actions button:disabled { opacity:.55; }
    `;
    document.head.appendChild(style);
  }

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sahitya-sutradhar-excerpt.png';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function showPreview(blob, story) {
    addPreviewStyles();
    document.getElementById('ssExcerptPreviewDialog')?.remove();
    if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = URL.createObjectURL(blob);

    const dialog = document.createElement('dialog');
    dialog.id = 'ssExcerptPreviewDialog';
    dialog.className = 'ss-excerpt-preview-dialog';
    dialog.setAttribute('aria-label', 'चुने हुए अंश का चित्र');

    const panel = document.createElement('div');
    panel.className = 'ss-excerpt-preview-panel';
    const heading = document.createElement('h2');
    heading.textContent = 'चुने हुए अंश का चित्र';

    const image = document.createElement('img');
    image.className = 'ss-excerpt-preview-image';
    image.src = activeObjectUrl;
    image.alt = 'चुने हुए अंश का साझा करने योग्य चित्र';

    const actions = document.createElement('div');
    actions.className = 'ss-excerpt-preview-actions';
    const makeButton = (label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      return button;
    };
    const shareButton = makeButton('शेयर करें');
    const downloadButton = makeButton('चित्र डाउनलोड करें');
    const backButton = makeButton('वापस जाएँ');

    shareButton.addEventListener('click', async () => {
      const file = new File([blob], 'sahitya-sutradhar-excerpt.png', { type: 'image/png' });
      let canShareFile = typeof navigator.share === 'function';
      if (canShareFile && typeof navigator.canShare === 'function') {
        try { canShareFile = navigator.canShare({ files: [file] }); }
        catch (_) { canShareFile = false; }
      }
      if (!canShareFile) {
        downloadBlob(blob);
        notify('इस ब्राउज़र में चित्र का सीधा शेयर उपलब्ध नहीं है। चित्र डाउनलोड हुआ है; अब उसे अपने शेयर विकल्प से भेजें।');
        return;
      }
      shareButton.disabled = true;
      try {
        await navigator.share({
          files: [file],
          title: story.title || 'साहित्य सूत्रधार',
          text: `साहित्य सूत्रधार पर पढ़ें — ${story.author || 'अनाम लेखक'}`
        });
      } catch (error) {
        if (error?.name !== 'AbortError') {
          notify('चित्र शेयर नहीं हो सका। चित्र डाउनलोड करके साझा कर सकते हैं।');
        }
      } finally {
        shareButton.disabled = false;
      }
    });

    downloadButton.addEventListener('click', () => {
      downloadBlob(blob);
      notify('चुने हुए अंश का चित्र डाउनलोड हो गया।');
    });

    const closePreview = () => {
      try { if (dialog.open) dialog.close(); } catch (_) {}
      dialog.remove();
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
        activeObjectUrl = '';
      }
    };
    backButton.addEventListener('click', closePreview);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closePreview();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closePreview();
    });

    actions.append(shareButton, downloadButton, backButton);
    panel.append(heading, image, actions);
    dialog.append(panel);
    document.body.append(dialog);

    // A real modal dialog enters the browser's top layer. A normal DIV with a
    // large z-index cannot cover readerDialog because readerDialog is already
    // in the top layer; this is the key visibility fix.
    try {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else {
        dialog.setAttribute('open', '');
        dialog.style.position = 'fixed';
        dialog.style.inset = '0';
        dialog.style.zIndex = '2147483647';
        dialog.style.background = 'rgba(12,8,10,.96)';
        dialog.style.padding = '16px';
      }
    } catch (error) {
      console.error('Excerpt preview could not open:', error);
      dialog.remove();
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = '';
      notify('चित्र बना, लेकिन प्रीव्यू नहीं खुल सका। कृपया फिर प्रयास करें।');
    }
  }

  async function createAndShowExcerpt() {
    const story = getStory();
    if (!story) {
      notify('पहले कोई रचना खोलें।');
      return;
    }

    captureSelection();
    const selected = savedSelection.workId === workIdNow() ? savedSelection.text : '';
    if (!selected) {
      notify('पहले रचना के पृष्ठ में अपना अंश चुनें, फिर इस बटन को दबाएँ।');
      return;
    }
    if (selected.length > 1800) {
      notify('कृपया 1800 अक्षरों से छोटा अंश चुनें।');
      return;
    }

    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas उपलब्ध नहीं है।');

      const gradient = context.createLinearGradient(0, 0, 1080, 1350);
      gradient.addColorStop(0, '#5b1d28');
      gradient.addColorStop(1, '#9a7047');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1080, 1350);

      context.strokeStyle = '#e8cf9d';
      context.lineWidth = 4;
      context.strokeRect(42, 42, 996, 1266);

      context.textAlign = 'center';
      context.fillStyle = '#f6dfb5';
      context.font = "700 40px 'Noto Sans Devanagari','Nirmala UI','Mangal',sans-serif";
      context.fillText('साहित्य सूत्रधार', 540, 142);

      context.fillStyle = '#fff8e9';
      context.font = "700 46px 'Noto Sans Devanagari','Nirmala UI','Mangal',sans-serif";
      wrapCanvasText(context, story.title || 'रचना', 540, 245, 860, 60, 3);

      context.strokeStyle = '#d9b56e';
      context.beginPath();
      context.moveTo(160, 405);
      context.lineTo(920, 405);
      context.stroke();

      context.textAlign = 'left';
      context.fillStyle = '#fffaf0';
      context.font = "36px 'Noto Sans Devanagari','Nirmala UI','Mangal',sans-serif";
      wrapCanvasText(context, selected, 140, 485, 800, 56, 10);

      context.textAlign = 'center';
      context.fillStyle = '#f5dcae';
      context.font = "700 30px 'Noto Sans Devanagari','Nirmala UI','Mangal',sans-serif";
      context.fillText(`— ${story.author || 'अनाम लेखक'}`, 540, 1160);
      context.font = '22px sans-serif';
      context.fillText(`${location.href.split('#')[0]}#work-${story.id}`, 540, 1220);

      const blob = await new Promise((resolve, reject) => {
        try { canvas.toBlob((value) => value ? resolve(value) : reject(new Error('चित्र निर्यात नहीं हो सका।')), 'image/png'); }
        catch (error) { reject(error); }
      });
      showPreview(blob, story);
    } catch (error) {
      console.error('Excerpt image generation failed:', error);
      notify('चुने हुए अंश का चित्र तैयार नहीं हो सका। कृपया फिर प्रयास करें।');
    }
  }

  function bindShareButton() {
    const button = document.getElementById('shareExcerptImage');
    if (!button || button.dataset.ssExcerptDialogFix === '1') return;
    button.dataset.ssExcerptDialogFix = '1';

    // Capture phase runs before app.js's old bubbling click handler. Stop it
    // so the old DIV-based preview cannot be invoked behind readerDialog.
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      createAndShowExcerpt();
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindShareButton, { once: true });
  } else {
    bindShareButton();
  }
})();
                                                 
