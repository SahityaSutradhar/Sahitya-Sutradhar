(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const workId = new URLSearchParams(location.search).get("id");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const words = value => String(value || "").trim().split(/\s+/).filter(Boolean);
  let work=null,user=null,pages=[],pageIndex=0,saveTimer=null,toastTimer=null,liked=false;
  const toast = message => { $("readerToast").textContent=message; $("readerToast").classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$("readerToast").classList.remove("show"),2600); };
  const showState = message => { $("readerState").hidden=false; $("readerState").textContent=message; $("readerArticle").hidden=true; };
  const setProgress = () => { const pct=pages.length?Math.round((pageIndex+1)/pages.length*100):0; $("readerProgressBar").style.width=pct+"%"; $("readerProgressText").textContent=pct+"% पढ़ा"; };
  function makePages(content) {
    const paragraphs=String(content||"").replace(/\r/g,"").split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
    const chunks=[]; let current=[],count=0; const maxWords=230;
    for(const paragraph of paragraphs.length?paragraphs:[String(content||"")]) {
      const pWords=words(paragraph);
      if(count && count+pWords.length>maxWords){chunks.push(current);current=[];count=0;}
      if(pWords.length>maxWords){
        for(let i=0;i<pWords.length;i+=maxWords){const part=pWords.slice(i,i+maxWords).join(" ");if(count){chunks.push(current);current=[];count=0;}chunks.push([part]);}
      } else {current.push(paragraph);count+=pWords.length;}
    }
    if(current.length)chunks.push(current);
    return chunks.length?chunks:[["इस रचना में अभी पाठ उपलब्ध नहीं है।"]];
  }
  function renderPage(index, direction="next") {
    pageIndex=Math.max(0,Math.min(pages.length-1,index));
    $("readerPages").innerHTML=`<div class="reader-page-card ${direction==="prev"?"flip-in-prev":"flip-in-next"}">${pages[pageIndex].map(p=>`<p>${esc(p)}</p>`).join("")}</div>`;
    $("pageNumber").textContent=`पृष्ठ ${pageIndex+1} / ${pages.length}`;
    $("prevPage").disabled=pageIndex===0; $("nextPage").disabled=pageIndex>=pages.length-1;
    setProgress(); scheduleProgress();
  }
  async function saveProgress() {
    if(!work||!user||!client)return;
    const position=Math.round((pageIndex+1)/Math.max(1,pages.length)*10000);
    const payload={user_id:user.id,work_id:work.id,last_position:position,estimated_words_read:Math.round(words(work.content).length*position/10000),updated_at:new Date().toISOString()};
    const {error}=await client.from("reading_progress").upsert(payload,{onConflict:"user_id,work_id"});
    if(error) console.warn("पठन-प्रगति सेव नहीं हुई:",error.message);
  }
  function scheduleProgress(){clearTimeout(saveTimer);saveTimer=setTimeout(saveProgress,900);}
  async function loadSeries(){
    if(!work.series_id)return;
    const {data,error}=await client.from("works").select("id,title,part_number").eq("series_id",work.series_id).eq("status","published").order("part_number",{ascending:true});
    if(error||!data?.length)return;
    $("seriesPanel").hidden=false;$("seriesTitle").textContent=work.series_title||"धारावाहिक के भाग";
    $("seriesLinks").className="series-links";
    $("seriesLinks").innerHTML=data.map(x=>`<a class="series-link ${x.id===work.id?"current":""}" href="mobile-reader.html?id=${encodeURIComponent(x.id)}&v=20261110-global-refresh-4"><span>भाग ${esc(x.part_number||"—")} · ${esc(x.title)}</span><span>${x.id===work.id?"पढ़ रहे हैं":"पढ़ें →"}</span></a>`).join("");
  }
  async function loadLikes(){
    const [{count,error},mine]=await Promise.all([
      client.from("work_likes").select("id",{count:"exact",head:true}).eq("work_id",work.id),
      user?client.from("work_likes").select("id").eq("work_id",work.id).eq("user_id",user.id).maybeSingle():Promise.resolve({data:null})
    ]);
    if(!error)$("workLikeCount").textContent=String(count||0);
    liked=!!mine?.data;$("workLikeButton").dataset.liked=liked?"1":"0";$("workLikeButton").firstChild.textContent=liked?"♥ पसंद किया · ":"♡ पसंद करें · ";
  }
  async function toggleLike(){
    if(!user){toast("पसंद करने के लिए पहले लॉगिन करें।");return;}
    const result=liked?await client.from("work_likes").delete().eq("work_id",work.id).eq("user_id",user.id):await client.from("work_likes").insert({work_id:work.id,user_id:user.id});
    if(result.error){toast("पसंद सुरक्षित नहीं हुई: "+result.error.message);return;}
    await loadLikes();
  }
  async function loadFeedback(){
    const summary=$("ratingSummary"),box=$("reviewsList");
    summary.textContent="रेटिंग और समीक्षाएँ लोड हो रही हैं…";box.innerHTML="";
    const [r,v]=await Promise.all([
      client.from("ratings").select("id,user_id,rating,created_at").eq("work_id",work.id),
      client.from("reviews").select("id,user_id,review_text,created_at,updated_at").eq("work_id",work.id).order("created_at",{ascending:false})
    ]);
    if(r.error||v.error){summary.textContent="प्रतिक्रियाएँ लोड नहीं हो सकीं: "+(r.error||v.error).message;return;}
    const ratings=r.data||[],reviews=v.data||[],avg=ratings.length?ratings.reduce((s,x)=>s+Number(x.rating),0)/ratings.length:0;
    summary.textContent=`★ ${avg?avg.toFixed(1):"—"} / 5 · ${ratings.length} रेटिंग · ${reviews.length} समीक्षाएँ`;
    const mineRating=ratings.find(x=>x.user_id===user?.id),mineReview=reviews.find(x=>x.user_id===user?.id);
    $("ratingInput").value=mineRating?.rating||"";$("reviewInput").value=mineReview?.review_text||"";
    $("deleteMyRating").hidden=!mineRating;$("deleteMyReview").hidden=!mineReview;
    const owner=user?.id===work.author_id;
    $("feedbackForm").hidden=owner||!user;
    if(!user){$("feedbackForm").hidden=false;$("feedbackForm").innerHTML='<p>रेटिंग और समीक्षा देने के लिए <a href="index.html#profileView">लॉगिन करें</a>।</p>';}
    const ids=[...new Set([...ratings.map(x=>x.user_id),...reviews.map(x=>x.user_id)])];
    let profiles=[];if(ids.length){const p=await client.from("profiles").select("id,display_name,username").in("id",ids);profiles=p.data||[];}
    const name=id=>{const p=profiles.find(x=>x.id===id);return p?.display_name||p?.username||"पाठक";};
    const ratingPeople=ratings.map(x=>`<span class="rating-person">${esc(name(x.user_id))} · ${"★".repeat(Number(x.rating))}</span>`).join(" ");
    box.innerHTML=`<div class="rating-people"><b>रेटिंग देने वाले</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div>`;
    for(const review of reviews){
      const article=document.createElement("article");article.className="review-card";article.dataset.reviewId=review.id;
      const head=document.createElement("strong");head.textContent=name(review.user_id);
      const body=document.createElement("p");body.textContent=review.review_text;
      const date=document.createElement("small");date.textContent=new Date(review.created_at).toLocaleDateString("hi-IN");
      const comments=document.createElement("div");comments.className="review-comments";comments.id="reviewComments-"+review.id;comments.textContent="टिप्पणियाँ लोड हो रही हैं…";
      const form=document.createElement("form");form.className="review-comment-form";form.dataset.reviewComment=review.id;
      form.innerHTML='<input name="comment" maxlength="1500" placeholder="इस समीक्षा पर टिप्पणी करें…" required><button type="submit">भेजें</button>';
      article.append(head,body,date,comments,form);box.append(article);await loadReviewComments(review.id,comments);
    }
    if(!reviews.length)box.insertAdjacentHTML("beforeend","<p>अभी कोई समीक्षा नहीं है।</p>");
  }
  async function loadReviewComments(reviewId,box){
    const {data,error}=await client.from("comments").select("id,user_id,comment_text,created_at").eq("review_id",reviewId).eq("work_id",work.id).order("created_at");
    if(error){box.textContent="टिप्पणियाँ लोड नहीं हो सकीं।";return;}
    if(!data?.length){box.textContent="अभी कोई टिप्पणी नहीं।";return;}
    const ids=[...new Set(data.map(x=>x.user_id))],p=ids.length?await client.from("profiles").select("id,display_name,username").in("id",ids):{data:[]};
    box.innerHTML=data.map(c=>{const who=(p.data||[]).find(x=>x.id===c.user_id);return `<p class="review-comment"><b>${esc(who?.display_name||who?.username||"पाठक")}:</b> ${esc(c.comment_text)}</p>`;}).join("");
  }
  async function submitFeedback(){
    if(!user){toast("रेटिंग या समीक्षा के लिए लॉगिन करें।");return;}
    if(user.id===work.author_id){toast("रचनाकार अपनी रचना को रेटिंग या समीक्षा नहीं दे सकता।");return;}
    const rating=Number($("ratingInput").value),review=$("reviewInput").value.trim();
    if(!rating&&!review){toast("रेटिंग चुनें या समीक्षा लिखें।");return;}
    if(rating){const q=await client.from("ratings").upsert({user_id:user.id,work_id:work.id,rating},{onConflict:"user_id,work_id"});if(q.error){toast("रेटिंग सुरक्षित नहीं हुई: "+q.error.message);return;}}
    if(review){const q=await client.from("reviews").upsert({user_id:user.id,work_id:work.id,review_text:review},{onConflict:"user_id,work_id"});if(q.error){toast("समीक्षा सुरक्षित नहीं हुई: "+q.error.message);return;}}
    toast("आपकी प्रतिक्रिया सुरक्षित हो गई।");await loadFeedback();
  }
  async function deleteFeedback(type){
    if(!user)return;
    if(!confirm(`क्या अपनी ${type==="rating"?"रेटिंग":"समीक्षा"} हटानी है?`))return;
    const table=type==="rating"?"ratings":"reviews";
    const {error}=await client.from(table).delete().eq("work_id",work.id).eq("user_id",user.id);
    if(error){toast("हटाया नहीं जा सका: "+error.message);return;}
    toast("आपकी प्रतिक्रिया हटा दी गई।");await loadFeedback();
  }
  async function submitReviewComment(form){
    if(!user){toast("टिप्पणी करने के लिए लॉगिन करें।");return;}
    const value=form.elements.comment.value.trim();if(!value)return;
    const {error}=await client.from("comments").insert({user_id:user.id,work_id:work.id,review_id:Number(form.dataset.reviewComment),comment_text:value});
    if(error){toast("टिप्पणी सुरक्षित नहीं हुई: "+error.message);return;}
    form.reset();const box=form.previousElementSibling;await loadReviewComments(Number(form.dataset.reviewComment),box);toast("टिप्पणी प्रकाशित हो गई।");
  }
  async function load(){
    if(!workId)return showState("रचना का लिंक अधूरा है। मोबाइल होम पर लौटें।");
    if(!client)return showState("Supabase कनेक्शन उपलब्ध नहीं है।");
    try{
      const auth=await client.auth.getUser();user=auth.data?.user||null;
      const {data,error}=await client.from("works").select("id,author_id,title,content,cover_url,main_form,work_type,subtype,content_language,series_id,series_title,part_number,status").eq("id",workId).eq("status","published").maybeSingle();
      if(error)throw error;if(!data)return showState("यह रचना उपलब्ध नहीं है या प्रकाशित नहीं है。");
      work=data;
      const profile=await client.from("profiles").select("display_name,username").eq("id",work.author_id).maybeSingle();
      $("readerTitle").textContent=work.title||"शीर्षक रहित रचना";
      $("readerAuthor").textContent="रचनाकार: "+(profile.data?.display_name||profile.data?.username||"अनाम लेखक");
      $("readerType").textContent=[work.main_form||work.work_type,work.subtype,work.content_language].filter(Boolean).join(" · ");
      $("readerMeta").textContent=`${words(work.content).length} शब्द · लगभग ${Math.max(1,Math.ceil(words(work.content).length/180))} मिनट`;
      if(work.cover_url){$("readerCover").src=work.cover_url;$("readerCoverWrap").hidden=false;}
      pages=makePages(work.content);$("readerState").hidden=true;$("readerArticle").hidden=false;
      renderPage(0);
      if(user){
        const q=await client.from("reading_progress").select("last_position").eq("user_id",user.id).eq("work_id",work.id).maybeSingle();
        if(!q.error&&q.data?.last_position>0){const restored=Math.max(0,Math.min(pages.length-1,Math.ceil(q.data.last_position/10000*pages.length)-1));renderPage(restored);}
      }
      await Promise.all([loadSeries(),loadLikes(),loadFeedback()]);
    }catch(error){console.error("मोबाइल रीडर:",error);showState("रचना लोड नहीं हो सकी: "+error.message);}
  }
  $("prevPage").addEventListener("click",()=>renderPage(pageIndex-1,"prev"));
  $("nextPage").addEventListener("click",()=>renderPage(pageIndex+1,"next"));
  let touchX=0;
  $("readerPages").addEventListener("touchstart",e=>{touchX=e.changedTouches[0].clientX;},{passive:true});
  $("readerPages").addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>55)renderPage(pageIndex+(dx<0?1:-1),dx<0?"next":"prev");},{passive:true});
  $("readerTextSettings").addEventListener("click",()=>$("readerSettings").hidden=!$("readerSettings").hidden);
  $("fontSizeControl").addEventListener("input",e=>{document.querySelectorAll(".reader-page-card").forEach(x=>x.style.fontSize=e.target.value+"px");});
  $("lineHeightControl").addEventListener("input",e=>{document.querySelectorAll(".reader-page-card").forEach(x=>x.style.lineHeight=String(e.target.value/10));});
  $("submitFeedback").addEventListener("click",submitFeedback);
  $("deleteMyRating").addEventListener("click",()=>deleteFeedback("rating"));
  $("deleteMyReview").addEventListener("click",()=>deleteFeedback("review"));
  $("reviewsList").addEventListener("submit",e=>{if(e.target.matches("[data-review-comment]")){e.preventDefault();submitReviewComment(e.target);}});
  $("workLikeButton").addEventListener("click",toggleLike);
  $("readerShare").addEventListener("click",async()=>{if(navigator.share){try{await navigator.share({title:work?.title||"साहित्य सूत्रधार",url:location.href});}catch(_){}}else{await navigator.clipboard?.writeText(location.href);toast("लिंक कॉपी हो गया।");}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)saveProgress();});
  window.addEventListener("pagehide",()=>{if(work&&user)saveProgress();});
  load();
})();