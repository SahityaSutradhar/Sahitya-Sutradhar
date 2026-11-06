# साझा बैकएंड का प्रस्ताव

## सेवा-विभाजन
- Authentication: Supabase Auth. Google login संभव; Zoho/Facebook को उनके उपलब्ध OAuth provider/configuration के अनुसार अलग से सेट करना होगा।
- Database: PostgreSQL tables in `supabase_schema.sql`.
- Image/cover storage: Supabase Storage buckets with policies.
- Website: इस PWA को HTTPS hosting पर प्रकाशित करना।
- Android: Capacitor shell में यही वेब ऐप; API और डेटाबेस समान रहेंगे।
- Admin: अलग role/claim और server-side policies; UI छिपाना सुरक्षा नहीं है।

## सुरक्षा से पहले जरूरी काम
1. RLS हर user table पर enable करें।
2. सार्वजनिक पढ़ने और authenticated write permissions अलग रखें।
3. `profiles` पर user केवल अपनी निजी संपादन योग्य fields बदल सके।
4. `works` में published works public-read; draft केवल author/admin को दिखें।
5. ratings में unique(work_id,user_id) एक यूज़र की एक सक्रिय रेटिंग सुनिश्चित करता है।
6. संदेश केवल sender/recipient को दिखें; recipient permission/block logic server-side enforce हो।
7. account deletion request के लिए audit log और admin workflow जोड़ें।
8. rate limits, spam checks, report/moderation tables और backups जोड़ें।

यह शुरुआती आधार है, audited production security configuration नहीं।

## पठन-प्रगति का क्लाउड सिंक
- पाठक की पठन-प्रगति स्थानीय रूप से `sutradhar.reader.progress.v1` में सुरक्षित रहती है; पुराने key को हटाया नहीं जाता। नए स्थानीय रिकॉर्ड guest और प्रत्येक Supabase user के अलग v2 key में रखे जाते हैं।
- लॉगिन उपयोगकर्ता की प्रगति `public.reading_progress` में `user_id + work_id` के आधार पर सिंक होती है।
- `last_position` में 0–10,000 के बीच normalized reading position रखी जाती है, ताकि अलग स्क्रीन आकार और pagination वाले डिवाइस पर भी लगभग उसी स्थान से पढ़ना शुरू हो। `words_read` अब तक पढ़े शब्दों का अनुमान रखता है।
- पुस्तकालय में “पढ़ना जारी रखें” सूची cloud और local progress से बनती है।
- इस सुविधा के लिए कोई schema reset, data deletion या नई destructive migration नहीं है। Cloud sync मौजूदा `reading_progress` table के `user_id`, `work_id`, `last_position`, `words_read` और `updated_at` columns पर निर्भर है।


## संगोष्ठी पोस्ट प्रबंधन
- लेखक की अपनी प्रोफ़ाइल में “मेरी रचनाएँ” और “संगोष्ठी” अलग टैब हैं। संगोष्ठी टैब से लिखित या फोटो सहित पोस्ट प्रकाशित की जा सकती है।
- केवल पोस्ट का लेखक अपनी पोस्ट संपादित या डिलीट कर सकता है। केवल लिखित पोस्ट (`image_url IS NULL`) ही संपादन योग्य है; फोटो सहित पोस्ट के लिए संपादन नियंत्रण नहीं दिखता और डेटाबेस अपडेट भी `image_url IS NULL` शर्त से बंधा है।
- पोस्ट अपडेट/डिलीट की अनुमति के लिए `COMMUNITY_POST_OWNER_POLICIES.sql` को Supabase SQL Editor में एक बार चलाएँ। यह केवल `community_posts` की owner-scoped UPDATE/DELETE RLS policies जोड़ता है; कोई डेटा या तालिका नहीं हटाता।
- पोस्ट हटाते समय संबंधित `community_post_comments` और `post_likes` के foreign keys में `ON DELETE CASCADE` होना चाहिए ताकि child records स्वतः हटें। यदि वर्तमान FK ऐसा नहीं करता, तो cascade migration अलग से जाँचकर ही लागू करें।
