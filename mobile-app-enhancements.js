/* साहित्य सूत्रधार — समेकित मोबाइल खोज, श्रेणियाँ, लोकप्रिय रचनाएँ और विवरण पृष्ठ
   सुरक्षित नियम: सार्वजनिक पाठक-रैंकिंग के लिए निजी work_reads/reading_progress रिकॉर्ड कभी नहीं पढ़े जाते। */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories = [
    ['रोमांटिक','♡','प्रेम और संबंध'],['कॉमेडी','☻','हँसी और मनोरंजन'],['हास्य-व्यंग्य','✎','व्यंग्य और विनोद'],['प्रेम','♥','प्रेम-कथाएँ'],
    ['सस्पेंस एवं थ्रिलर','◈','रहस्य और रोमांच'],['एडवेंचर','⚑','साहसिक यात्राएँ'],['साइंस फिक्शन','✧','विज्ञान और कल्पना'],['फैंटेसी','❋','कल्पना लोक'],
    ['देशप्रेम','⚑','राष्ट्र और समाज'],['शौर्य','⚔','वीरता की गाथाएँ'],['ओज','❖','ओजस्वी साहित्य'],['ऐतिहासिक','⌛','इतिहास की कथाएँ'],
    ['पौराणिक','ॐ','पुराण और आख्यान'],['मिश्रित','✿','विविध साहित्य'],['रेखाचित्र','▤','व्यक्तिचित्र'],['बालकथा','☀','बाल साहित्य'],
    ['मनोरंजन','♫','मनोरंजक रचनाएँ'],['शिक्षाप्रद','✥','ज्ञान और सीख'],['अन्य','❀','अन्य विधाएँ']
  ];
  let searchTimer = null;
  let searchSequence = 0;
  let catalogPage = 0;
  let catalogRows = [];
  let catalogStatsAvailable = false;

  function showToast(message) {
    const el = $('toast');
    if (el) { el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2400); }
  }

  function renderCategoryCards() {
    const grid = $('mobileCategoryGrid');
    if (!grid) return;
    grid.innerHTML = categories.map(([name, symbol, desc], i) => `
      <button type="button" class="mobile-category-card" data-mobile-category="${esc(name)}">
        <span class="category-symbol" aria-hidden="true">${symbol}</span>
        <strong>${esc(name)}</strong><small>${esc(desc)}</small>
      </button>`).join('');
  }

  function setHomeMode(mode) {
    const categoryMode = mode === 'categories';
    document.querySelectorAll('.mobile-home-switch-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.homeMode === mode));
    const appShell = document.querySelector('.app-shell');
    if (!appShell) return;
    [...appShell.children].forEach(child => {
      if (child.id === 'mobileCategoryScreen') child.classList.toggle('hidden', !categoryMode);
      else if (child.matches('section')) child.classList.toggle('hidden', categoryMode);
    });
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function openCategory(category) {
    if (typeof activeCategory !== 'undefined') activeCategory = category;
    if (typeof renderChips === 'function') renderChips();
    if (typeof renderStories === 'function') renderStories();
    setHomeMode('for-you');
    const input = $('workSearchInput'); if (input) input.value = '';
    $('storyList')?.scrollIntoView({behavior:'smooth', block:'start'});
    if ($('storyHeading')) $('storyHeading').textContent = category === 'सभी' ? 'नई और लोकप्रिय रचनाएँ' : category + ' की रचनाएँ';
  }

  function bindHomeSwitches() {
    document.querySelectorAll('[data-home-mode]').forEach(btn => btn.addEventListener('click', () => setHomeMode(btn.dataset.homeMode)));
    $('backToForYou')?.addEventListener('click', () => setHomeMode('for-you'));
    $('mobileCategoryGrid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-mobile-category]');
      if (button) openCategory(button.dataset.mobileCategory);
    });
    $('clearCategory')?.addEventListener('click', () => { if (typeof activeCategory !== 'undefined') activeCategory = 'सभी'; if (typeof renderChips === 'function') renderChips(); if (typeof renderStories === 'function') renderStories(); });
  }

  function findWork(id) {
    try {
      const local = (typeof state !== 'undefined' ? state.stories : []).find(work => String(work.id) === String(id));
      return local || (window.__ssMobileWorkCache || []).find(work => String(work.id) === String(id)) || null;
    } catch (_) { return (window.__ssMobileWorkCache || []).find(work => String(work.id) === String(id)) || null; }
  }

  async function loadWorkStats(workId) {
    if (!client) return {average:null, ratings:0, reviews:0};
    const [ratingResult, reviewResult] = await Promise.all([
      client.from('ratings').select('rating', {count:'exact'}).eq('work_id', workId),
      client.from('reviews').select('id', {count:'exact', head:true}).eq('work_id', workId)
    ]);
    if (ratingResult.error || reviewResult.error) return {average:null, ratings:0, reviews:0};
    const rows = ratingResult.data || [];
    return {average: rows.length ? (rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rows.length).toFixed(1) : null, ratings:ratingResult.count ?? rows.length, reviews:reviewResult.count ?? 0};
  }

  async function showWorkDetail(id) {
    const work = findWork(id);
    if (!work) { showToast('रचना का विवरण अभी उपलब्ध नहीं है।'); return; }
    const box = $('mobileWorkDetailContent');
    const dialog = $('mobileWorkDetailDialog');
    if (!box || !dialog) return;
    const cover = work.coverUrl ? `<img class="mobile-detail-cover" src="${esc(work.coverUrl)}" alt="${esc(work.title)} का आवरण">` : '<div class="mobile-detail-cover mobile-horizontal-cover">❀</div>';
    box.innerHTML = `<div class="mobile-detail-hero">${cover}<div><h2>${esc(work.title)}</h2><p><button type="button" class="text-button" data-detail-author="${esc(work.authorId || '')}">${esc(work.author || 'अनाम रचनाकार')}</button></p><div class="mobile-detail-meta"><span>${esc(work.type || 'रचना')}</span><span>${esc(work.subtype || '')}</span><span>${esc(work.language || 'हिंदी')}</span><span>${wordCountSafe(work.body)} शब्द</span><span>${minutesSafe(work.body)} मिनट</span></div><p class="mobile-detail-rating" id="mobileDetailRating">रेटिंग लोड हो रही है…</p></div></div><p class="mobile-detail-summary">${esc(String(work.body || '').replace(/\s+/g,' ').slice(0,900))}${String(work.body || '').length > 900 ? '…' : ''}</p><div class="mobile-detail-actions"><button type="button" class="primary-button" data-detail-read="${esc(work.id)}">अभी पढ़ें</button><button type="button" class="secondary-button" data-detail-bookmark="${esc(work.id)}">पुस्तकालय में सहेजें</button><button type="button" class="secondary-button" data-detail-share="${esc(work.id)}">शेयर करें</button><button type="button" class="secondary-button" data-detail-download="${esc(work.id)}">पाठ डाउनलोड करें</button></div><p class="tiny-note">पूरी रचना, पाठक प्रतिक्रिया और उपलब्ध समीक्षाएँ पढ़ने के लिए रचना खोलें।</p>`;
    if (!dialog.open) dialog.showModal();
    const stats = await loadWorkStats(id);
    const rating = $('mobileDetailRating');
    if (rating) rating.textContent = `★ ${stats.average || '—'} / 5 · ${stats.ratings} रेटिंग · ${stats.reviews} समीक्षाएँ`;
  }

  function wordCountSafe(text) {
    const value = String(text || '').trim();
    if (!value) return 0;
    try { return [...new Intl.Segmenter('hi', {granularity:'word'}).segment(value)].filter(x => x.isWordLike).length; }
    catch (_) { return (value.match(/[\p{L}\p{N}]+/gu) || []).length; }
  }
  function minutesSafe(text) { return Math.max(1, Math.ceil(wordCountSafe(text) / 200)); }

  async function showSeriesDetail(seriesId) {
    let parts = [];
    try { const source = [...(typeof state !== 'undefined' ? state.stories : []), ...(window.__ssMobileWorkCache || [])]; parts = [...new Map(source.filter(work => String(work.seriesId || work.series_id) === String(seriesId) && work.status === 'published').map(work => [String(work.id),work])).values()].sort((a,b) => Number(a.partNumber || a.part_number || 1) - Number(b.partNumber || b.part_number || 1)); } catch (_) {}
    if (!parts.length) { showToast('इस धारावाहिक के प्रकाशित भाग उपलब्ध नहीं हैं।'); return; }
    const first = parts[0];
    const box = $('mobileSeriesDetailContent'); const dialog = $('mobileSeriesDetailDialog');
    if (!box || !dialog) return;
    const cover = first.coverUrl ? `<img class="mobile-detail-cover" src="${esc(first.coverUrl)}" alt="">` : '<div class="mobile-detail-cover mobile-horizontal-cover">❀</div>';
    box.innerHTML = `<div class="mobile-detail-hero">${cover}<div><h2>${esc(first.seriesTitle || first.title)}</h2><p><button type="button" class="text-button" data-detail-author="${esc(first.authorId || '')}">${esc(first.author || 'अनाम रचनाकार')}</button></p><div class="mobile-detail-meta"><span>${parts.length} प्रकाशित भाग</span><span>${esc(first.seriesStatus === 'completed' ? 'पूर्ण' : 'जारी')}</span></div><p>${esc(first.seriesDescription || 'इस धारावाहिक के सभी प्रकाशित भाग नीचे उपलब्ध हैं।')}</p></div></div><h3>सभी भाग</h3><div class="mobile-detail-parts">${parts.map(part => `<div class="mobile-detail-part-row"><button type="button" class="mobile-detail-part" data-detail-read="${esc(part.id)}"><strong>भाग ${Number(part.partNumber) || 1}: ${esc(part.title)}</strong><span>पढ़ें →</span></button><button type="button" class="text-button mobile-part-reviews" data-detail-reviews="${esc(part.id)}">समीक्षाएँ देखें</button></div>`).join('')}</div>`;
    if (!dialog.open) dialog.showModal();
    if (client) {
      const ids = parts.map(part => part.id);
      const [ratings, reviews] = await Promise.all([
        client.from('ratings').select('work_id,rating').in('work_id', ids),
        client.from('reviews').select('id,work_id').in('work_id', ids)
      ]);
      if (!ratings.error && !reviews.error) {
        const values = ratings.data || []; const avg = values.length ? (values.reduce((n,r) => n + Number(r.rating || 0),0) / values.length).toFixed(1) : '—';
        const summary = document.createElement('p'); summary.className = 'mobile-detail-meta'; summary.textContent = `समग्र रेटिंग ★ ${avg}/5 · ${values.length} रेटिंग · ${(reviews.data || []).length} समीक्षाएँ`;
        box.insertBefore(summary, box.querySelector('h3'));
        box.querySelectorAll('[data-detail-reviews]').forEach(button => { const count = (reviews.data || []).filter(row => String(row.work_id) === String(button.dataset.detailReviews)).length; button.textContent = `समीक्षाएँ (${count}) देखें`; });
      }
    }
  }

  function bindDetailActions() {
    document.addEventListener('click', async event => {
      const detail = event.target.closest('[data-work-detail]');
      if (detail) { event.preventDefault(); event.stopImmediatePropagation(); await showWorkDetail(detail.dataset.workDetail); return; }
      const series = event.target.closest('[data-series-detail]');
      if (series) { event.preventDefault(); event.stopImmediatePropagation(); await showSeriesDetail(series.dataset.seriesDetail); return; }
      const read = event.target.closest('[data-detail-read]');
      if (read) { const id = read.dataset.detailRead; $('mobileWorkDetailDialog')?.close(); $('mobileSeriesDetailDialog')?.close(); if (typeof openReader === 'function') await openReader(id); return; }
      const reviewButton = event.target.closest('[data-detail-reviews]');
      if (reviewButton) { const id = reviewButton.dataset.detailReviews; $('mobileSeriesDetailDialog')?.close(); if (typeof openReader === 'function') { await openReader(id); $('feedbackPanel')?.scrollIntoView({behavior:'smooth',block:'start'}); } return; }
      const author = event.target.closest('[data-detail-author]');
      if (author && author.dataset.detailAuthor && typeof openAuthorProfile === 'function') { $('mobileWorkDetailDialog')?.close(); $('mobileSeriesDetailDialog')?.close(); await openAuthorProfile(author.dataset.detailAuthor); return; }
      const searchAuthor = event.target.closest('[data-search-author]');
      if (searchAuthor && typeof openAuthorProfile === 'function') { await openAuthorProfile(searchAuthor.dataset.searchAuthor); return; }
      const bookmark = event.target.closest('[data-detail-bookmark]');
      if (bookmark) { if (typeof state !== 'undefined' && state.profile) { const id = bookmark.dataset.detailBookmark; state.profile.bookmarks = [...new Set([...(state.profile.bookmarks || []), id])]; if (typeof saveState === 'function') saveState(); if (typeof renderLibrary === 'function') renderLibrary(); showToast('रचना पुस्तकालय में सहेज दी गई।'); } return; }
      const share = event.target.closest('[data-detail-share]');
      if (share) { const work = findWork(share.dataset.detailShare); const url = `${location.origin}${location.pathname}#work-${encodeURIComponent(share.dataset.detailShare)}`; if (navigator.share) { try { await navigator.share({title:work?.title || 'साहित्य सूत्रधार', url}); } catch (_) {} } else { try { await navigator.clipboard.writeText(url); showToast('रचना लिंक कॉपी हो गया।'); } catch (_) { showToast(url); } } }
      const download = event.target.closest('[data-detail-download]');
      if (download) { const work = findWork(download.dataset.detailDownload); if (!work) return; const text = `${work.title || 'रचना'}\nलेखक: ${work.author || 'अनाम रचनाकार'}\n\n${String(work.body || '').replace(/\r/g,'')}`; const blob = new Blob([text], {type:'text/plain;charset=utf-8'}); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${String(work.title || 'sahitya-sutradhar').replace(/[\\/:*?"<>|]/g,'-').slice(0,80)}.txt`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); showToast('रचना का पाठ डाउनलोड हो गया।'); }
    }, true);
    $('mobileDetailClose')?.addEventListener('click', () => $('mobileWorkDetailDialog')?.close());
    $('mobileSeriesClose')?.addEventListener('click', () => $('mobileSeriesDetailDialog')?.close());
  }

  // धारावाहिक के अलग-अलग भागों को हर सूची/रैंकिंग में एक ही कार्ड में समेटें।
  function collapseSeries(works, readCounts = null) {
    const groups = new Map();
    (works || []).forEach((work, index) => {
      const seriesId = work.seriesId || work.series_id;
      const key = seriesId ? `series:${seriesId}` : `work:${work.id}`;
      if (!groups.has(key)) groups.set(key, {key, seriesId: seriesId || null, items: [], firstIndex: index, totalReads: 0});
      const group = groups.get(key);
      group.items.push(work);
      const reads = readCounts?.get(String(work.id));
      group.totalReads += Number(reads ?? work.reads ?? 0);
    });
    return [...groups.values()].map(group => {
      const parts = group.items.slice().sort((a,b) => Number(a.partNumber || a.part_number || 1) - Number(b.partNumber || b.part_number || 1));
      const first = parts[0];
      return {
        ...first,
        id: first.id,
        seriesId: group.seriesId,
        series_id: group.seriesId,
        seriesTitle: group.seriesId ? (first.seriesTitle || first.series_title || first.title) : '',
        partCount: group.seriesId ? parts.length : 0,
        partIds: parts.map(part => String(part.id)),
        reads: group.totalReads,
        _seriesSortIndex: group.firstIndex
      };
    });
  }

  function renderHorizontalCard(work) {
    const isSeries = Boolean(work.seriesId || work.series_id);
    const title = isSeries ? (work.seriesTitle || work.series_title || work.title) : (work.title || 'शीर्षक रहित रचना');
    const cover = work.coverUrl || work.cover_url;
    const action = isSeries ? `data-series-detail="${esc(work.seriesId || work.series_id)}"` : `data-work-detail="${esc(work.id)}"`;
    const label = isSeries ? `धारावाहिक · ${Number(work.partCount || 1)} भाग · विवरण और सभी भाग` : (work.type || work.main_form || 'रचना');
    return `<button type="button" class="mobile-horizontal-card" ${action}>${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : '<span class="mobile-horizontal-cover">❀</span>'}<strong>${esc(title)}</strong><small>${esc(work.author || 'अनाम रचनाकार')}</small>${isSeries ? `<small class="mobile-series-card-label">${esc(label)}</small>` : ''}</button>`;
  }

  function renderCatalogPage() {
    const list = $('mobileAllStoriesList'); if (!list) return;
    const pageSize = 50; const totalPages = Math.max(1, Math.ceil(catalogRows.length / pageSize));
    catalogPage = Math.max(0, Math.min(catalogPage, totalPages - 1));
    list.innerHTML = catalogRows.slice(catalogPage * pageSize, (catalogPage + 1) * pageSize).map(renderHorizontalCard).join('') || '<p class="muted">अभी रचनाएँ उपलब्ध नहीं हैं।</p>';
    if ($('mobileCatalogPage')) $('mobileCatalogPage').textContent = `${catalogPage + 1} / ${totalPages}`;
    if ($('mobileCatalogPrev')) $('mobileCatalogPrev').disabled = catalogPage === 0;
    if ($('mobileCatalogNext')) $('mobileCatalogNext').disabled = catalogPage >= totalPages - 1;
    if ($('mobileAllStoriesStatus')) $('mobileAllStoriesStatus').textContent = catalogStatsAvailable ? `सार्वजनिक पठन आँकड़ों के आधार पर क्रमबद्ध · ${catalogRows.length} तक रचनाएँ` : `सार्वजनिक लोकप्रियता आँकड़े उपलब्ध नहीं; ${catalogRows.length} नवीन प्रकाशित रचनाएँ दिखाई जा रही हैं।`;
  }

  function bindCatalog() {
    $('mobileAllStoriesButton')?.addEventListener('click', () => { catalogPage = 0; renderCatalogPage(); $('mobileAllStoriesDialog')?.showModal(); });
    $('mobileAllStoriesClose')?.addEventListener('click', () => $('mobileAllStoriesDialog')?.close());
    $('mobileCatalogPrev')?.addEventListener('click', () => { catalogPage--; renderCatalogPage(); });
    $('mobileCatalogNext')?.addEventListener('click', () => { catalogPage++; renderCatalogPage(); });
  }

  async function loadDiscovery() {
    const popularBox = $('mobilePopularShelf');
    const topWorksBox = $('mobileTopWorks');
    const topReadersBox = $('mobileTopReaders');
    if (topReadersBox) topReadersBox.innerHTML = '<p class="muted">पाठकों की सार्वजनिक रैंकिंग उपलब्ध होने पर यहाँ दिखाई जाएगी। निजी पठन रिकॉर्ड सार्वजनिक नहीं किए जाते।</p>';
    if (!client) {
      if (popularBox) popularBox.innerHTML = '<p class="muted">लोकप्रिय रचनाओं के लिए इंटरनेट कनेक्शन आवश्यक है।</p>';
      return;
    }
    try {
      const [statsResult, worksResult] = await Promise.all([
        client.rpc('get_public_work_read_stats'),
        client.from('works').select('id,author_id,title,content,main_form,subtype,status,created_at,cover_url,content_language,series_id,series_title,part_number').eq('status','published').order('created_at',{ascending:false}).limit(1000)
      ]);
      if (worksResult.error) throw worksResult.error;
      const works = worksResult.data || [];
      const hasPublicStats = !statsResult.error && Array.isArray(statsResult.data) && statsResult.data.length > 0;
      const counts = hasPublicStats ? new Map(statsResult.data.map(row => [String(row.work_id), Number(row.total_reads || 0)])) : new Map();
      const ranked = hasPublicStats
        ? [...works].sort((a,b) => (counts.get(String(b.id)) || 0) - (counts.get(String(a.id)) || 0))
        : [...works];
      const authorIds = [...new Set(ranked.slice(0,1000).map(w => w.author_id).filter(Boolean))];
      let profiles = [];
      if (authorIds.length) {
        const profileResult = await client.from('profiles').select('id,display_name,username').in('id', authorIds);
        if (!profileResult.error) profiles = profileResult.data || [];
      }
      const names = new Map(profiles.map(p => [p.id, p.display_name || p.username || 'अनाम रचनाकार']));
      const hydratedParts = ranked.map(work => ({...work, author:names.get(work.author_id) || 'अनाम रचनाकार', authorId:work.author_id, body:work.content || '', type:work.main_form || 'रचना', language:work.content_language || 'hi', coverUrl:work.cover_url || '', seriesId:work.series_id || null, seriesTitle:work.series_title || '', partNumber:work.part_number || 1, reads:counts.get(String(work.id)) || 0}));
      // Detail dialog को धारावाहिक के सभी भाग उपलब्ध रहें; सूचियों में केवल एक धारावाहिक कार्ड दिखे।
      window.__ssMobileWorkCache = hydratedParts;
      const hydrated = collapseSeries(hydratedParts, counts);
      catalogRows = hydrated;
      catalogStatsAvailable = hasPublicStats;
      if (popularBox) popularBox.innerHTML = hasPublicStats && hydrated.length ? hydrated.slice(0,24).map(renderHorizontalCard).join('') : '<p class="muted">लोकप्रियता क्रम दिखाने के लिए सार्वजनिक समेकित पठन आँकड़े उपलब्ध नहीं हैं।</p>';
      if (topWorksBox) topWorksBox.innerHTML = hasPublicStats && hydrated.length ? hydrated.slice(0,8).map(work => `<article class="story-card"><div class="cover-grid">${work.coverUrl ? `<img class="cover-thumb" src="${esc(work.coverUrl)}" alt="">` : '<div class="cover-placeholder">❀</div>'}<div><h3>${esc(work.seriesId ? (work.seriesTitle || work.title) : work.title)}</h3><p>${esc(work.author)}</p>${work.seriesId ? `<p class="tiny-note">धारावाहिक · ${work.partCount} भाग</p><button class="primary-button" type="button" data-series-detail="${esc(work.seriesId)}">विवरण और सभी भाग</button>` : `<button class="primary-button" type="button" data-work-detail="${esc(work.id)}">विवरण देखें</button>`}</div></div></article>`).join('') : '<p class="muted">सार्वजनिक पठन आँकड़े उपलब्ध होने पर लोकप्रिय रचनाएँ यहाँ दिखाई जाएँगी।</p>';
      window.__ssPublicPublishedCatalog = hydrated;
      renderCatalogPage();
    } catch (error) {
      console.warn('सार्वजनिक खोज/लोकप्रिय रचनाएँ:', error);
      if (popularBox) popularBox.innerHTML = '<p class="muted">लोकप्रिय रचनाओं के आँकड़े अभी उपलब्ध नहीं हैं।</p>';
      if (topWorksBox) topWorksBox.innerHTML = '<p class="muted">लोकप्रिय रचनाएँ अभी लोड नहीं हो सकीं।</p>';
    }
  }

  function editDistance(left, right) {
    left = String(left || '').toLocaleLowerCase('hi'); right = String(right || '').toLocaleLowerCase('hi');
    if (Math.abs(left.length - right.length) > 2) return 99;
    let previous = Array.from({length:right.length + 1}, (_, i) => i);
    for (let i = 1; i <= left.length; i++) {
      const current = [i];
      for (let j = 1; j <= right.length; j++) current[j] = Math.min(current[j-1] + 1, previous[j] + 1, previous[j-1] + (left[i-1] === right[j-1] ? 0 : 1));
      previous = current;
    }
    return previous[right.length];
  }

  async function performSearch() {
    const input = $('workSearchInput'); const query = (input?.value || '').trim();
    const status = $('mobileSearchStatus');
    if (!query) { if (typeof renderStories === 'function') renderStories(); if (status) status.textContent = 'शीर्षक, लेखक, विषय या संगोष्ठी पोस्ट खोजें।'; return; }
    const seq = ++searchSequence;
    if (status) status.textContent = 'रचनाएँ, लेखक और संगोष्ठी खोजी जा रही हैं…';
    if (!client) { if (typeof renderStories === 'function') renderStories(); if (status) status.textContent = 'ऑनलाइन खोज के लिए इंटरनेट आवश्यक है।'; return; }
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        const safe = query.replace(/[,%()]/g, ' ').replace(/\s+/g,' ').trim();
        const pattern = `%${safe}%`;
        const [workResult, profileResult, postResult] = await Promise.all([
          client.from('works').select('id,author_id,title,content,main_form,subtype,status,created_at,cover_url,content_language,series_id,series_title,part_number').eq('status','published').or(`title.ilike.${pattern},content.ilike.${pattern},main_form.ilike.${pattern},subtype.ilike.${pattern},content_language.ilike.${pattern}`).order('created_at',{ascending:false}).limit(50),
          client.from('profiles').select('id,display_name,username,bio').or(`display_name.ilike.${pattern},username.ilike.${pattern},bio.ilike.${pattern}`).limit(30),
          client.from('community_posts').select('id,author_id,body,created_at').eq('status','published').ilike('body',pattern).order('created_at',{ascending:false}).limit(20)
        ]);
        if (seq !== searchSequence) return;
        if (workResult.error) throw workResult.error;
        const ids = [...new Set((workResult.data || []).map(w => w.author_id).filter(Boolean))];
        let authorProfiles = [];
        if (ids.length) { const pr = await client.from('profiles').select('id,display_name,username').in('id',ids); if (!pr.error) authorProfiles = pr.data || []; }
        const nameMap = new Map(authorProfiles.map(p => [p.id,p.display_name || p.username || 'अनाम रचनाकार']));
        const workBox = $('mobileSearchResults');
        if (workBox) {
          let found = (workResult.data || []).map(w => ({...w,author:nameMap.get(w.author_id) || 'अनाम रचनाकार',authorId:w.author_id,body:w.content || '',type:w.main_form || 'रचना',language:w.content_language || 'hi',coverUrl:w.cover_url || '',seriesId:w.series_id || null,seriesTitle:w.series_title || '',partNumber:w.part_number || 1}));
          if (!found.length && query.length >= 4) {
            const cached = window.__ssMobileWorkCache || [];
            found = cached.filter(work => editDistance(query, work.title) <= 2 || editDistance(query, work.author) <= 2).slice(0,20);
          }
          window.__ssMobileWorkCache = [...new Map([...(window.__ssMobileWorkCache || []), ...found].map(work => [String(work.id),work])).values()];
          const groupedFound = collapseSeries(found);
          workBox.innerHTML = `<h3>रचनाएँ (${groupedFound.length})</h3>${groupedFound.map(renderHorizontalCard).join('') || '<p class="muted">कोई रचना नहीं मिली।</p>'}`;
        }
        const authorBox = $('mobileSearchAuthors');
        if (authorBox) authorBox.innerHTML = `<h3>लेखक (${(profileResult.data || []).length})</h3>${(profileResult.data || []).map(p => `<button type="button" class="mobile-search-author" data-search-author="${esc(p.id)}"><strong>${esc(p.display_name || p.username || 'रचनाकार')}</strong><small>${esc((p.bio || '').slice(0,100))}</small></button>`).join('') || '<p class="muted">कोई लेखक नहीं मिला।</p>'}`;
        const communityBox = $('mobileSearchCommunity');
        if (communityBox) communityBox.innerHTML = `<h3>संगोष्ठी (${(postResult.data || []).length})</h3>${(postResult.data || []).map(post => `<article class="mobile-search-author"><p>${esc((post.body || '').slice(0,180))}</p><small>${new Date(post.created_at).toLocaleDateString('hi-IN')}</small></article>`).join('') || '<p class="muted">कोई संगोष्ठी पोस्ट नहीं मिली।</p>'}`;
        if (status) status.textContent = `खोज पूरी हुई: ${(workResult.data || []).length} रचनाएँ · ${(profileResult.data || []).length} लेखक · ${(postResult.data || []).length} संगोष्ठी पोस्ट।`;
      } catch (error) { console.warn('मोबाइल खोज:', error); if (status) status.textContent = 'खोज पूरी नहीं हो सकी। कृपया शब्द बदलकर पुनः प्रयास करें।'; }
    }, 180);
  }

  function bindSearch() {
    $('mobileSearchSubmit')?.addEventListener('click', performSearch);
    $('workSearchInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); performSearch(); } });
    $('workSearchInput')?.addEventListener('input', () => { if (typeof renderStories === 'function') renderStories(); });
    $('workSearchClear')?.addEventListener('click', () => { if ($('mobileSearchStatus')) $('mobileSearchStatus').textContent = ''; $('mobileSearchResults')?.replaceChildren(); $('mobileSearchAuthors')?.replaceChildren(); $('mobileSearchCommunity')?.replaceChildren(); });
    $('mobileSearchStatus')?.insertAdjacentHTML('afterend','<div id="mobileSearchResults" class="mobile-search-results"></div><div id="mobileSearchAuthors" class="mobile-search-results"></div><div id="mobileSearchCommunity" class="mobile-search-results"></div>');
  }

  function categoryFromSearch() {
    const categoriesBox = $('mobileCategoryGrid');
    if (categoriesBox && !categoriesBox.children.length) renderCategoryCards();
  }

  function setupLoginOnboarding() {
    if (!client) return;
    const markerKey = userId => `ss_mobile_onboarding_completed:${userId}`;
    const checkingUsers = new Set();

    function hasCompleted(user) {
      if (!user?.id) return false;
      try {
        if (localStorage.getItem(markerKey(user.id)) === '1') return true;
      } catch (_) {}
      return user.user_metadata?.ss_mobile_onboarding_completed === true;
    }

    async function showOnboardingIfNeeded(user) {
      if (!user?.id || hasCompleted(user) || checkingUsers.has(user.id)) return;
      checkingUsers.add(user.id);
      try {
        const {data: profile, error} = await client.from('profiles')
          .select('reading_language,preferred_categories')
          .eq('id', user.id).maybeSingle();
        if (error) console.warn('पठन-पसंद लोड नहीं हुई:', error.message);

        // पुराने खातों में पहले से पसंदीदा श्रेणियाँ मौजूद हों तो उन्हें पूरा माना जाए।
        if (profile?.preferred_categories?.length) {
          try { localStorage.setItem(markerKey(user.id), '1'); } catch (_) {}
          return;
        }

        // खाते के metadata में भी स्थिति रखने से दूसरे डिवाइस पर भी दोबारा प्रश्न नहीं आएगा।
        if (user.user_metadata?.ss_mobile_onboarding_completed === true) return;
        const dialog = $('mobileOnboarding');
        if (dialog && !dialog.open) {
          const language = $('mobileOnboardingLanguage');
          if (language) language.value = profile?.reading_language || 'hi';
          dialog.showModal();
        }
      } finally {
        checkingUsers.delete(user.id);
      }
    }

    $('mobileOnboardingForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const {data:{user}} = await client.auth.getUser();
      if (!user) return;
      const selected = [...document.querySelectorAll('#mobileOnboardingCategories input:checked')].map(input => input.value);
      const message = $('mobileOnboardingMessage');
      if (selected.length > 4) {
        if (message) message.textContent = 'अधिकतम चार श्रेणियाँ चुनें।';
        return;
      }
      const {error} = await client.from('profiles').update({
        reading_language: $('mobileOnboardingLanguage')?.value || 'hi',
        preferred_categories: selected
      }).eq('id', user.id);
      if (error) {
        if (message) message.textContent = 'पसंद सुरक्षित नहीं हुई: ' + error.message;
        return;
      }

      // पूरा किया गया चिह्न खाली श्रेणी चयन पर भी सहेजा जाता है।
      try { localStorage.setItem(markerKey(user.id), '1'); } catch (_) {}
      try {
        await client.auth.updateUser({data:{ss_mobile_onboarding_completed:true}});
      } catch (metadataError) {
        console.warn('खाते में स्वागत-चयन की स्थिति सुरक्षित नहीं हुई:', metadataError);
      }
      $('mobileOnboarding')?.close();
      if (typeof loadCloudProfile === 'function') await loadCloudProfile();
      if (typeof loadCloudWorks === 'function') await loadCloudWorks();
    });

    async function gate() {
      const {data, error} = await client.auth.getSession();
      if (error) console.warn('लॉगिन सत्र नहीं पढ़ा जा सका:', error.message);
      if (!data.session) {
        const dialog = $('authDialog');
        const close = $('authClose');
        if (close) close.hidden = true;
        if (dialog && !dialog.open) dialog.showModal();
      } else {
        await showOnboardingIfNeeded(data.session.user);
      }
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          $('authDialog')?.close();
          showOnboardingIfNeeded(session.user);
        }
        if (event === 'SIGNED_OUT') {
          // पूर्णता का चिह्न जानबूझकर नहीं मिटाया जाता; अगली बार लॉगिन पर स्क्रीन नहीं खुलेगी।
          const dialog = $('authDialog');
          if (dialog && !dialog.open) dialog.showModal();
        }
      });
    }
    gate().catch(error => console.warn('मोबाइल लॉगिन गेट:', error));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const safeStart = (name, task) => {
      try { task(); }
      catch (error) {
        console.error(`[Sahitya Sutradhar Mobile] ${name} प्रारंभ नहीं हुआ:`, error);
        window.__SS_MOBILE_INIT_ERRORS = window.__SS_MOBILE_INIT_ERRORS || [];
        window.__SS_MOBILE_INIT_ERRORS.push({ step: name, message: error?.message || String(error) });
      }
    };
    // प्रत्येक मोबाइल मॉड्यूल स्वतंत्र रूप से शुरू हो; एक मॉड्यूल की त्रुटि बाकी UI न रोके।
    safeStart('श्रेणियाँ', renderCategoryCards);
    safeStart('होम नेविगेशन', bindHomeSwitches);
    safeStart('रचना विवरण', bindDetailActions);
    safeStart('खोज', bindSearch);
    safeStart('रचना सूची', bindCatalog);
    safeStart('श्रेणी डीप-लिंक', categoryFromSearch);
    safeStart('नई रचनाएँ', loadDiscovery);
    safeStart('लॉगिन/ऑनबोर्डिंग', setupLoginOnboarding);
  });
})();

/* साहित्य सूत्रधार — केवल संस्थापक खाते के लिए Admin Panel प्रवेश */
(() => {
  'use strict';

  const FOUNDER_ID = '51dcef91-419e-4470-b300-85abc8b1d830';
  const ENTRY_ID = 'adminBulkUploadEntry';
  let adminClient = null;
  let observer = null;
  let currentUserId = null;

  function removeAdminEntry() {
    document.getElementById(ENTRY_ID)?.remove();
  }

  async function checkFounder() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      removeAdminEntry();
      return;
    }

    try {
      if (!adminClient) {
        adminClient = window.supabase.createClient(
          window.SUPABASE_URL,
          window.SUPABASE_ANON_KEY
        );
      }

      const { data: { user }, error } = await adminClient.auth.getUser();

      if (error || !user || user.id !== FOUNDER_ID) {
        currentUserId = null;
        removeAdminEntry();
        return;
      }

      currentUserId = user.id;

      // सर्वर की मौजूदा एडमिन जाँच भी चलाएँ।
      // UI का UUID check केवल बटन दिखाने के लिए है।
      const { data, error: rpcError } =
        await adminClient.rpc('is_sutradhar_admin');

      if (rpcError) {
        console.warn('Admin RPC जाँच:', rpcError.message);
      } else if (data !== true) {
        console.warn('संस्थापक खाते की Admin RPC अनुमति सत्यापित नहीं हुई।');
      }

      renderAdminEntry();

    } catch (error) {
      console.error('Admin Panel प्रवेश जाँच:', error);
      removeAdminEntry();
    }
  }

  function renderAdminEntry() {
    if (currentUserId !== FOUNDER_ID) {
      removeAdminEntry();
      return;
    }

    const settings = document.getElementById('settingsView');
    if (!settings) return;

    if (document.getElementById(ENTRY_ID)) return;

    const row = document.createElement('div');
    row.id = ENTRY_ID;
    row.className = 'setting-row';

    row.innerHTML = `
      <div>
        <strong>एडमिन बल्क प्रकाशन</strong>
        <p>PDF, फोटो, DOCX और अनेक रचनाओं का सुरक्षित प्रबंधन।</p>
      </div>
      <a class="secondary-button" href="admin-bulk-upload.html">
        एडमिन पैनल खोलें ↗
      </a>
    `;

    settings.insertBefore(row, settings.firstElementChild);
  }

  function startAdminEntryWatcher() {
    checkFounder();

    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (currentUserId === FOUNDER_ID) {
        renderAdminEntry();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    if (!adminClient) {
      adminClient = window.supabase?.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    }

    adminClient?.auth.onAuthStateChange((event, session) => {
      currentUserId = session?.user?.id || null;

      if (currentUserId !== FOUNDER_ID) {
        removeAdminEntry();
      } else {
        renderAdminEntry();
        checkFounder();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAdminEntryWatcher, {
      once: true
    });
  } else {
    startAdminEntryWatcher();
  }
})();
