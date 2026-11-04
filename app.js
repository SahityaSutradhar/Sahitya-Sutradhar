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
let readerPageIndex = 0, readerPagesTotal = 1, readerSeenPages = new Set(), readerTrack = false, readerWordsTotal = 0;
let toastTimer;


const UI_TEXT={
  en:{home:"Home",library:"Library",write:"Write",profile:"Profile",settings:"Settings",latest:"Newly published works",newWriters:"New writers",activeWriters:"Active and popular writers",categories:"Literary categories",readWorld:"Explore works",all:"View all",yourLibrary:"Your library",myWorks:"My published works",myDrafts:"My private drafts",wordsRead:"Total words read",myFollowers:"Followers",readingLanguage:"Reading language",preferred:"Preferred categories",darkMode:"Dark mode",edit:"Edit",login:"Login / Account",logout:"Log out",publish:"Publish",saveChanges:"Save changes",saveDraft:"Save draft",newWork:"New work",workTitle:"Work title",workBody:"Write your work",cover:"Work cover (9:16 ratio)",workLanguage:"Work language",writerOrder:"Writer ranking",mostRead:"Most read",mostWorks:"Most works",mostFollowers:"Most followers",read:"Open",report:"Report",share:"Share",finish:"Finish reading",ratingReview:"Reader feedback",yourRating:"Your rating",yourReview:"Your review",saveFeedback:"Save rating / review",profileIntro:"Introduction (up to 1,000 characters)",changeDP:"Change profile picture",chooseCategories:"Choose preferred categories",welcomeTitle:"Where words come together.",welcomeText:"Read, write and share your creations with readers.",communityTitle:"Community posts",communityPlaceholder:"Share your thoughts…",categoryHeading:"Literary categories"},
  mr:{home:"मुख्यपृष्ठ",library:"वाचनालय",write:"लिहा",profile:"प्रोफाइल",settings:"सेटिंग्ज",latest:"नवीन प्रकाशित साहित्य",newWriters:"नवे लेखक",activeWriters:"सक्रिय आणि लोकप्रिय लेखक",categories:"साहित्य प्रकार",readWorld:"साहित्य वाचा",all:"सर्व पहा",yourLibrary:"तुमचे वाचनालय",myWorks:"माझ्या प्रकाशित रचना",myDrafts:"माझे खाजगी मसुदे",wordsRead:"वाचलेले एकूण शब्द",myFollowers:"अनुयायी",readingLanguage:"वाचनाची भाषा",preferred:"आवडते प्रकार",darkMode:"डार्क मोड",edit:"बदला",login:"लॉगिन / खाते",logout:"बाहेर पडा",publish:"प्रकाशित करा",saveChanges:"बदल जतन करा",saveDraft:"मसुदा जतन करा",newWork:"नवीन रचना",workTitle:"रचनेचे शीर्षक",workBody:"तुमची रचना लिहा",cover:"रचनेचे मुखपृष्ठ (9:16)",workLanguage:"रचनेची भाषा",writerOrder:"लेखक क्रमवारी",mostRead:"सर्वाधिक वाचलेले",mostWorks:"सर्वाधिक रचना",mostFollowers:"सर्वाधिक अनुयायी",read:"उघडा",report:"तक्रार",share:"शेअर करा",finish:"वाचन पूर्ण",ratingReview:"वाचकांचा अभिप्राय",yourRating:"तुमचे मूल्यांकन",yourReview:"तुमचा अभिप्राय",saveFeedback:"मूल्यांकन / अभिप्राय जतन करा",profileIntro:"परिचय (कमाल 1,000 अक्षरे)",changeDP:"प्रोफाइल फोटो बदला",chooseCategories:"आवडते प्रकार निवडा",welcomeTitle:"जिथे शब्द एकत्र येतात.",welcomeText:"वाचा, लिहा आणि आपल्या रचना वाचकांपर्यंत पोहोचवा.",communityTitle:"समुदाय पोस्ट",communityPlaceholder:"आपले विचार मांडा…",categoryHeading:"साहित्य प्रकार"},
  sa:{home:"मुखपृष्ठम्",library:"पुस्तकालयः",write:"लिखतु",profile:"परिचयः",settings:"व्यवस्थाः",latest:"नवीनाः प्रकाशिताः रचनाः",newWriters:"नवीनाः लेखकाः",activeWriters:"सक्रियाः लोकप्रियाः लेखकाः",categories:"साहित्यवर्गाः",readWorld:"रचनाः पठन्तु",all:"सर्वं पश्यतु",yourLibrary:"भवतः पुस्तकालयः",myWorks:"मम प्रकाशिताः रचनाः",myDrafts:"मम गोपनीयाः प्रारूपाः",wordsRead:"पठिताः कुलशब्दाः",myFollowers:"अनुयायिनः",readingLanguage:"पठनभाषा",preferred:"प्रियाः वर्गाः",darkMode:"रात्रिवर्णः",edit:"सम्पादयतु",login:"प्रवेशः / खाता",logout:"निर्गच्छतु",publish:"प्रकाशयतु",saveChanges:"परिवर्तनानि रक्षतु",saveDraft:"प्रारूपं रक्षतु",newWork:"नवीनरचना",workTitle:"रचनायाः शीर्षकम्",workBody:"रचनां लिखतु",cover:"रचनाचित्रम् (9:16)",workLanguage:"रचनायाः भाषा",writerOrder:"लेखकक्रमः",mostRead:"अधिकं पठिताः",mostWorks:"अधिकरचनाः",mostFollowers:"अधिकानुयायिनः",read:"उद्घाटयतु",report:"सूचयतु",share:"वितरतु",finish:"पठनं समाप्तम्",ratingReview:"पाठकप्रतिक्रिया",yourRating:"भवतः मूल्याङ्कनम्",yourReview:"भवतः समीक्षा",saveFeedback:"मूल्याङ्कनं समीक्षां च रक्षतु",profileIntro:"परिचयः (अधिकतमं १००० अक्षराणि)",changeDP:"चित्रं परिवर्तयतु",chooseCategories:"प्रियवर्गान् चिनोतु",welcomeTitle:"यत्र शब्दाः मिलन्ति।",welcomeText:"पठतु, लिखतु, स्वकीयाः रचनाः पाठकेभ्यः प्रेषयतु।",communityTitle:"समुदायलेखाः",communityPlaceholder:"स्वविचारान् लिखतु…",categoryHeading:"साहित्यवर्गाः"}
};
function applyUILanguage(){
  const lang=state.profile.uiLanguage||"hi", t=UI_TEXT[lang]||{};
  const set=(selector,key)=>{const el=document.querySelector(selector);if(el&&t[key])el.textContent=t[key];};
  const navKeys=[['home','home'],['library','library'],['write','write'],['profile','profile'],['settings','settings']];
  navKeys.forEach(([tab,key])=>{const el=document.querySelector(`[data-tab="${tab}"]`);if(el&&t[key]){const node=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(node)node.nodeValue=" "+t[key];}});
  set('#welcomeTitle','welcomeTitle');set('#welcomeText','welcomeText');set('#communityTitle','communityTitle');set('#categoryHeading','categoryHeading');set('#storyHeading','readWorld');set('#clearCategory','all');set('#publishCommunityPost','publish');
  const headings=[['#latestHeading','latest'],['#newWritersHeading','newWriters'],['#activeWritersHeading','activeWriters'],['#libraryView h1','yourLibrary'],['#profileView h1','profile'],['#settingsView h1','settings']];
  headings.forEach(([s,k])=>set(s,k));
  const ids=[['#wordsRead+span','wordsRead'],['#myFollowerCount+span','myFollowers'],['#saveDraftCloud','saveDraft'],['#submitFeedback','saveFeedback'],['#reportWork','report'],['#shareWork','share'],['#finishReading','finish'],['#feedbackPanel h2','ratingReview']];
  ids.forEach(([s,k])=>set(s,k));
  const postBox=document.getElementById("communityPostText");if(postBox&&t.communityPlaceholder)postBox.placeholder=t.communityPlaceholder;
  const titleBox=document.getElementById("storyTitle");if(titleBox&&t.workTitle)titleBox.placeholder=t.workTitle;
  const bodyBox=document.getElementById("storyBody");if(bodyBox&&t.workBody)bodyBox.placeholder=t.workBody;
  document.documentElement.lang=lang;
}

function emptyAccountState(){
  return {stories:[], profile:{name:"अनाम पाठक",intro:"",wordsRead:0,bookmarks:[],avatarUrl:"",readingLanguage:"hi",uiLanguage:"hi",preferredCategories:[]}, theme:"light", drafts:{title:"",body:"",type:"",subtype:"",categories:[]}};
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
function wordCount(s=""){
  const plain=String(s||"")
    .replace(/\[\[\/?(?:font|color)(?::[^\]]+)?\]\]/g," ")
    .replace(/\[\[\/?highlight\]\]/g," ")
    .replace(/\*\*|(?<!\*)\*(?!\*)/g," ")
    .trim();
  if(!plain)return 0;
  if(typeof Intl!="undefined" && Intl.Segmenter){
    const segmenter=new Intl.Segmenter("hi",{granularity:"word"});
    let count=0; for(const part of segmenter.segment(plain)) if(part.isWordLike) count++;
    return count;
  }
  return (plain.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu)||[]).length;
}
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
  const isOwner = s.source === "supabase" && !!currentUserId && s.authorId === currentUserId;
  return `<article class="story-card"><div class="cover-grid"><button class="cover-open" type="button" data-read="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.title)} पढ़ें">${s.coverUrl?`<img class="cover-thumb" src="${escapeHtml(s.coverUrl)}" alt="${escapeHtml(s.title)} कवर">`:`<div class="cover-placeholder">❀</div>`}</button><div><div>${cats}</div><h3>${escapeHtml(s.title)}</h3><p><button class="story-author-link" type="button" data-story-author="${escapeHtml(s.authorId||"")}">${escapeHtml(s.author||"अनाम लेखक")}</button> · ${escapeHtml(s.type||"रचना")}${s.subtype?" / "+escapeHtml(s.subtype):""}</p><p class="excerpt">${escapeHtml(excerpt)}${excerpt.length>=150?"…":""}</p><div class="story-meta"><span>◉ ${s.reads||0} पाठक</span><button data-read="${escapeHtml(s.id)}">खोलें ↗</button>${isOwner && s.status === "published" ? `<button class="secondary-button" type="button" data-edit-work="${escapeHtml(s.id)}">संपादित करें ✎</button>` : ""}</div></div></div></article>`;
}
function renderStories(){
  let list=[...state.stories].filter(s=>s.status==="published").sort((a,b)=>(b.created||0)-(a.created||0));
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
  bindReadButtons(); applyUILanguage();
}
function bindReadButtons(){
  const roots = [
    "#storyList",
    "#latestWorksList",
    "#libraryList",
    "#myStoryList",
    "#myDraftList"
  ];

  roots.forEach(root => {
    document.querySelectorAll(`${root} [data-read]`).forEach(b => {
      b.onclick = () => openReader(b.dataset.read);
    });

    document.querySelectorAll(`${root} [data-edit-work]`).forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        openEditWork(b.dataset.editWork);
      };
    });

    document.querySelectorAll(`${root} [data-story-author]`).forEach(b => {
      b.onclick = () => {
        if (b.dataset.storyAuthor) {
          openAuthorProfile(b.dataset.storyAuthor);
        }
      };
    });
  });
}
function formatMarkup(value=""){
  let safe=escapeHtml(value);
  safe=safe.replace(/\[\[font:(serif|sans|devotional|poetic|mono|classic|handwritten|newspaper|decorative)\]\]([\s\S]*?)\[\[\/font\]\]/g,'<span class="font-$1">$2</span>');
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
  for(const s of published){let w=grouped.get(s.authorId);if(!w){w={id:s.authorId,name:s.author||"रचनाकार",avatar:s.authorAvatar||"",works:0,reads:0,firstPublished:s.created||0};grouped.set(s.authorId,w);}w.works++;w.reads+=Number(s.reads||0);w.firstPublished=Math.min(w.firstPublished,s.created||w.firstPublished);}
  const writers=[...grouped.values()];
  const render=(list)=>list.map(w=>`<button class="writer-card" type="button" data-writer="${escapeHtml(w.id)}"><span class="mini-avatar">${w.avatar?`<img src="${escapeHtml(w.avatar)}" alt="">`:escapeHtml(w.name.slice(0,1))}</span><span class="writer-card-main"><strong>${escapeHtml(w.name)}</strong><small>${w.works} प्रकाशित रचनाएँ</small></span><span class="tag">प्रोफ़ाइल ↗</span></button>`).join("")||'<p class="muted">अभी लेखक सूची उपलब्ध नहीं है।</p>';
  document.getElementById("newWritersList").innerHTML=render([...writers].sort((a,b)=>b.firstPublished-a.firstPublished).slice(0,8));
  const sort=document.getElementById("writerSort")?.value||"reads";

document.getElementById("activeWritersList").innerHTML=render([...writers].sort((a,b)=>sort==="works"?b.works-a.works:sort==="followers"?Number(b.followers||0)-Number(a.followers||0):b.reads-a.reads).slice(0,12));
  document.querySelectorAll("#newWritersList [data-writer], #activeWritersList [data-writer]").forEach(b=>{
  b.onclick = () => openWriterProfile(b.dataset.writer);
});
}
async function openWriterProfile(authorId){
  const story=state.stories.find(s=>s.authorId===authorId);if(story)currentReaderId=story.id;await openAuthorProfile(authorId);
}
async function loadHomepageStats(){
  const latest=state.stories.filter(s=>s.status==="published").sort((a,b)=>b.created-a.created).slice(0,20);
  const box=document.getElementById("latestWorksList");if(box){box.innerHTML=latest.map(storyCard).join("")||'<p class="muted">अभी कोई प्रकाशित रचना नहीं।</p>';bindReadButtons();}
  renderWriters();
  if(!supabaseClient)return;
  const [{data:stats,error},{data:workReadStats,error:workStatsError}]=await Promise.all([
    supabaseClient.rpc("get_public_author_stats"),
    supabaseClient.rpc("get_public_work_read_stats")
  ]);
  if(!error&&!workStatsError&&Array.isArray(stats)&&Array.isArray(workReadStats)){
    const map=new Map(stats.map(x=>[x.author_id,x]));
    const perWorkReads=new Map(workReadStats.map(x=>[x.work_id,Number(x.total_reads||0)]));
    for(const s of state.stories)s.reads=perWorkReads.get(s.id)||0;
    const followMap=new Map(stats.map(x=>[x.author_id,Number(x.total_followers||0)]));
    const latestBox=document.getElementById("latestWorksList");if(latestBox){latestBox.innerHTML=state.stories.filter(x=>x.status==="published").sort((a,b)=>b.created-a.created).slice(0,20).map(storyCard).join("");bindReadButtons();}
    renderStories();
    const grouped=new Map();for(const s of state.stories.filter(x=>x.status==="published"&&x.authorId)){const w=grouped.get(s.authorId)||{id:s.authorId,name:s.author,avatar:s.authorAvatar,works:0,reads:0,followers:followMap.get(s.authorId)||0,firstPublished:s.created};w.works++;w.reads+=Number(s.reads||0);w.firstPublished=Math.min(w.firstPublished,s.created||w.firstPublished);grouped.set(s.authorId,w);}
    const writers=[...grouped.values()];const sort=document.getElementById("writerSort")?.value||"reads";
    const render=list=>list.map(w=>`<button class="writer-card" type="button" data-writer="${escapeHtml(w.id)}"><span class="mini-avatar">${w.avatar?`<img src="${escapeHtml(w.avatar)}" alt="">`:escapeHtml((w.name||"अ").slice(0,1))}</span><span class="writer-card-main"><strong>${escapeHtml(w.name)}</strong><small>${w.works} रचनाएँ · ${w.reads} पाठक · ${w.followers} फ़ॉलोअर</small></span></button>`).join("")||'<p class="muted">अभी लेखक सूची उपलब्ध नहीं है।</p>';
    document.getElementById("newWritersList").innerHTML=render([...writers].sort((a,b)=>b.firstPublished-a.firstPublished).slice(0,8));
    document.getElementById("activeWritersList").innerHTML=render([...writers].sort((a,b)=>sort==="works"?b.works-a.works:sort==="followers"?b.followers-a.followers:b.reads-a.reads).slice(0,12));
    document.querySelectorAll("#newWritersList [data-writer], #activeWritersList [data-writer]").forEach(b=>{
  b.onclick = () => openWriterProfile(b.dataset.writer);
});
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
  document.getElementById("charCount").textContent=`${document.getElementById("storyBody").value.length} अक्षर · ${wordCount(document.getElementById("storyBody").value)} शब्द`;
}
function restoreDraft(){
  const d=state.drafts||{};
  document.getElementById("storyTitle").value=d.title||"";
  document.getElementById("storyBody").value=d.body||"";
  document.getElementById("formType").value=d.type||"";
  updateSubtypes();
  document.getElementById("formSubType").value=d.subtype||"";
  document.querySelectorAll("#formCategories input").forEach(cb=>cb.checked=(d.categories||[]).includes(cb.value));
  document.getElementById("charCount").textContent=`${(d.body||"").length} अक्षर · ${wordCount(d.body||"")} शब्द`;
}
function openWrite(){
  editingWorkId = null;
  restoreDraft();
  document.querySelector("#writeDialog .modal-heading h2").textContent = "नई रचना";
  document.querySelector('#storyForm button[type="submit"]').textContent = "प्रकाशित करें";
  document.getElementById("storyCover").value = "";
  document.getElementById("rightsCheck").checked = false;
  document.getElementById("writeDialog").showModal();
}

async function openEditWork(id){
  const s = state.stories.find(x => String(x.id) === String(id));
  if(!s || s.source !== "supabase") return;
  const {data:{user}} = await supabaseClient.auth.getUser();
  if(!user || user.id !== s.authorId){toast("केवल अपनी प्रकाशित रचना संपादित कर सकते हैं।");return;}
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
  document.getElementById("charCount").textContent = `${(s.body || "").length} अक्षर · ${wordCount(s.body||"")} शब्द`;
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
    const requestUserId = authResult.data?.user?.id || null;
    if(requestUserId !== currentUserId) return;
    const { data: works, error } = await supabaseClient
      .from("works")
      .select("id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language")
      .in("status", ["published", "draft"])
      .order("created_at", { ascending: false });

    if (error) throw error;
    const latestAuth = await supabaseClient.auth.getUser();
    if((latestAuth.data?.user?.id || null) !== requestUserId || requestUserId !== currentUserId) return;

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

    if(requestUserId !== currentUserId) return;
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


async function saveCloudDraft(){
  const title=document.getElementById("storyTitle").value.trim();
  const body=document.getElementById("storyBody").value.trim();
  const type=document.getElementById("formType").value;
  const subtype=document.getElementById("formSubType").value;
  const language=document.getElementById("storyLanguage")?.value||"hi";
  const coverFile=document.getElementById("storyCover")?.files?.[0]||null;
  const categoryNames=[...document.querySelectorAll("#formCategories input:checked")].map(x=>x.value);
  if(!title&&!body){toast("ड्राफ्ट में कम-से-कम शीर्षक या सामग्री लिखें।");return;}
  if(!supabaseClient){toast("Supabase कनेक्शन उपलब्ध नहीं है।");return;}
  const button=document.getElementById("saveDraftCloud"); if(button)button.disabled=true;
  try{
    const {data:{user},error:userError}=await supabaseClient.auth.getUser();
    if(userError)throw userError; if(!user){toast("क्लाउड ड्राफ्ट के लिए पहले लॉगिन करें।");return;}
    let coverUrl=null; if(coverFile)coverUrl=await uploadSutradharImage(coverFile,"covers");
    const payload={author_id:user.id,title:title||"शीर्षक रहित मसौदा",content:body,work_type:getDatabaseWorkType(type,subtype),main_form:type||"गद्य",subtype:subtype||null,status:"draft",content_language:language};
    if(coverUrl)payload.cover_url=coverUrl;
    let work;
    if(editingWorkId){
      const existing=state.stories.find(x=>String(x.id)===String(editingWorkId));
      if(!existing||existing.authorId!==user.id)throw new Error("केवल अपनी रचना का ड्राफ्ट सेव कर सकते हैं。");
      const {data,error}=await supabaseClient.from("works").update(payload).eq("id",editingWorkId).eq("author_id",user.id).select().single();
      if(error)throw error; work=data;
    }else{
      const {data,error}=await supabaseClient.from("works").insert(payload).select().single();
      if(error)throw error; work=data;
    }
    const {data:cats,error:catError}=categoryNames.length?await supabaseClient.from("categories").select("id,name").in("name",categoryNames):{data:[],error:null};
    if(catError)throw catError;
    const ids=(cats||[]).map(x=>x.id);
    if(editingWorkId){const {error}=await supabaseClient.from("work_categories").delete().eq("work_id",work.id);if(error)throw error;}
    if(ids.length){const {error}=await supabaseClient.from("work_categories").insert(ids.map(category_id=>({work_id:work.id,category_id})));if(error)throw error;}
    editingWorkId=null; state.drafts={title:"",body:"",type:"",subtype:"",categories:[]}; saveState();
    document.getElementById("writeDialog").close(); await loadCloudWorks(); toast("ड्राफ्ट आपके खाते में निजी रूप से सुरक्षित हो गया।");
  }catch(error){toast("ड्राफ्ट सेव नहीं हुआ: "+(error.message||String(error)));}
  finally{if(button)button.disabled=false;}
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
        content_language: contentLanguage,
        status: "published"
      };
      if (coverUrl) updateData.cover_url = coverUrl;
      const { data, error: workError } = await supabaseClient
        .from("works").update(updateData).eq("id", editingWorkId).eq("author_id", user.id).select().single();
      if (workError) throw workError;
      work = data;
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

    const desiredCategoryIds = categoryNames.map(name => categoryMap.get(name));
    let linkError = null;
    if (editingWorkId) {
      // पहले नई श्रेणियाँ जोड़ें; सफल होने के बाद ही हटाई गई श्रेणियाँ हटाएँ।
      const { data: oldLinks, error: oldLinksError } = await supabaseClient
        .from("work_categories").select("category_id").eq("work_id", work.id);
      if (oldLinksError) throw oldLinksError;
      const oldIds = (oldLinks || []).map(x => x.category_id);
      const addIds = desiredCategoryIds.filter(id => !oldIds.includes(id));
      const removeIds = oldIds.filter(id => !desiredCategoryIds.includes(id));
      if (addIds.length) {
        const result = await supabaseClient.from("work_categories").insert(addIds.map(category_id => ({work_id:work.id,category_id})));
        linkError = result.error;
      }
      if (!linkError && removeIds.length) {
        const result = await supabaseClient.from("work_categories").delete().eq("work_id",work.id).in("category_id",removeIds);
        linkError = result.error;
      }
    } else {
      const result = await supabaseClient.from("work_categories").insert(desiredCategoryIds.map(category_id => ({work_id:work.id,category_id})));
      linkError = result.error;
    }

    if (linkError) {
      console.error("श्रेणी लिंक सेव नहीं हुए:", linkError);
      toast("रचना का पाठ सुरक्षित हुआ, लेकिन श्रेणियाँ पूरी तरह अपडेट नहीं हुईं: " + linkError.message);
    } else {
      toast(editingWorkId ? "पुरानी प्रकाशित रचना के बदलाव सुरक्षित हो गए।" : "रचना Supabase में सफलतापूर्वक प्रकाशित हो गई!");
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
  const sel=window.getSelection(),selection=sel?.toString().trim();
  const body=document.getElementById("readerBody");
  if(!selection||!sel.anchorNode||!body?.contains(sel.anchorNode)||!sel.focusNode||!body.contains(sel.focusNode)){toast("केवल रचना के पृष्ठ के भीतर का अंश चुनें।");return;}
  try{await document.fonts?.ready;}catch{}
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext("2d");const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,"#5b1d28");g.addColorStop(1,"#9a7047");ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
  ctx.strokeStyle="#e8cf9d";ctx.lineWidth=4;ctx.strokeRect(42,42,996,1266);
  ctx.fillStyle="#f6dfb5";ctx.textAlign="center";ctx.font="bold 38px sans-serif";ctx.fillText("साहित्य सूत्रधार",540,145);
  try{const logo=new Image();logo.src="assets/sahitya-sutradhar-logo.png";await logo.decode();ctx.drawImage(logo,490,65,100,70);}catch{}
  ctx.fillStyle="#fff8e9";ctx.font="bold 48px sans-serif";wrapCanvasText(ctx,s.title,540,250,850,64,5);
  ctx.strokeStyle="#d9b56e";ctx.beginPath();ctx.moveTo(160,390);ctx.lineTo(920,390);ctx.stroke();
  ctx.textAlign="left";ctx.fillStyle="#fffaf0";ctx.font="36px sans-serif";wrapCanvasText(ctx,selection,140,480,800,58,11);
  ctx.textAlign="center";ctx.fillStyle="#f5dcae";ctx.font="bold 32px sans-serif";ctx.fillText("— "+(s.author||"अनाम लेखक"),540,1160);
  ctx.font="22px sans-serif";ctx.fillText(location.href.split("#")[0]+"#work-"+s.id,540,1220);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob){toast("चित्र तैयार नहीं हो सका।");return;}
  const file=new File([blob],"sahitya-sutradhar-excerpt.png",{type:"image/png"});
  if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:s.title,text:"साहित्य सूत्रधार पर पढ़ें — "+s.author});return;}catch(e){if(e.name==="AbortError")return;}}
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="sahitya-sutradhar-excerpt.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast("चुने हुए अंश का चित्र डाउनलोड हो गया।");
}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines){
  const words=String(text).split(/\s+/);let line="",lines=[];
  for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
  if(line)lines.push(line);if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=lines[maxLines-1].replace(/[.…]*$/,"…");}
  lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return lines.length;
}

const READER_PROGRESS_KEY="sutradhar.reader.progress.v1";
function loadReaderProgress(){try{return JSON.parse(localStorage.getItem(READER_PROGRESS_KEY)||"{}");}catch{return {};}}
function saveReaderProgress(id,entry){const all=loadReaderProgress();all[String(id)]=entry;localStorage.setItem(READER_PROGRESS_KEY,JSON.stringify(all));}
function readerProgressFor(id){return loadReaderProgress()[String(id)]||{page:0,seen:[],words:0};}
function readerPageMetrics(){
 const el=document.getElementById("readerBody");if(!el)return;
 readerPagesTotal=Math.max(1,Math.round(el.scrollWidth/Math.max(1,el.clientWidth)));
 readerPageIndex=Math.min(readerPagesTotal-1,Math.max(0,Math.round(el.scrollLeft/Math.max(1,el.clientWidth))));
 document.getElementById("readerPageStatus").textContent=`पृष्ठ ${readerPageIndex+1} / ${readerPagesTotal}`;
 document.getElementById("readerPrevPage").disabled=readerPageIndex===0;
 document.getElementById("readerNextPage").disabled=readerPageIndex>=readerPagesTotal-1;
}
function readerGoPage(index,direction){
 const el=document.getElementById("readerBody");if(!el)return;
 const next=Math.max(0,Math.min(readerPagesTotal-1,index));el.classList.remove("flip-next","flip-prev");void el.offsetWidth;el.classList.add(direction==="prev"?"flip-prev":"flip-next");
 el.scrollTo({left:next*el.clientWidth,behavior:"smooth"});readerPageIndex=next;readerPageMetrics();recordReaderPage(next);
}
async function recordReaderPage(page){
 const id=String(currentReaderId),seen=readerSeenPages;
 if(seen.has(page))return;
 seen.add(page);
 const pageWords=Math.max(0,Math.ceil(readerWordsTotal/readerPagesTotal));
 const progress=readerProgressFor(id);progress.page=page;progress.seen=[...seen];progress.words=(progress.words||0)+pageWords;progress.updatedAt=Date.now();saveReaderProgress(id,progress);
 if(readerTrack&&supabaseClient){const {data:{user}}=await supabaseClient.auth.getUser();if(user&&user.id!==state.stories.find(x=>String(x.id)===id)?.authorId){
  const {error}=await supabaseClient.from("work_reads").insert({work_id:id,reader_id:user.id,words_count:pageWords});
  if(error)console.warn("पृष्ठ-पठन रिकॉर्ड सेव नहीं हुआ",error.message);
 }}
}
function setupReaderPagination(id){
 const body=document.getElementById("readerBody"),saved=readerProgressFor(id);
 readerPageIndex=Number(saved.page)||0;readerSeenPages=new Set(saved.seen||[]);readerWordsTotal=wordCount(body.innerText||"");readerPagesTotal=1;
 body.scrollLeft=0;requestAnimationFrame(()=>{readerPageMetrics();readerGoPage(Math.min(readerPageIndex,readerPagesTotal-1),"next");});
}
async function openReader(id){
  const s=state.stories.find(x=>x.id===id);if(!s)return;
  currentReaderId=id;readingStartedAt=Date.now();
  const {data:{user}} = supabaseClient ? await supabaseClient.auth.getUser() : {data:{user:null}};
  if(s.source==="supabase" && s.status==="published" && !user){
    readerTrack=false;
    document.getElementById("readerTitle").textContent=s.title;
    document.getElementById("readerCategory").textContent=[s.type,s.subtype,...(s.categories||[])].filter(Boolean).join(" · ");
    document.getElementById("readerAuthor").textContent=s.author||"अनाम लेखक";
    document.getElementById("readerAuthorAvatar").innerHTML=s.authorAvatar?`<img src="${escapeHtml(s.authorAvatar)}" alt="">`:escapeHtml((s.author||"अ").trim().slice(0,1));
    const previewCover=document.getElementById("readerCoverSlot");previewCover.innerHTML=s.coverUrl?`<img class="cover-thumb" src="${escapeHtml(s.coverUrl)}" alt="कवर">`:`<div class="cover-placeholder">कवर नहीं</div>`;
    document.getElementById("readerBody").textContent=(s.body||"").slice(0,220)+"… पूरी रचना पढ़ने, रेटिंग और समीक्षा के लिए खाता बनाएँ या लॉगिन करें।";
    document.getElementById("readerWords").textContent=`रचना में कुल ${wordCount(s.body)} शब्द`;
    document.getElementById("feedbackPanel").classList.add("hidden");
    document.getElementById("editWorkAction")?.classList.add("hidden");document.getElementById("workOwnerAction")?.classList.add("hidden");
    document.getElementById("readerDialog").showModal();
    return;
  }
  readerTrack=!!(s.source==="supabase"&&s.status==="published"&&user&&user.id!==s.authorId);
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
  setupReaderPagination(id);
  if(s.source==="supabase" && s.status!=="draft") await loadWorkFeedback(id);
  if(s.source==="supabase" && user) await refreshReaderStats(s);
  if(s.source==="supabase" && s.status==="published") await refreshWorkLikes(id);
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
    summary.textContent=`★ ${avg?avg.toFixed(1):"—"} / 5 (${avg?Math.round(avg*20):0}%) · ${rows.length} रेटिंग · ${(reviews||[]).length} समीक्षाएँ`;
    const {data:{user}}=await supabaseClient.auth.getUser();
    const myRating=rows.find(x=>x.user_id===user?.id);
    const myReview=(reviews||[]).find(x=>x.user_id===user?.id);
    document.getElementById("ratingInput").value=myRating?.rating||"";
    document.getElementById("reviewInput").value=myReview?.review_text||"";
    const userIds=[...new Set([...(reviews||[]).map(x=>x.user_id),...rows.map(x=>x.user_id)])];
    let profiles=[];
    if(userIds.length){const q=await supabaseClient.from("profiles").select("id,display_name,username,avatar_url").in("id",userIds);if(!q.error)profiles=q.data||[];}
    const ratingPeople=rows.map(r=>{const who=profiles.find(p=>p.id===r.user_id);return `<button class="tag profile-link" type="button" data-person-profile="${escapeHtml(r.user_id)}"><span class="mini-avatar">${who?.avatar_url?`<img src="${escapeHtml(who.avatar_url)}" alt="">`:escapeHtml((who?.display_name||who?.username||"प").slice(0,1))}</span>${escapeHtml(who?.display_name||who?.username||"पाठक")} · ${"★".repeat(Number(r.rating))}</button>`;}).join(" ");
    if(!(reviews||[]).length){reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div><p class="muted">अभी कोई समीक्षा नहीं है। पहली समीक्षा आप लिख सकते हैं।</p>`;reviewsBox.querySelectorAll("[data-person-profile]").forEach(b=>b.addEventListener("click",()=>openAuthorProfile(b.dataset.personProfile)));return;}
    reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div>`;
    reviewsBox.innerHTML+= (reviews||[]).map(r=>{
      const who=profiles.find(p=>p.id===r.user_id);
      return `<article class="review-card"><button class="profile-link" type="button" data-person-profile="${escapeHtml(r.user_id)}"><span class="mini-avatar">${who?.avatar_url?`<img src="${escapeHtml(who.avatar_url)}" alt="">`:escapeHtml((who?.display_name||who?.username||"प").slice(0,1))}</span><strong>${escapeHtml(who?.display_name||who?.username||"पाठक")}</strong></button><p>${escapeHtml(r.review_text)}</p><small>${new Date(r.created_at).toLocaleDateString("hi-IN")}</small><div class="review-comments" id="reviewComments-${r.id}">कमेंट लोड हो रहे हैं…</div><form class="review-comment-form" data-review-comment="${r.id}"><input name="comment" maxlength="1500" placeholder="इस समीक्षा पर टिप्पणी करें…" required><button type="submit">भेजें</button></form></article>`;
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
  box.innerHTML=(data||[]).length?(data||[]).map(c=>{const u=people.find(p=>p.id===c.user_id);return `<p class="review-comment"><button class="story-author-link" type="button" data-writer="${escapeHtml(c.user_id)}">${escapeHtml(u?.display_name||u?.username||"पाठक")}</button>: ${escapeHtml(c.comment_text)}</p>`;}).join(""):'<p class="muted">अभी कोई टिप्पणी नहीं।</p>';
  box.querySelectorAll("[data-writer]").forEach(b=>b.addEventListener("click",()=>openAuthorProfile(b.dataset.writer)));
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
  const s=state.stories.find(x=>x.id===currentReaderId);
  readerPageMetrics();const p=readerProgressFor(currentReaderId);p.page=readerPageIndex;p.seen=[...readerSeenPages];p.updatedAt=Date.now();saveReaderProgress(currentReaderId,p);
  document.getElementById("readerDialog").close();
  if(s)toast(`पठन सुरक्षित: ${readerSeenPages.size} पृष्ठ देखे गए।`);
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

async function refreshWorkLikes(workId){
  const countEl=document.getElementById("workLikeCount"),btn=document.getElementById("workLikeButton");
  if(!countEl||!btn||!supabaseClient)return;
  const [{count,error:countError},{data:{user}}]=await Promise.all([
    supabaseClient.from("work_likes").select("id",{count:"exact",head:true}).eq("work_id",workId),
    supabaseClient.auth.getUser()
  ]);
  if(countError){countEl.textContent="0";return;}
  let liked=false;if(user){const q=await supabaseClient.from("work_likes").select("id").eq("work_id",workId).eq("user_id",user.id).maybeSingle();liked=!!q.data;}
  if(currentReaderId!==workId)return;
  countEl.textContent=String(count||0);btn.dataset.liked=liked?"1":"0";btn.firstChild.textContent=liked?"♥ पसंद किया · ":"♡ पसंद करें · ";
}
async function toggleWorkLike(){
  if(!supabaseClient||!currentReaderId)return;
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("पसंद करने के लिए लॉगिन करें।");return;}
  const btn=document.getElementById("workLikeButton"),liked=btn?.dataset.liked==="1";
  const q=liked?await supabaseClient.from("work_likes").delete().eq("work_id",currentReaderId).eq("user_id",user.id):await supabaseClient.from("work_likes").insert({work_id:currentReaderId,user_id:user.id});
  if(q.error){toast("पसंद सुरक्षित नहीं हुई: "+q.error.message);return;}await refreshWorkLikes(currentReaderId);
}
async function loadCommunityPosts(){
  const box=document.getElementById("communityPostsList");if(!box||!supabaseClient)return;
  const {data:posts,error}=await supabaseClient.from("community_posts").select("id,author_id,body,created_at").eq("status","published").order("created_at",{ascending:false}).limit(20);
  if(error){box.innerHTML='<p class="muted">समुदाय पोस्ट लोड नहीं हो सकीं।</p>';console.warn(error);return;}
  const ids=[...new Set((posts||[]).map(p=>p.author_id))];let profiles=[];
  if(ids.length){const q=await supabaseClient.from("profiles").select("id,display_name,username,avatar_url").in("id",ids);profiles=q.data||[];}
  const {data:{user}}=await supabaseClient.auth.getUser();
  const postIds=(posts||[]).map(p=>p.id);let likes=[];
  if(postIds.length){const q=await supabaseClient.from("post_likes").select("post_id,user_id").in("post_id",postIds);likes=q.data||[];}
  box.innerHTML=(posts||[]).map(p=>{const who=profiles.find(x=>x.id===p.author_id),mine=likes.some(x=>x.post_id===p.id&&x.user_id===user?.id),count=likes.filter(x=>x.post_id===p.id).length;return `<article class="community-post"><div class="community-post-head"><span class="mini-avatar">${who?.avatar_url?`<img src="${escapeHtml(who.avatar_url)}" alt="">`:escapeHtml((who?.display_name||who?.username||"अ").slice(0,1))}</span><button class="story-author-link" type="button" data-writer="${escapeHtml(p.author_id)}">${escapeHtml(who?.display_name||who?.username||"लेखक")}</button><small>${new Date(p.created_at).toLocaleDateString("hi-IN")}</small></div><p>${escapeHtml(p.body)}</p><button type="button" data-post-like="${escapeHtml(p.id)}" data-liked="${mine?"1":"0"}">${mine?"♥ पसंद किया":"♡ पसंद करें"} · ${count}</button></article>`;}).join("")||'<p class="muted">अभी कोई पोस्ट नहीं है। पहली पोस्ट आप लिख सकते हैं।</p>';
  box.querySelectorAll("[data-writer]").forEach(b=>b.addEventListener("click",()=>openAuthorProfile(b.dataset.writer)));
  box.querySelectorAll("[data-post-like]").forEach(b=>b.addEventListener("click",()=>togglePostLike(b.dataset.postLike,b.dataset.liked==="1")));
}
async function togglePostLike(postId,liked){
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("पोस्ट पसंद करने के लिए लॉगिन करें।");return;}
  const q=liked?await supabaseClient.from("post_likes").delete().eq("post_id",postId).eq("user_id",user.id):await supabaseClient.from("post_likes").insert({post_id:postId,user_id:user.id});
  if(q.error){toast("पसंद सुरक्षित नहीं हुई: "+q.error.message);return;}await loadCommunityPosts();
}
async function publishCommunityPost(){
  const field=document.getElementById("communityPostText"),body=field?.value.trim();if(!body)return;
  if(wordCount(body)>2000){toast("पोस्ट अधिकतम 2,000 शब्दों की हो सकती है।");return;}
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("पोस्ट लिखने के लिए लॉगिन करें।");return;}
  const {error}=await supabaseClient.from("community_posts").insert({author_id:user.id,body,status:"published"});
  if(error){toast("पोस्ट प्रकाशित नहीं हुई: "+error.message);return;}field.value="";await loadCommunityPosts();toast("आपकी पोस्ट प्रकाशित हो गई।");
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

  const profileUserId=user.id;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("display_name, avatar_url, bio, reading_language, preferred_categories, ui_language")
    .eq("id", profileUserId)
    .maybeSingle();
  const latestAuth=await supabaseClient.auth.getUser();
  if((latestAuth.data?.user?.id||null)!==profileUserId || currentUserId!==profileUserId) return;

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
    state.profile.uiLanguage = data.ui_language || state.profile.uiLanguage || "hi";
    state.profile.preferredCategories = data.preferred_categories || [];
    const langSel=document.getElementById("readingLanguage"); if(langSel)langSel.value=state.profile.readingLanguage;
    const uiSel=document.getElementById("layoutLanguage"); if(uiSel)uiSel.value=state.profile.uiLanguage; applyUILanguage();
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
  if(currentUserId && supabaseClient){const uid=currentUserId;supabaseClient.from("work_reads").select("words_count").eq("reader_id",uid).then(({data,error})=>{if(!error&&uid===currentUserId){const total=(data||[]).reduce((n,r)=>n+Number(r.words_count||0),0);document.getElementById("wordsRead").textContent=total.toLocaleString("hi-IN");}});}
  const mine=state.stories.filter(s=>s.source==="supabase" && s.authorId===currentUserId && s.status==="published");
  const drafts=state.stories.filter(s=>s.source==="supabase" && s.authorId===currentUserId && s.status==="draft");
  document.getElementById("publishedCount").textContent=mine.length;
  const followerEl=document.getElementById("myFollowerCount");
  if(followerEl)followerEl.textContent="0";
  if(followerEl&&currentUserId&&supabaseClient){const uid=currentUserId;supabaseClient.from("author_follows").select("follower_id",{count:"exact",head:true}).eq("author_id",uid).then(({count,error})=>{if(!error&&uid===currentUserId)followerEl.textContent=(count||0).toLocaleString("hi-IN");});}
  document.getElementById("myStoryList").innerHTML=mine.length?mine.map(storyCard).join(""):'<p class="muted">अभी आपने कोई रचना प्रकाशित नहीं की है।</p>';
  const draftBox=document.getElementById("myDraftList");
  if(draftBox) draftBox.innerHTML=drafts.length?drafts.map(d=>`<article class="story-card"><h3>${escapeHtml(d.title)}</h3><p>निजी ड्राफ्ट</p><div class="story-meta"><button type="button" data-edit-work="${escapeHtml(d.id)}">संपादित करें</button><button type="button" data-republish="${escapeHtml(d.id)}">पुनः प्रकाशित करें</button></div></article>`).join(""):'<p class="muted">कोई निजी ड्राफ्ट नहीं।</p>';
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
/* =========================================
   SAHITYA SUTRADHAR — LOADER CONTROLLER
========================================= */

const loaderQuotes = [
  {
    text: "ऐसी बानी बोलिए, मन का आपा खोय। औरन को शीतल करै, आपहुँ शीतल होय॥",
    author: "— संत कबीरदास"
  },
  {
    text: "गुरु गोविंद दोऊ खड़े, काके लागूं पाय। बलिहारी गुरु आपने, गोविंद दियो बताय॥",
    author: "— संत कबीरदास"
  },
  {
    text: "निंदक नियरे राखिए, आँगन कुटी छवाय। बिन पानी साबुन बिना, निर्मल करे सुभाय॥",
    author: "— संत कबीरदास"
  }
];

const loaderStartedAt = Date.now();
let loaderQuoteIndex = 0;
let loaderQuoteTimer = null;
let loaderHideTimer = null;

function writeLoaderQuote() {
  const quote = loaderQuotes[loaderQuoteIndex];
  const quoteEl = document.getElementById("loaderQuote");
  const authorEl = document.getElementById("loaderAuthor");

  if (!quoteEl || !authorEl) return;

  quoteEl.textContent = "";
  authorEl.textContent = "";

  let position = 0;

  const typing = setInterval(() => {
    quoteEl.textContent = quote.text.slice(0, position + 1);
    position++;

    if (position >= quote.text.length) {
      clearInterval(typing);
      authorEl.textContent = quote.author;
    }
  }, 65);

  loaderQuoteIndex = (loaderQuoteIndex + 1) % loaderQuotes.length;
}

function hideAppLoader() {
  const loader = document.getElementById("appLoader");
  if (!loader || loader.classList.contains("loader-hidden")) return;

  clearInterval(loaderQuoteTimer);
  clearTimeout(loaderHideTimer);

  const elapsed = Date.now() - loaderStartedAt;
  const minimumDisplay = 1400;

  loaderHideTimer = setTimeout(() => {
    loader.classList.add("loader-hidden");

    setTimeout(() => {
      loader.remove();
    }, 750);
  }, Math.max(0, minimumDisplay - elapsed));
}

writeLoaderQuote();

loaderQuoteTimer = setInterval(() => {
  writeLoaderQuote();
}, 8500);

// किसी असामान्य नेटवर्क समस्या में Loader हमेशा अटका न रहे।
setTimeout(hideAppLoader, 15000);
function init(){
  applyTheme();renderCategoriesForm();renderChips();renderStories();renderProfile();renderLibrary();applyUILanguage();
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.go)));
  document.getElementById("profileShortcut").addEventListener("click",()=>switchTab("profile"));
  document.getElementById("settingsShortcut")?.addEventListener("click",()=>switchTab("settings"));
  document.getElementById("readerAuthorLink")?.addEventListener("click",()=>openAuthorProfile());
  document.getElementById("reportWork")?.addEventListener("click",async()=>{const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;const reason=prompt("समस्या का प्रकार लिखें (आपत्तिजनक/कॉपीराइट/अन्य):");if(!reason)return;const details=prompt("अपनी समस्या अधिकतम 100 शब्दों में लिखें:");if(!details)return;if(wordCount(details)>100){toast("रिपोर्ट अधिकतम 100 शब्दों की हो सकती है।");return;}const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("रिपोर्ट के लिए लॉगिन करें।");return;}const {error}=await supabaseClient.from("content_reports").insert({reporter_id:user.id,target_type:"work",target_work_id:s.id,reason:reason.slice(0,100),details});toast(error?"रिपोर्ट नहीं भेजी: "+error.message:"रिपोर्ट भेज दी गई।");});
  document.getElementById("shareWork")?.addEventListener("click",async()=>{const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;const url=location.href.split("#")[0]+"#work-"+s.id;const share={title:s.title,text:`${s.title} — ${s.author}`,url};if(navigator.share){try{await navigator.share(share);}catch(e){}}else{await navigator.clipboard?.writeText(url);toast("रचना लिंक कॉपी हुई।");}});
  document.getElementById("shareExcerptImage")?.addEventListener("click",shareExcerptAsImage);
  document.getElementById("workLikeButton")?.addEventListener("click",toggleWorkLike);
  document.getElementById("publishCommunityPost")?.addEventListener("click",publishCommunityPost);
  loadCommunityPosts();
  document.getElementById("authShortcut")?.addEventListener("click",()=>document.getElementById("openAuthButton")?.click());
  document.getElementById("avatarUpload")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const url=await uploadSutradharImage(f,"avatars");const {data:{user}}=await supabaseClient.auth.getUser();const {error}=await supabaseClient.from("profiles").update({avatar_url:url}).eq("id",user.id);if(error)throw error;state.profile.avatarUrl=url;saveState();renderProfile();toast("प्रोफ़ाइल DP अपडेट हो गई।");}catch(err){toast("DP अपडेट नहीं हुई: "+err.message);}});
  document.getElementById("readingLanguage")?.addEventListener("change",async e=>{if(!supabaseClient)return;const {data:{user}}=await supabaseClient.auth.getUser();if(user){const {error}=await supabaseClient.from("profiles").update({reading_language:e.target.value}).eq("id",user.id);if(error)toast(error.message);else{state.profile.readingLanguage=e.target.value;saveState();renderStories();toast("पठन भाषा सुरक्षित हुई।");}}});
  document.getElementById("themeToggle").addEventListener("click",toggleTheme);
  document.getElementById("writerSort")?.addEventListener("change",loadHomepageStats);
  renderPreferredCategories();
  document.getElementById("editorToolbar")?.querySelectorAll("[data-format]").forEach(b=>b.addEventListener("click",()=>{const m={bold:["**","**"],italic:["*","*"],highlight:["[[highlight]]","[[/highlight]]"]}[b.dataset.format];wrapEditorSelection(...m);}));
  document.getElementById("applyEditorStyle")?.addEventListener("click",()=>{const font=document.getElementById("editorFont").value,color=document.getElementById("editorColor").value;if(color)wrapEditorSelection(`[[color:${color}]]`,`[[/color]]`);else wrapEditorSelection(`[[font:${font}]]`,`[[/font]]`);});
  document.getElementById("themeToggle2").addEventListener("click",toggleTheme);
  const uiSelect=document.getElementById("layoutLanguage");
  if(uiSelect){uiSelect.value=state.profile.uiLanguage||"hi";uiSelect.addEventListener("change",async()=>{state.profile.uiLanguage=uiSelect.value;saveState();if(supabaseClient){const {data:{user}}=await supabaseClient.auth.getUser();if(user){const {error}=await supabaseClient.from("profiles").update({ui_language:uiSelect.value}).eq("id",user.id);if(error)toast("इस डिवाइस पर भाषा बदली गई, क्लाउड सेव नहीं हुई: "+error.message);}}applyUILanguage();toast("प्रदर्शन भाषा बदल दी गई।");});}
  applyUILanguage();
  document.getElementById("formType").addEventListener("change",()=>{updateSubtypes();saveDraftFromForm();});
 document.getElementById("storyForm").addEventListener("submit",publishStory);
  document.getElementById("saveDraftCloud")?.addEventListener("click",saveCloudDraft);
  document.getElementById("storyTitle").addEventListener("input",saveDraftFromForm);
  document.getElementById("storyBody").addEventListener("input",saveDraftFromForm);
  document.getElementById("formSubType").addEventListener("change",saveDraftFromForm);
  document.getElementById("formCategories").addEventListener("change",saveDraftFromForm);
  document.getElementById("closeWrite").addEventListener("click",()=>document.getElementById("writeDialog").close());
  document.getElementById("closeReader").addEventListener("click",()=>document.getElementById("readerDialog").close());
  document.getElementById("readerPrevPage")?.addEventListener("click",()=>readerGoPage(readerPageIndex-1,"prev"));
  document.getElementById("readerNextPage")?.addEventListener("click",()=>readerGoPage(readerPageIndex+1,"next"));
  document.getElementById("readerBody")?.addEventListener("scroll",()=>{readerPageMetrics();recordReaderPage(readerPageIndex);},{passive:true});
  document.getElementById("readerFontSize")?.addEventListener("input",e=>{document.getElementById("readerBody").style.fontSize=e.target.value+"px";requestAnimationFrame(readerPageMetrics);});
  document.getElementById("readerBody")?.addEventListener("touchstart",e=>{window.__readerTouchX=e.changedTouches[0].clientX;},{passive:true});
  document.getElementById("readerBody")?.addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-(window.__readerTouchX||e.changedTouches[0].clientX);if(Math.abs(dx)>55)readerGoPage(readerPageIndex+(dx<0?1:-1),dx<0?"next":"prev");},{passive:true});

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
  // साहित्य सूत्रधार PWA Service Worker
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(registration => {
          console.log("साहित्य सूत्रधार PWA तैयार है।", registration.scope);
        })
        .catch(error => {
          console.error("PWA Service Worker रजिस्टर नहीं हुआ:", error);
        });
    });
  }
}
function openWorkFromHash(){
  const match=location.hash.match(/^#work-(.+)$/);if(!match)return;
  const id=decodeURIComponent(match[1]);if(state.stories.some(x=>String(x.id)===String(id)))openReader(id);
}
function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme();}
init();
/* साहित्य सूत्रधार: Supabase लॉगिन */

(function setupSahityaSutradharAuth() {
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
  try {
    const version = ++authSyncVersion;
    const nextId = sessionUser?.id || null;

    if (currentUserId !== nextId) switchAccountState(nextId);

    if (!nextId) {
      state = emptyAccountState();
      currentUserId = null;
      saveState();
      renderProfile();
      renderStories();
      renderLibrary();
      await loadCloudWorks();
      await loadCommunityPosts();
      openWorkFromHash();
      return;
    }

    // खाते की प्रोफ़ाइल पहले, फिर उसी खाते की रचनाएँ लोड हों।
    await loadCloudProfile();
    if (version !== authSyncVersion) return;

    await loadCloudWorks();
    if (version !== authSyncVersion) return;

    renderProfile();
    await loadCommunityPosts();
    openWorkFromHash();

  } catch (error) {
    console.error("शुरुआती डेटा लोड नहीं हुआ:", error);
  } finally {
    hideAppLoader();
  }
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

