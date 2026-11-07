/* साहित्य सूत्रधार — एडमिन बल्क अपलोड एवं धारावाहिक प्रबंधन
   सभी फाइलें पहले ब्राउज़र में पढ़ी जाती हैं। सार्वजनिक प्रकाशन केवल स्पष्ट अंतिम पुष्टि पर RPC से होता है। */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'g' + Date.now() + Math.random().toString(16).slice(2));
  const SUBTYPES = {
    'गद्य':['कहानी','लघुकथा','उपन्यास','लेख','निबंध','नाटक','संस्मरण','यात्रा वृत्तांत','आत्मकथा','हास्य-व्यंग्य','जीवनी','अन्य'],
    'पद्य':['कविता','गीत','मुक्तक','छंद','नई कविता','अन्य'],
    'चंपू काव्य':['अन्य']
  };
  const LANGS = [['hi','हिंदी'],['sa','संस्कृत'],['en','English'],['mr','मराठी'],['gu','ગુજરાતી'],['pa','ਪੰਜਾਬੀ'],['kn','ಕನ್ನಡ'],['ta','தமிழ்'],['ur','اردو']];
  const LOCAL_KEY = 'sahityaSutradhar.adminBulkDraft.v1';
  let client = null, adminUser = null, categories = [], authors = [], seriesRows = [], queue = [], groups = new Map(), existingWorks = [];

  function message(text, kind='') { const el=$('resultMessage'); if(el){el.textContent=text;el.className=kind;} }
  function progress(text, error=false) { const box=$('extractProgress'); if(!box)return; const row=document.createElement('div');row.className='progress-line'+(error?' error':'');row.textContent=text;box.appendChild(row); }
  function showDenied(text) { $('loadingState')?.classList.add('hidden');$('adminApp')?.classList.add('hidden');$('deniedState')?.classList.remove('hidden');if(text)$('deniedMessage').textContent=text; }
  function setBusy(button,busy,label) { if(!button)return;button.disabled=busy;if(label)button.textContent=label; }
  function normalizeName(s) { return String(s||'').toLocaleLowerCase('hi').replace(/\.[^.]+$/,'').replace(/[\s._-]+/g,' ').replace(/(भाग|पार्ट|part|episode|ep|अध्याय|chapter|खंड|कड़ी|अंक)\s*[०-९0-9ivxlcdm]+/giu,' ').replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d)).replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' '); }
  function getPartNumber(s) { const m=String(s||'').match(/(?:भाग|पार्ट|part|episode|ep|अध्याय|chapter|खंड|कड़ी|अंक)\s*[-_:#.]?\s*([०-९0-9]+)/iu);if(!m)return null;const raw=m[1].replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d));const n=parseInt(raw,10);return Number.isFinite(n)&&n>0?n:null; }
  function guessTitle(fileName, content) {
    const base=String(fileName).replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s*(भाग|पार्ट|part|episode|ep|अध्याय|chapter|खंड|कड़ी|अंक)\s*[-_:#.]?\s*[०-९0-9]+/iu,'').trim();
    const first=String(content||'').split(/\r?\n/).map(x=>x.trim()).find(x=>x.length>=4&&x.length<=110&&!/^([0-9०-९]+|page\s+\d+)$/i.test(x));
    return first && first.length < base.length + 4 ? first.replace(/^#+\s*/,'') : (base || 'शीर्षक रहित रचना');
  }
  function detectLanguage(text) {
    const s=String(text||'');
    if(/[\u0A00-\u0A7F]/.test(s))return 'pa'; if(/[\u0B80-\u0BFF]/.test(s))return 'ta'; if(/[\u0C80-\u0CFF]/.test(s))return 'kn'; if(/[\u0A80-\u0AFF]/.test(s))return 'gu'; if(/[\u0900-\u097F]/.test(s))return 'hi'; if(/[\u0600-\u06FF]/.test(s))return 'ur'; return 'en';
  }
  function detectForm(text) { const s=String(text||'').trim(); const lines=s.split(/\r?\n/).filter(x=>x.trim()); if(lines.length>5){const short=lines.filter(x=>x.trim().length<45).length; if(short/lines.length>.58)return {main_form:'पद्य',subtype:'कविता'};} return {main_form:'गद्य',subtype:'कहानी'}; }
  function workType(main, subtype) { if(main==='पद्य')return 'poem';const m={कहानी:'story',लघुकथा:'story',उपन्यास:'novel',लेख:'article',निबंध:'essay'};return m[subtype]||'other'; }
  function authorOptions(selected) { return authors.map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(a.display_name||a.username||'अनाम लेखक')}</option>`).join(''); }
  function categoryOptions(selected=[]) { return categories.map(c=>`<option value="${esc(c.id)}" ${selected.includes(c.id)?'selected':''}>${esc(c.name)}</option>`).join(''); }
  function languageOptions(selected) { return LANGS.map(([id,label])=>`<option value="${id}" ${selected===id?'selected':''}>${label}</option>`).join(''); }
  function seriesOptions(selected='') { return seriesRows.map(s=>`<option value="${esc(s.id)}" ${s.id===selected?'selected':''}>${esc(s.title)} — ${s.status==='completed'?'पूर्ण':'जारी'}</option>`).join(''); }

  async function readTextFile(file) {
    const ext=file.name.split('.').pop().toLowerCase();
    if(ext==='txt'||ext==='md') return await file.text();
    if(ext==='docx') { if(!window.mammoth)throw new Error('DOCX रीडर लोड नहीं हुआ। इंटरनेट जाँचें।');const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return r.value||''; }
    if(ext==='rtf') { const raw=await file.text();return raw.replace(/\\par[d]?/g,'\n').replace(/\\'[0-9a-f]{2}/gi,' ').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'').replace(/\n{3,}/g,'\n\n'); }
    if(ext==='html'||ext==='htm') { const raw=await file.text();return new DOMParser().parseFromString(raw,'text/html').body?.innerText||''; }
    if(ext==='pdf') return await readPdf(file);
    if(['jpg','jpeg','png','webp'].includes(ext)) return await ocrImage(file);
    throw new Error('यह फाइल प्रारूप समर्थित नहीं है।');
  }
  async function getOcrWorker() {
    if(!window.Tesseract)throw new Error('OCR इंजन लोड नहीं हुआ। इंटरनेट जाँचें।');
    const lang=$('ocrLanguage').value||'hin+eng';
    return await Tesseract.createWorker(lang,1,{logger:m=>{if(m.status==='recognizing text'&&m.progress) $('extractProgress').dataset.ocr=Math.round(m.progress*100)+'%';}});
  }
  async function ocrImage(file) {
    const worker=await getOcrWorker();
    try { const result=await worker.recognize(file);return result.data.text||''; } finally { await worker.terminate(); }
  }
  async function readPdf(file) {
    if(!window.pdfjsLib)throw new Error('PDF रीडर लोड नहीं हुआ। इंटरनेट जाँचें।');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    if(pdf.numPages>100)throw new Error('PDF में 100 से अधिक पृष्ठ हैं; इसे छोटे भागों में बाँटें।');
    let worker=null, parts=[];
    try {
      for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
        const page=await pdf.getPage(pageNo);const textContent=await page.getTextContent();
        let text=textContent.items.map(x=>x.str||'').join(' ').replace(/[ \t]+/g,' ').trim();
        if(text.length<35){
          if(!worker)worker=await getOcrWorker();
          const viewport=page.getViewport({scale:1.7});const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          await page.render({canvasContext:ctx,viewport}).promise;const ocr=await worker.recognize(canvas);text=ocr.data.text||'';canvas.width=canvas.height=1;
        }
        if(text)parts.push(`\n\n[पृष्ठ ${pageNo}]\n${text}`);
        progress(`PDF: ${pageNo}/${pdf.numPages} पृष्ठ पढ़े।`);
      }
    } finally { if(worker)await worker.terminate(); }
    return parts.join('\n').trim();
  }

  async function extractFiles(files) {
    const btn=$('extractBtn');setBusy(btn,true,'टेक्स्ट निकाला जा रहा है…');$('extractProgress').innerHTML='';
    let done=0;
    for(const file of files){
      try{
        if(file.size>50*1024*1024)throw new Error('फाइल 50 MB से बड़ी है।');
        const content=(await readTextFile(file)).replace(/\u0000/g,'').trim();
        if(content.length<3)throw new Error('पढ़ने योग्य टेक्स्ट नहीं मिला। स्कैन स्पष्ट है या OCR भाषा सही है, जाँचें।');
        const title=guessTitle(file.name,content),part=getPartNumber(file.name)||getPartNumber(content.slice(0,500));
        const form=detectForm(content);
        queue.push({id:uid(),fileName:file.name,title,content,authorId:adminUser.id,mainForm:form.main_form,subtype:form.subtype,language:detectLanguage(content),categoryIds:[],seriesKey:null,partNumber:part||1,coverFile:null,selected:true,originalSize:file.size});
        progress(`✓ ${file.name} — ${content.length.toLocaleString('hi-IN')} अक्षर निकाले।`);
      }catch(err){progress(`✕ ${file.name}: ${err.message||err}`,true);}
      done++;$('fileCount').textContent=`${done}/${files.length} फाइलें पढ़ीं`;
    }
    setBusy(btn,false,'टेक्स्ट निकालें');renderQueue();renderSuggestions();
    $('autoGroupBtn').disabled=queue.length<2;$('createManualGroup').disabled=queue.length<1;$('addToExistingSeries').disabled=!queue.length;
    updateSummary();
  }

  function detectGroups() {
    const buckets=new Map();
    queue.forEach(item=>{const part=getPartNumber(item.fileName)||item.partNumber;const base=normalizeName(item.fileName);if(!base)return;const key=base;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({...item,detectedPart:part});});
    const suggestions=[];
    for(const [base,items] of buckets){if(items.length<2)continue;const sorted=items.sort((a,b)=>(a.detectedPart||9999)-(b.detectedPart||9999));suggestions.push({base,items:sorted,score:Math.min(98,70+items.length*5)});}
    // समान आरंभिक शीर्षक के आधार पर दूसरा, कमजोर संकेत; यह केवल सुझाव है।
    const byTitle=new Map();queue.forEach(item=>{const line=(item.content.split(/\r?\n/).map(x=>x.trim()).find(x=>x.length>5&&x.length<70)||'').toLocaleLowerCase('hi');if(line){if(!byTitle.has(line))byTitle.set(line,[]);byTitle.get(line).push(item);}});
    for(const [title,items] of byTitle){if(items.length>1&&!suggestions.some(s=>s.items.some(x=>x.id===items[0].id)))suggestions.push({base:title,items,score:55});}
    return suggestions;
  }
  function renderSuggestions(){const box=$('suggestions');const suggestions=detectGroups();if(!suggestions.length){box.className='suggestions empty-state';box.textContent='फाइल नाम/शीर्षक में समान धारावाहिक संकेत नहीं मिले। चाहें तो मैन्युअल रूप से फाइलें चुनकर समूह बनाएँ।';return;}box.className='suggestions';box.innerHTML=suggestions.map((s,i)=>`<article class="suggestion"><div class="suggestion-head"><strong>${esc(s.items.length)} संभावित भाग · ${esc(s.base)}</strong><span class="pill">विश्वास संकेत ${s.score}%</span></div><p class="hint">${s.items.map(x=>esc(x.fileName)).join(' · ')}</p><button class="secondary" type="button" data-use-suggestion="${i}">इस समूह को धारावाहिक सुझाव के रूप में अपनाएँ</button></article>`).join('');box._suggestions=suggestions;}

  function selectedQueue(){return queue.filter(x=>x.selected);}
  function createGroup(items, existingSeries=null, title=''){
    if(items.length<1){alert('कम-से-कम एक भाग चुनें।');return;}
    if(existingSeries)items.forEach(item=>{item.authorId=existingSeries.author_id;});
    const authorIds=[...new Set(items.map(x=>x.authorId))];if(authorIds.length!==1){alert('एक धारावाहिक के सभी भागों का लेखक समान होना चाहिए। पहले प्रत्येक भाग का लेखक एक जैसा चुनें।');return;}
    const key=uid();const group={key,title:title||existingSeries?.title||items[0].title.replace(/\s*(भाग|पार्ट|part|episode|अध्याय|chapter)\s*[-_:#.]?\s*[०-९0-9]+/iu,'').trim(),description:'',authorId:authorIds[0],status:existingSeries?.status||'ongoing',existingSeriesId:existingSeries?.id||null,coverFile:null,itemIds:items.map(x=>x.id),startPartNumber:1};
    const lastExistingPart=existingSeries?existingWorks.filter(w=>w.series_id===existingSeries.id).reduce((max,w)=>Math.max(max,Number(w.part_number)||0),0):0;group.startPartNumber=lastExistingPart+1;
    groups.set(key,group);items.sort((a,b)=>(a.partNumber||9999)-(b.partNumber||9999)).forEach((item,i)=>{item.seriesKey=key;item.partNumber=existingSeries?lastExistingPart+i+1:(item.partNumber||i+1);});
    renderQueue();renderSuggestions();updateSummary();
  }
  function detachQueueItem(id){const item=queue.find(x=>x.id===id);if(!item)return;const key=item.seriesKey;item.seriesKey=null;item.partNumber=1;if(key&&groups.has(key)){const g=groups.get(key);g.itemIds=g.itemIds.filter(x=>x!==id);if(!g.itemIds.length)groups.delete(key);}renderQueue();renderSuggestions();updateSummary();}
  function moveQueuePart(id,delta){const item=queue.find(x=>x.id===id);const group=item&&groups.get(item.seriesKey);if(!group)return;const i=group.itemIds.indexOf(id),j=i+delta;if(j<0||j>=group.itemIds.length)return;[group.itemIds[i],group.itemIds[j]]=[group.itemIds[j],group.itemIds[i]];group.itemIds.forEach((workId,index)=>{const w=queue.find(x=>x.id===workId);if(w)w.partNumber=(group.startPartNumber||1)+index;});renderQueue();updateSummary();}

  function renderQueue(){
    $('queueCount').textContent=`${queue.length} रचनाएँ`;
    if(!queue.length){$('queueList').className='queue-list empty-state';$('queueList').textContent='फाइलें चुनने के बाद यहाँ प्रत्येक रचना संपादित कर सकेंगे।';return;}
    const groupHtml=[...groups.values()].map(g=>{const parts=g.itemIds.map((id,i)=>{const w=queue.find(x=>x.id===id);return w?`<div class="part-row"><span>${i+1}. ${esc(w.title)}</span><button type="button" data-move-part="${id}" data-delta="-1" aria-label="ऊपर">↑</button><button type="button" data-move-part="${id}" data-delta="1" aria-label="नीचे">↓</button><button type="button" class="danger" data-detach="${id}">अलग करें</button></div>`:'';}).join('');return `<article class="group-card" data-group="${g.key}"><div class="card-head"><strong>धारावाहिक समूह · ${g.itemIds.length} भाग</strong><button type="button" class="danger" data-remove-group="${g.key}">समूह हटाएँ</button></div><div class="queue-grid"><label class="wide">धारावाहिक का नाम<input data-group-field="title" data-group-key="${g.key}" value="${esc(g.title)}"></label><label class="wide">परिचय<textarea data-group-field="description" data-group-key="${g.key}">${esc(g.description)}</textarea></label><label>स्थिति<select data-group-field="status" data-group-key="${g.key}"><option value="ongoing" ${g.status==='ongoing'?'selected':''}>क्रमशः जारी</option><option value="completed" ${g.status==='completed'?'selected':''}>पूर्ण</option></select></label><label>कवर (वैकल्पिक)<input type="file" accept="image/png,image/jpeg,image/webp" data-group-cover="${g.key}"></label></div>${g.existingSeriesId?'<p class="group-tag">मौजूदा धारावाहिक में नए भाग</p>':''}<div>${parts}</div></article>`;}).join('');
    const itemHtml=queue.map(item=>{const group=groups.get(item.seriesKey);return `<article class="queue-card"><div class="card-head"><label class="checkline"><input type="checkbox" data-item-selected="${item.id}" ${item.selected?'checked':''}><span class="queue-title">${esc(item.title)}</span></label><span class="queue-meta">${esc(item.fileName)}</span></div>${group?`<span class="group-tag">${esc(group.title)} · भाग ${item.partNumber}</span>`:'<span class="queue-meta">स्वतंत्र रचना</span>'}<div class="queue-grid"><label>शीर्षक<input data-item-field="title" data-item-id="${item.id}" value="${esc(item.title)}"></label><label>लेखक<select data-item-field="authorId" data-item-id="${item.id}">${authorOptions(item.authorId)}</select></label><label>रचना का रूप<select data-item-field="mainForm" data-item-id="${item.id}">${['गद्य','पद्य','चंपू काव्य'].map(x=>`<option ${item.mainForm===x?'selected':''}>${x}</option>`).join('')}</select></label><label>उपप्रकार<select data-item-field="subtype" data-item-id="${item.id}">${(SUBTYPES[item.mainForm]||SUBTYPES['गद्य']).map(x=>`<option ${item.subtype===x?'selected':''}>${x}</option>`).join('')}</select></label><label>भाषा<select data-item-field="language" data-item-id="${item.id}">${languageOptions(item.language)}</select></label><label>कवर (वैकल्पिक)<input type="file" accept="image/png,image/jpeg,image/webp" data-item-cover="${item.id}"></label><label class="wide">श्रेणियाँ (अधिकतम 4; Ctrl/बहु-चयन)<select multiple size="4" data-item-categories="${item.id}">${categoryOptions(item.categoryIds)}</select></label><label class="wide">पूरा टेक्स्ट<textarea data-item-field="content" data-item-id="${item.id}">${esc(item.content)}</textarea></label></div><div class="queue-meta">${item.content.length.toLocaleString('hi-IN')} अक्षर · ${item.content.trim().split(/\s+/).filter(Boolean).length.toLocaleString('hi-IN')} शब्द</div><details class="full-preview"><summary>पूरा पूर्वावलोकन देखें</summary><h3>${esc(item.title)}</h3><p>${esc(authors.find(a=>a.id===item.authorId)?.display_name||'अनाम लेखक')}</p><pre>${esc(item.content)}</pre></details><button type="button" class="danger" data-remove-item="${item.id}">इस फाइल को कतार से हटाएँ</button></article>`;}).join('');
    $('queueList').className='queue-list';$('queueList').innerHTML=groupHtml+itemHtml;
  }

  function updateSummary(){const count=queue.length;const ready=queue.filter(x=>x.title.trim()&&x.content.trim()&&x.authorId&&x.categoryIds.length>=1&&x.categoryIds.length<=4).length;$('readyCount').textContent=`${ready}/${count} तैयार`;$('publishAllBtn').disabled=!count||ready!==count;$('saveLocalDraft').disabled=!count;$('autoGroupBtn').disabled=count<2;$('createManualGroup').disabled=selectedQueue().length<1;$('addToExistingSeries').disabled=!selectedQueue().length;$('previewSummary').textContent=count?`${count} रचनाएँ कतार में हैं। ${groups.size} धारावाहिक समूह। ${ready} रचनाएँ आवश्यक विवरणों सहित तैयार।\nप्रकाशन से पहले हर पाठ, लेखक, श्रेणी और भाग क्रम की जाँच करें।`:'अभी कोई रचना तैयार नहीं है।';}

  async function uploadCover(file){if(!file)return null;if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('कवर केवल JPG, PNG या WebP हो सकता है।');if(file.size>8*1024*1024)throw new Error('कवर 8 MB से छोटा होना चाहिए।');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${adminUser.id}/admin-bulk/${Date.now()}-${uid()}.${ext}`;const {error}=await client.storage.from('sutradhar-media').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return client.storage.from('sutradhar-media').getPublicUrl(path).data.publicUrl;}
  function seriesPayloadForItems(items,coverUrls){const series=[];for(const g of groups.values()){const members=g.itemIds.map(id=>queue.find(x=>x.id===id)).filter(Boolean).filter(x=>items.some(i=>i.id===x.id));if(!members.length)continue;series.push({key:g.key,title:g.title,description:g.description,author_id:g.authorId,status:g.status,existing_series_id:g.existingSeriesId||null,cover_url:coverUrls.get('group:'+g.key)||null});}return series;}
  async function publishQueue(){
    const items=queue.filter(x=>x.selected);if(!items.length){message('प्रकाशित करने के लिए कम-से-कम एक रचना चुनें।','error');return;}
    const invalid=items.filter(x=>!x.title.trim()||!x.content.trim()||!x.authorId||x.categoryIds.length<1||x.categoryIds.length>4||!categories.some(c=>x.categoryIds.includes(c.id)));
    if(invalid.length){message(`${invalid.length} रचनाओं में शीर्षक, पाठ, लेखक या 1–4 श्रेणियाँ अधूरी हैं।`,'error');return;}
    const groupKeys=[...new Set(items.map(x=>x.seriesKey).filter(Boolean))];for(const key of groupKeys){const g=groups.get(key);const members=items.filter(x=>x.seriesKey===key);if(!g||!g.title.trim()){message('हर धारावाहिक समूह का नाम लिखें।','error');return;}if(new Set(members.map(x=>x.authorId)).size!==1){message('एक धारावाहिक के सभी भागों का लेखक समान होना चाहिए।','error');return;}if(g.itemIds.some(id=>!items.some(x=>x.id===id))){message('एक धारावाहिक के सभी भाग एक साथ चुनें, या समूह से अलग करें।','error');return;}}
    const confirmText=`आप ${items.length} रचनाएँ सार्वजनिक रूप से प्रकाशित करने जा रहे हैं। ${groupKeys.length} धारावाहिक समूह बनेंगे/अपडेट होंगे। यह कार्रवाई पाठकों को सामग्री दिखाएगी।\n\nक्या आपने सभी रचनाओं का पूर्वावलोकन और अधिकार/अनुमति जाँच ली है?`;
    if(!window.confirm(confirmText))return;
    const btn=$('publishAllBtn');setBusy(btn,true,'प्रकाशित किया जा रहा है…');message('कवर अपलोड और सुरक्षित प्रकाशन प्रक्रिया चल रही है…');
    try{
      const coverUrls=new Map();
      for(const g of groups.values()){if(g.coverFile)coverUrls.set('group:'+g.key,await uploadCover(g.coverFile));}
      for(const item of items){if(item.coverF
