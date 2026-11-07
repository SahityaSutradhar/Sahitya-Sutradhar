(() => {
  const client = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const topWorks = document.getElementById('mobileTopWorks');
  const topReaders = document.getElementById('mobileTopReaders');
  async function loadDiscovery() {
    if (!client) return;
    try {
      const { data: reads, error } = await client.from('work_reads').select('work_id,reader_id,words_count').limit(5000);
      if (error) throw error;
      const workCounts = new Map(), readerCounts = new Map();
      (reads || []).forEach(r => {
        workCounts.set(String(r.work_id), (workCounts.get(String(r.work_id)) || 0) + 1);
        if (r.reader_id) readerCounts.set(String(r.reader_id), (readerCounts.get(String(r.reader_id)) || 0) + 1);
      });
      const topIds = [...workCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
      if (topIds.length) {
        const {data: works,error:we}=await client.from('works').select('id,title,author_id,cover_url,status,series_id,series_title,part_number').in('id',topIds.map(x=>x[0])).eq('status','published');
        if(we) throw we;
        const authorIds=[...new Set((works||[]).map(w=>w.author_id).filter(Boolean))];
        const {data: authors}=authorIds.length?await client.from('profiles').select('id,display_name,username').in('id',authorIds):{data:[]};
        const names=new Map((authors||[]).map(a=>[a.id,a.display_name||a.username||'अनाम रचनाकार']));
        const byId=new Map(topIds);
        topWorks.innerHTML=(works||[]).sort((a,b)=>(byId.get(String(b.id))||0)-(byId.get(String(a.id))||0)).map(w=>`<article class="story-card"><div class="cover-grid"><button class="cover-open" type="button" data-mobile-read="${esc(w.id)}">${w.cover_url?`<img class="cover-thumb" src="${esc(w.cover_url)}" alt="">`:'<div class="cover-placeholder">❀</div>'}</button><div><h3>${esc(w.series_title||w.title)}</h3><p>${esc(names.get(w.author_id)||'अनाम रचनाकार')}</p><p class="muted">${byId.get(String(w.id))||0} पठन</p><button class="primary-button" type="button" data-mobile-read="${esc(w.id)}">पढ़ें</button></div></div></article>`).join('') || '<p class="muted">अभी पर्याप्त पठन आँकड़े उपलब्ध नहीं हैं।</p>';
        topWorks.querySelectorAll('[data-mobile-read]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.mobileRead;const target=document.querySelector(`[data-read="${CSS.escape(id)}"]`);if(target)target.click();else location.hash=`work-${encodeURIComponent(id)}`;}));
      } else topWorks.innerHTML='<p class="muted">अभी पर्याप्त पठन आँकड़े उपलब्ध नहीं हैं।</p>';
      const readerIds=[...readerCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0]);
      if(readerIds.length){
        const {data: people}=await client.from('profiles').select('id,display_name,username,avatar_url').in('id',readerIds);
        const map=new Map((people||[]).map(x=>[x.id,x]));
        topReaders.innerHTML=readerIds.map(id=>{const p=map.get(id);if(!p)return '';return `<button class="writer-card" type="button" data-mobile-writer="${esc(id)}"><span class="mini-avatar">${p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:esc((p.display_name||p.username||'अ').slice(0,1))}</span><span class="writer-card-main"><strong>${esc(p.display_name||p.username||'पाठक')}</strong><small>${readerCounts.get(id)||0} पठन</small></span></button>`;}).join('')||'<p class="muted">पाठक आँकड़े उपलब्ध नहीं हैं।</p>';
        topReaders.querySelectorAll('[data-mobile-writer]').forEach(b=>b.addEventListener('click',()=>{const trigger=document.querySelector(`[data-writer="${CSS.escape(b.dataset.mobileWriter)}"]`);if(trigger)trigger.click();else document.querySelector('[data-tab="profile"]')?.click();}));
      } else topReaders.innerHTML='<p class="muted">अभी पाठक आँकड़े उपलब्ध नहीं हैं।</p>';
    } catch(e) { console.warn('Mobile discovery stats:',e); topWorks.innerHTML='<p class="muted">लोकप्रिय रचनाओं के आँकड़े अभी उपलब्ध नहीं हैं।</p>'; topReaders.innerHTML='<p class="muted">पाठक आँकड़े अभी उपलब्ध नहीं हैं।</p>'; }
  }
  function categorySelection() { return [...document.querySelectorAll('#mobileOnboardingCategories input:checked')].map(x=>x.value); }
  async function showOnboardingIfNeeded(user) {
    if (!user || sessionStorage.getItem('ss_mobile_onboarded') === user.id) return;
    let profile = null;
    try { const q=await client.from('profiles').select('reading_language,preferred_categories').eq('id',user.id).maybeSingle(); profile=q.data||null; } catch(e) { console.warn(e); }
    if (profile?.preferred_categories?.length) { sessionStorage.setItem('ss_mobile_onboarded',user.id); return; }
    const dialog=document.getElementById('mobileOnboarding');
    if (!dialog || dialog.open) return;
    document.getElementById('mobileOnboardingLanguage').value=profile?.reading_language||'hi';
    dialog.showModal();
  }
  document.getElementById('mobileOnboardingForm')?.addEventListener('submit',async e=>{
    e.preventDefault(); const user=(await client.auth.getUser()).data.user; if(!user)return;
    const cats=categorySelection(); if(cats.length>4){document.getElementById('mobileOnboardingMessage').textContent='अधिकतम चार श्रेणियाँ चुनें।';return;}
    const language=document.getElementById('mobileOnboardingLanguage').value;
    const {error}=await client.from('profiles').update({reading_language:language,preferred_categories:cats}).eq('id',user.id);
    if(error){document.getElementById('mobileOnboardingMessage').textContent='पसंद सुरक्षित नहीं हुई: '+error.message;return;}
    sessionStorage.setItem('ss_mobile_onboarded',user.id);document.getElementById('mobileOnboarding').close();
    location.reload();
  });
  async function gateLogin() {
    if(!client)return;
    document.getElementById('authDialog')?.addEventListener('cancel',e=>e.preventDefault());
    const {data}=await client.auth.getSession();
    if(!data.session){
      const dlg=document.getElementById('authDialog');
      const close=document.getElementById('authClose'); if(close) close.hidden=true;
      if(dlg&&!dlg.open)dlg.showModal();
    } else showOnboardingIfNeeded(data.session.user);
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'&&session?.user){document.getElementById('authDialog')?.close();showOnboardingIfNeeded(session.user);}
      if(event==='SIGNED_OUT'){
        sessionStorage.removeItem('ss_mobile_onboarded');
        const dlg=document.getElementById('authDialog');const close=document.getElementById('authClose');if(close)close.hidden=true;
        if(dlg&&!dlg.open)dlg.showModal();
      }
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{loadDiscovery();gateLogin();});
})();
