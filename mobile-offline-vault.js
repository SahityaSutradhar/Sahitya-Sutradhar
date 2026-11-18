/* सूत्रधार ऐप ऑफलाइन वॉल्ट: AES-GCM encrypted IndexedDB; installed app only */
(function(){
  const installed=()=>window.matchMedia?.("(display-mode: standalone)").matches||window.navigator.standalone===true||!!window.Capacitor?.isNativePlatform?.();
  if(!installed())return;
  const DB="sutradhar-offline-vault",STORE="items",KEY_ID="device-aes-key";
  let dbPromise;
  function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
  async function tx(mode,fn){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,mode),s=t.objectStore(STORE),r=fn(s);t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error);});}
  async function getKey(){
    const d=await db();let k=await new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readonly"),r=t.objectStore(STORE).get(KEY_ID);r.onsuccess=()=>resolve(r.result?.key);r.onerror=()=>reject(r.error);});
    if(!k){k=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);await tx("readwrite",s=>s.put({id:KEY_ID,key:k,kind:"key"}));}
    return k;
  }
  async function seal(value){
    const key=await getKey(),iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify(value));
    const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
    return {iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))};
  }
  async function open(item){
    const key=await getKey(),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(item.iv)},key,new Uint8Array(item.cipher));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function save(type,payload){
    const sealed=await seal(payload),id=type+":"+String(payload.id||payload.requestId||Date.now());
    await tx("readwrite",s=>s.put({id,type,...sealed,savedAt:Date.now()}));return id;
  }
  async function all(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE,"readonly").objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result.filter(x=>x.kind!=="key"));r.onerror=()=>reject(r.error);});}
  function addButton(parent,id,label,fn){if(!parent||parent.querySelector("#"+id))return;const b=document.createElement("button");b.id=id;b.type="button";b.className="secondary-button";b.textContent=label;b.addEventListener("click",fn);parent.appendChild(b);}
  function ensureReader(){
    const page=document.querySelector("#readerDialog .reader-page");if(!page)return;
    addButton(page,"ss-save-work-offline","⬇ इस रचना को ऑफलाइन सहेजें",async()=>{
      const detail=window.__ssCurrentReader;if(!detail){alert("रचना का डेटा उपलब्ध नहीं है।");return;}
      try{await save("work",detail);alert("रचना इस ऐप में एन्क्रिप्ट करके सुरक्षित कर दी गई।");}catch(e){alert("ऑफलाइन सेव नहीं हुआ: "+e.message);}
    });
  }
  async function showVault(){
    let panel=document.getElementById("ss-offline-vault");if(!panel){panel=document.createElement("section");panel.id="ss-offline-vault";panel.className="ss-offline-library";panel.innerHTML='<button id="ss-vault-close" class="secondary-button">← वापस</button><h2>मेरी ऑफलाइन सामग्री</h2><div id="ss-vault-list"></div>';document.body.appendChild(panel);panel.querySelector("#ss-vault-close").onclick=()=>panel.remove();}
    const box=panel.querySelector("#ss-vault-list");box.textContent="लोड हो रहा है…";
    const rows=await all();box.innerHTML="";
    for(const row of rows){
      try{const data=await open(row),el=document.createElement("article");el.className="ss-offline-entry";
        const title=document.createElement("h3");title.textContent=row.type==="work"?data.title:"पुराने संदेश";
        const info=document.createElement("p");info.textContent=row.type==="work"?(data.author||"लेखक"):`${(data.messages||[]).length} संदेश`;
        const view=document.createElement("button");view.textContent="पढ़ें";view.className="secondary-button";
        view.onclick=()=>{const detail=document.createElement("div");detail.className="ss-offline-entry";detail.innerHTML='<button class="secondary-button">बंद करें</button>';detail.firstChild.onclick=()=>detail.remove();const h=document.createElement("h2");h.textContent=row.type==="work"?data.title:"पुराने संदेश";const content=document.createElement("div");content.style.whiteSpace="pre-wrap";content.textContent=row.type==="work"?data.body:(data.messages||[]).map(m=>`${new Date(m.created_at).toLocaleString("hi-IN")} · ${m.sender_id===window.__ssUserId?"आप":"अन्य"}\n${m.message_text}`).join("\n\n");detail.append(h,content);panel.appendChild(detail);};
        const del=document.createElement("button");del.textContent="हटाएँ";del.className="secondary-button";del.onclick=async()=>{await tx("readwrite",s=>s.delete(row.id));el.remove();};
        el.append(title,info,view,del);box.appendChild(el);
      }catch(e){console.warn("Offline vault item could not decrypt",e);}
    }
    if(!rows.length)box.textContent="अभी कोई डाउनलोड की हुई रचना या संदेश नहीं है।";
  }
  function bindInbox(){
    const list=document.getElementById("inboxMessagesList");if(!list)return;
    const parent=list.parentElement;addButton(parent,"ss-save-inbox-offline","✉ पुराने संदेश ऑफलाइन सहेजें",async()=>{
      const data=window.__ssInboxSnapshot;if(!data?.messages?.length){alert("पहले कोई گفتگو खोलें ताकि संदेश लोड हों।");return;}
      try{await save("messages",data);alert("लोड हुए पुराने संदेश इस ऐप में एन्क्रिप्ट करके सुरक्षित हैं।");}catch(e){alert("संदेश सेव नहीं हुए: "+e.message);}
    });
  }
  function addVaultLauncher(){if(document.getElementById("ss-open-vault"))return;const b=document.createElement("button");b.id="ss-open-vault";b.className="secondary-button";b.textContent="मेरी ऑफलाइन सामग्री";b.style.cssText="position:fixed;right:12px;bottom:94px;z-index:80";b.onclick=showVault;document.body.appendChild(b);}
  window.addEventListener("sutradhar:reader-opened",e=>{window.__ssCurrentReader=e.detail;setTimeout(ensureReader,100);});
  window.addEventListener("sutradhar:inbox-loaded",e=>{window.__ssInboxSnapshot=e.detail;setTimeout(bindInbox,100);});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{addVaultLauncher();bindInbox();},{once:true});else{addVaultLauncher();bindInbox();}
  window.addEventListener("online",()=>{});
})();
