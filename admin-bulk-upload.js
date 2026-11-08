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
  const LOCAL_KEY = 'sahityaSutradhar.adminBulkDraft.v2';
  const MAX_FILES=100, MAX_BATCH_BYTES=500*1024*1024;
  const FILE_LIMITS={pdf:50*1024*1024,docx:25*1024*1024,txt:10*1024*1024,md:10*1024*1024,rtf:10*1024*1024,html:10*1024*1024,htm:10*1024*1024,jpg:8*1024*1024,jpeg:8*1024*1024,png:8*1024*1024,webp:8*1024*1024};
  const FILE_MIMES={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',md:'text/markdown',rtf:'application/rtf',html:'text/html',htm:'text/html',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
  let client = null, adminUser = null, categories = [], authors = [], seriesRows = [], queue = [], groups = new Map(), existingWorks = [], pendingCoverPaths = [];

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
  function categoryOptions(selected=[]) { const chosen=new Set((selected||[]).map(String)); return categories.map(c=>`<option value="${esc(String(c.id))}" ${chosen.has(String(c.id))?'selected':''}>${esc(c.name)}</option>`).join(''); }
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

  function fileExtension(file){return String(file.name.split('.').pop()||'').toLowerCase();}
  function validateBatch(files){if(files.length>MAX_FILES)throw new Error('एक बैच में अधिकतम 100 फाइलें ही चुनें।');const total=files.reduce((n,f)=>n+f.size,0);if(total>MAX_BATCH_BYTES)throw new Error('पूरे बैच का आकार 500 MB से अधिक है।');for(const f of files){const ext=fileExtension(f),limit=FILE_LIMITS[ext];if(!limit)throw new Error(`${f.name}: यह फाइल प्रकार समर्थित नहीं है।`);if(f.size>limit)throw new Error(`${f.name}: ${ext.toUpperCase()} की निर्धारित सीमा ${Math.round(limit/1024/1024)} MB है।`);}return total;}
  async function extractFiles(files) {
    try{validateBatch(files);if(queue.length+files.length>MAX_FILES)throw new Error('एक बैच/कतार में अधिकतम 100 फाइलें ही रखी जा सकती हैं।');const queuedBytes=queue.reduce((n,x)=>n+(Number(x.originalSize)||0),0);if(queuedBytes+files.reduce((n,f)=>n+f.size,0)>MAX_BATCH_BYTES)throw new Error('पूरी कतार का कुल आकार 500 MB से अधिक हो जाएगा।');}catch(err){message(err.message,'error');return;}
    const btn=$('extractBtn');setBusy(btn,true,'टेक्स्ट निकाला जा रहा है…');$('extractProgress').innerHTML='';
    let done=0;
    for(const file of files){
      try{
        const ext=fileExtension(file);if(file.size>(FILE_LIMITS[ext]||0))throw new Error(`${ext.toUpperCase()} फाइल की निर्धारित आकार सीमा से बड़ी है।`);
        const content=(await readTextFile(file)).replace(/\u0000/g,'').trim();
        if(content.length<3)throw new Error('पढ़ने योग्य टेक्स्ट नहीं मिला। स्कैन स्पष्ट है या OCR भाषा सही है, जाँचें।');
        const title=guessTitle(file.name,content),part=getPartNumber(file.name)||getPartNumber(content.slice(0,500));
        const form=detectForm(content);
        queue.push({id:uid(),fileName:file.name,title,content,authorId:adminUser.id,mainForm:form.main_form,subtype:form.subtype,language:detectLanguage(content),categoryIds:[],seriesKey:null,partNumber:part||1,coverFile:null,sourceFile:file,sourceMissing:false,selfDeclarationAccepted:false,selected:true,originalSize:file.size});
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
    const itemHtml=queue.map(item=>{const group=groups.get(item.seriesKey);return `<article class="queue-card"><div class="card-head"><label class="checkline"><input type="checkbox" data-item-selected="${item.id}" ${item.selected?'checked':''}><span class="queue-title">${esc(item.title)}</span></label><span class="queue-meta">${esc(item.fileName)}</span></div>${group?`<span class="group-tag">${esc(group.title)} · भाग ${item.partNumber}</span>`:'<span class="queue-meta">स्वतंत्र रचना</span>'}<div class="queue-grid"><label>शीर्षक<input data-item-field="title" data-item-id="${item.id}" value="${esc(item.title)}"></label><label>लेखक<select data-item-field="authorId" data-item-id="${item.id}">${authorOptions(item.authorId)}</select></label><label>रचना का रूप<select data-item-field="mainForm" data-item-id="${item.id}">${['गद्य','पद्य','चंपू काव्य'].map(x=>`<option ${item.mainForm===x?'selected':''}>${x}</option>`).join('')}</select></label><label>उपप्रकार<select data-item-field="subtype" data-item-id="${item.id}">${(SUBTYPES[item.mainForm]||SUBTYPES['गद्य']).map(x=>`<option ${item.subtype===x?'selected':''}>${x}</option>`).join('')}</select></label><label>भाषा<select data-item-field="language" data-item-id="${item.id}">${languageOptions(item.language)}</select></label><label>कवर (वैकल्पिक)<input type="file" accept="image/png,image/jpeg,image/webp" data-item-cover="${item.id}"></label><label class="wide">श्रेणियाँ (अधिकतम 4; बहु-चयन)<select multiple size="4" data-item-categories="${item.id}">${categoryOptions(item.categoryIds)}</select></label><label class="wide">मूल फाइल ${item.sourceFile?`<small>(${esc(item.fileName)} · ${(item.sourceFile.size/1024/1024).toFixed(2)} MB)</small>`:'<strong class="error">मूल फाइल दोबारा चुनें</strong>'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx,.md,.rtf,.html,.htm" data-item-source="${item.id}"></label><label class="wide checkline"><input type="checkbox" data-item-declaration="${item.id}" ${item.selfDeclarationAccepted?'checked':''}><span>मैंने इस लेखक की अनुमति/स्वामित्व और साहित्यिक सामग्री प्रकाशित करने की स्व-घोषणा की पुष्टि की है।</span></label><label class="wide">पूरा टेक्स्ट<textarea data-item-field="content" data-item-id="${item.id}">${esc(item.content)}</textarea></label></div><div class="queue-meta">${item.content.length.toLocaleString('hi-IN')} अक्षर · ${item.content.trim().split(/\s+/).filter(Boolean).length.toLocaleString('hi-IN')} शब्द</div><details class="full-preview"><summary>पूरा पूर्वावलोकन देखें</summary><h3>${esc(item.title)}</h3><p>${esc(authors.find(a=>a.id===item.authorId)?.display_name||'अनाम लेखक')}</p><pre>${esc(item.content)}</pre></details><button type="button" class="danger" data-remove-item="${item.id}">इस फाइल को कतार से हटाएँ</button></article>`;}).join('');
    $('queueList').className='queue-list';$('queueList').innerHTML=groupHtml+itemHtml;
  }

  function updateSummary(){const count=queue.length,selected=selectedQueue();const ready=selected.filter(x=>x.title.trim()&&x.content.trim()&&x.authorId&&x.categoryIds.length>=1&&x.categoryIds.length<=4&&x.categoryIds.every(id=>categories.some(c=>String(c.id)===String(id)&&c.is_enabled!==false))&&x.selfDeclarationAccepted===true&&!!x.sourceFile).length;$('readyCount').textContent=`${ready}/${selected.length} चुनी हुई तैयार`;$('publishAllBtn').disabled=!selected.length||ready!==selected.length;$('saveLocalDraft').disabled=!count;$('autoGroupBtn').disabled=count<2;$('createManualGroup').disabled=selected.length<2;$('addToExistingSeries').disabled=!selected.length;$('previewSummary').textContent=count?`${count} रचनाएँ कतार में हैं; ${selected.length} चुनी गई हैं। ${groups.size} धारावाहिक समूह। चुनी हुई ${ready} रचनाएँ सभी आवश्यक जाँचों में तैयार हैं।\nप्रकाशन से पहले हर पाठ, लेखक, श्रेणी, मूल फाइल, स्व-घोषणा और भाग क्रम की जाँच करें।`:'अभी कोई रचना तैयार नहीं है।';}

  async function uploadCover(file){if(!file)return null;if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('कवर केवल JPG, PNG या WebP हो सकता है।');if(file.size>8*1024*1024)throw new Error('कवर 8 MB से छोटा होना चाहिए।');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${adminUser.id}/admin-bulk/${Date.now()}-${uid()}.${ext}`;const {error}=await client.storage.from('sutradhar-media').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;pendingCoverPaths.push(path);return client.storage.from('sutradhar-media').getPublicUrl(path).data.publicUrl;}
  async function uploadOriginal(file){
    if(!file)throw new Error('मूल फाइल उपलब्ध नहीं है।');
    const ext=fileExtension(file),limit=FILE_LIMITS[ext];if(!limit||file.size>limit)throw new Error(`${file.name}: फाइल प्रकार/आकार अमान्य है।`);
    const mime=FILE_MIMES[ext]||file.type||'application/octet-stream';
    const safeName=file.name.replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(-90);const path=`${adminUser.id}/bulk-originals/${file.lastModified}-${file.size}-${safeName}`;
    if(!window.tus||!window.SUPABASE_URL)throw new Error('Resumable upload लाइब्रेरी उपलब्ध नहीं है।');
    const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError||!session?.access_token)throw new Error('लॉगिन सत्र उपलब्ध नहीं है।');
    const projectRef=new URL(window.SUPABASE_URL).hostname.split('.')[0];
    await new Promise((resolve,reject)=>{
      const upload=new tus.Upload(file,{endpoint:`https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],removeFingerprintOnSuccess:true,uploadDataDuringCreation:true,headers:{authorization:`Bearer ${session.access_token}`,apikey:window.SUPABASE_ANON_KEY,'x-upsert':'false'},metadata:{bucketName:'sutradhar-originals',objectName:path,contentType:mime,cacheControl:'3600'},onError:reject,onProgress:(sent,total)=>{const pct=Math.round(sent/total*100);message(`${file.name}: सुरक्षित अपलोड ${pct}%`);},onSuccess:resolve});
      upload.findPreviousUploads().then(previous=>{if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(reject);
    });
    return {bucket:'sutradhar-originals',path,file_name:file.name,mime_type:mime,file_size:file.size};
  }
  function seriesPayloadForItems(items,coverUrls){const series=[];for(const g of groups.values()){const members=g.itemIds.map(id=>queue.find(x=>x.id===id)).filter(Boolean).filter(x=>items.some(i=>i.id===x.id));if(!members.length)continue;series.push({key:g.key,title:g.title,description:g.description,author_id:g.authorId,status:g.status,existing_series_id:g.existingSeriesId||null,cover_url:coverUrls.get('group:'+g.key)||null});}return series;}
  async function publishQueue(){
    const items=queue.filter(x=>x.selected);if(!items.length){message('प्रकाशित करने के लिए कम-से-कम एक रचना चुनें।','error');return;}
    const invalid=items.filter(x=>!x.title.trim()||!x.content.trim()||!x.authorId||x.categoryIds.length<1||x.categoryIds.length>4||!x.categoryIds.every(id=>categories.some(c=>String(c.id)===String(id)&&c.is_enabled!==false))||x.selfDeclarationAccepted!==true||!x.sourceFile);
    if(invalid.length){message(`${invalid.length} रचनाओं में शीर्षक, पाठ, लेखक, 1–4 सक्रिय श्रेणियाँ, मूल फाइल या स्व-घोषणा की पुष्टि अधूरी है।`,'error');return;}
    const groupKeys=[...new Set(items.map(x=>x.seriesKey).filter(Boolean))];for(const key of groupKeys){const g=groups.get(key);const members=items.filter(x=>x.seriesKey===key);if(!g||!g.title.trim()){message('हर धारावाहिक समूह का नाम लिखें।','error');return;}if(new Set(members.map(x=>x.authorId)).size!==1){message('एक धारावाहिक के सभी भागों का लेखक समान होना चाहिए।','error');return;}if(g.itemIds.some(id=>!items.some(x=>x.id===id))){message('एक धारावाहिक के सभी भाग एक साथ चुनें, या समूह से अलग करें।','error');return;}}
    const totalBytes=items.reduce((n,x)=>n+(Number(x.originalSize)||0)+(x.coverFile?.size||0),0)+[...groups.values()].reduce((n,g)=>n+(g.coverFile?.size||0),0);if(totalBytes>MAX_BATCH_BYTES){message('मूल फाइलों और चुने हुए कवर सहित बैच 500 MB से बड़ा है।','error');return;}
    const confirmText=`अंतिम प्रकाशन पुष्टि\n\n${items.length} रचनाएँ सार्वजनिक होंगी। ${groupKeys.length} धारावाहिक समूह बनेंगे/अपडेट होंगे। मूल फाइलें निजी संग्रह में रहेंगी।\n\nक्या आपने प्रत्येक लेखक की अनुमति/स्व-घोषणा की पुष्टि की है और सभी रचनाओं का पूर्वावलोकन जाँच लिया है? केवल पुष्टि करने पर ही प्रकाशन होगा।`;
    if(!window.confirm(confirmText))return;
    const btn=$('publishAllBtn');setBusy(btn,true,'प्रकाशित किया जा रहा है…');message('कवर अपलोड और सुरक्षित प्रकाशन प्रक्रिया चल रही है…');
    const uploadedOriginals=[];pendingCoverPaths=[];
    try{
      const coverUrls=new Map(),originalFiles=new Map();
      for(const item of items){const meta=await uploadOriginal(item.sourceFile);originalFiles.set(item.id,meta);uploadedOriginals.push(meta.path);}
      for(const g of groups.values()){if(g.coverFile)coverUrls.set('group:'+g.key,await uploadCover(g.coverFile));}
      for(const item of items){if(item.coverFile)coverUrls.set(item.id,await uploadCover(item.coverFile));}
      const series=seriesPayloadForItems(items,coverUrls);
      const payloadItems=items.map(item=>{const g=groups.get(item.seriesKey);const groupCover=g&&coverUrls.get('group:'+g.key);return {title:item.title.trim(),content:item.content.trim(),author_id:item.authorId,main_form:item.mainForm,subtype:item.subtype,work_type:workType(item.mainForm,item.subtype),content_language:item.language,cover_url:coverUrls.get(item.id)||groupCover||null,categories:item.categoryIds.map(String),series_key:item.seriesKey||null,part_number:item.seriesKey?(item.partNumber||g.itemIds.indexOf(item.id)+1):1,self_declaration_accepted:item.selfDeclarationAccepted,original:originalFiles.get(item.id)};});
      const {data,error}=await client.rpc('admin_bulk_publish',{p_payload:{items:payloadItems,series}});if(error)throw error;
      message(`${data?.published_count||items.length} रचनाएँ सफलतापूर्वक प्रकाशित हुईं।`,'success');pendingCoverPaths=[];
      const publishedIds=new Set(items.map(x=>x.id));queue=queue.filter(x=>!publishedIds.has(x.id));for(const [key,g] of groups){g.itemIds=g.itemIds.filter(id=>!publishedIds.has(id));if(!g.itemIds.length)groups.delete(key);}renderQueue();renderSuggestions();updateSummary();localStorage.removeItem(LOCAL_KEY);await loadExistingWorks();
    }catch(err){if(uploadedOriginals.length){try{await client.storage.from('sutradhar-originals').remove(uploadedOriginals);}catch(_){}}if(pendingCoverPaths.length){try{await client.storage.from('sutradhar-media').remove(pendingCoverPaths);}catch(_){}}pendingCoverPaths=[];message('प्रकाशन पूरा नहीं हुआ: '+(err.message||String(err)),'error');}
    finally{setBusy(btn,false,'समीक्षा के बाद सभी तैयार रचनाएँ प्रकाशित करें');}
  }

  function saveLocalDraft(){const safeQueue=queue.map(x=>({...x,coverFile:null,sourceFile:null,sourceMissing:true}));const safeGroups=[...groups.values()].map(g=>({...g,coverFile:null}));localStorage.setItem(LOCAL_KEY,JSON.stringify({queue:safeQueue,groups:safeGroups,savedAt:new Date().toISOString()}));message('टेक्स्ट, संपादन और समूह इसी डिवाइस में सुरक्षित किए। चुनी गई कवर फाइलें दोबारा चुननी होंगी।','success');}
  function restoreLocalDraft(){try{const data=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');if(!data)return;queue=Array.isArray(data.queue)?data.queue:[];groups=new Map((data.groups||[]).map(g=>[g.key,g]));queue.forEach(x=>{x.coverFile=null;x.sourceFile=null;x.sourceMissing=true;x.selected=true;x.categoryIds=(x.categoryIds||[]).map(String);});renderQueue();renderSuggestions();updateSummary();}catch(_){localStorage.removeItem(LOCAL_KEY);}}

  async function loadExistingWorks(){
    $('existingList').textContent='मौजूदा रचनाएँ लोड हो रही हैं…';
    let data=[],error=null,from=0,page=[];do{const result=await client.from('works').select('id,title,author_id,status,series_id,series_title,part_number,created_at').in('status',['published','draft']).order('created_at',{ascending:false}).range(from,from+499);page=result.data||[];error=result.error;if(error)break;data.push(...page);from+=500;}while(page.length===500);
    if(error){$('existingList').textContent='रचनाएँ लोड नहीं हुईं: '+error.message;return;}
    existingWorks=data||[];const ids=[...new Set(existingWorks.map(x=>x.author_id).filter(Boolean))];const {data:profiles}=ids.length?await client.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'अनाम लेखक']));existingWorks.forEach(w=>w.authorName=names.get(w.author_id)||'अनाम लेखक');renderExistingWorks();
  }
  function renderExistingWorks(){const q=($('existingSearch').value||'').toLocaleLowerCase('hi');const rows=existingWorks.filter(w=>(w.title+' '+w.authorName+' '+(w.series_title||'')).toLocaleLowerCase('hi').includes(q));$('existingList').className='existing-list';$('existingList').innerHTML=rows.map(w=>`<label class="existing-card"><input type="checkbox" data-existing-select="${w.id}"><div><strong>${esc(w.title)}</strong><small class="queue-meta">${esc(w.authorName)} · ${w.status==='draft'?'ड्राफ्ट':'प्रकाशित'} · ${w.series_id?`${esc(w.series_title||'धारावाहिक')} · भाग ${w.part_number||1}`:'स्वतंत्र रचना'}</small></div>${w.series_id?`<button type="button" data-existing-move="${w.id}" data-delta="-1" class="secondary">↑</button><button type="button" data-existing-move="${w.id}" data-delta="1" class="secondary">↓</button>`:''}</label>`).join('')||'<div class="empty-state">कोई रचना नहीं मिली।</div>';updateExistingButtons();}
  function selectedExisting(){return [...document.querySelectorAll('[data-existing-select]:checked')].map(el=>existingWorks.find(w=>w.id===el.dataset.existingSelect)).filter(Boolean);}
  function updateExistingButtons(){const n=selectedExisting().length;$('makeExistingSeries').disabled=n<2;$('detachExisting').disabled=n<1;}
  async function groupExistingSelected(){const chosen=selectedExisting();if(chosen.length<2)return;const authorIds=[...new Set(chosen.map(x=>x.author_id))];if(authorIds.length!==1){alert('चुनी गई सभी रचनाओं के लेखक एक ही होने चाहिए।');return;}const title=prompt('नए धारावाहिक का नाम लिखें:',chosen[0].series_title||chosen[0].title);if(!title)return;const description=prompt('धारावाहिक का परिचय (वैकल्पिक):','')||'';const key=uid();const ordered=chosen.sort((a,b)=>(a.part_number||9999)-(b.part_number||9999));const payload={series:[{key,title,description,author_id:authorIds[0],status:'ongoing'}],changes:ordered.map((w,i)=>({work_id:w.id,series_key:key,part_number:i+1}))};const {error}=await client.rpc('admin_manage_existing_works',{p_payload:payload});if(error){message('धारावाहिक नहीं बना: '+error.message,'error');return;}message(`${chosen.length} मौजूदा रचनाएँ धारावाहिक में बदल दी गईं।`,'success');await loadExistingWorks();}
  async function detachExistingSelected(){const chosen=selectedExisting();if(!chosen.length)return;if(!confirm(`${chosen.length} चुने हुए भागों को धारावाहिक से अलग करके स्वतंत्र रचना बनाना है?`))return;const {error}=await client.rpc('admin_manage_existing_works',{p_payload:{series:[],changes:chosen.map(w=>({work_id:w.id,series_key:null,part_number:1}))}});if(error){message('भाग अलग नहीं हुए: '+error.message,'error');return;}message(`${chosen.length} रचनाएँ अब स्वतंत्र हैं।`,'success');await loadExistingWorks();}
  async function moveExistingPart(id,delta){const work=existingWorks.find(x=>x.id===id);if(!work?.series_id)return;const {data:allParts,error:partsError}=await client.from('works').select('id,author_id,part_number,series_title').eq('series_id',work.series_id).order('part_number',{ascending:true});if(partsError){message('धारावाहिक के भाग नहीं लोड हुए: '+partsError.message,'error');return;}const group=allParts||[];const i=group.findIndex(x=>x.id===id),j=i+delta;if(i<0||j<0||j>=group.length)return;[group[i],group[j]]=[group[j],group[i]];const series=seriesRows.find(s=>s.id===work.series_id);const payload={series:[{key:'existing-order',title:series?.title||work.series_title||'धारावाहिक',author_id:work.author_id,existing_series_id:work.series_id}],changes:group.map((w,index)=>({work_id:w.id,series_key:'existing-order',part_number:index+1}))};const {error}=await client.rpc('admin_manage_existing_works',{p_payload:payload});if(error){message('भागों का क्रम नहीं बदला: '+error.message,'error');return;}await loadExistingWorks();}

  async function init(){
    if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY){showDenied('Supabase कनेक्शन उपलब्ध नहीं है।');return;}
    client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
    const {data:{user},error}=await client.auth.getUser();if(error||!user){showDenied('पहले साहित्य सूत्रधार में अपने खाते से लॉगिन करें।');return;}
    adminUser=user;$('signOutBtn').classList.remove('hidden');
    const {data:isAdmin,error:adminError}=await client.rpc('is_sutradhar_admin');if(adminError||isAdmin!==true){showDenied(adminError?'एडमिन अनुमति जाँची नहीं जा सकी। '+adminError.message:'इस खाते को एडमिन अनुमति नहीं मिली।');$('setupUuidBox')?.classList.remove('hidden');$('currentUserUuid').textContent=user.id;$('copyAdminUuid')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(user.id);$('copyAdminUuid').textContent='कॉपी हो गया';}catch(_){$('copyAdminUuid').textContent='UUID चुनकर कॉपी करें';}});return;}
    $('loadingState').classList.add('hidden');$('deniedState').classList.add('hidden');$('adminApp').classList.remove('hidden');
    const [catRes,authorRes,seriesRes]=await Promise.all([
      client.from('categories').select('id,name,is_enabled').eq('is_enabled',true).order('name'),
      client.from('profiles').select('id,display_name,username').order('display_name').limit(2000),
      client.from('work_series').select('id,title,description,status,author_id').order('created_at',{ascending:false}).limit(1000)
    ]);
    if(catRes.error)throw catRes.error;if(authorRes.error)throw authorRes.error;if(seriesRes.error)throw seriesRes.error;
    categories=catRes.data||[];authors=authorRes.data||[];seriesRows=seriesRes.data||[];
    $('existingSeriesSelect').innerHTML='<option value="">धारावाहिक चुनें</option>'+seriesOptions();
    $('addToExistingSeries').disabled=true;restoreLocalDraft();await loadExistingWorks();bindEvents();
  }
  function bindEvents(){
    $('bulkFiles').addEventListener('change',e=>{const files=[...e.target.files];$('fileCount').textContent=`${files.length} फाइलें चुनीं`;try{validateBatch(files);$('extractBtn').disabled=!files.length;message(`${files.length} फाइलें · ${(files.reduce((n,f)=>n+f.size,0)/1024/1024).toFixed(1)} MB कुल`,'success');}catch(err){$('extractBtn').disabled=true;message(err.message,'error');}});
    $('extractBtn').addEventListener('click',()=>extractFiles([...$('bulkFiles').files]));
    $('autoGroupBtn').addEventListener('click',renderSuggestions);
    $('suggestions').addEventListener('click',e=>{const b=e.target.closest('[data-use-suggestion]');if(!b)return;const s=$('suggestions')._suggestions?.[Number(b.dataset.useSuggestion)];if(s){const items=s.items.map(x=>queue.find(q=>q.id===x.id)).filter(Boolean);createGroup(items);}});
    $('createManualGroup').addEventListener('click',()=>{const items=selectedQueue();if(items.length<2)return;const title=prompt('धारावाहिक का नाम लिखें:',items[0].title);if(title)createGroup(items,null,title);});
    $('addToExistingSeries').addEventListener('click',()=>{const s=seriesRows.find(x=>x.id===$('existingSeriesSelect').value);if(!s){alert('पहले मौजूदा धारावाहिक चुनें।');return;}createGroup(selectedQueue(),s,s.title);});
    $('queueList').addEventListener('change',e=>{const itemId=e.target.dataset.itemId; if(itemId){const item=queue.find(x=>x.id===itemId);if(item){const field=e.target.dataset.itemField;if(field==='mainForm'){item.mainForm=e.target.value;item.subtype=SUBTYPES[item.mainForm][0];renderQueue();}else if(field){item[field]=e.target.value;if(field==='authorId'&&item.seriesKey){const g=groups.get(item.seriesKey);if(g){g.authorId=item.authorId;g.itemIds.forEach(id=>{const part=queue.find(x=>x.id===id);if(part)part.authorId=item.authorId;});renderQueue();}}}updateSummary();}}if(e.target.dataset.itemCategories){const item=queue.find(x=>x.id===e.target.dataset.itemCategories);if(item){item.categoryIds=[...e.target.selectedOptions].map(o=>String(o.value));updateSummary();}}if(e.target.dataset.itemDeclaration){const item=queue.find(x=>x.id===e.target.dataset.itemDeclaration);if(item){item.selfDeclarationAccepted=e.target.checked;updateSummary();}}if(e.target.dataset.itemSource){const item=queue.find(x=>x.id===e.target.dataset.itemSource);if(item&&e.target.files?.[0]){const f=e.target.files[0];try{validateBatch([f]);item.sourceFile=f;item.sourceMissing=false;item.fileName=f.name;item.originalSize=f.size;message('मूल फाइल फिर से जोड़ दी गई।','success');renderQueue();updateSummary();}catch(err){message(err.message,'error');e.target.value='';}}}if(e.target.dataset.itemSelected){const item=queue.find(x=>x.id===e.target.dataset.itemSelected);if(item){item.selected=e.target.checked;updateSummary();}}if(e.target.dataset.itemCover){const item=queue.find(x=>x.id===e.target.dataset.itemCover);if(item)item.coverFile=e.target.files?.[0]||null;}if(e.target.dataset.groupField){const g=groups.get(e.target.dataset.groupKey);if(g)g[e.target.dataset.groupField]=e.target.value;}if(e.target.dataset.groupCover){const g=groups.get(e.target.dataset.groupCover);if(g)g.coverFile=e.target.files?.[0]||null;}});
    $('queueList').addEventListener('input',e=>{const id=e.target.dataset.itemId,field=e.target.dataset.itemField;if(id&&field){const item=queue.find(x=>x.id===id);if(item){item[field]=e.target.value;updateSummary();}}const g=groups.get(e.target.dataset.groupKey);if(g&&e.target.dataset.groupField)g[e.target.dataset.groupField]=e.target.value;});
    $('queueList').addEventListener('click',e=>{const move=e.target.closest('[data-move-part]');if(move){moveQueuePart(move.dataset.movePart,Number(move.dataset.delta));return;}const detach=e.target.closest('[data-detach]');if(detach){detachQueueItem(detach.dataset.detach);return;}const rm=e.target.closest('[data-remove-item]');if(rm){detachQueueItem(rm.dataset.removeItem);queue=queue.filter(x=>x.id!==rm.dataset.removeItem);renderQueue();renderSuggestions();updateSummary();return;}const rg=e.target.closest('[data-remove-group]');if(rg){const g=groups.get(rg.dataset.removeGroup);if(g)g.itemIds.forEach(id=>{const w=queue.find(x=>x.id===id);if(w){w.seriesKey=null;w.partNumber=1;}});groups.delete(rg.dataset.removeGroup);renderQueue();updateSummary();}});
    $('existingSearch').addEventListener('input',renderExistingWorks);$('existingList').addEventListener('change',updateExistingButtons);$('existingList').addEventListener('click',e=>{const b=e.target.closest('[data-existing-move]');if(b){e.preventDefault();moveExistingPart(b.dataset.existingMove,Number(b.dataset.delta));}});
    $('reloadExisting').addEventListener('click',loadExistingWorks);$('makeExistingSeries').addEventListener('click',groupExistingSelected);$('detachExisting').addEventListener('click',detachExistingSelected);
    $('publishAllBtn').addEventListener('click',publishQueue);$('saveLocalDraft').addEventListener('click',saveLocalDraft);
    $('signOutBtn').addEventListener('click',async()=>{await client.auth.signOut();location.href='mobile-app.html';});
  }
  document.addEventListener('DOMContentLoaded',()=>init().catch(err=>showDenied('एडमिन पैनल शुरू नहीं हो सका: '+(err.message||err))));
})();
