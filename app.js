const supabaseClient = window.supabase?.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
const CATEGORIES = ["रोमांटिक","कॉमेडी","हास्य-व्यंग्य","प्रेम","सस्पेंस एवं थ्रिलर","एडवेंचर","साइंस फिक्शन","फैंटेसी","देशप्रेम","शौर्य","ओज","ऐतिहासिक","पौराणिक","मिश्रित","रेखाचित्र","बालकथा","मनोरंजन","शिक्षाप्रद","अन्य"];
const SUBTYPES = {
  "गद्य":["कहानी","लघुकथा","उपन्यास","लेख","निबंध","नाटक","संस्मरण","यात्रा वृत्तांत","आत्मकथा","हास्य-व्यंग्य","जीवनी"],
  "पद्य":["कविता","गीत","मुक्तक","छंद","नई कविता"],
  "चंपू काव्य":[]
};
const STORAGE = "sahityaSutradhar.account.v2";
const seed = [];
let state = loadState();
let activeCategory = "सभी";
let activeTab = "home";
let currentReaderId = null;
let editingWorkId = null;
let currentUserId = null;
let authSyncVersion = 0;
let readingStartedAt = 0;
let toastTimer;

function emptyAccountState(){
  return {stories:[], profile:{name:"अनाम पाठक",intro:"",wordsRead:0,bookmarks:[],avatarUrl:"",readingLanguage:"hi",preferredCategories:[]}, theme:"light", drafts:{title:"",body:"",type:"",subtype:"",categories:[]}};
}
function accountStorageKey(userId=currentUserId){ return STORAGE + "." + (userId || "guest"); }
function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(accountStorageKey(null)));
    if(saved) return {...emptyAccountState(), ...saved, stories:[], profile:{...emptyAccountState().profile,...(saved.profile||{})}};
  }catch(e){}
  return emptyAccountState();
}
function saveState(){
  try{ localStorage.setItem(accountStorageKey(), JSON.stringify({...state, stories:[]})); }
  catch(e){ console.warn("स्थानीय खाता डेटा सुरक्षित नहीं हुआ:",e); }
}
function switchAccountState(userId){
  currentUserId = userId || null;
  try{
    const saved = JSON.parse(localStorage.getItem(accountStorageKey(currentUserId)) || "null");
    state = saved ? {...emptyAccountState(),...saved,stories:[],profile:{...emptyAccountState().profile,...(saved.profile||{})}} : emptyAccountState();
  }catch(e){ state=emptyAccountState(); }
  state.stories=[];
  applyTheme();
  renderProfile();
  renderLibrary();
  renderStories();
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function wordCount(s=""){return (s.trim().match(/\S+/g)||[]).length;}
function minutesFor(s=""){return Math.max(1,Math.ceil(wordCount(s)/200));}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2500);}
function allCategories(){return ["सभी",...CATEGORIES];}
function renderChips(){
  document.getElementById("categoryChips").innerHTML=allCategories().map(c=>`<button class="chip ${c===activeCategory?"active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
  document.getElementById("categoryChips").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.category;renderChips();renderStories();}));
}
function storyCard(s){
  const cats=(s.categories||[]).map(c=>`<span class="tag">${escapeHtml(c)}</span>`).join(" ");
  const excerpt=(s.body||"").replace(/\s+/g," ").slice(0,150);
  return `<article class="story-card"><div class="cover-grid"><div>${s.coverUrl?`<img class="cover-thumb" src="${escapeHtml(s.coverUrl)}" alt="${escapeHtml(s.title)} कवर">`:`<div class="cover-placeholder">❀</div>`}</div><div><div>${cats}</div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.author||"अनाम लेखक")} · ${escapeHtml(s.type||"रचना")}${s.subtype?" / "+escapeHtml(s.subtype):""}</p><p class="excerpt">${escapeHtml(excerpt)}${excerpt.length>=150?"…":""}</p><div class="story-meta"><span>◉ ${s.reads||0} पाठक</span><button data-read="${escapeHtml(s.id)}">खोलें ↗</button></div></div></div></article>`;
}
function renderStories(){
  let list=[...state.stories].filter(s=>s.status!=="draft").sort((a,b)=>(b.created||0)-(a.created||0));
  const readingLang=state.profile.readingLanguage||"hi";
  list=list.filter(s=>(s.language||"hi")===readingLang);
  const preferred=state.profile.preferredCategories||[];
  if(preferred.length)list.sort((a,b)=>Number((b.categories||[]).some(c=>preferred.includes(c)))-Number((a.categories||[]).some(c=>preferred.includes(c))));
  if(activeCategory!=="सभी")list=list.filter(s=>(s.categories||[]).includes(activeCategory));
  document.getElementById("storyCount").textContent=`${list.length} रचनाएँ`;
  document.getElementById("storyList").innerHTML=list.map(storyCard).join("");
  document.getElementById("emptyState").classList.toggle("hidden",list.length!==0);
  document.getElementById("storyList").classList.toggle("hidden",list.length===0);
  document.getElementById("storyHeading").textContent=activeCategory==="सभी"?"नई और लोकप्रिय रचनाएँ":activeCategory+" की रचनाएँ";
  bindReadButtons();
}
function bindReadButtons(){document.querySelectorAll("[data-read]").forEach(b=>b.addEventListener("click",()=>openReader(b.dataset.read)));}
function formatMarkup(value=""){
  let safe=escapeHtml(value);
  safe=safe.replace(/\[\[font:(serif|sans|devotional|poetic|mono)\]\]([\s\S]*?)\[\[\/font\]\]/g,'<span class="font-$1">$2</span>');
  safe=safe.replace(/\[\[color:(royal-red|dark-red|saffron|black|blue|green|white|yellow)\]\]([\s\S]*?)\[\[\/color\]\]/g,'<span class="color-$1">$2</span>');
  safe=safe.replace(/\[\[highlight\]\]([\s\S]*?)\[\[\/highlight\]\]/g,'<mark>$1</mark>');
  safe=safe.replace(/\*\*([\s\S]*?)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>');
  return safe.replace(/\n/g,'<br>');
}
function wrapEditorSelection(open,close){
  const el=document.getElementById("storyBody"),a=el.selectionStart,b=el.selectionEnd;
  if(a===b){toast("पहले जिस पाठ को सजाना है उसे चुनें।");return;}
  const selected=el.value.slice(a,b);el.setRangeText(open+selected+close,a,b,"select");el.focus();saveDraftFromForm();
}
function renderWriters(){
  const published=state.stories.filter(s=>s.status==="published"&&s.authorId);
  const grouped=new Map();
  for(const s of published){let w=grouped.get(s.authorId);if(!w){w={id:s.authorId,name:s.author||"रचनाकार",avatar:s.authorAvatar||"",works:0,reads:0,latest:s.created||0};grouped.set(s.authorId,w);}w.works++;w.reads+=Number(s.reads||0);w.latest=Math.max(w.latest,s.created||0);}
  const writers=[...grouped.values()];
  const render=(list)=>list.map(w=>`<button class="writer-card" type="button" data-writer="${escapeHtml(w.id)}"><span class="mini-avatar">${w.avatar?`<img src="${escapeHtml(w.avatar)}" alt="">`:escapeHtml(w.name.slice(0,1))}</span><span class="writer-card-main"><strong>${escapeHtml(w.name)}</strong><small>${w.works} प्रकाशित रचनाएँ</small></span><span class="tag">प्रोफ़ाइल ↗</span></button>`).join("")||'<p class="muted">अभी लेखक सूची उपलब्ध नहीं है।</p>';
  document.getElementById("newWritersList").innerHTML=render([...writers].sort((a,b)=>b.latest-a.latest).slice(0,8));
  const sort=document.getElementById("writerSort")?.value||"reads";
  document.getElementById("activeWritersList").innerHTML=render([...writers].sort((a,b)=>sort==="works"?b.works-a.works:sort==="followers"?Number(b.followers||0)-Number(a.followers||0):b.reads-a.reads).slice(0,12));
  document.querySelectorAll("[data-writer]").forEach(b=>b.addEventListener("click",()=>openWriterProfile(b.dataset.writer)));
}
async function openWriterProfile(authorId){
  const story=state.stories.find(s=>s.authorId===authorId);if(story)currentReaderId=story.id;await openAuthorProfile(authorId);
}
async function loadHomepageStats(){
  const latest=state.stories.filter(s=>s.status==="published").sort((a,b)=>b.created-a.created).slice(0,20);
  const box=document.getElementById("latestWorksList");if(box){box.innerHTML=latest.map(storyCard).join("")||'<p class="muted">अभी कोई प्रकाशित रचना नहीं।</p>';bindReadButtons();}
  renderWriters();
  if(!supabaseClient)return;
  const {data:stats,error}=await supabaseClient.rpc("get_public_author_stats");
  if(!error&&Array.isArray(stats)){
    const map=new Map(stats.map(x=>[x.author_id,x]));
    for(const s of state.stories){const x=map.get(s.authorId);if(x)s.reads=Number(x.total_reads||0);}
    const followMap=new Map(stats.map(x=>[x.author_id,Number(x.total_followers||0)]));
    const latestBox=document.getElementById("latestWorksList");if(latestBox){latestBox.innerHTML=state.stories.filter(x=>x.status==="published").sort((a,b)=>b.created-a.created).slice(0,20).map(storyCard).join("");bindReadButtons();}
    renderStories();
    const grouped=new Map();for(const s of state.stories.filter(x=>x.status==="published"&&x.authorId)){const w=grouped.get(s.authorId)||{id:s.authorId,name:s.author,avatar:s.authorAvatar,works:0,reads:0,followers:followMap.get(s.authorId)||0,latest:s.created};w.works++;w.reads+=Number(s.reads||0);w.latest=Math.max(w.latest,s.created||0);grouped.set(s.authorId,w);}
    const writers=[...grouped.values()];const sort=document.getElementById("writerSort")?.value||"reads";
    const render=list=>list.map(w=>`<button class="writer-card" type="button" data-writer="${escapeHtml(w.id)}"><span class="mini-avatar">${w.avatar?`<img src="${escapeHtml(w.avatar)}" alt="">`:escapeHtml((w.name||"अ").slice(0,1))}</span><span class="writer-card-main"><strong>${escapeHtml(w.name)}</strong><small>${w.works} रचनाएँ · ${w.reads} पाठक · ${w.followers} फ़ॉलोअर</small></span></button>`).join("")||'<p class="muted">अभी लेखक सूची उपलब्ध नहीं है।</p>';
    document.getElementById("newWritersList").innerHTML=render([...writers].sort((a,b)=>b.latest-a.latest).slice(0,8));
    document.getElementById("activeWritersList").innerHTML=render([...writers].sort((a,b)=>sort==="works"?b.works-a.works:sort==="followers"?b.followers-a.followers:b.reads-a.reads).slice(0,12));
    document.querySelectorAll("[data-writer]").forEach(b=>b.addEventListener("click",()=>openWriterProfile(b.dataset.writer)));
  }
}
function renderPreferredCategories(){
  const box=document.getElementById("preferredCategories");if(!box)return;
  box.innerHTML=CATEGORIES.map(c=>`<label><input type="checkbox" value="${escapeHtml(c)}" ${(state.profile.preferredCategories||[]).includes(c)?"checked":""}>${escapeHtml(c)}</label>`).join("");
  box.querySelectorAll("input").forEach(input=>input.addEventListener("change",async()=>{
    const values=[...box.querySelectorAll("input:checked")].map(x=>x.value);state.profile.preferredCategories=values;saveState();renderStories();
    if(!supabaseClient){toast("पसंद इस डिवाइस पर सुरक्षित हुई।");return;}
    const {data:{user}}=await supabaseClient.auth.getUser();if(user){const {error}=await supabaseClient.from("profiles").update({preferred_categories:values}).eq("id",user.id);if(error)toast("पसंद सुरक्षित नहीं हुई: "+error.message);else toast("पसंदीदा श्रेणियाँ सुरक्षित हुईं।");}else toast("पसंद स्थानीय रूप से सुरक्षित हुई। लॉगिन के बाद क्लाउड में भी सहेजें।");
  }));
}
function renderCategoriesForm(){
  document.getElementById("formCategories").innerHTML=CATEGORIES.map(c=>`<label><input type="checkbox" value="${escapeHtml(c)}"> ${escapeHtml(c)}</label>`).join("");
  document.querySelectorAll("#formCategories input").forEach(cb=>cb.addEventListener("change",()=>{
    const checked=[...document.querySelectorAll("#formCategories input:checked")];
    if(checked.length>4){cb.checked=false;toast("एक रचना के लिए अधिकतम चार श्रेणियाँ चुन सकते हैं।");}
  }));
}
function updateSubtypes(){
  const type=document.getElementById("formType").value;
  const sel=document.getElementById("formSubType");
  sel.innerHTML=type==="चंपू काव्य"?'<option value="">उपप्रकार आवश्यक नहीं</option>':type?'<option value="">उपप्रकार चुनें</option>'+SUBTYPES[type].map(s=>`<option>${escapeHtml(s)}</option>`).join(""):'<option value="">पहले रूप चुनें</option>';
  sel.required=!!type&&type!=="चंपू काव्य";
}
function saveDraftFromForm(){
  state.drafts={title:document.getElementById("storyTitle").value,body:document.getElementById("storyBody").value,type:document.getElementById("formType").value,subtype:document.getElementById("formSubType").value,categories:[...document.querySelectorAll("#formCategories input:checked")].map(x=>x.value)};
  saveState();document.getElementById("draftStatus").textContent="मसौदा इसी डिवाइस पर सुरक्षित";
  document.getElementById("charCount").textContent=`${document.getElementById("storyBody").value.length} अक्षर`;
}
function restoreDraft(){
  const d=state.drafts||{};
  document.getElementById("storyTitle").value=d.title||"";
  document.getElementById("storyBody").value=d.body||"";
  document.getElementById("formType").value=d.type||"";
  updateSubtypes();
  document.getElementById("formSubType").value=d.subtype||"";
  document.querySelectorAll("#formCategories input").forEach(cb=>cb.checked=(d.categories||[]).includes(cb.value));
  document.getElementById("charCount").textContent=`${(d.body||"").length} अक्षर`;
}
function openWrite(){
  editingWorkId = null;
  restoreDraft();
  document.querySelector("#writeDialog .modal-heading h2").textContent = "नई रचना";
  document.querySelector('#storyForm button[type="submit"]').textContent = "प्रकाशित करें";
  document.getElementById("storyCover").value = "";
  document.getElementById("writeDialog").showModal();
}

function openEditWork(id){
  const s = state.stories.find(x => String(x.id) === String(id));
  if(!s || s.source !== "supabase") return;
  editingWorkId = s.id;
  document.getElementById("storyTitle").value = s.title || "";
  document.getElementById("storyBody").value = s.body || "";
  document.getElementById("formType").value = s.type || "";
  updateSubtypes();
  document.getElementById("formSubType").value = s.subtype || "";
  document.querySelectorAll("#formCategories input").forEach(cb => cb.checked = (s.categories || []).includes(cb.value));
  document.getElementById("storyLanguage").value = s.language || "hi";
  document.getElementById("storyCover").value = "";
  document.getElementById("rightsCheck").checked = true;
  document.getElementById("charCount").textContent = `${(s.body || "").length} अक्षर`;
  document.getElementById("draftStatus").textContent = s.coverUrl ? "मौजूदा कवर सुरक्षित रहेगा; नया कवर चुनने पर बदलेगा" : "प्रकाशित रचना संपादन मोड";
  document.querySelector("#writeDialog .modal-heading h2").textContent = "प्रकाशित रचना संपादित करें";
  document.querySelector('#storyForm button[type="submit"]').textContent = "बदलाव सुरक्षित करें";
  document.getElementById("readerDialog").close();
  document.getElementById("writeDialog").showModal();
}

function getDatabaseWorkType(type, subtype) {
  if (type === "पद्य") return "poem";
  const mapping = {
    "कहानी": "story",
    "लघुकथा": "story",
    "उपन्यास": "novel",
    "लेख": "article",
    "निबंध": "essay"
  };
  return mapping[subtype] || "other";
}

async function loadCloudWorks() {
  if (!supabaseClient) return;

  try {
    const authResult = await supabaseClient.auth.getUser();
    currentUserId = authResult.data?.user?.id || null;
    const { data: works, error } = await supabaseClient
      .from("works")
      .select("id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language")
      .in("status", ["published", "draft"])
      .order("created_at", { ascending: false });

    if (error) throw error;

    const ids = (works || []).map(w => w.id);
    const authorIds = [...new Set((works || []).map(w => w.author_id))];
    let links = [], categories = [], profiles = [];

    if (ids.length) {
      const { data, error: linksError } = await supabaseClient
        .from("work_categories")
        .select("work_id,category_id")
        .in("work_id", ids);
      if (linksError) throw linksError;
      links = data || [];
    }

    const categoryIds = [...new Set(links.map(x => x.category_id))];
    if (categoryIds.length) {
      const { data, error: categoriesError } = await supabaseClient
        .from("categories")
        .select("id,name")
        .in("id", categoryIds);
      if (categoriesError) throw categoriesError;
      categories = data || [];
    }

    if (authorIds.length) {
      const { data, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .in("id", authorIds);
      if (profilesError) throw profilesError;
      profiles = data || [];
                                   }
    const cloudStories = (works || []).map(w => {
      const profile = profiles.find(p => p.id === w.author_id);
      const linkedCategoryIds = links
        .filter(link => link.work_id === w.id)
        .map(link => link.category_id);

      return {
        id: w.id,
        title: w.title,
        body: w.content,
        type: w.main_form || (w.work_type === "poem" ? "पद्य" : "गद्य"),
        subtype: w.subtype || "",
        categories: categories
          .filter(c => linkedCategoryIds.includes(c.id))
          .map(c => c.name),
        author: profile?.display_name || profile?.username || "अनाम लेखक",
        authorAvatar: profile?.avatar_url || "",
        coverUrl: w.cover_url || "",
        language: w.content_language || "hi",
        authorId: w.author_id,
        created: new Date(w.created_at).getTime(),
        reads: 0,
        minutes: minutesFor(w.content),
        source: "supabase",
        status: w.status || "published"
      };
    });

    // पुराने LocalStorage रिकॉर्ड मिटाए बिना क्लाउड रिकॉर्ड ताज़ा करें।
    const cloudIds = new Set(cloudStories.map(s => s.id));
    // केवल Supabase से प्राप्त वास्तविक प्रकाशित/अपने ड्राफ्ट रखें; पुराने साझा लोकल डेमो रिकॉर्ड हटाएँ।
    state.stories = cloudStories;

    saveState();
    renderStories();
    renderProfile();
    renderLibrary();
    loadHomepageStats();
  } catch (error) {
    console.error("Supabase रचनाएँ लोड नहीं हुईं:", error);
    toast("Supabase से रचनाएँ लोड नहीं हुईं: " + error.message);
  }
}

async function publishStory(e) {
  e.preventDefault();

  const title = document.getElementById("storyTitle").value.trim();
  const body = document.getElementById("storyBody").value.trim();
  const type = document.getElementById("formType").value;
  const subtype = document.getElementById("formSubType").value;
  const categoryNames = [
    ...document.querySelectorAll("#formCategories input:checked")
  ].map(x => x.value);
  const contentLanguage = document.getElementById("storyLanguage")?.value || "hi";
  const coverFile = document.getElementById("storyCover")?.files?.[0] || null;

  if (!title || !body || !type || !categoryNames.length) {
    toast("शीर्षक, सामग्री, विधा और कम-से-कम एक श्रेणी भरें।");
    return;
  }
  if (type !== "चंपू काव्य" && !subtype) {
    toast("कृपया रचना का उपप्रकार चुनें।");
    return;
  }
  if (!supabaseClient) {
    toast("Supabase कनेक्शन उपलब्ध नहीं है।");
    return;
  }

  const submitButton = document.querySelector(
    '#storyForm button[type="submit"]'
  );
  if (submitButton) submitButton.disabled = true;

  try {
    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();
    if (authError) throw authError;

    const user = authData?.user;
    if (!user) {
      toast("रचना प्रकाशित करने के लिए पहले लॉगिन करें।");
      return;
    }

    // श्रेणियों की ID पहले जाँचें ताकि गलत श्रेणी पर रचना insert न हो।
    const { data: categoryRows, error: categoryError } =
      await supabaseClient
        .from("categories")
        .select("id,name")
        .in("name", categoryNames);
    if (categoryError) throw categoryError;

    const categoryMap = new Map(
      (categoryRows || []).map(row => [row.name, row.id])
    );
    const missing = categoryNames.filter(name => !categoryMap.has(name));
    if (missing.length) {
      throw new Error(
        "ये श्रेणियाँ Supabase की categories टेबल में नहीं मिलीं: " +
        missing.join(", ")
      );
    }

    let coverUrl = null;
    if (coverFile) coverUrl = await uploadSutradharImage(coverFile, "covers");
    let work;
    if (editingWorkId) {
      const existing = state.stories.find(x => String(x.id) === String(editingWorkId));
      if (!existing || existing.authorId !== user.id) throw new Error("केवल अपनी रचना संपादित कर सकते हैं।");
      const updateData = {
        title,
        content: body,
        work_type: getDatabaseWorkType(type, subtype),
        main_form: type,
        subtype: subtype || null,
        content_language: contentLanguage
      };
      if (coverUrl) updateData.cover_url = coverUrl;
      const { data, error: workError } = await supabaseClient
        .from("works").update(updateData).eq("id", editingWorkId).eq("author_id", user.id).select().single();
      if (workError) throw workError;
      work = data;
      const { error: deleteLinksError } = await supabaseClient.from("work_categories").delete().eq("work_id", editingWorkId);
      if (deleteLinksError) throw deleteLinksError;
    } else {
      const { data, error: workError } = await supabaseClient
        .from("works")
        .insert({
          author_id: user.id,
          title,
          content: body,
          work_type: getDatabaseWorkType(type, subtype),
          main_form: type,
          subtype: subtype || null,
          status: "published",
          content_language: contentLanguage,
          cover_url: coverUrl
        })
        .select()
        .single();
      if (workError) throw workError;
      work = data;
    }

    const links = categoryNames.map(name => ({ work_id: work.id, category_id: categoryMap.get(name) }));
    const { error: linkError } = await supabaseClient.from("work_categories").insert(links);

    if (linkError) {
      console.error("श्रेणी लिंक सेव नहीं हुए:", linkError);
      toast("रचना सेव हुई, लेकिन श्रेणियाँ नहीं जुड़ीं: " + linkError.message);
    } else {
      toast(editingWorkId ? "रचना के बदलाव सुरक्षित हो गए।" : "रचना Supabase में सफलतापूर्वक प्रकाशित हो गई!");
    }
    
    editingWorkId = null;
    state.drafts = {
      title: "", body: "", type: "", subtype: "", categories: []
    };
    saveState();
    document.getElementById("writeDialog").close();
    await loadCloudWorks();
  } catch (error) {
    console.error("रचना प्रकाशित करने में समस्या:", error);
    toast("रचना प्रकाशित नहीं हुई: " + (error.message || String(error)));
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function shareExcerptAsImage(){
  const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;
  const selection=window.getSelection()?.toString().trim();
  if(!selection){toast("पहले रचना में से कोई अंश चुनें, फिर यह बटन दबाएँ।");return;}
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext("2d");const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,"#5b1d28");g.addColorStop(1,"#9a7047");ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
  ctx.strokeStyle="#e8cf9d";ctx.lineWidth=4;ctx.strokeRect(42,42,996,1266);
  ctx.fillStyle="#f6dfb5";ctx.textAlign="center";ctx.font="bold 38px Georgia, serif";ctx.fillText("साहित्य सूत्रधार",540,130);
  ctx.fillStyle="#fff8e9";ctx.font="bold 48px sans-serif";wrapCanvasText(ctx,s.title,540,250,850,64,5);
  ctx.strokeStyle="#d9b56e";ctx.beginPath();ctx.moveTo(160,390);ctx.lineTo(920,390);ctx.stroke();
  ctx.textAlign="left";ctx.fillStyle="#fffaf0";ctx.font="36px sans-serif";wrapCanvasText(ctx,selection,140,480,800,58,11);
  ctx.textAlign="center";ctx.fillStyle="#f5dcae";ctx.font="bold 32px sans-serif";ctx.fillText("— "+(s.author||"अनाम लेखक"),540,1160);
  ctx.font="22px sans-serif";ctx.fillText(location.href.split("#")[0]+"#work-"+s.id,540,1220);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob){toast("चित्र तैयार नहीं हो सका।");return;}
  const file=new File([blob],"sahitya-sutradhar-excerpt.png",{type:"image/png"});
  if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:s.title,text:"साहित्य सूत्रधार पर पढ़ें — "+s.author});return;}catch(e){if(e.name==="AbortError")return;}}
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="sahitya-sutradhar-excerpt.png";a.click();URL.revokeObjectURL(url);toast("चुने हुए अंश का चित्र डाउनलोड हो गया।");
}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines){
  const words=String(text).split(/\s+/);let line="",lines=[];
  for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
  if(line)lines.push(line);if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=lines[maxLines-1].replace(/[.…]*$/,"…");}
  lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return lines.length;
}

async function openReader(id){
  const s=state.stories.find(x=>x.id===id);if(!s)return;
  currentReaderId=id;readingStartedAt=Date.now();
  const {data:{user}} = supabaseClient ? await supabaseClient.auth.getUser() : {data:{user:null}};
  if(s.source==="supabase" && s.status==="published" && !user){
    document.getElementById("readerBody").textContent=(s.body||"").slice(0,220)+"… पूरी रचना पढ़ने, रेटिंग और समीक्षा के लिए खाता बनाएँ या लॉगिन करें।";
    document.getElementById("feedbackPanel").classList.add("hidden");
    document.getElementById("readerDialog").showModal();
    return;
  }
  if(s.source==="supabase" && s.status==="published" && user && user.id!==s.authorId){
    const wc=wordCount(s.body||"");
    const {error:readError}=await supabaseClient.from("work_reads").insert({work_id:s.id,reader_id:user.id,words_count:wc});
    if(readError) console.warn("पठन इवेंट सेव नहीं हुआ",readError.message);
  }
  document.getElementById("readerTitle").textContent=s.title;
  document.getElementById("readerCategory").textContent=[s.type,s.subtype,...(s.categories||[])].filter(Boolean).join(" · ");
  document.getElementById("readerAuthor").textContent=(s.author||"अनाम लेखक");
  document.getElementById("readerAuthorAvatar").innerHTML=s.authorAvatar?`<img src="${escapeHtml(s.authorAvatar)}" alt="">`:escapeHtml((s.author||"अ").trim().slice(0,1));
  const coverSlot=document.getElementById("readerCoverSlot"); coverSlot.innerHTML=s.coverUrl?`<img class="cover-thumb" src="${escapeHtml(s.coverUrl)}" alt="कवर">`:`<div class="cover-placeholder">कवर नहीं</div>`;
  document.getElementById("readerBody").innerHTML=formatMarkup(s.body);
  document.getElementById("readerMeta").textContent=`लगभग ${minutesFor(s.body)} मिनट`;
  document.getElementById("readerWords").textContent=`रचना में कुल ${wordCount(s.body)} शब्द`;
  document.getElementById("bookmarkButton").textContent=(state.profile.bookmarks||[]).includes(id)?"♥":"♧";
  const owner = !!s.authorId && (await supabaseClient?.auth.getUser())?.data?.user?.id === s.authorId;
  const action = document.getElementById("workOwnerAction");
  if(action){ action.classList.toggle("hidden",!owner); action.textContent=s.status==="draft"?"पुनः प्रकाशित करें":"अप्रकाशित करके ड्राफ्ट में रखें"; }
  const editAction = document.getElementById("editWorkAction");
  if(editAction) editAction.classList.toggle("hidden",!owner);
  const panel=document.getElementById("feedbackPanel");
  if(panel) panel.classList.toggle("hidden",s.source!=="supabase" || s.status==="draft");
  document.getElementById("readerDialog").showModal();
  if(s.source==="supabase" && s.status!=="draft") await loadWorkFeedback(id);
  if(s.source==="supabase" && user) await refreshReaderStats(s);
}

async function loadWorkFeedback(workId){
  const summary=document.getElementById("ratingSummary");
  const reviewsBox=document.getElementById("reviewsList");
  if(!summary||!reviewsBox||!supabaseClient)return;
  summary.textContent="रेटिंग और समीक्षाएँ लोड हो रही हैं…";
  reviewsBox.innerHTML="";
  try{
    const [{data:ratings,error:re}, {data:reviews,error:ve}] = await Promise.all([
      supabaseClient.from("ratings").select("id,user_id,rating,created_at").eq("work_id",workId),
      supabaseClient.from("reviews").select("id,user_id,review_text,created_at,updated_at").eq("work_id",workId).order("created_at",{ascending:false})
    ]);
    if(re)throw re;if(ve)throw ve;
    const rows=ratings||[], avg=rows.length?rows.reduce((a,x)=>a+Number(x.rating),0)/rows.length:0;
    summary.textContent=`★ ${avg?avg.toFixed(1):"—"} / 5 · ${rows.length} रेटिंग · ${(reviews||[]).length} समीक्षाएँ`;
    const {data:{user}}=await supabaseClient.auth.getUser();
    const myRating=rows.find(x=>x.user_id===user?.id);
    const myReview=(reviews||[]).find(x=>x.user_id===user?.id);
    document.getElementById("ratingInput").value=myRating?.rating||"";
    document.getElementById("reviewInput").value=myReview?.review_text||"";
    const userIds=[...new Set([...(reviews||[]).map(x=>x.user_id),...rows.map(x=>x.user_id)])];
    let profiles=[];
    if(userIds.length){const q=await supabaseClient.from("profiles").select("id,display_name,username").in("id",userIds);if(!q.error)profiles=q.data||[];}
    const ratingPeople=rows.map(r=>{const who=profiles.find(p=>p.id===r.user_id);return `<button class="tag profile-link" type="button" data-person-profile="${escapeHtml(r.user_id)}">${escapeHtml(who?.display_name||who?.username||"पाठक")} · ${"★".repeat(Number(r.rating))}</button>`;}).join(" ");
    if(!(reviews||[]).length){reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div><p class="muted">अभी कोई समीक्षा नहीं है। पहली समीक्षा आप लिख सकते हैं।</p>`;return;}
    reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div>`;
    reviewsBox.innerHTML+= (reviews||[]).map(r=>{
      const who=profiles.find(p=>p.id===r.user_id);
      return `<article class="review-card"><button class="profile-link" type="button" data-person-profile="${escapeHtml(r.user_id)}"><strong>${escapeHtml(who?.display_name||who?.username||"पाठक")}</strong></button><p>${escapeHtml(r.review_text)}</p><small>${new Date(r.created_at).toLocaleDateString("hi-IN")}</small><div class="review-comments" id="reviewComments-${r.id}">कमेंट लोड हो रहे हैं…</div><form class="review-comment-form" data-review-comment="${r.id}"><input name="comment" maxlength="1500" placeholder="इस समीक्षा पर टिप्पणी करें…" required><button type="submit">भेजें</button></form></article>`;
    }).join("");
    reviewsBox.querySelectorAll("[data-person-profile]").forEach(b=>b.addEventListener("click",()=>openAuthorProfile(b.dataset.personProfile)));
    for(const r of (reviews||[])) await loadReviewComments(r.id,workId);
  }catch(e){summary.textContent="फीडबैक लोड नहीं हुआ: "+e.message;}
}

async function loadReviewComments(reviewId,workId){
  const box=document.getElementById(`reviewComments-${reviewId}`);if(!box)return;
  const {data,error}=await supabaseClient.from("comments").select("id,user_id,comment_text,created_at").eq("review_id",reviewId).eq("work_id",workId).order("created_at");
  if(error){box.textContent="कमेंट लोड नहीं हुए: "+error.message;return;}
  const ids=[...new Set((data||[]).map(x=>x.user_id))];let people=[];
  if(ids.length){const q=await supabaseClient.from("profiles").select("id,display_name,username").in("id",ids);if(!q.error)people=q.data||[];}
  box.innerHTML=(data||[]).length?(data||[]).map(c=>{const u=people.find(p=>p.id===c.user_id);return `<p class="review-comment"><b>${escapeHtml(u?.display_name||u?.username||"पाठक")}:</b> ${escapeHtml(c.comment_text)}</p>`;}).join(""):'<p class="muted">अभी कोई टिप्पणी नहीं।</p>';
    }
async function submitRatingReview(){
  if(!supabaseClient||!currentReaderId)return;
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(!user){toast("रेटिंग या समीक्षा देने के लिए लॉगिन करें।");return;}
  const rating=Number(document.getElementById("ratingInput").value);
  const review=document.getElementById("reviewInput").value.trim();
  try{
    if(rating){const q=await supabaseClient.from("ratings").upsert({user_id:user.id,work_id:currentReaderId,rating},{onConflict:"user_id,work_id"});if(q.error)throw q.error;}
    if(review){const q=await supabaseClient.from("reviews").upsert({user_id:user.id,work_id:currentReaderId,review_text:review},{onConflict:"user_id,work_id"});if(q.error)throw q.error;}
    toast("आपकी रेटिंग और समीक्षा सुरक्षित हो गई।");await loadWorkFeedback(currentReaderId);
  }catch(e){toast("सुरक्षित नहीं हुआ: "+e.message);}
}

async function setCurrentWorkStatus(){
  const s=state.stories.find(x=>x.id===currentReaderId);if(!s||!s.authorId||!supabaseClient)return;
  const next=s.status==="draft"?"published":"draft";
  const msg=next==="draft"?"क्या इस रचना को अप्रकाशित करके निजी ड्राफ्ट में रखना चाहते हैं?":"क्या इसी रचना को फिर से प्रकाशित करना चाहते हैं?";
  if(!confirm(msg))return;
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user||user.id!==s.authorId){toast("केवल रचनाकार यह बदलाव कर सकता है।");return;}
  const {error}=await supabaseClient.from("works").update({status:next,updated_at:new Date().toISOString()}).eq("id",s.id).eq("author_id",user.id);
  if(error){toast("स्थिति नहीं बदली: "+error.message);return;}
  s.status=next;saveState();document.getElementById("readerDialog").close();await loadCloudWorks();
  toast(next==="draft"?"रचना निजी ड्राफ्ट में चली गई।":"रचना पुनः प्रकाशित हो गई; पुराना फीडबैक सुरक्षित है।");
}

async function submitReviewComment(form){
  const reviewId=Number(form.dataset.reviewComment), textValue=new FormData(form).get("comment")?.toString().trim();
  if(!textValue||!supabaseClient||!currentReaderId)return;
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("कमेंट करने के लिए लॉगिन करें।");return;}
  const {error}=await supabaseClient.from("comments").insert({user_id:user.id,work_id:currentReaderId,review_id:reviewId,comment_text:textValue});
  if(error){toast("कमेंट सुरक्षित नहीं हुआ: "+error.message);return;}
  form.reset();await loadReviewComments(reviewId,currentReaderId);toast("टिप्पणी प्रकाशित हो गई।");
}

async function finishReading(){
  const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;
  const {data:{user}}=supabaseClient?await supabaseClient.auth.getUser():{data:{user:null}};
  if(s.source==="supabase" && user && user.id!==s.authorId){
    const exact=wordCount(s.body||"");
    const {data,error}=await supabaseClient.from("profiles").select("id").eq("id",user.id).maybeSingle();
    if(error) toast("पठन इतिहास सुरक्षित नहीं हुआ: "+error.message);
    else toast(`इस रचना के ${exact.toLocaleString("hi-IN")} शब्द पढ़े गए।`);
  } else if(!user) { toast("पढ़ने का रिकॉर्ड रखने के लिए लॉगिन करें।"); }
  document.getElementById("readerDialog").close();
  await loadCloudWorks(); await renderProfile();
}

function toggleBookmark(){
  if(!currentReaderId)return;
  const list=state.profile.bookmarks||(state.profile.bookmarks=[]);
  const i=list.indexOf(currentReaderId);
  if(i>=0)list.splice(i,1);else list.push(currentReaderId);
  saveState();document.getElementById("bookmarkButton").textContent=i>=0?"♧":"♥";renderLibrary();toast(i>=0?"बुकमार्क हटाया गया":"पुस्तकालय में बुकमार्क किया गया");
}
function renderLibrary(){
  const ids=state.profile.bookmarks||[];
  const list=state.stories.filter(s=>ids.includes(s.id));
  document.getElementById("libraryList").innerHTML=list.length?list.map(storyCard).join():'<div class="empty-state"><span class="empty-flower">✿</span><h3>आपका पुस्तकालय खाली है</h3><p>किसी रचना को खोलकर बुकमार्क करें। वह यहाँ दिखाई देगी।</p></div>';
  bindReadButtons();
}

async function uploadSutradharImage(file,folder){
  if(!supabaseClient) throw new Error("Supabase कनेक्शन उपलब्ध नहीं है।");
  if(!file || !["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("केवल JPG, PNG या WebP चित्र चुनें।");
  if(file.size>8*1024*1024) throw new Error("चित्र 8 MB से छोटा होना चाहिए।");
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user)throw new Error("पहले लॉगिन करें।");
  const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
  const path=`${user.id}/${folder}/${Date.now()}.${ext}`;
  const {error}=await supabaseClient.storage.from("sutradhar-media").upload(path,file,{upsert:true,contentType:file.type});
  if(error)throw error;
  return supabaseClient.storage.from("sutradhar-media").getPublicUrl(path).data.publicUrl;
}
async function refreshReaderStats(work){
  const [{count:readCount},{data:ratings},{count:reviewCount}]=await Promise.all([
    supabaseClient.from("work_reads").select("id",{count:"exact",head:true}).eq("work_id",work.id),
    supabaseClient.from("ratings").select("rating").eq("work_id",work.id),
    supabaseClient.from("reviews").select("id",{count:"exact",head:true}).eq("work_id",work.id)
  ]);
  const rr=ratings||[],avg=rr.length?rr.reduce((a,r)=>a+Number(r.rating),0)/rr.length:0;
  document.getElementById("readerStats").textContent=`रेटिंग ${avg?Math.round(avg*20):0}% (${rr.length}) · समीक्षाएँ ${reviewCount??0} · पाठक ${readCount??0}`;
}
async function openAuthorProfile(authorId=null){
  const currentStory=state.stories.find(x=>x.id===currentReaderId);const targetId=authorId||currentStory?.authorId;if(!targetId)return;
  const {data:works}=await supabaseClient.from("works").select("id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language").eq("author_id",targetId).eq("status","published").order("created_at",{ascending:false});
  const {data:profile}=await supabaseClient.from("profiles").select("id,display_name,username,avatar_url,bio").eq("id",targetId).maybeSingle();
  const {data:{user}}=await supabaseClient.auth.getUser();
  const {count:followerCount}=await supabaseClient.from("author_follows").select("follower_id",{count:"exact",head:true}).eq("author_id",targetId);
  const {data:follow}=user?await supabaseClient.from("author_follows").select("author_id").eq("follower_id",user.id).eq("author_id",targetId).maybeSingle():{data:null};
  const name=profile?.display_name||profile?.username||"रचनाकार";
  const list=(works||[]).map(w=>`<article class="story-card"><h3>${escapeHtml(w.title)}</h3><p>${wordCount(w.content)} शब्द</p><button class="primary-button" data-read="${w.id}">पढ़ें</button></article>`).join("");
  const d=document.createElement("dialog");d.className="modal";d.innerHTML=`<div class="reader-page"><button class="close-button" id="authorClose">×</button><div class="profile-card"><div class="profile-avatar">${profile?.avatar_url?`<img src="${escapeHtml(profile.avatar_url)}">`:escapeHtml(name.slice(0,1))}</div><div><h2>${escapeHtml(name)}</h2><p>${followerCount||0} फ़ॉलोअर</p></div></div><p>${escapeHtml(profile?.bio||"")}</p>${user&&user.id!==targetId?`<button class="primary-button" id="followAuthor">${follow?"अनफ़ॉलो":"फ़ॉलो करें"}</button><button class="secondary-button" id="reportAuthor">प्रोफ़ाइल रिपोर्ट करें</button>`:""}<h3>प्रकाशित रचनाएँ (${(works||[]).length})</h3><div class="story-list">${list||"<p>अभी कोई प्रकाशित रचना नहीं।</p>"}</div></div>`;
  document.body.appendChild(d);d.showModal();d.querySelector("#authorClose").onclick=()=>{d.close();d.remove();};
  d.querySelectorAll("[data-read]").forEach(b=>b.onclick=()=>{d.close();d.remove();openReader(b.dataset.read);});
  d.querySelector("#followAuthor")?.addEventListener("click",async()=>{if(follow){await supabaseClient.from("author_follows").delete().eq("follower_id",user.id).eq("author_id",targetId);}else{await supabaseClient.from("author_follows").insert({follower_id:user.id,author_id:targetId});}d.close();d.remove();toast(follow?"फ़ॉलो हटाया गया":"रचनाकार को फ़ॉलो किया गया");});
  d.querySelector("#reportAuthor")?.addEventListener("click",async()=>{const reason=prompt("प्रोफ़ाइल रिपोर्ट का कारण लिखें:");if(!reason)return;const details=prompt("विवरण अधिकतम 100 शब्दों में लिखें:");if(!details)return;if(wordCount(details)>100){toast("रिपोर्ट अधिकतम 100 शब्दों की हो सकती है।");return;}const {error}=await supabaseClient.from("content_reports").insert({reporter_id:user.id,target_type:"profile",target_profile_id:targetId,reason:reason.slice(0,100),details});toast(error?"रिपोर्ट नहीं भेजी: "+error.message:"प्रोफ़ाइल रिपोर्ट भेज दी गई।");});
}

async function loadCloudProfile() {
  if (!supabaseClient) return;

  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) {
    state.profile = emptyAccountState().profile;
    currentUserId = null;
    saveState();
    renderProfile();
    return;
  }
  if (currentUserId !== user.id) switchAccountState(user.id);

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("display_name, avatar_url, bio, reading_language, preferred_categories")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("प्रोफ़ाइल लोड नहीं हुई:", error.message);
    return;
                                 }
  
  if (data) {
    state.profile.name =
      data.display_name || "अनाम पाठक";
    state.profile.avatarUrl = data.avatar_url || "";
    state.profile.intro = data.bio || "";
    state.profile.readingLanguage = data.reading_language || "hi";
    state.profile.preferredCategories = data.preferred_categories || [];
    const langSel=document.getElementById("readingLanguage"); if(langSel)langSel.value=state.profile.readingLanguage;
    saveState();
    renderProfile();
    renderPreferredCategories();
  }
}
function renderProfile(){
  const p=state.profile;
  document.getElementById("profileAvatar").innerHTML=p.avatarUrl?`<img src="${escapeHtml(p.avatarUrl)}" alt="प्रोफ़ाइल DP">`:escapeHtml((p.name||"अ").trim().slice(0,1));
  document.getElementById("profileName").textContent=p.name||"अनाम पाठक";
  document.getElementById("profileRole").textContent=state.stories.some(s=>s.author===p.name)?"लेखक / कवि · पाठक":"पाठक";
  document.getElementById("introInput").value=p.intro||"";
  document.getElementById("introCount").textContent=`${(p.intro||"").length}/1000 अक्षर`;
  document.getElementById("wordsRead").textContent=(p.wordsRead||0).toLocaleString("hi-IN");
  if(currentUserId && supabaseClient){supabaseClient.from("work_reads").select("words_count").eq("reader_id",currentUserId).then(({data,error})=>{if(!error){const total=(data||[]).reduce((n,r)=>n+Number(r.words_count||0),0);document.getElementById("wordsRead").textContent=total.toLocaleString("hi-IN");}});}
  const mine=state.stories.filter(s=>s.source==="supabase" && s.authorId===currentUserId && s.status!=="draft");
  const drafts=state.stories.filter(s=>s.source==="supabase" && s.authorId===currentUserId && s.status==="draft");
  document.getElementById("publishedCount").textContent=mine.length;
  const followerEl=document.getElementById("myFollowerCount");
  if(followerEl&&currentUserId&&supabaseClient)supabaseClient.from("author_follows").select("follower_id",{count:"exact",head:true}).eq("author_id",currentUserId).then(({count,error})=>{if(!error)followerEl.textContent=count||0;});
  document.getElementById("myStoryList").innerHTML=mine.length?mine.map(storyCard).join(""):'<p class="muted">अभी आपने कोई रचना प्रकाशित नहीं की है।</p>';
  const draftBox=document.getElementById("myDraftList");
  if(draftBox) draftBox.innerHTML=drafts.length?drafts.map(d=>`<article class="story-card"><h3>${escapeHtml(d.title)}</h3><p>निजी ड्राफ्ट</p><button data-republish="${escapeHtml(d.id)}">पुनः प्रकाशित करें</button></article>`).join(""):'<p class="muted">कोई निजी ड्राफ्ट नहीं।</p>';
  bindReadButtons();
  document.querySelectorAll("[data-republish]").forEach(b=>b.addEventListener("click",()=>{currentReaderId=b.dataset.republish;setCurrentWorkStatus();}));
}
function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  document.querySelector(".app-shell").classList.toggle("hidden",tab!=="home");
  ["library","profile","settings"].forEach(t=>document.getElementById(t+"View").classList.toggle("hidden",tab!==t));
  if(tab==="write"){openWrite();document.querySelector('[data-tab="home"]').classList.remove("active");}
  if(tab==="library")renderLibrary();
  if(tab==="settings")renderPreferredCategories();
  if(tab==="profile")renderProfile();
  window.scrollTo({top:0,behavior:"smooth"});
}
function applyTheme(){document.body.classList.toggle("dark",state.theme==="dark");}
function init(){
  applyTheme();renderCategoriesForm();renderChips();renderStories();renderProfile();renderLibrary();
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.go)));
  document.getElementById("profileShortcut").addEventListener("click",()=>switchTab("profile"));
  document.getElementById("settingsShortcut")?.addEventListener("click",()=>switchTab("settings"));
  document.getElementById("readerAuthorLink")?.addEventListener("click",openAuthorProfile);
  document.getElementById("reportWork")?.addEventListener("click",async()=>{const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;const reason=prompt("समस्या का प्रकार लिखें (आपत्तिजनक/कॉपीराइट/अन्य):");if(!reason)return;const details=prompt("अपनी समस्या अधिकतम 100 शब्दों में लिखें:");if(!details)return;if(wordCount(details)>100){toast("रिपोर्ट अधिकतम 100 शब्दों की हो सकती है।");return;}const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("रिपोर्ट के लिए लॉगिन करें।");return;}const {error}=await supabaseClient.from("content_reports").insert({reporter_id:user.id,target_type:"work",target_work_id:s.id,reason:reason.slice(0,100),details});toast(error?"रिपोर्ट नहीं भेजी: "+error.message:"रिपोर्ट भेज दी गई।");});
  document.getElementById("shareWork")?.addEventListener("click",async()=>{const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;const url=location.href.split("#")[0]+"#work-"+s.id;const share={title:s.title,text:`${s.title} — ${s.author}`,url};if(navigator.share){try{await navigator.share(share);}catch(e){}}else{await navigator.clipboard?.writeText(url);toast("रचना लिंक कॉपी हुई।");}});
  document.getElementById("shareExcerptImage")?.addEventListener("click",shareExcerptAsImage);
  document.getElementById("authShortcut")?.addEventListener("click",()=>document.getElementById("openAuthButton")?.click());
  document.getElementById("avatarUpload")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const url=await uploadSutradharImage(f,"avatars");const {data:{user}}=await supabaseClient.auth.getUser();const {error}=await supabaseClient.from("profiles").update({avatar_url:url}).eq("id",user.id);if(error)throw error;state.profile.avatarUrl=url;saveState();renderProfile();toast("प्रोफ़ाइल DP अपडेट हो गई।");}catch(err){toast("DP अपडेट नहीं हुई: "+err.message);}});
  document.getElementById("readingLanguage")?.addEventListener("change",async e=>{if(!supabaseClient)return;const {data:{user}}=await supabaseClient.auth.getUser();if(user){const {error}=await supabaseClient.from("profiles").update({reading_language:e.target.value}).eq("id",user.id);if(error)toast(error.message);else{state.profile.readingLanguage=e.target.value;saveState();renderStories();toast("पठन भाषा सुरक्षित हुई।");}}});
  document.getElementById("themeToggle").addEventListener("click",toggleTheme);
  document.getElementById("writerSort")?.addEventListener("change",loadHomepageStats);
  renderPreferredCategories();
  document.getElementById("editorToolbar")?.querySelectorAll("[data-format]").forEach(b=>b.addEventListener("click",()=>{const m={bold:["**","**"],italic:["*","*"],highlight:["[[highlight]]","[[/highlight]]"]}[b.dataset.format];wrapEditorSelection(...m);}));
  document.getElementById("applyEditorStyle")?.addEventListener("click",()=>{const font=document.getElementById("editorFont").value,color=document.getElementById("editorColor").value;if(color)wrapEditorSelection(`[[color:${color}]]`,`[[/color]]`);else wrapEditorSelection(`[[font:${font}]]`,`[[/font]]`);});
  document.getElementById("themeToggle2").addEventListener("click",toggleTheme);
  document.getElementById("formType").addEventListener("change",()=>{updateSubtypes();saveDraftFromForm();});
  document.getElementById("storyForm").addEventListener("submit",publishStory);
  document.getElementById("storyTitle").addEventListener("input",saveDraftFromForm);
  document.getElementById("storyBody").addEventListener("input",saveDraftFromForm);
  document.getElementById("formSubType").addEventListener("change",saveDraftFromForm);
  document.getElementById("formCategories").addEventListener("change",saveDraftFromForm);
  document.getElementById("closeWrite").addEventListener("click",()=>document.getElementById("writeDialog").close());
  document.getElementById("closeReader").addEventListener("click",()=>document.getElementById("readerDialog").close());
  document.getElementById("finishReading").addEventListener("click",finishReading);
  document.getElementById("bookmarkButton").addEventListener("click",toggleBookmark);
  document.getElementById("submitFeedback")?.addEventListener("click",submitRatingReview);
  document.getElementById("workOwnerAction")?.addEventListener("click",setCurrentWorkStatus);
  document.getElementById("editWorkAction")?.addEventListener("click",()=>openEditWork(currentReaderId));
  document.getElementById("reviewsList")?.addEventListener("submit",e=>{if(e.target.matches("[data-review-comment]")){e.preventDefault();submitReviewComment(e.target);}});
  document.getElementById("clearCategory").addEventListener("click",()=>{activeCategory="सभी";renderChips();renderStories();});
  document.getElementById("introInput").addEventListener("input",e=>document.getElementById("introCount").textContent=`${e.target.value.length}/1000 अक्षर`);
  
document.getElementById("saveProfile").addEventListener("click", async () => {
  const intro = document.getElementById("introInput").value.slice(0, 1000);

  if (!supabaseClient) {
    toast("डेटाबेस से कनेक्शन उपलब्ध नहीं है।");
    return;
  }

  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) {
    toast("पहले लॉगिन करें।");
    return;
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({ bio: intro })
    .eq("id", user.id);

  if (error) {
    toast("परिचय सुरक्षित नहीं हुआ: " + error.message);
    return;
  }

  state.profile.intro = intro;
  saveState();
  renderProfile();
  toast("परिचय डेटाबेस में सुरक्षित हो गया।");
});

  document.getElementById("editProfile").addEventListener("click",async()=>{const name=prompt("अपना प्रदर्शित नाम लिखें:",state.profile.name||"अनाम पाठक");if(name&&name.trim()){if(!supabaseClient){toast("Supabase उपलब्ध नहीं है।");return;}const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("पहले लॉगिन करें।");return;}const {error}=await supabaseClient.from("profiles").update({display_name:name.trim().slice(0,60)}).eq("id",user.id);if(error){toast("नाम अपडेट नहीं हुआ: "+error.message);return;}state.profile.name=name.trim().slice(0,60);saveState();renderProfile();toast("नाम अपडेट हो गया।");}});
  document.getElementById("resetData").addEventListener("click",()=>{if(confirm("क्या स्थानीय डेमो डेटा मिटाकर शुरुआत करें?")){localStorage.removeItem(STORAGE);state=loadState();init();switchTab("home");toast("डेमो रीसेट हो गया।");}});
  document.getElementById("writeDialog").addEventListener("close",saveDraftFromForm);
  // पुराने Service Worker की cached JS/HTML फ़ाइलें account बदलने पर पुराना डेटा दिखा सकती हैं।
  if("serviceWorker" in navigator && location.protocol.startsWith("http")){
    navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(reg=>reg.unregister())).catch(()=>{});
  }
}
function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme();}
init();
/* साहित्य सूत्रधार: Supabase लॉगिन */

(function setupSahityaGramAuth() {
  const dialog = document.getElementById("authDialog");
  const form = document.getElementById("authForm");

  if (!dialog || !form || !window.supabase) {
    console.error("लॉगिन फ़ॉर्म या Supabase उपलब्ध नहीं है।");
    return;
  }

  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");
  const message = document.getElementById("authMessage");
  const submit = document.getElementById("authSubmit");
  const register = document.getElementById("authRegister");
  const google = document.getElementById("authGoogle");
  const close = document.getElementById("authClose");

  let mode = "login";

  const loginButton = document.createElement("button");
  loginButton.type = "button";
  loginButton.id = "openAuthButton";
  loginButton.textContent = "लॉगिन / खाता";
  loginButton.style.cssText = "display:none";
  document.body.appendChild(loginButton);

  function showMessage(text) {
    message.textContent = text;
  }

  function setMode(nextMode) {
    mode = nextMode;
    showMessage("");
    document.getElementById("authHeading").textContent =
      mode === "login" ? "साहित्य सूत्रधार में प्रवेश" : "नया खाता बनाएँ";
    submit.textContent =
      mode === "login" ? "लॉगिन करें" : "रजिस्टर करें";
    register.textContent =
      mode === "login" ? "नया खाता बनाएँ" : "पहले से खाता है? लॉगिन करें";
    passwordInput.autocomplete =
      mode === "login" ? "current-password" : "new-password";
  }

  async function refreshAuth() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) console.error("खाता जाँच:", error.message);

    if (data.user) {
      loginButton.textContent = "लॉगआउट";
      loginButton.title = data.user.email || "लॉगिन है";
    } else {
      loginButton.textContent = "लॉगिन / खाता";
      loginButton.title = "";
    }

    return data.user;
  }

  loginButton.addEventListener("click", async () => {
    const user = await refreshAuth();

    if (user) {
      if (confirm("क्या लॉगआउट करना चाहते हो?")) {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          showMessage("लॉगआउट नहीं हुआ: " + error.message);
          dialog.showModal();
        } else {
          alert("लॉगआउट हो गया।");
          await refreshAuth();
        }
      }
    } else {
      setMode("login");
      dialog.showModal();
    }
  });

  register.addEventListener("click", () => {
    setMode(mode === "login" ? "register" : "login");
  });

google.addEventListener("click", async () => {
  if (!supabaseClient) {
    message.textContent = "Supabase कनेक्शन उपलब्ध नहीं है।";
    return;
  }

  message.textContent = "Google लॉगिन खोला जा रहा है...";

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    message.textContent = "Google लॉगिन त्रुटि: " + error.message;
  }
});
  
  close.addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("कृपया प्रतीक्षा करें…");
    submit.disabled = true;

    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      let result;

      if (mode === "login") {
        result = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });
              } else {
        result = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: "अनाम पाठक"
            }
          }
        });
      }

      if (result.error) {
        showMessage("समस्या: " + result.error.message);
      } else if (mode === "register" && !result.data.session) {
        showMessage("खाता बनाने का अनुरोध सफल हुआ। यदि ईमेल सत्यापन माँगा जाए, तो अपने ईमेल में आए निर्देश पूरे करें।");
    } else {
  showMessage("लॉगिन सफल हुआ!");
  await refreshAuth();
  const {data: sessionData}=await supabaseClient.auth.getSession();
  await syncCurrentAccount(sessionData?.session?.user || null);
  setTimeout(() => dialog.close(), 700);
      }
    } catch (error) {
      showMessage("त्रुटि: " + error.message);
    } finally {
      submit.disabled = false;
    }
  });
    
  async function syncCurrentAccount(sessionUser){
    const version = ++authSyncVersion;
    const nextId = sessionUser?.id || null;
    if (currentUserId !== nextId) switchAccountState(nextId);
    if (!nextId) {
      state = emptyAccountState();
      currentUserId = null;
      saveState();
      renderProfile(); renderStories(); renderLibrary();
      return;
    }
    // खाते की प्रोफ़ाइल पहले, फिर उसी खाते की रचनाएँ लोड हों।
    await loadCloudProfile();
    if (version !== authSyncVersion) return;
    await loadCloudWorks();
    if (version !== authSyncVersion) return;
    renderProfile();
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    refreshAuth();
    // Auth callback के भीतर सीधे Supabase query न चलाएँ।
    setTimeout(() => syncCurrentAccount(session?.user || null), 0);
  });

  supabaseClient.auth.getSession().then(({data,error})=>{
    if(error) console.error("सेशन लोड नहीं हुआ:",error.message);
    syncCurrentAccount(data?.session?.user || null);
  });
})();
