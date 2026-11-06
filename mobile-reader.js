(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const params = new URLSearchParams(location.search);
  const workId = params.get('id');
  let work = null, userId = null, saveTimer = null, lastSaved = -1;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const countWords = text => (String(text || '').trim().match(/\S+/g) || []).length;
  const showState = message => { $('readerState').hidden = false; $('readerState').textContent = message; $('readerArticle').hidden = true; };
  function setProgress(position) {
    const pct = Math.max(0, Math.min(100, position));
    $('readerProgressBar').style.width = pct + '%';
    $('readerProgressText').textContent = Math.round(pct) + '% पढ़ा';
  }
  function currentPosition() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.round((window.scrollY / max) * 10000) : 0;
  }
  async function saveProgress() {
    if (!work || !userId) return;
    const position = currentPosition();
    if (Math.abs(position - lastSaved) < 40 && position !== 10000) return;
    lastSaved = position;
    const words = Math.round(countWords(work.content) * position / 10000);
    const { error } = await client.from('reading_progress').upsert({
      user_id: userId,
      work_id: work.id,
      last_position: position,
      estimated_words_read: words,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,work_id' });
    if (error) console.warn('मोबाइल रीडर की प्रगति क्लाउड में सेव नहीं हुई:', error.message);
  }
  function scheduleSave() {
    setProgress(currentPosition() / 100);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveProgress, 1100);
  }
  async function load() {
    if (!workId) return showState('रचना का लिंक अधूरा है। होम पर लौटकर रचना फिर खोलें।');
    if (!client) return showState('डेटाबेस कनेक्शन उपलब्ध नहीं है।');
    try {
      const { data, error } = await client.from('works')
        .select('id,author_id,title,content,cover_url,main_form,work_type,subtype,content_language,series_id,series_title,part_number,created_at')
        .eq('id', workId).eq('status', 'published').maybeSingle();
      if (error) throw error;
      if (!data) return showState('यह रचना उपलब्ध नहीं है या प्रकाशित नहीं है।');
      work = data;
      const { data: profile } = await client.from('profiles').select('display_name,username').eq('id', work.author_id).maybeSingle();
      const { data: auth } = await client.auth.getUser();
      userId = auth?.user?.id || null;
      $('readerTitle').textContent = work.title || 'शीर्षक रहित रचना';
      $('readerAuthor').textContent = 'रचनाकार: ' + (profile?.display_name || profile?.username || 'अनाम लेखक');
      $('readerType').textContent = [work.main_form, work.subtype, work.content_language].filter(Boolean).join(' · ') || 'साहित्यिक रचना';
      $('readerMeta').textContent = countWords(work.content) + ' शब्द · लगभग ' + Math.max(1, Math.ceil(countWords(work.content) / 180)) + ' मिनट';
      if (work.cover_url) { $('readerCover').src = work.cover_url; $('readerCover').alt = work.title || 'रचना का आवरण'; $('readerCoverWrap').hidden = false; }
      $('readerContent').textContent = work.content || 'इस रचना में अभी पाठ उपलब्ध नहीं है।';
      $('readerState').hidden = true; $('readerArticle').hidden = false;
      if (work.series_id) await loadSeries();
      if (userId) {
        const { data: progress, error: progressError } = await client.from('reading_progress')
          .select('last_position').eq('user_id', userId).eq('work_id', work.id).maybeSingle();
        if (!progressError && progress?.last_position > 0) {
          requestAnimationFrame(() => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo(0, max * (progress.last_position / 10000));
            setProgress(progress.last_position / 100);
          });
        }
      }
      window.addEventListener('scroll', scheduleSave, { passive: true });
    } catch (error) {
      console.error('मोबाइल रीडर:', error);
      showState('रचना लोड नहीं हो सकी। इंटरनेट कनेक्शन जाँचकर पुनः प्रयास करें।');
    }
  }
  async function loadSeries() {
    const { data, error } = await client.from('works').select('id,title,part_number,series_title')
      .eq('series_id', work.series_id).eq('status', 'published').order('part_number', { ascending: true });
    if (error || !data?.length) return;
    $('seriesPanel').hidden = false;
    $('seriesTitle').textContent = work.series_title || 'इस धारावाहिक के भाग';
    $('seriesLinks').className = 'series-links';
    $('seriesLinks').innerHTML = data.map(item => `<a class="series-link ${item.id === work.id ? 'current' : ''}" href="mobile-reader.html?id=${encodeURIComponent(item.id)}"><span>भाग ${esc(item.part_number || '—')} · ${esc(item.title)}</span><span>${item.id === work.id ? 'पढ़ रहे हैं' : 'पढ़ें →'}</span></a>`).join('');
  }
  $('readerTextSettings').addEventListener('click', () => { $('readerSettings').hidden = !$('readerSettings').hidden; });
  $('fontSizeControl').addEventListener('input', e => $('readerContent').style.fontSize = e.target.value + 'px');
  $('lineHeightControl').addEventListener('input', e => { $('readerContent').style.lineHeight = String(e.target.value / 10); });
  $('readerBackBottom').addEventListener('click', () => location.href = 'mobile-app.html');
  $('readerShare').addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: work?.title || 'साहित्य सूत्रधार', url }); } catch (_) {} }
    else if (navigator.clipboard) { await navigator.clipboard.writeText(url); $('readerShare').textContent = 'लिंक कॉपी हो गया'; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveProgress(); });
  window.addEventListener('pagehide', () => { if (work && userId) { const position = currentPosition(); const words = Math.round(countWords(work.content) * position / 10000); const payload = { user_id:userId, work_id:work.id, last_position:position, estimated_words_read:words, updated_at:new Date().toISOString() }; try { client.from('reading_progress').upsert(payload, {onConflict:'user_id,work_id'}); } catch (_) {} } });
  load();
})();
