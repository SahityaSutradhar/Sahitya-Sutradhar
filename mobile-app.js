(() => {
  const $ = id => document.getElementById(id);
  const grid = $('worksGrid'), state = $('worksState');
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  let allWorks = [];
  let searchTimer = null;
  let searchVersion = 0;
  function render(items) {
    grid.innerHTML = items.map(w => `<article class="work-card"><div class="cover">${w.cover_url ? `<img loading="lazy" src="${escapeHTML(w.cover_url)}" alt="${escapeHTML(w.title)} का आवरण">` : '<span class="cover-placeholder">❀</span>'}</div><div class="work-info"><h3>${escapeHTML(w.title || 'शीर्षक रहित रचना')}</h3><p class="work-author">${escapeHTML(w.author_name || 'अनाम रचनाकार')}</p><small>${escapeHTML(w.main_form||w.work_type||'रचना')}${w.subtype?' · '+escapeHTML(w.subtype):''}</small><p>${escapeHTML((w.content||'').replace(/\s+/g,' ').slice(0,100))}</p><a class="open-work" href="mobile-reader.html?id=${encodeURIComponent(w.id)}">रचना पढ़ें ↗</a></div></article>`).join('');
    state.textContent = items.length ? `${items.length} नवीन रचनाएँ` : 'अभी कोई प्रकाशित रचना उपलब्ध नहीं है।';
  }
  async function load() {
    if (!client) { state.textContent = 'कनेक्शन तैयार नहीं हो पाया। इंटरनेट जाँचें।'; return; }
    try {
      const {data: works, error} = await client.from('works').select('id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language').eq('status','published').order('created_at',{ascending:false}).limit(20);
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
  $('searchClose').addEventListener('click', () => { $('searchPanel').hidden = true; $('searchInput').value=''; render(allWorks); const authors=document.getElementById('mobileSearchAuthors'); if(authors)authors.innerHTML=''; const community=document.getElementById('mobileSearchCommunity');if(community)community.innerHTML=''; });
  $('searchInput').addEventListener('input', e => {
    const q=e.target.value.trim(); clearTimeout(searchTimer); const version=++searchVersion;
    if(!q){render(allWorks);return;}
    state.textContent='रचनाएँ और रचनाकार खोजे जा रहे हैं…';
    searchTimer=setTimeout(async()=>{
      try{
        const pattern=`%${q.replace(/[,%()]/g,' ')}%`;
        const [wr,pr,cr]=await Promise.all([
          client.from('works').select('id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language').eq('status','published').or(`title.ilike.${pattern},content.ilike.${pattern},work_type.ilike.${pattern},main_form.ilike.${pattern},subtype.ilike.${pattern},content_language.ilike.${pattern}`).order('created_at',{ascending:false}).limit(50),
          client.from('profiles').select('id,display_name,username,bio').or(`display_name.ilike.${pattern},username.ilike.${pattern},bio.ilike.${pattern}`).limit(30),
          client.from('community_posts').select('id,author_id,body,created_at').eq('status','published').ilike('body',pattern).order('created_at',{ascending:false}).limit(20)
        ]);
        if(version!==searchVersion)return;
        if(wr.error)throw wr.error;if(pr.error)throw pr.error;if(cr.error)throw cr.error;
        const ids=[...new Set((wr.data||[]).map(w=>w.author_id).filter(Boolean))];let profiles=[];
        if(ids.length){const a=await client.from('profiles').select('id,display_name,username').in('id',ids);profiles=a.data||[];}
        const names=new Map(profiles.map(p=>[p.id,p.display_name||p.username||'अनाम रचनाकार']));
        const workItems=(wr.data||[]).map(w=>({...w,author_name:names.get(w.author_id)||'अनाम रचनाकार'}));
        render(workItems);
        const people=(pr.data||[]).map(p=>`<a class="mobile-search-author" href="index.html#author-${encodeURIComponent(p.id)}">${escapeHTML(p.display_name||p.username||'अनाम रचनाकार')}${p.bio?' · '+escapeHTML(p.bio.slice(0,90)):''}</a>`).join('');
        const authorBox=document.getElementById('mobileSearchAuthors');
        if(authorBox)authorBox.innerHTML='<strong>रचनाकार</strong>'+ (people||'<small>कोई रचनाकार नहीं मिला।</small>');
        const posts=(cr.data||[]).map(p=>`<a class="mobile-search-author" href="index.html#communityView">✧ ${escapeHTML((p.body||'').slice(0,140))}</a>`).join('');
        const communityBox=document.getElementById('mobileSearchCommunity');
        if(communityBox)communityBox.innerHTML='<strong>संगोष्ठी</strong>'+ (posts||'<small>कोई संगोष्ठी पोस्ट नहीं मिली।</small>');
        state.textContent=`${workItems.length} रचनाएँ · ${(pr.data||[]).length} रचनाकार · ${(cr.data||[]).length} संगोष्ठी पोस्ट मिले`;
      }catch(err){console.error('Mobile search:',err);state.textContent='खोज पूरी नहीं हो सकी।';}
    },300);
  });
  $('accountBtn').addEventListener('click', () => location.href='index.html#profileView');
  load();
})();
