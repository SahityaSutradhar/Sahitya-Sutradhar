/* साहित्य सूत्रधार — साहित्यिक अंश चयन 2.0
 * Adds a premium selection mode, golden highlight, draggable range markers,
 * and a contextual literary toolbar. Works with the existing share button.
 * Load after app.js (and after excerpt-share-fix.js, when that add-on is used).
 */
(() => {
  'use strict';

  const BUILD = '20261112-literary-selection-2';
  if (window.__SS_LITERARY_SELECTION_BUILD__ === BUILD) return;
  window.__SS_LITERARY_SELECTION_BUILD__ = BUILD;

  const I18N = {
    hi: {
      button: '✦ साहित्यिक अंश चुनें', active: '✦ चयन मोड चालू',
      hint: 'पहले आरंभ का शब्द स्पर्श करें, फिर अंतिम शब्द।', stepEnd: 'अब उस अंश का अंतिम शब्द स्पर्श करें।',
      ready: 'अब रचना में शब्दों को चुनें।', selected: 'चयनित अंश',
      make: '✦ चित्र बनाएँ', copy: 'प्रतिलिपि करें', clear: 'चयन हटाएँ',
      copied: 'चुना हुआ अंश प्रतिलिपि हो गया।', noCopy: 'प्रतिलिपि नहीं हो सकी।',
      off: 'चयन मोड बंद किया गया।',
      long: 'अंश बहुत बड़ा है। कृपया 1800 अक्षरों से छोटा अंश चुनें।',
      noText: 'पहले रचना के भीतर कोई अंश चुनें।'
    },
    en: {
      button: '✦ Literary selection', active: '✦ Selection mode on',
      hint: 'Tap the first word, then tap the final word of your passage.', stepEnd: 'Now tap the final word of the passage.',
      ready: 'Now select words in the work.', selected: 'Selected passage',
      make: '✦ Create image', copy: 'Copy text', clear: 'Clear selection',
      copied: 'Selected passage copied.', noCopy: 'Could not copy the passage.',
      off: 'Selection mode turned off.',
      long: 'The passage is too long. Select fewer than 1,800 characters.',
      noText: 'Select a passage inside the work first.'
    },
    mr: {
      button: '✦ साहित्यिक उतारा निवडा', active: '✦ निवड मोड सुरू',
      hint: 'प्रथम सुरुवातीच्या शब्दाला स्पर्श करा, नंतर शेवटच्या शब्दाला.', stepEnd: 'आता उताऱ्यातील शेवटच्या शब्दाला स्पर्श करा.',
      ready: 'आता रचनेतील शब्द निवडा.', selected: 'निवडलेला उतारा',
      make: '✦ चित्र तयार करा', copy: 'मजकूर कॉपी करा', clear: 'निवड काढा',
      copied: 'निवडलेला उतारा कॉपी झाला.', noCopy: 'उतारा कॉपी करता आला नाही.',
      off: 'निवड मोड बंद केला.',
      long: 'उतारा खूप मोठा आहे. कृपया १,८०० अक्षरांपेक्षा लहान उतारा निवडा.',
      noText: 'प्रथम रचनेतील एखादा उतारा निवडा.'
    },
    sa: {
      button: '✦ साहित्यिकांशं चिनुत', active: '✦ चयनविधिः प्रवर्तितः',
      hint: 'प्रथमम् आरम्भशब्दं स्पृशतु, ततः अन्तिमशब्दम्।', stepEnd: 'अधुना अंशस्य अन्तिमशब्दं स्पृशतु।',
      ready: 'अधुना रचनायाः शब्दान् चिनुत।', selected: 'चयनितः अंशः',
      make: '✦ चित्रं रचयतु', copy: 'पाठं प्रतिलिखतु', clear: 'चयनं निष्कासयतु',
      copied: 'चयनितः अंशः प्रतिलिखितः।', noCopy: 'अंशः प्रतिलिपितः न अभवत्।',
      off: 'चयनविधिः निरस्तः।',
      long: 'अंशः अतिदीर्घः अस्ति। कृपया १८०० अक्षरेभ्यः लघुं अंशं चिनुत।',
      noText: 'प्रथमं रचनायाः अन्तः अंशं चिनुत।'
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const getLang = () => {
    const candidate = document.documentElement.dataset.uiLanguage ||
      $('#layoutLanguage')?.value || document.documentElement.lang || 'hi';
    return I18N[candidate] ? candidate : 'hi';
  };
  const t = (key) => I18N[getLang()][key] || I18N.hi[key] || key;
  const announce = (message) => {
    try {
      if (typeof window.toast === 'function') window.toast(message);
      else {
        let note = $('#ssLiteraryLiveNote');
        if (!note) {
          note = document.createElement('div');
          note.id = 'ssLiteraryLiveNote';
          note.className = 'ss-literary-live-note';
          note.setAttribute('role', 'status');
          document.body.append(note);
        }
        note.textContent = message;
        note.classList.add('is-visible');
        window.setTimeout(() => note.classList.remove('is-visible'), 2200);
      }
    } catch (_) { /* UI enhancement must never disrupt the reader. */ }
  };

  let readerBody = null;
  let readerDialog = null;
  let control = null;
  let modeButton = null;
  let hint = null;
  let layer = null;
  let actionBar = null;
  let startHandle = null;
  let endHandle = null;
  let active = false;
  let lastBodyText = '';
  let selectedRange = null;
  let selectedText = '';
  let pendingStart = null;
  let pendingStartEnd = 0;
  let tapStart = null;
  let dragState = null;
  let repositionFrame = 0;
  let initialized = false;
  let bootObserver = null;

  function makeButton(className, label, title) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    if (title) button.setAttribute('aria-label', title);
    return button;
  }

  function createUI() {
    readerBody = $('#readerBody');
    readerDialog = $('#readerDialog');
    if (!readerBody || !readerDialog) return false;

    control = $('#ssLiterarySelectionControl');
    if (!control) {
      control = document.createElement('section');
      control.id = 'ssLiterarySelectionControl';
      control.className = 'ss-literary-selection-control';
      control.setAttribute('aria-label', 'Literary text selection');
      modeButton = makeButton('ss-literary-mode-button', t('button'));
      modeButton.setAttribute('aria-pressed', 'false');
      hint = document.createElement('p');
      hint.className = 'ss-literary-selection-hint';
      hint.textContent = t('hint');
      control.append(modeButton, hint);
      readerBody.parentNode.insertBefore(control, readerBody);
      modeButton.addEventListener('click', toggleMode);
    } else {
      modeButton = $('.ss-literary-mode-button', control);
      hint = $('.ss-literary-selection-hint', control);
    }

    layer = $('#ssLiterarySelectionLayer', readerDialog);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'ssLiterarySelectionLayer';
      layer.className = 'ss-literary-selection-layer';
      layer.setAttribute('aria-label', t('selected'));
      layer.hidden = true;

      actionBar = document.createElement('div');
      actionBar.className = 'ss-literary-selection-actions';
      actionBar.setAttribute('role', 'toolbar');
      actionBar.setAttribute('aria-label', t('selected'));
      const makeImage = makeButton('ss-literary-action ss-literary-action-primary', t('make'));
      const copy = makeButton('ss-literary-action', t('copy'));
      const clear = makeButton('ss-literary-action ss-literary-action-clear', t('clear'));
      makeImage.dataset.action = 'image';
      copy.dataset.action = 'copy';
      clear.dataset.action = 'clear';
      actionBar.append(makeImage, copy, clear);

      startHandle = makeButton('ss-literary-handle ss-literary-handle-start', '•', 'Selection start handle');
      endHandle = makeButton('ss-literary-handle ss-literary-handle-end', '•', 'Selection end handle');
      startHandle.dataset.edge = 'start';
      endHandle.dataset.edge = 'end';
      layer.append(actionBar, startHandle, endHandle);
      readerDialog.append(layer);

      actionBar.addEventListener('click', handleToolbarAction);
      [startHandle, endHandle].forEach(handle => {
        handle.addEventListener('pointerdown', beginHandleDrag);
      });
    } else {
      actionBar = $('.ss-literary-selection-actions', layer);
      startHandle = $('.ss-literary-handle-start', layer);
      endHandle = $('.ss-literary-handle-end', layer);
    }

    if (!readerBody.dataset.ssLiteraryBound) {
      readerBody.dataset.ssLiteraryBound = '1';
      readerBody.addEventListener('scroll', schedulePosition, { passive: true });
      readerBody.addEventListener('pointerdown', event => { if (active) tapStart = { x: event.clientX, y: event.clientY, id: event.pointerId }; }, { passive: true });
      readerBody.addEventListener('pointerup', handleReaderPointerUp, { passive: true });
      readerBody.addEventListener('pointercancel', () => { tapStart = null; }, { passive: true });
      readerBody.addEventListener('keyup', readNativeSelection);
    }

    lastBodyText = readerBody.textContent || '';
    refreshLabels();
    return true;
  }

  function refreshLabels() {
    if (!modeButton) return;
    modeButton.textContent = active ? t('active') : t('button');
    modeButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (hint) hint.textContent = active ? (pendingStart ? t('stepEnd') : t('hint')) : t('hint');
    if (actionBar) {
      const image = $('[data-action="image"]', actionBar);
      const copy = $('[data-action="copy"]', actionBar);
      const clear = $('[data-action="clear"]', actionBar);
      if (image) image.textContent = t('make');
      if (copy) copy.textContent = t('copy');
      if (clear) clear.textContent = t('clear');
    }
  }

  function toggleMode() {
    active = !active;
    if (readerBody) readerBody.classList.toggle('ss-literary-selection-active', active);
    if (control) control.classList.toggle('is-active', active);
    refreshLabels();
    if (!active) {
      hideSelectionUI();
      window.getSelection?.()?.removeAllRanges();
      tapStart = null;
      announce(t('off'));
    } else {
      announce(t('ready'));
      readerBody?.setAttribute('tabindex', '-1');
      pendingStart = null;
      pendingStartEnd = 0;
    }
  }

  function isRangeInReader(range) {
    return !!(readerBody && range && readerBody.contains(range.startContainer) && readerBody.contains(range.endContainer));
  }

  function readNativeSelection() {
    if (!active) return;
    const selection = window.getSelection?.();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!isRangeInReader(range)) return;
    const value = selection.toString();
    if (!value.trim()) return;
    selectedRange = range.cloneRange();
    selectedText = value;
    pendingStart = null;
    pendingStartEnd = 0;
    readerBody.classList.add('ss-literary-has-selection');
    showSelectionUI();
  }

  function wordAtPoint(point) {
    if (!point || !point.node || point.node.nodeType !== Node.TEXT_NODE) return null;
    const text = point.node.nodeValue || '';
    if (!text) return null;
    const offset = clamp(point.offset, 0, text.length);
    try {
      if (typeof Intl.Segmenter === 'function') {
        const segmenter = new Intl.Segmenter(getLang(), { granularity: 'word' });
        const segments = Array.from(segmenter.segment(text));
        let segment = segments.find(item => item.isWordLike && offset >= item.index && offset <= item.index + item.segment.length);
        if (!segment) segment = segments.find(item => item.isWordLike && item.index >= offset);
        if (segment) return { node: point.node, start: segment.index, end: segment.index + segment.segment.length };
      }
    } catch (_) { /* Use the Unicode fallback below. */ }
    const isWord = character => /[\p{L}\p{N}\p{M}_]/u.test(character || '');
    let start = offset;
    let end = offset;
    if (start === text.length && start > 0) start--;
    while (start > 0 && isWord(Array.from(text.slice(0, start)).pop())) start--;
    while (end < text.length && isWord(Array.from(text.slice(0, end + 1)).pop())) end++;
    if (end <= start) return null;
    return { node: point.node, start, end };
  }

  function handleReaderPointerUp(event) {
    if (!active || !tapStart || event.pointerId !== tapStart.id) return;
    const start = tapStart;
    tapStart = null;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
      window.setTimeout(readNativeSelection, 50);
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    window.setTimeout(() => {
      const selection = window.getSelection?.();
      if (selection && !selection.isCollapsed && selection.rangeCount && isRangeInReader(selection.getRangeAt(0))) {
        readNativeSelection();
        return;
      }
      const point = caretAtPoint(x, y);
      const word = wordAtPoint(point);
      if (!word) return;
      processWordTap(word);
    }, 70);
  }

  function processWordTap(word) {
    const tappedStart = { node: word.node, offset: word.start };
    const tappedEnd = { node: word.node, offset: word.end };
    if (!pendingStart) {
      pendingStart = tappedStart;
      pendingStartEnd = word.end;
      selectedRange = null;
      selectedText = '';
      if (layer) {
        layer.hidden = false;
        layer.classList.add('is-pending');
        actionBar.hidden = true;
        endHandle.hidden = true;
        startHandle.hidden = false;
      }
      positionPendingHandle(tappedStart);
      refreshLabels();
      return;
    }

    let rangeStart = pendingStart;
    let rangeEnd = tappedEnd;
    try {
      if (comparePoints(pendingStart, tappedStart) > 0) {
        rangeStart = tappedStart;
        rangeEnd = { node: pendingStart.node, offset: pendingStartEnd };
      }
      const range = document.createRange();
      range.setStart(rangeStart.node, rangeStart.offset);
      range.setEnd(rangeEnd.node, rangeEnd.offset);
      if (!range.toString().trim()) {
        pendingStart = tappedStart;
        pendingStartEnd = word.end;
        positionPendingHandle(tappedStart);
        refreshLabels();
        return;
      }
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      selectedRange = range.cloneRange();
      selectedText = range.toString();
      pendingStart = null;
      pendingStartEnd = 0;
      if (layer) layer.classList.remove('is-pending');
      readerBody.classList.add('ss-literary-has-selection');
      refreshLabels();
      showSelectionUI();
    } catch (_) {
      pendingStart = tappedStart;
      pendingStartEnd = word.end;
      positionPendingHandle(tappedStart);
      refreshLabels();
    }
  }

  function positionPendingHandle(point) {
    if (!layer || !startHandle) return;
    const range = document.createRange();
    try {
      range.setStart(point.node, point.offset);
      range.collapse(true);
      const rect = range.getBoundingClientRect();
      const x = clamp(rect.left - 11, 2, (document.documentElement.clientWidth || innerWidth) - 26);
      const y = clamp(rect.bottom + 2, 8, (document.documentElement.clientHeight || innerHeight) - 32);
      startHandle.style.left = `${x}px`;
      startHandle.style.top = `${y}px`;
      layer.hidden = false;
      actionBar.hidden = true;
      endHandle.hidden = true;
      startHandle.hidden = false;
    } catch (_) { /* No caret geometry available on this browser. */ }
  }

  function showSelectionUI() {
    if (!selectedRange || !layer) return;
    layer.hidden = false;
    layer.classList.remove('is-pending');
    actionBar.hidden = false;
    startHandle.hidden = false;
    endHandle.hidden = false;
    positionSelectionUI();
  }

  function hideSelectionUI() {
    if (layer) { layer.hidden = true; layer.classList.remove('is-pending'); }
    if (readerBody) readerBody.classList.remove('ss-literary-has-selection');
    selectedRange = null;
    selectedText = '';
    pendingStart = null;
    pendingStartEnd = 0;
    dragState = null;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function positionSelectionUI() {
    if (!selectedRange || !layer || layer.hidden) return;
    let rects;
    try { rects = Array.from(selectedRange.getClientRects()).filter(rect => rect.width || rect.height); }
    catch (_) { rects = []; }
    if (!rects.length) return;
    const first = rects[0];
    const last = rects[rects.length - 1];
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;

    const actionWidth = Math.min(360, viewportWidth - 20);
    const centerX = (first.left + last.right) / 2;
    const actionLeft = clamp(centerX - actionWidth / 2, 10, viewportWidth - actionWidth - 10);
    const preferredTop = first.top - 58;
    const actionTop = preferredTop > 10 ? preferredTop : clamp(last.bottom + 12, 10, viewportHeight - 62);
    actionBar.style.left = `${actionLeft}px`;
    actionBar.style.top = `${actionTop}px`;
    actionBar.style.maxWidth = `${actionWidth}px`;

    const markerTopStart = clamp(first.bottom + 2, 8, viewportHeight - 32);
    const markerTopEnd = clamp(last.bottom + 2, 8, viewportHeight - 32);
    startHandle.style.left = `${clamp(first.left - 11, 2, viewportWidth - 26)}px`;
    startHandle.style.top = `${markerTopStart}px`;
    endHandle.style.left = `${clamp(last.right - 13, 2, viewportWidth - 26)}px`;
    endHandle.style.top = `${markerTopEnd}px`;
  }

  function schedulePosition() {
    if (repositionFrame) cancelAnimationFrame(repositionFrame);
    repositionFrame = requestAnimationFrame(() => {
      repositionFrame = 0;
      positionSelectionUI();
    });
  }

  function handleToolbarAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !selectedText) return;
    const action = button.dataset.action;
    if (action === 'clear') {
      window.getSelection?.()?.removeAllRanges();
      hideSelectionUI();
      return;
    }
    if (action === 'copy') {
      copySelectedText();
      return;
    }
    if (action === 'image') {
      if (selectedText.length > 1800) {
        announce(t('long'));
        return;
      }
      // Preserve the exact selection before browser focus can collapse it.
      try { if (typeof savedExcerptSelection !== 'undefined') savedExcerptSelection = selectedText.trim(); } catch (_) { /* optional integration */ }
      const shareButton = $('#shareExcerptImage');
      if (shareButton) shareButton.click();
      else announce(t('noText'));
    }
  }

  async function copySelectedText() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedText);
      } else {
        const field = document.createElement('textarea');
        field.value = selectedText;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        const ok = document.execCommand('copy');
        field.remove();
        if (!ok) throw new Error('copy failed');
      }
      announce(t('copied'));
    } catch (_) {
      announce(t('noCopy'));
    }
  }

  function caretAtPoint(x, y) {
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }
    if (!range || !readerBody?.contains(range.startContainer)) return null;
    return { node: range.startContainer, offset: range.startOffset };
  }

  function comparePoints(a, b) {
    const ra = document.createRange();
    const rb = document.createRange();
    ra.setStart(a.node, a.offset); ra.collapse(true);
    rb.setStart(b.node, b.offset); rb.collapse(true);
    return ra.compareBoundaryPoints(Range.START_TO_START, rb);
  }

  function beginHandleDrag(event) {
    if (!selectedRange) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    dragState = { pointerId: event.pointerId, edge: handle.dataset.edge };
    try { handle.setPointerCapture(event.pointerId); } catch (_) { /* pointer capture is optional */ }
    handle.addEventListener('pointermove', moveHandleDrag);
    handle.addEventListener('pointerup', endHandleDrag, { once: true });
    handle.addEventListener('pointercancel', endHandleDrag, { once: true });
  }

  function moveHandleDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId || !selectedRange) return;
    event.preventDefault();
    const point = caretAtPoint(event.clientX, event.clientY);
    if (!point) return;

    const fixed = dragState.edge === 'start'
      ? { node: selectedRange.endContainer, offset: selectedRange.endOffset }
      : { node: selectedRange.startContainer, offset: selectedRange.startOffset };
    const order = comparePoints(point, fixed);
    const next = document.createRange();
    try {
      if (dragState.edge === 'start') {
        if (order <= 0) { next.setStart(point.node, point.offset); next.setEnd(fixed.node, fixed.offset); }
        else { next.setStart(fixed.node, fixed.offset); next.setEnd(point.node, point.offset); dragState.edge = 'end'; }
      } else {
        if (order >= 0) { next.setStart(fixed.node, fixed.offset); next.setEnd(point.node, point.offset); }
        else { next.setStart(point.node, point.offset); next.setEnd(fixed.node, fixed.offset); dragState.edge = 'start'; }
      }
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(next);
      document.dispatchEvent(new Event('selectionchange'));
      selectedRange = next.cloneRange();
      selectedText = selection.toString();
      readerBody.classList.toggle('ss-literary-has-selection', !!selectedText.trim());
      if (!selectedText.trim()) hideSelectionUI();
      else positionSelectionUI();
    } catch (_) { /* A transient invalid caret position is ignored. */ }
  }

  function endHandleDrag(event) {
    const handle = event.currentTarget;
    handle.removeEventListener('pointermove', moveHandleDrag);
    dragState = null;
    readNativeSelection();
  }

  function observeReader() {
    const observer = new MutationObserver(() => {
      if (!readerBody) return;
      const text = readerBody.textContent || '';
      if (text !== lastBodyText) {
        lastBodyText = text;
        hideSelectionUI();
        active = false;
        readerBody.classList.remove('ss-literary-selection-active');
        control?.classList.remove('is-active');
        refreshLabels();
      }
    });
    observer.observe(readerBody, { subtree: true, childList: true, characterData: true });
  }

  function bindGlobalEvents() {
    document.addEventListener('selectionchange', readNativeSelection, { passive: true });
    document.addEventListener('scroll', schedulePosition, true);
    window.addEventListener('resize', schedulePosition, { passive: true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && active) {
        active = false;
        readerBody?.classList.remove('ss-literary-selection-active');
        control?.classList.remove('is-active');
        hideSelectionUI();
        refreshLabels();
      }
    });
    readerDialog?.addEventListener('close', () => {
      active = false;
      window.getSelection?.()?.removeAllRanges();
      tapStart = null;
      readerBody?.classList.remove('ss-literary-selection-active');
      control?.classList.remove('is-active');
      hideSelectionUI();
      refreshLabels();
    });
    $('#layoutLanguage')?.addEventListener('change', refreshLabels);
    const languageObserver = new MutationObserver(refreshLabels);
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-ui-language'] });
  }

  function init() {
    if (initialized) return true;
    if (!createUI()) return false;
    initialized = true;
    observeReader();
    bindGlobalEvents();
    if (bootObserver) { bootObserver.disconnect(); bootObserver = null; }
    return true;
  }

  // The reader dialog/body may be created lazily by app.js only after a work is opened.
  // A one-shot DOMContentLoaded init misses that case, so watch until the reader exists.
  function boot() {
    if (init()) return;
    if (!bootObserver) {
      bootObserver = new MutationObserver(() => {
        if (init()) { bootObserver?.disconnect(); bootObserver = null; }
      });
      bootObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
