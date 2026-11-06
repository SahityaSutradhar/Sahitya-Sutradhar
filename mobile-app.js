(() => {
  const $ = id => document.getElementById(id);
  const grid = $('worksGrid'), state = $('worksState');
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  let allWorks = [];
  function render(items) {
    grid.innerHTML = items.map(w => `<article class="work-card"><div class="cover">${w.cover_url ? `<img loading="lazy" src="${escapeHTML(w.cover_url)}" alt="${escapeHTML(w.title)} का आवरण">` : '<span class="cover-placeholder">❀</span>'}</div><div class="work-info"><h3>${escapeHTML(w.title || 'शीर्षक रहित रचना')}</h3><p class="work-author">${escapeHTML(w.author_name || 'अनाम रचनाकार')}</p><a class="open-work" href="index.html#work-${encodeURIComponent(w.id)}">रचना पढ़ें ↗</a></div></article>`).join('');
    state.textContent = items.length ? `${items.length} नवीन रचनाएँ` : 'अभी कोई प्रकाशित रचना उपलब्ध नहीं है।';
  }
  async function load() {
    if (!client) { state.textContent = 'कनेक्शन तैयार नहीं हो पाया। इंटरनेट जाँचें।'; return; }
    try {
      const {data: works, error} = await client.from('works').select('id,author_id,title,status,created_at,cover_url,content_language').eq('status','published').order('created_at',{ascending:false}).limit(12);
      if (error) throw error;
      const ids = [...new Set((works || []).map(w => w.author_id).filter(Boolean))];
      let profiles = [];
      if (ids.length) {
        const result = await client.from('profiles').select('id,display_name,username').in('id',ids);
        if (result.error) throw result.error;
        profiles = result.data || [];
      }
      const names = new Map(profiles.map(p => [p.id,p.display_name || p.username || 'अनाम रचनाकार']));
      allWorks = (works || []).map(w => ({...w,author_name:names.get(w.author_id) || 'अनाम रचनाकार'}));
      render(allWorks);
    } catch (error) {
      console.error('Mobile app home load:', error);
      state.textContent = 'रचनाएँ लोड नहीं हो सकीं। कृपया इंटरनेट कनेक्शन जाँचकर पुनः खोलें।';
    }
  }
  $('searchToggle').addEventListener('click', () => { $('searchPanel').hidden = !$('searchPanel').hidden; if (!$('searchPanel').hidden) $('searchInput').focus(); });
  $('searchClose').addEventListener('click', () => { $('searchPanel').hidden = true; $('searchInput').value=''; render(allWorks); });
  $('searchInput').addEventListener('input', e => { const q=e.target.value.trim().toLocaleLowerCase('hi'); render(allWorks.filter(w => `${w.title} ${w.author_name}`.toLocaleLowerCase('hi').includes(q))); });
  $('accountBtn').addEventListener('click', () => location.href='index.html#profileView');
  load();
})();
    
