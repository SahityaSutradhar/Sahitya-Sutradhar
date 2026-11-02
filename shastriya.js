/* साहित्य सूत्रधार : शास्त्रीय विभाग
छन्द-गणना के दो स्पष्ट मोड:

1. सामान्य पाठ-विभाजन: लिखित स्वर की मात्रा + देवनागरी अक्षर-समूह।
2. पारंपरिक: संस्कृत छन्दशास्त्र के लघु-गुरु नियम।
   यह नियम-आधारित सहायक है; स्वचालित निर्णय को अंतिम पाण्डित्यपूर्ण प्रमाण न मानें।
   */
   window.initShastriyaModule = function () {
   const root = document.getElementById('sgShastriya');
   if (!root || root.dataset.ready === '1') return;
   root.dataset.ready = '1';
   const $ = id => root.querySelector('#' + id);

// Tabs
root.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
root.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== btn.dataset.tab);
}));

// Small static archive retained from the previous version
const archive = [
['ऋग्वेद','वैदिक संहिता','वैदिक साहित्य'],
['भगवद्गीता','दर्शन एवं योग','महाभारत का संवादात्मक ग्रन्थ'],
['रामचरितमानस','भक्ति साहित्य','गोस्वामी तुलसीदास की अवधी रचना'],
['अभिज्ञानशाकुन्तलम्','नाटक','कालिदास का संस्कृत नाटक'],
['मेघदूतम्','काव्य','कालिदास का दूतकाव्य'],
['कबीर वाणी','सन्त साहित्य','निर्गुण भक्ति की वाणी']
];
function renderArchive(q = '') {
const list = $('sgArchiveList');
list.replaceChildren();
archive.filter(x => x.join(' ').toLowerCase().includes(q.toLowerCase())).forEach(x => {
const card = document.createElement('article'); card.className = 'sgs-card';
const h = document.createElement('h3'); h.textContent = x[0];
const p = document.createElement('p'); p.textContent = x[1] + ' · ' + x[2];
card.append(h, p); list.append(card);
});
if (!list.children.length) list.textContent = 'कोई मिलान नहीं मिला।';
}
renderArchive();
$('sgSearch').addEventListener('input', e => renderArchive(e.target.value));

// Reader / study worksheet
$('sgExplain').addEventListener('click', () => {
const text = $('sgVerse').value.trim();
$('sgVerseOutput').textContent = text
? 'पाठ-विभाजन:\n' + text.split(/\n+/).map((s, i) => (i + 1) + '. ' + s.trim()).join('\n') +
'\n\nअध्ययन के लिए:\n• पदच्छेद और अन्वय लिखें।\n• प्रत्येक पद का शब्दार्थ प्रमाणित कोश से जाँचें।\n• छन्द, अलंकार और प्रसंग का उल्लेख करें।\n• टीका/स्रोत का नाम और संस्करण दर्ज करें।'
: 'पहले श्लोक या पद्य लिखें।';
});
$('sgCopyVerse').addEventListener('click', async () => {
try {
await navigator.clipboard.writeText($('sgVerse').value);
$('sgVerseOutput').textContent = 'पाठ कॉपी कर लिया गया।';
} catch (e) {
$('sgVerseOutput').textContent = 'कॉपी सुविधा उपलब्ध नहीं; पाठ चुनकर कॉपी करें।';
}
});

// Devanagari prosody engine
const VOWEL_SIGNS = new Map([
['ा','आ'],['ि','इ'],['ी','ई'],['ु','उ'],['ू','ऊ'],['ृ','ऋ'],['ॄ','ॠ'],
['ॅ','ऍ'],['े','ए'],['ै','ऐ'],['ॉ','ऑ'],['ो','ओ'],['ौ','औ'],['ॢ','ऌ'],['ॣ','ॡ']
]);
const INDEPENDENT = new Map([
['अ','अ'],['आ','आ'],['इ','इ'],['ई','ई'],['उ','उ'],['ऊ','ऊ'],['ऋ','ऋ'],['ॠ','ॠ'],
['ऌ','ऌ'],['ॡ','ॡ'],['ए','ए'],['ऐ','ऐ'],['ओ','ओ'],['औ','औ'],['ऍ','ऍ'],['ऑ','ऑ']
]);
const SHORT = new Set(['अ','इ','उ','ऋ','ऌ']);
const LONG = new Set(['आ','ई','ऊ','ॠ','ॡ','ए','ऐ','ओ','औ']);
const VIRAMA = '्', ANUSVARA = 'ं', CHANDRABINDU = 'ँ', VISARGA = 'ः';
const isConsonant = c => /[क-हक़-य़]/u.test(c);
const isMark = c => /[\u0900-\u0903\u093a-\u094f\u0951-\u0957\u0962-\u0963]/u.test(c);
const chars = s => Array.from(s.normalize('NFC'));

// Reliable orthographic akshara grouping, including virama conjuncts.
function buildAksharas(a) {
const out = [];
let i = 0;
while (i < a.length) {
const c = a[i];
if (/\s/u.test(c) || '।॥,;:!?—–-()[]{}"“”‘’'.includes(c)) { i++; continue; }
if (INDEPENDENT.has(c)) {
const n = { text: c, vowel: c, nasal: false, visarga: false, consonants: 0, independent: true };
i++;
while (a[i] === ANUSVARA || a[i] === CHANDRABINDU || a[i] === VISARGA) {
if (a[i] === VISARGA) n.visarga = true; else n.nasal = true;
n.text += a[i++];
}
out.push(n); continue;
}
if (!isConsonant(c)) { i++; continue; }
let text = '', consonants = 0, hasVowel = false, vowel = 'अ', nasal = false, visarga = false;
while (i < a.length && isConsonant(a[i])) {
text += a[i++]; consonants++;
if (a[i] === '़') text += a[i++];
if (a[i] === VIRAMA) {
text += a[i++];
// Next consonant continues the same conjunct; stop if no consonant follows.
if (i < a.length && isConsonant(a[i])) continue;
hasVowel = false; vowel = null; break;
}
if (VOWEL_SIGNS.has(a[i])) {
vowel = VOWEL_SIGNS.get(a[i]); text += a[i++]; hasVowel = true; break;
}
hasVowel = true; vowel = 'अ'; break;
}
if (hasVowel) {
while (a[i] === ANUSVARA || a[i] === CHANDRABINDU || a[i] === VISARGA) {
if (a[i] === VISARGA) visarga = true; else nasal = true;
text += a[i++];
}
out.push({ text, vowel, nasal, visarga, consonants, independent: false });
} else {
// A dead consonant is retained as a coda candidate for the preceding syllable.
if (out.length) out[out.length - 1].followingDeadConsonants = (out[out.length - 1].followingDeadConsonants || 0) + consonants;
}
}
// Count consonant material between vowel nuclei. A short vowel closed by a
// conjunct is guru in the traditional mode. Word spaces are not kept here;
// the line is treated as a single pāda unless split by punctuation.
for (let j = 0; j < out.length; j++) {
const next = out[j + 1];
out[j].clusterAfter = next ? Math.max(0, next.consonants - 1) : 0;
out[j].deadAfter = out[j].followingDeadConsonants || 0;
}
return out;
}

function analyzePada(line, mode, index) {
const syllables = buildAksharas(chars(line));
const items = syllables.map((s, i) => {
const naturalLong = LONG.has(s.vowel);
const naturalShort = SHORT.has(s.vowel);
const closedByCluster = (s.clusterAfter || 0) > 0 || (s.deadAfter || 0) > 0;
const closedByMark = s.visarga || (s.nasal && !line.includes('ँ'));
const isPadaEnd = i === syllables.length - 1;
const guru = naturalLong || closedByCluster || closedByMark;
const traditionalGuru = guru || isPadaEnd;
return {
...s,
spokenMatra: naturalLong ? 2 : 1,
hindiChhandaMatra: guru ? 2 : 1,
traditional: traditionalGuru ? 'गुरु' : 'लघु',
traditionalMatra: traditionalGuru ? 2 : 1,
reason: naturalLong ? 'दीर्घ स्वर' : closedByMark ? 'अनुस्वार/विसर्ग' : closedByCluster ? 'अगले संयुक्त/हलन्त व्यंजन से गुरु' : isPadaEnd ? 'पादान्त-विकल्प से गुरु माना' : 'ह्रस्व स्वर'
};
});
const spokenTotal = items.reduce((n, x) => n + x.spokenMatra, 0);
const hindiChhandaTotal = items.reduce((n, x) => n + x.hindiChhandaMatra, 0);
const classicalTotal = items.reduce((n, x) => n + x.traditionalMatra, 0);
return { line, index, items, spokenTotal, hindiChhandaTotal, classicalTotal };
}

const ganaNames = {
GGG:'मगण', LGG:'यगण', GLG:'रगण', GGL:'तगण',
GLL:'भगण', LGL:'जगण', LLG:'सगण', LLL:'नगण'
};
function ganaPattern(items) {
const marks = items.map(x => x.traditional === 'गुरु' ? 'G' : 'L');
const groups = [];
for (let i = 0; i < marks.length; i += 3) {
const part = marks.slice(i, i + 3).join('');
if (part.length === 3) groups.push(ganaNames[part] || part);
else groups.push(part);
}
return groups.join(' · ');
}

function identifySanskritMeters(padas) {
if (padas.length !== 4 || padas.some(p => !p.items.length)) return [];
const counts = padas.map(p => p.items.length);
const results = [];
if (counts.every(n => n === 8)) {
const ok = padas.every((p, i) => {
const m = p.items.map(x => x.traditional);
return m[4] === 'लघु' && m[5] === 'गुरु' && m[6] === (i % 2 === 0 ? 'गुरु' : 'लघु');
});
results.push({ name: 'अनुष्टुप् / श्लोक (प्रारम्भिक परीक्षण)', detail: 'चारों पादों में 8-8 अक्षर मिले। पाँचवाँ लघु, छठा गुरु और सातवें का सामान्य पथ्या-विन्यास भी जाँचा गया: ' + (ok ? 'मूल शर्तें मेल खाती हैं।' : 'कुछ पादों में पथ्या-विन्यास मेल नहीं खाता।'), confidence: ok ? 'संभावित' : 'केवल अक्षर-संख्या मेल' });
}
const sig = p => p.items.map(x => x.traditional === 'गुरु' ? 'G' : 'L').join('');
const patterns = [
['इन्द्रवज्रा','11 अक्षर; त-त-ज-ग-ग','GG L?'], // descriptive fallback; exact pattern checked below
['उपेन्द्रवज्रा','11 अक्षर; ज-त-ज-ग-ग',''],
['वसन्ततिलका','14 अक्षर; त-भ-ज-ज-ग-ग',''],
['मालिनी','15 अक्षर; न-न-म-य-य','']
];
const ganaSeq = p => {
const m = p.items.map(x => x.traditional === 'गुरु' ? 'G' : 'L');
const names = [];
for (let i=0;i+2<m.length;i+=3) names.push(m.slice(i,i+3).join(''));
return names.join('-');
};
const targets = [
['इन्द्रवज्रा',11,'GGL-GGL-LGL-GG'],
['उपेन्द्रवज्रा',11,'LGL-GGL-LGL-GG'],
['वसन्ततिलका',14,'GGL-GLL-LGL-LGL-GG'],
['मालिनी',15,'LLL-LLL-GGG-LGG-LGG']
];
for (const [name,count,pattern] of targets) {
const parts = pattern.split('-');
if (padas.every(p => p.items.length === count && parts.every((part, k) => p.items.slice(k*3,k*3+3).map(x => x.traditional==='गुरु'?'G':'L').join('') === part))) {
results.push({name, detail:'चारों पादों का लघु-गुरु-गण विन्यास दिए गए सामान्य पैटर्न से मेल खाता है।', confidence:'संभावित'});
}
}
return results;
}

function identifyHindiMeters(padas) {
const counts = padas.map(p => p.hindiChhandaTotal);
const results = [];
if (padas.length === 4) {
if (counts.join(',') === '13,11,13,11') results.push({name:'दोहा', detail:'चरण-मात्राएँ 13–11–13–11 मिलीं। तुक, यति तथा विषम/सम चरणों के अन्तिम वर्णों की जाँच भी आवश्यक है।', confidence:'मात्रा-विन्यास मेल'});
if (counts.join(',') === '11,13,11,13') results.push({name:'सोरठा', detail:'चरण-मात्राएँ 11–13–11–13 मिलीं। तुक और चरणान्त के नियम अलग से जाँचें।', confidence:'मात्रा-विन्यास मेल'});
if (counts.every(n => n === 16)) results.push({name:'चौपाई', detail:'चारों चरणों में 16-16 मात्राएँ मिलीं। चरणान्त, यति और लय का परीक्षण अभी आवश्यक है।', confidence:'मात्रा-विन्यास मेल'});
}
return results;
}

function renderChhanda() {
const text = $('sgChhandaText').value.trim();
if (!text) { $('sgChhandaOutput').textContent = 'पहले पद्य लिखें।'; return; }
const mode = root.querySelector('input[name="sgChhandaMode"]:checked')?.value || 'spoken';
   const lines = text
  .split(/\n+/)
  .flatMap(line => line.split(/(?<=[।॥])/u))
  .map(s => s.trim())
  .filter(Boolean);
const padas = lines.map((line, i) => analyzePada(line, mode, i + 1));
const out = [];
out.push(mode === 'spoken'
? 'विश्लेषण-पद्धति: सामान्य उच्चारण / लिखित-पाठ आधारित अनुमान'
: 'विश्लेषण-पद्धति: पारंपरिक छन्दशास्त्र — लघु/गुरु');
out.push('नोट: प्रत्येक नई पंक्ति को अलग चरण माना गया है।');
padas.forEach(p => {
out.push('\nचरण ' + p.index + ': ' + p.line);
out.push('अक्षर-खंड: ' + (p.items.map(x => x.text).join(' · ') || 'नहीं पहचाने गए'));
out.push('खंड-संख्या: ' + p.items.length);
if (mode === 'spoken') {
out.push('स्वर-मात्रा संकेत: ' + p.items.map(x => x.spokenMatra === 2 ? 'दीर्घ(2)' : 'ह्रस्व(1)').join(' – '));
out.push('स्वर-दीर्घता योग (ह्रस्व=1, दीर्घ=2): ' + p.spokenTotal);
out.push('हिन्दी मात्रिक-छन्द संकेत (बन्द अक्षर/संयोग/अनुस्वार-विशर्ग पर गुरु): ' + p.items.map(x => x.hindiChhandaMatra === 2 ? '2' : '1').join(' – '));
out.push('हिन्दी छन्द-मात्रा योग: ' + p.hindiChhandaTotal);
out.push('यह सामान्य पाठ-विभाजन है; बोलचाल में schwa लोप, क्षेत्रीय उच्चारण और गति के कारण वास्तविक ध्वनि अलग हो सकती है।');
} else {
out.push('लघु-गुरु: ' + p.items.map(x => x.traditional === 'गुरु' ? 'गु' : 'ल').join(' – '));
out.push('गण-संकेत: ' + ganaPattern(p.items));
out.push('छन्द-मात्रा योग (लघु=1, गुरु=2): ' + p.classicalTotal);
out.push('नियम-संकेत: ' + p.items.map((x,i) => (i+1)+'. '+x.text+'='+x.traditional+' ('+x.reason+')').join('; '));
}
});
const hindi = identifyHindiMeters(padas);
const sanskrit = identifySanskritMeters(padas);
if (mode === 'spoken') {
out.push('\nहिन्दी मात्रिक छन्दों का प्रारम्भिक मिलान:');
out.push(hindi.length ? hindi.map(x => x.name + ' — ' + x.confidence + '\n' + x.detail).join('\n') : 'दोहा/सोरठा/चौपाई का निर्धारित चरण-मात्रा-विन्यास नहीं मिला। यह सूची सीमित है; अन्य छन्द सम्भव हैं।');
} else {
out.push('\nसंस्कृत वर्णिक छन्दों का प्रारम्भिक मिलान:');
out.push(sanskrit.length ? sanskrit.map(x => x.name + ' — ' + x.confidence + '\n' + x.detail).join('\n') : 'इस सीमित पैटर्न-संग्रह में निश्चित मेल नहीं मिला। अन्य छन्द, वैकल्पिक गण, यति या पाठभेद सम्भव हैं।');
}
out.push('\nसीमा: यह संस्करण स्वचालित प्रारम्भिक विश्लेषक है, सम्पूर्ण छन्द-निर्णायक नहीं। वैदिक स्वराघात, सन्धि, अपवाद, हिन्दी के उच्चारण-आधारित लोप और छन्द-विशेष की यति/तुक की विद्वत् जाँच आवश्यक है।');
$('sgChhandaOutput').textContent = out.join('\n');
}
$('sgScan').addEventListener('click', renderChhanda);
$('sgClearChhanda').addEventListener('click', () => { $('sgChhandaText').value=''; $('sgChhandaOutput').textContent='पाठ साफ़ कर दिया गया।'; });

// Comparative commentary worksheet
$('sgCompare').addEventListener('click', () => {
const base = $('sgBase').value.trim(), a = $('sgComment1').value.trim(), b = $('sgComment2').value.trim();

$('sgCompareOut').textContent = `मूल पाठ
${base || '—'}

भाष्य १
${a || 'अभी दर्ज नहीं'}

भाष्य २
${b || 'अभी दर्ज नहीं'}

तुलनात्मक अध्ययन के प्रश्न:
• दोनों टीकाओं में समान अर्थ कौन-सा है?
• व्याख्या या व्याकरण में कहाँ भिन्नता है?
• प्रत्येक मत का मूल स्रोत/ग्रन्थ-सन्दर्भ क्या है?`;
});

// Pothi preview / print
$('sgPreview').addEventListener('click', () => {
const article = $('sgPothiPreview'); article.replaceChildren();
const h = document.createElement('h2'); h.textContent = $('sgPothiTitle').value || 'अनाम ग्रन्थ';
const by = document.createElement('p'); by.textContent = '— ' + ($('sgPothiAuthor').value || 'अज्ञात लेखक') + ' —';
const body = document.createElement('p'); body.textContent = $('sgPothiBody').value;
article.append(h, by, body);
});
$('sgPrint').addEventListener('click', () => {
if (!$('sgPothiPreview').textContent.trim()) $('sgPreview').click();
window.print();
});
};
document.addEventListener('DOMContentLoaded', window.initShastriyaModule);
