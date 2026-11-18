/* सूत्रधार: एडमिन-नियंत्रित लेखक पुस्तक PDF */
(function(){
  const BUCKET="author-books";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function mount(profileRoot,targetAuthorId,user){
    const client=window.supabaseClient;
    if(!client||!user)return;
    const {data:admin,error:adminError}=await client.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
    const {data:books,error:booksError}=await client.from("author_profile_books").select("id,title,object_path,created_at").eq("author_id",targetAuthorId).order("created_at",{ascending:false});
    if(booksError){console.warn("Author books:",booksError.message);return;}
    const section=document.createElement("section");
    section.className="ss-admin-books";
    section.innerHTML=`<h3>लेखक की पुस्तकें</h3><div class="ss-author-book-list">${(books||[]).map(b=>`<div class="ss-admin-book-item"><span>${esc(b.title)}</span><button type="button" data-open-book="${esc(b.id)}">PDF पढ़ें</button></div>`).join("")||'<p class="muted">अभी कोई पुस्तक PDF उपलब्ध नहीं है।</p>'}</div>`;
    if(!adminError&&admin){
      section.insertAdjacentHTML("beforeend",`<form id="ss-admin-book-form"><label>इस लेखक की प्रोफ़ाइल पर पुस्तक PDF जोड़ें</label><input name="title" maxlength="160" placeholder="पुस्तक का शीर्षक" required><input name="pdf" type="file" accept="application/pdf,.pdf" required><button class="primary-button" type="submit">PDF अपलोड करें</button><small class="muted">यह सुविधा केवल अधिकृत एडमिन के लिए है।</small></form>`);
    }
    const bio=profileRoot.querySelector(".profile-bio");
    (bio||profileRoot.querySelector(".author-profile-inner"))?.after(section);
    section.querySelectorAll("[data-open-book]").forEach(btn=>btn.addEventListener("click",async()=>{
      const book=(books||[]).find(x=>x.id===btn.dataset.openBook);if(!book)return;
      const {data,error}=await client.storage.from(BUCKET).createSignedUrl(book.object_path,300);
      if(error||!data?.signedUrl){alert("PDF अभी नहीं खुल सकी।");return;}
      const viewer="protected-pdf-viewer.html?src="+encodeURIComponent(data.signedUrl)+"&u="+encodeURIComponent(user.id);
      window.open(viewer,"_blank","noopener,noreferrer");
    }));
    section.querySelector("#ss-admin-book-form")?.addEventListener("submit",async e=>{
      e.preventDefault();
      const form=e.currentTarget,file=form.pdf.files?.[0],title=form.title.value.trim();
      if(!file||file.type!=="application/pdf"||file.size>50*1024*1024){alert("केवल 50 MB तक की PDF चुनें।");return;}
      const btn=form.querySelector("button");btn.disabled=true;btn.textContent="अपलोड हो रहा है…";
      const path=`${targetAuthorId}/${crypto.randomUUID()}.pdf`;
      const up=await client.storage.from(BUCKET).upload(path,file,{contentType:"application/pdf",upsert:false});
      if(up.error){alert("अपलोड असफल: "+up.error.message);btn.disabled=false;btn.textContent="PDF अपलोड करें";return;}
      const ins=await client.from("author_profile_books").insert({author_id:targetAuthorId,title,object_path:path,uploaded_by:user.id});
      if(ins.error){await client.storage.from(BUCKET).remove([path]);alert("रिकॉर्ड सुरक्षित नहीं हुआ: "+ins.error.message);btn.disabled=false;btn.textContent="PDF अपलोड करें";return;}
      alert("पुस्तक PDF लेखक की प्रोफ़ाइल पर जोड़ दी गई।");profileRoot.querySelector("#authorClose")?.click();
      if(typeof window.openAuthorProfile==="function") await window.openAuthorProfile(targetAuthorId);
    });
  }
  window.SutradharAdminBooks={mount};
})();
