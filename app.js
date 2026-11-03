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
const seed = [];
let state = loadState();
let activeCategory = "सभी";
let activeTab = "home";
let currentReaderId = null;
let currentUserId = null;
let readingStartedAt = 0;
let toastTimer;

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if(saved) return {...saved, stories: []};
  }catch(e){}
  return {stories:[], profile:{name:"अनाम पाठक",intro:"",wordsRead:0,bookmarks:[]}, theme:"light", drafts:{title:"",body:"",type:"",subtype:"",categories:[]}};
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
  return `<article class="story-card"><div class="cover-grid"><div>${s.coverUrl?`<img class="cover-thumb" src="${escapeHtml(s.coverUrl)}" alt="${escapeHtml(s.title)} कवर">`:`<div class="cover-placeholder">❀</div>`}</div><div><div>${cats}</div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.author||"अनाम लेखक")} · ${escapeHtml(s.type||"रचना")}${s.subtype?" / "+escapeHtml(s.subtype):""}</p><p class="excerpt">${escapeHtml(excerpt)}${excerpt.length>=150?"…":""}</p><div class="story-meta"><span>◉ ${s.reads||0} पाठक</span><button data-read="${escapeHtml(s.id)}">खोलें ↗</button></div></div></div></article>`;
}
function renderStories(){
  let list=[...state.stories].filter(s=>s.status!=="draft").sort((a,b)=>(b.created||0)-(a.created||0));
  const readingLang=state.profile.readingLanguage||"hi";
  list=list.filter(s=>(s.language||"hi")===readingLang);
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
    const { data: work, error: workError } = await supabaseClient
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

    const links = categoryNames.map(name => ({
      work_id: work.id,
      category_id: categoryMap.get(name)
    }));
    const { error: linkError } = await supabaseClient
      .from("work_categories")
      .insert(links);

    if (linkError) {
      console.error("श्रेणी लिंक सेव नहीं हुए:", linkError);
      toast(
        "रचना Supabase में सेव हो गई, लेकिन श्रेणियाँ नहीं जुड़ीं: " +
        linkError.message
      );
    } else {
      toast("रचना Supabase में सफलतापूर्वक प्रकाशित हो गई!");
    }

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
  document.getElementById("readerBody").textContent=s.body;
  document.getElementById("readerMeta").textContent=`लगभग ${minutesFor(s.body)} मिनट`;
  document.getElementById("readerWords").textContent=`रचना में कुल ${wordCount(s.body)} शब्द`;
  document.getElementById("bookmarkButton").textContent=(state.profile.bookmarks||[]).includes(id)?"♥":"♧";
  const owner = !!s.authorId && (await supabaseClient?.auth.getUser())?.data?.user?.id === s.authorId;
  const action = document.getElementById("workOwnerAction");
  if(action){ action.classList.toggle("hidden",!owner); action.textContent=s.status==="draft"?"पुनः प्रकाशित करें":"अप्रकाशित करके ड्राफ्ट में रखें"; }
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
    const ratingPeople=rows.map(r=>{const who=profiles.find(p=>p.id===r.user_id);return `<span class="tag">${escapeHtml(who?.display_name||who?.username||"पाठक")} · ${"★".repeat(Number(r.rating))}</span>`;}).join(" ");
    if(!(reviews||[]).length){reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div><p class="muted">अभी कोई समीक्षा नहीं है। पहली समीक्षा आप लिख सकते हैं।</p>`;return;}
    reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div>`;
    reviewsBox.innerHTML+= (reviews||[]).map(r=>{
      const who=profiles.find(p=>p.id===r.user_id);
      return `<article class="review-card"><strong>${escapeHtml(who?.display_name||who?.username||"पाठक")}</strong><p>${escapeHtml(r.review_text)}</p><small>${new Date(r.created_at).toLocaleDateString("hi-IN")}</small><div class="review-comments" id="reviewComments-${r.id}">कमेंट लोड हो रहे हैं…</div><form class="review-comment-form" data-review-comment="${r.id}"><input name="comment" maxlength="1500" placeholder="इस समीक्षा पर टिप्पणी करें…" required><button type="submit">भेजें</button></form></article>`;
    }).join("");
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
async function openAuthorProfile(){
  const s=state.stories.find(x=>x.id===currentReaderId);if(!s?.authorId)return;
  const {data:works}=await supabaseClient.from("works").select("id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language").eq("author_id",s.authorId).eq("status","published").order("created_at",{ascending:false});
  const {data:profile}=await supabaseClient.from("profiles").select("id,display_name,username,avatar_url,bio").eq("id",s.authorId).maybeSingle();
  const {data:{user}}=await supabaseClient.auth.getUser();
  const {count:followerCount}=await supabaseClient.from("author_follows").select("follower_id",{count:"exact",head:true}).eq("author_id",s.authorId);
  const {data:follow}=user?await supabaseClient.from("author_follows").select("author_id").eq("follower_id",user.id).eq("author_id",s.authorId).maybeSingle():{data:null};
  const name=profile?.display_name||profile?.username||"रचनाकार";
  const list=(works||[]).map(w=>`<article class="story-card"><h3>${escapeHtml(w.title)}</h3><p>${wordCount(w.content)} शब्द</p><button class="primary-button" data-read="${w.id}">पढ़ें</button></article>`).join("");
  const d=document.createElement("dialog");d.className="modal";d.innerHTML=`<div class="reader-page"><button class="close-button" id="authorClose">×</button><div class="profile-card"><div class="profile-avatar">${profile?.avatar_url?`<img src="${escapeHtml(profile.avatar_url)}">`:escapeHtml(name.slice(0,1))}</div><div><h2>${escapeHtml(name)}</h2><p>${followerCount||0} फ़ॉलोअर</p></div></div><p>${escapeHtml(profile?.bio||"")}</p>${user&&user.id!==s.authorId?`<button class="primary-button" id="followAuthor">${follow?"अनफ़ॉलो":"फ़ॉलो करें"}</button>`:""}<h3>प्रकाशित रचनाएँ (${(works||[]).length})</h3><div class="story-list">${list||"<p>अभी कोई प्रकाशित रचना नहीं।</p>"}</div></div>`;
  document.body.appendChild(d);d.showModal();d.querySelector("#authorClose").onclick=()=>{d.close();d.remove();};
  d.querySelectorAll("[data-read]").forEach(b=>b.onclick=()=>{d.close();d.remove();openReader(b.dataset.read);});
  d.querySelector("#followAuthor")?.addEventListener("click",async()=>{if(follow){await supabaseClient.from("author_follows").delete().eq("follower_id",user.id).eq("author_id",s.authorId);}else{await supabaseClient.from("author_follows").insert({follower_id:user.id,author_id:s.authorId});}d.close();d.remove();toast(follow?"फ़ॉलो हटाया गया":"रचनाकार को फ़ॉलो किया गया");});
}

async function loadCloudProfile() {
  if (!supabaseClient) return;

  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) return;

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
    const langSel=document.getElementById("readingLanguage"); if(langSel)langSel.value=state.profile.readingLanguage;
    saveState();
    renderProfile();
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
  document.getElementById("authShortcut")?.addEventListener("click",()=>document.getElementById("openAuthButton")?.click());
  document.getElementById("avatarUpload")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const url=await uploadSutradharImage(f,"avatars");const {data:{user}}=await supabaseClient.auth.getUser();const {error}=await supabaseClient.from("profiles").update({avatar_url:url}).eq("id",user.id);if(error)throw error;state.profile.avatarUrl=url;saveState();renderProfile();toast("प्रोफ़ाइल DP अपडेट हो गई।");}catch(err){toast("DP अपडेट नहीं हुई: "+err.message);}});
  document.getElementById("readingLanguage")?.addEventListener("change",async e=>{if(!supabaseClient)return;const {data:{user}}=await supabaseClient.auth.getUser();if(user){const {error}=await supabaseClient.from("profiles").update({reading_language:e.target.value}).eq("id",user.id);if(error)toast(error.message);else{state.profile.readingLanguage=e.target.value;saveState();renderStories();toast("पठन भाषा सुरक्षित हुई।");}}});
  document.getElementById("themeToggle").addEventListener("click",toggleTheme);
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
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme();}
init();
loadCloudWorks();
loadCloudProfile();
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
    }, 0);
  });

  refreshAuth();
})();
      
