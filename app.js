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
const STORAGE = "sahityaGram.v1";
const seed = [
  {id:"sample1",title:"पीपल के नीचे",type:"गद्य",subtype:"कहानी",categories:["प्रेम","मिश्रित"],author:"साहित्य सूत्रधार",body:"गाँव के पुराने पीपल के नीचे एक छोटी-सी चौपाल थी। शाम ढलती तो पत्तों के बीच से आती हवा जाने कितनी कहानियाँ सुनाती।\n\nउस दिन भी कोई वहाँ आया था—अपने मन में एक अधूरा पत्र और आँखों में एक पूरा संसार लिए।",created:Date.now()-300000,reads:18,minutes:1},
  {id:"sample2",title:"शब्दों का घर",type:"पद्य",subtype:"कविता",categories:["मनोरंजन","प्रेम"],author:"साहित्य सूत्रधार",body:"कुछ शब्द दीपक बन जाते हैं,\nकुछ राहों में फूल बिछाते हैं।\nजो मन से मन तक पहुँच सकें,\nवे ही अपना घर बनाते हैं।",created:Date.now()-200000,reads:12,minutes:1},
  {id:"sample3",title:"एक नया सवेरा",type:"गद्य",subtype:"लघुकथा",categories:["शिक्षाप्रद","मिश्रित"],author:"साहित्य सूत्रधार",body:"पहली किरण खिड़की पर आई तो उसने पुरानी डायरी खोली। कल की असफलताओं के बीच आज के लिए एक खाली पन्ना बचा था। उसने मुस्कराकर लिखा—शुरुआत।",created:Date.now()-100000,reads:9,minutes:1}
];
let state = loadState();
let activeCategory = "सभी";
let activeTab = "home";
let currentReaderId = null;
let currentDraftId = null;
let cloudDrafts = [];
let readingStartedAt = 0;
let toastTimer;

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if(saved) return {...saved, stories: Array.isArray(saved.stories) ? saved.stories : seed};
  }catch(e){}
  return {stories:seed, profile:{name:"अनाम पाठक",intro:"",wordsRead:0,bookmarks:[]}, theme:"light", drafts:{title:"",body:"",type:"",subtype:"",categories:[]}};
}
function saveState(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
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
  return `<article class="story-card"><div>${cats}</div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.author||"अनाम लेखक")} · ${escapeHtml(s.type||"रचना")}${s.subtype?" / "+escapeHtml(s.subtype):""}</p><p class="excerpt">${escapeHtml(excerpt)}${excerpt.length>=150?"…":""}</p><div class="story-meta"><span>◉ ${s.reads||0} पाठक · लगभग ${minutesFor(s.body)} मिनट</span><button data-read="${escapeHtml(s.id)}">पढ़ें ↗</button></div></article>`;
}
function renderStories(){
  let list=[...state.stories].sort((a,b)=>(b.created||0)-(a.created||0));
  if(activeCategory!=="सभी")list=list.filter(s=>(s.categories||[]).includes(activeCategory));
  document.getElementById("storyCount").textContent=`${list.length} रचनाएँ`;
  document.getElementById("storyList").innerHTML=list.map(storyCard).join("");
  document.getElementById("emptyState").classList.toggle("hidden",list.length!==0);
  document.getElementById("storyList").classList.toggle("hidden",list.length===0);
  document.getElementById("storyHeading").textContent=activeCategory==="सभी"?"नई और लोकप्रिय रचनाएँ":activeCategory+" की रचनाएँ";
  bindReadButtons();
}
function bindReadButtons(){document.querySelectorAll("[data-read]").forEach(b=>b.addEventListener("click",()=>openReader(b.dataset.read)));}
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
  currentDraftId=null;
  restoreDraft();document.getElementById("writeDialog").showModal();
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

function getStoryFormValues() {
  return {
    title: document.getElementById("storyTitle").value.trim(),
    body: document.getElementById("storyBody").value.trim(),
    type: document.getElementById("formType").value,
    subtype: document.getElementById("formSubType").value,
    categoryNames: [...document.querySelectorAll("#formCategories input:checked")].map(x => x.value)
  };
}
async function getCategoryMap(names) {
  if (!names.length) return new Map();
  const { data, error } = await supabaseClient.from("categories").select("id,name").in("name", names);
  if (error) throw error;
  const map = new Map((data || []).map(row => [row.name, row.id]));
  const missing = names.filter(name => !map.has(name));
  if (missing.length) throw new Error("Supabase में ये श्रेणियाँ नहीं मिलीं: " + missing.join(", "));
  return map;
}
async function saveCloudDraft() {
  if (!supabaseClient) return toast("Supabase कनेक्शन उपलब्ध नहीं है।");
  const { title, body, type, subtype, categoryNames } = getStoryFormValues();
  if (!title || !body || !type || (type !== "चंपू काव्य" && !subtype)) return toast("ड्राफ्ट सेव करने के लिए शीर्षक, सामग्री और रचना का रूप भरें।");
  const button = document.getElementById("saveDraftCloud"); button.disabled = true;
  try {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError) throw authError;
    if (!user) return toast("ड्राफ्ट Supabase में सेव करने के लिए पहले लॉगिन करें।");
    const categoryMap = await getCategoryMap(categoryNames);
    const payload = { author_id:user.id, title, content:body, work_type:getDatabaseWorkType(type,subtype), main_form:type, subtype:subtype||null, status:"draft", content_language:"hi" };
    if (currentDraftId) {
      const { error } = await supabaseClient.from("works").update(payload).eq("id",currentDraftId).eq("author_id",user.id);
      if (error) throw error;
      if (categoryNames.length) {
        const { data: existingLinks, error: existingError } = await supabaseClient.from("work_categories").select("category_id").eq("work_id",currentDraftId);
        if (existingError) throw existingError;
        const already = new Set((existingLinks || []).map(x => x.category_id));
        const newLinks = categoryNames.map(name => categoryMap.get(name)).filter(id => !already.has(id)).map(id => ({work_id:currentDraftId,category_id:id}));
        if (newLinks.length) { const { error: addError } = await supabaseClient.from("work_categories").insert(newLinks); if (addError) throw addError; }
      }
    } else {
      const { data, error } = await supabaseClient.from("works").insert(payload).select("id").single();
      if (error) throw error;
      currentDraftId = data.id;
      if (categoryNames.length) {
        const links = categoryNames.map(name => ({work_id:data.id,category_id:categoryMap.get(name)}));
        const { error: linkError } = await supabaseClient.from("work_categories").insert(links);
        if (linkError) throw new Error("ड्राफ्ट सेव हुआ, लेकिन श्रेणियाँ नहीं जुड़ीं: " + linkError.message);
      }
    }
    saveDraftFromForm();
    document.getElementById("draftStatus").textContent = "Supabase में ड्राफ्ट सुरक्षित है";
    toast("ड्राफ्ट Supabase में सुरक्षित हो गया।");
    await loadCloudDrafts();
  } catch (error) { console.error("ड्राफ्ट सेव नहीं हुआ:",error); toast("ड्राफ्ट सेव नहीं हुआ: "+(error.message||String(error))); }
  finally { button.disabled = false; }
}
async function loadCloudDrafts() {
  if (!supabaseClient) return;
  try {
    // getSession() restores the persisted login before draft loading; getUser()
    // can throw AuthSessionMissingError during the initial page-load race.
    const { data:{session}, error:authError } = await supabaseClient.auth.getSession();
    if (authError) throw authError;
    const user = session?.user;
    if (!user) { cloudDrafts=[]; renderProfile(); return; }
    const { data:rows, error } = await supabaseClient.from("works").select("id,author_id,title,content,work_type,main_form,subtype,created_at").eq("author_id",user.id).eq("status","draft").order("created_at",{ascending:false});
    if (error) throw error;
    const ids=(rows||[]).map(row=>row.id); let links=[], categories=[];
    if (ids.length) {
      const {data,error:linkError}=await supabaseClient.from("work_categories").select("work_id,category_id").in("work_id",ids);
      if(linkError) throw linkError; links=data||[];
      const categoryIds=[...new Set(links.map(x=>x.category_id))];
      if(categoryIds.length){const {data:cats,error:catError}=await supabaseClient.from("categories").select("id,name").in("id",categoryIds);if(catError)throw catError;categories=cats||[];}
    }
    cloudDrafts=(rows||[]).map(row=>({id:row.id,title:row.title,body:row.content,type:row.main_form||(row.work_type==="poem"?"पद्य":"गद्य"),subtype:row.subtype||"",categories:categories.filter(c=>links.some(l=>l.work_id===row.id&&l.category_id===c.id)).map(c=>c.name),created:new Date(row.created_at).getTime()}));
    renderProfile();
  } catch(error){console.error("ड्राफ्ट लोड नहीं हुए:",error);toast("ड्राफ्ट लोड नहीं हुए: "+(error.message||String(error)));}
}
function editCloudDraft(id) {
  const d=cloudDrafts.find(x=>String(x.id)===String(id)); if(!d)return;
  currentDraftId=d.id;
  document.getElementById("storyTitle").value=d.title||"";
  document.getElementById("storyBody").value=d.body||"";
  document.getElementById("formType").value=d.type||""; updateSubtypes();
  document.getElementById("formSubType").value=d.subtype||"";
  document.querySelectorAll("#formCategories input").forEach(cb=>cb.checked=(d.categories||[]).includes(cb.value));
  document.getElementById("draftStatus").textContent="Supabase का ड्राफ्ट संपादन में है";
  document.getElementById("charCount").textContent=`${(d.body||"").length} अक्षर`;
  document.getElementById("writeDialog").showModal();
}

async function loadCloudWorks() {
  if (!supabaseClient) return;

  try {
    const { data: works, error } = await supabaseClient
      .from("works")
      .select("id,author_id,title,content,work_type,main_form,subtype,created_at")
      .eq("status", "published")
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
        .select("id,display_name,username")
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
        authorId: w.author_id,
        created: new Date(w.created_at).getTime(),
        reads: 0,
        minutes: minutesFor(w.content),
        source: "supabase"
      };
    });

    // पुराने LocalStorage रिकॉर्ड मिटाए बिना क्लाउड रिकॉर्ड ताज़ा करें।
  const cloudIds = new Set(cloudStories.map(s => s.id));
    const localStories = (state.stories || []).filter(
      s => !cloudIds.has(s.id) && s.source !== "supabase"
    );
    state.stories = [...cloudStories, ...localStories];

    saveState();
    renderStories();
    renderProfile();
    renderLibrary();
  } catch (error) {
    console.error("Supabase रचनाएँ लोड नहीं हुईं:", error);
    toast("Supabase से रचनाएँ लोड नहीं हुईं: " + error.message);
  }
}

async function publishStory(e) {
  e.preventDefault();
  const {title,body,type,subtype,categoryNames}=getStoryFormValues();
  if(!title||!body||!type||!categoryNames.length)return toast("शीर्षक, सामग्री, विधा और कम-से-कम एक श्रेणी भरें।");
  if(type!=="चंपू काव्य"&&!subtype)return toast("कृपया रचना का उपप्रकार चुनें।");
  if(!supabaseClient)return toast("Supabase कनेक्शन उपलब्ध नहीं है।");
  const submitButton=document.querySelector('#storyForm button[type="submit"]'); if(submitButton)submitButton.disabled=true;
  try{
    const {data:{user},error:authError}=await supabaseClient.auth.getUser(); if(authError)throw authError;
    if(!user)return toast("रचना प्रकाशित करने के लिए पहले लॉगिन करें।");
    const categoryMap=await getCategoryMap(categoryNames);
    const payload={title,content:body,work_type:getDatabaseWorkType(type,subtype),main_form:type,subtype:subtype||null,status:"published",content_language:"hi"};
    if(currentDraftId){
      if(categoryNames.length){
        const {data:existingLinks,error:existingError}=await supabaseClient.from("work_categories").select("category_id").eq("work_id",currentDraftId);
        if(existingError)throw existingError;
        const already=new Set((existingLinks||[]).map(x=>x.category_id));
        const newLinks=categoryNames.map(name=>categoryMap.get(name)).filter(id=>!already.has(id)).map(id=>({work_id:currentDraftId,category_id:id}));
        if(newLinks.length){const {error:addError}=await supabaseClient.from("work_categories").insert(newLinks);if(addError)throw addError;}
      }
      const {error}=await supabaseClient.from("works").update(payload).eq("id",currentDraftId).eq("author_id",user.id);
      if(error)throw error;
    }else{
      const {data,error}=await supabaseClient.from("works").insert({...payload,author_id:user.id}).select("id").single();
      if(error)throw error;
      const links=categoryNames.map(name=>({work_id:data.id,category_id:categoryMap.get(name)}));
      const {error:linkError}=await supabaseClient.from("work_categories").insert(links);
      if(linkError)throw new Error("रचना सेव हुई, लेकिन श्रेणियाँ नहीं जुड़ीं: "+linkError.message);
    }
    currentDraftId=null; state.drafts={title:"",body:"",type:"",subtype:"",categories:[]}; saveState();
    document.getElementById("writeDialog").close(); toast("रचना Supabase में प्रकाशित हो गई!");
    await Promise.all([loadCloudWorks(),loadCloudDrafts()]);
  }catch(error){console.error("रचना प्रकाशित करने में समस्या:",error);toast("रचना प्रकाशित नहीं हुई: "+(error.message||String(error)));}
  finally{if(submitButton)submitButton.disabled=false;}
}

function openReader(id){
  const s=state.stories.find(x=>x.id===id);if(!s)return;
  currentReaderId=id;readingStartedAt=Date.now();
  document.getElementById("readerTitle").textContent=s.title;
  document.getElementById("readerCategory").textContent=[s.type,s.subtype,...(s.categories||[])].filter(Boolean).join(" · ");
  document.getElementById("readerAuthor").textContent="रचनाकार: "+(s.author||"अनाम लेखक");
  document.getElementById("readerBody").textContent=s.body;
  document.getElementById("readerMeta").textContent=`लगभग ${minutesFor(s.body)} मिनट`;
  document.getElementById("readerWords").textContent=`${wordCount(s.body)} शब्द`;
  document.getElementById("bookmarkButton").textContent=(state.profile.bookmarks||[]).includes(id)?"♥":"♧";
  document.getElementById("readerDialog").showModal();
}
function finishReading(){
  const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;
  s.reads=(s.reads||0)+1;
  const elapsed=(Date.now()-readingStartedAt)/1000;
  const estimated=Math.min(wordCount(s.body),Math.round(wordCount(s.body)*Math.min(1,Math.max(.15,elapsed/(minutesFor(s.body)*60)))));
  state.profile.wordsRead=(state.profile.wordsRead||0)+estimated;
  saveState();document.getElementById("readerDialog").close();renderStories();renderProfile();toast(`पठन दर्ज हुआ: लगभग ${estimated} शब्द`);
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
async function loadCloudProfile() {
  if (!supabaseClient) return;

  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("display_name, avatar_url, bio")
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
    saveState();
    renderProfile();
  }
}
function renderProfile(){
  const p=state.profile;
  document.getElementById("profileAvatar").textContent=(p.name||"अ").trim().slice(0,1);
  document.getElementById("profileName").textContent=p.name||"अनाम पाठक";
  document.getElementById("profileRole").textContent=state.stories.some(s=>s.author===p.name)?"लेखक / कवि · पाठक":"पाठक";
  document.getElementById("introInput").value=p.intro||"";
  document.getElementById("introCount").textContent=`${(p.intro||"").length}/1000 अक्षर`;
  document.getElementById("wordsRead").textContent=(p.wordsRead||0).toLocaleString("hi-IN");
  const mine=state.stories.filter(s=>s.author===p.name);
  document.getElementById("publishedCount").textContent=mine.length;
  document.getElementById("myStoryList").innerHTML=mine.length?mine.map(storyCard).join(""):'<p class="muted">अभी आपने कोई रचना प्रकाशित नहीं की है।</p>';
  const draftHost=document.getElementById("myDraftList");
  if(draftHost){
    draftHost.innerHTML=cloudDrafts.length?cloudDrafts.map(d=>`<article class="story-card"><h3>${escapeHtml(d.title||"बिना शीर्षक")}</h3><p>${escapeHtml(d.type||"ड्राफ्ट")}${d.subtype?" / "+escapeHtml(d.subtype):""}</p><p class="excerpt">${escapeHtml((d.body||"").replace(/\s+/g," ").slice(0,130))}</p><div class="story-meta"><button type="button" data-edit-draft="${escapeHtml(d.id)}">संपादित करें / प्रकाशित करें</button></div></article>`).join(""):'<p class="muted">अभी Supabase में कोई निजी ड्राफ्ट नहीं है।</p>';
   draftHost.querySelectorAll("[data-edit-draft]").forEach(b=>b.addEventListener("click",()=>editCloudDraft(b.dataset.editDraft)));
  }
  bindReadButtons();
}
function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  document.querySelector(".app-shell").classList.toggle("hidden",tab!=="home");
  ["library","profile","settings"].forEach(t=>document.getElementById(t+"View").classList.toggle("hidden",tab!==t));
  if(tab==="write"){openWrite();document.querySelector('[data-tab="home"]').classList.remove("active");}
  if(tab==="library")renderLibrary();
  if(tab==="profile")renderProfile();
  window.scrollTo({top:0,behavior:"smooth"});
}
function applyTheme(){document.body.classList.toggle("dark",state.theme==="dark");}
function init(){
  applyTheme();renderCategoriesForm();renderChips();renderStories();renderProfile();renderLibrary();
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.go)));
  document.getElementById("profileShortcut").addEventListener("click",()=>switchTab("profile"));
  document.getElementById("themeToggle").addEventListener("click",toggleTheme);
  document.getElementById("themeToggle2").addEventListener("click",toggleTheme);
  document.getElementById("formType").addEventListener("change",()=>{updateSubtypes();saveDraftFromForm();});
  document.getElementById("storyForm").addEventListener("submit",publishStory);
  document.getElementById("saveDraftCloud").addEventListener("click",saveCloudDraft);
  document.getElementById("storyTitle").addEventListener("input",saveDraftFromForm);
  document.getElementById("storyBody").addEventListener("input",saveDraftFromForm);
  document.getElementById("formSubType").addEventListener("change",saveDraftFromForm);
  document.getElementById("formCategories").addEventListener("change",saveDraftFromForm);
  document.getElementById("closeWrite").addEventListener("click",()=>document.getElementById("writeDialog").close());
  document.getElementById("closeReader").addEventListener("click",()=>document.getElementById("readerDialog").close());
  document.getElementById("finishReading").addEventListener("click",finishReading);
  document.getElementById("bookmarkButton").addEventListener("click",toggleBookmark);
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
  
  document.getElementById("editProfile").addEventListener("click",()=>{const name=prompt("अपना प्रदर्शित नाम लिखें:",state.profile.name||"अनाम पाठक");if(name&&name.trim()){state.profile.name=name.trim().slice(0,60);saveState();renderProfile();toast("नाम अपडेट हो गया।");}});
  document.getElementById("resetData").addEventListener("click",()=>{if(confirm("क्या स्थानीय डेमो डेटा मिटाकर शुरुआत करें?")){localStorage.removeItem(STORAGE);state=loadState();init();switchTab("home");toast("डेमो रीसेट हो गया।");}});
  document.getElementById("writeDialog").addEventListener("close",saveDraftFromForm);
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme();}
init();
loadCloudWorks();
loadCloudProfile();
loadCloudDrafts();
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
  loginButton.style.cssText =
    "position:fixed;right:16px;bottom:18px;z-index:9999;padding:12px 18px;border-radius:24px;background:#6d3f87;color:white;border:0;box-shadow:0 2px 8px #777;";

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
  await loadCloudProfile();
  await loadCloudWorks();
  setTimeout(() => dialog.close(), 1000);
      }
    } catch (error) {
      showMessage("त्रुटि: " + error.message);
    } finally {
      submit.disabled = false;
    }
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshAuth();
    // Auth callback के भीतर सीधे Supabase query न चलाएँ।
    setTimeout(() => {
      loadCloudWorks();
      loadCloudProfile();
      loadCloudDrafts();
    }, 0);
  });

  refreshAuth();
})();
