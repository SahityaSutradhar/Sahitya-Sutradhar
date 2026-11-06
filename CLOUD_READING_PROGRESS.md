Cloud Reading Progress — deployment note
इस अपडेट में पठन-प्रगति को Supabase खाते से जोड़कर दूसरे डिवाइस पर जारी रखने की सुविधा जोड़ी गई है।
बदली गई फाइलें
app.js: local progress सुरक्षित रखते हुए cloud load/upsert, account-scoped local cache, responsive position restore, और Library में “पढ़ना जारी रखें”।
styles.css: Library progress card और progress bar styling।
index.html: app.js cache-buster।
sw.js: service-worker shell cache version bump।
ARCHITECTURE.md: cloud progress व्यवहार का विवरण।
अपेक्षित मौजूदा Supabase table fields
क्लाउड सिंक मौजूदा public.reading_progress table में इन fields का उपयोग करता है:
user_id (UUID)
work_id (UUID)
last_position (integer; इस implementation में 0–10,000 normalized position)
estimated_words_read (integer/bigint)
updated_at (timestamptz)
user_id + work_id पर primary key या unique constraint होना चाहिए। RLS में उपयोगकर्ता को केवल अपनी progress rows SELECT, INSERT और UPDATE करने की अनुमति होनी चाहिए। इस patch में कोई SQL migration नहीं जोड़ी गई और कोई मौजूदा डेटा नहीं हटाया गया।
जल्दी परीक्षण
वेबसाइट पर नया app code deploy करें और एक खाते से लॉगिन करें।
किसी लंबी प्रकाशित रचना को खोलकर कुछ पृष्ठ आगे जाएँ और “वापस” दबाएँ।
Library में “पढ़ना जारी रखें” कार्ड दिखना चाहिए।
उसी खाते से दूसरे डिवाइस/ब्राउज़र में लॉगिन करें। उसी रचना को खोलने पर लगभग उसी reading position से शुरुआत होनी चाहिए।
उसी डिवाइस पर अलग खाते से लॉगिन करने पर पहले खाते की local progress नहीं दिखनी चाहिए।
यदि Supabase table में ऊपर के field names अलग हैं, cloud sync console में warning देगा; स्थानीय progress काम करती रहेगी। Schema में कोई बदलाव करने से पहले live table columns की पुष्टि करें।
