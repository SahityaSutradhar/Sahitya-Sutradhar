const supabaseClient = window.supabase?.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
const CATEGORIES = ["रोमांटिक","कॉमेडी","हास्य-व्यंग्य","प्रेम","सस्पेंस एवं थ्रिलर","एडवेंचर","साइंस फिक्शन","फैंटेसी","देशप्रेम","शौर्य","ओज","ऐतिहासिक","पौराणिक","मिश्रित","रेखाचित्र","बालकथा","मनोरंजन","शिक्षाप्रद","अन्य"];
const SUBTYPES = {
  "गद्य":["कहानी","लघुकथा","उपन्यास","लेख","निबंध","नाटक","संस्मरण","यात्रा वृत्तांत","आत्मकथा","हास्य-व्यंग्य","जीवनी","अन्य"],
  "पद्य":["कविता","गीत","मुक्तक","छंद","नई कविता","अन्य"],
  "चंपू काव्य":["अन्य"]
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
// =====================================
// SAHITYA SUTRADHAR — PRIVATE INBOX
// =====================================
let inboxCurrentRequestId = null;
let inboxCurrentOtherUserId = null;
let inboxCurrentMode = "messages";
let inboxRequestsCache = [];
let inboxMessagesCache = [];

const UI_TEXT={
  en:{home:"Home",library:"Library",write:"Write",profile:"Profile",settings:"Settings",latest:"Newly published works",newWriters:"New writers",activeWriters:"Active and popular writers",categories:"Literary categories",readWorld:"Explore works",all:"View all",yourLibrary:"Your library",myWorks:"My published works",myDrafts:"My private drafts",wordsRead:"Total words read",myFollowers:"Followers",readingLanguage:"Reading language",preferred:"Preferred categories",darkMode:"Dark mode",edit:"Edit",login:"Login / Account",logout:"Log out",publish:"Publish",saveChanges:"Save changes",saveDraft:"Save draft",newWork:"New work",workTitle:"Work title",workBody:"Write your work",cover:"Work cover (9:16 ratio)",workLanguage:"Work language",writerOrder:"Writer ranking",mostRead:"Most read",mostWorks:"Most works",mostFollowers:"Most followers",read:"Open",report:"Report",share:"Share",finish:"Finish reading",ratingReview:"Reader feedback",yourRating:"Your rating",yourReview:"Your review",saveFeedback:"Save rating / review",profileIntro:"Introduction (up to 1,000 characters)",changeDP:"Change profile picture",chooseCategories:"Choose preferred categories",welcomeTitle:"Where words come together.",welcomeText:"Read, write and share your creations with readers.",communityTitle:"Community posts",communityPlaceholder:"Share your thoughts…",categoryHeading:"Literary categories"},
  mr:{home:"मुख्यपृष्ठ",library:"वाचनालय",write:"लिहा",profile:"प्रोफाइल",settings:"सेटिंग्ज",latest:"नवीन प्रकाशित साहित्य",newWriters:"नवे लेखक",activeWriters:"सक्रिय आणि लोकप्रिय लेखक",categories:"साहित्य प्रकार",readWorld:"साहित्य वाचा",all:"सर्व पहा",yourLibrary:"तुमचे वाचनालय",myWorks:"माझ्या प्रकाशित रचना",myDrafts:"माझे खाजगी मसुदे",wordsRead:"वाचलेले एकूण शब्द",myFollowers:"अनुयायी",readingLanguage:"वाचनाची भाषा",preferred:"आवडते प्रकार",darkMode:"डार्क मोड",edit:"बदला",login:"लॉगिन / खाते",logout:"बाहेर पडा",publish:"प्रकाशित करा",saveChanges:"बदल जतन करा",saveDraft:"मसुदा जतन करा",newWork:"नवीन रचना",workTitle:"रचनेचे शीर्षक",workBody:"तुमची रचना लिहा",cover:"रचनेचे मुखपृष्ठ (9:16)",workLanguage:"रचनेची भाषा",writerOrder:"लेखक क्रमवारी",mostRead:"सर्वाधिक वाचलेले",mostWorks:"सर्वाधिक रचना",mostFollowers:"सर्वाधिक अनुयायी",read:"उघडा",report:"तक्रार",share:"शेअर करा",finish:"वाचन पूर्ण",ratingReview:"वाचकांचा अभिप्राय",yourRating:"तुमचे मूल्यांकन",yourReview:"तुमचा अभिप्राय",saveFeedback:"मूल्यांकन / अभिप्राय जतन करा",profileIntro:"परिचय (कमाल 1,000 अक्षरे)",changeDP:"प्रोफाइल फोटो बदला",chooseCategories:"आवडते प्रकार निवडा",welcomeTitle:"जिथे शब्द एकत्र येतात.",welcomeText:"वाचा, लिहा आणि आपल्या रचना वाचकांपर्यंत पोहोचवा.",communityTitle:"समुदाय पोस्ट",communityPlaceholder:"आपले विचार मांडा…",categoryHeading:"साहित्य प्रकार"},
  sa:{home:"मुखपृष्ठम्",library:"पुस्तकालयः",write:"लिखतु",profile:"परिचयः",settings:"व्यवस्थाः",latest:"नवीनाः प्रकाशिताः रचनाः",newWriters:"नवीनाः लेखकाः",activeWriters:"सक्रियाः लोकप्रियाः लेखकाः",categories:"साहित्यवर्गाः",readWorld:"रचनाः पठन्तु",all:"सर्वं पश्यतु",yourLibrary:"भवतः पुस्तकालयः",myWorks:"मम प्रकाशिताः रचनाः",myDrafts:"मम गोपनीयाः प्रारूपाः",wordsRead:"पठिताः कुलशब्दाः",myFollowers:"अनुयायिनः",readingLanguage:"पठनभाषा",preferred:"प्रियाः वर्गाः",darkMode:"रात्रिवर्णः",edit:"सम्पादयतु",login:"प्रवेशः / खाता",logout:"निर्गच्छतु",publish:"प्रकाशयतु",saveChanges:"परिवर्तनानि रक्षतु",saveDraft:"प्रारूपं रक्षतु",newWork:"नवीनरचना",workTitle:"रचनायाः शीर्षकम्",workBody:"रचनां लिखतु",cover:"रचनाचित्रम् (9:16)",workLanguage:"रचनायाः भाषा",writerOrder:"लेखकक्रमः",mostRead:"अधिकं पठिताः",mostWorks:"अधिकरचनाः",mostFollowers:"अधिकानुयायिनः",read:"उद्घाटयतु",report:"सूचयतु",share:"वितरतु",finish:"पठनं समाप्तम्",ratingReview:"पाठकप्रतिक्रिया",yourRating:"भवतः मूल्याङ्कनम्",yourReview:"भवतः समीक्षा",saveFeedback:"मूल्याङ्कनं समीक्षां च रक्षतु",profileIntro:"परिचयः (अधिकतमं १००० अक्षराणि)",changeDP:"चित्रं परिवर्तयतु",chooseCategories:"प्रियवर्गान् चिनोतु",welcomeTitle:"यत्र शब्दाः मिलन्ति।",welcomeText:"पठतु, लिखतु, स्वकीयाः रचनाः पाठकेभ्यः प्रेषयतु।",communityTitle:"समुदायलेखाः",communityPlaceholder:"स्वविचारान् लिखतु…",categoryHeading:"साहित्यवर्गाः"}
};
const UI_PHRASES={
 en:{
 "मुख्यपृष्ठ":"Home","मुख्यपृष्ठम्":"Home","पुस्तकालय":"Library","वाचनालय":"Library","लिखें":"Write","लिखें":"Write","प्रोफ़ाइल":"Profile","प्रोफाइल":"Profile","सेटिंग्स":"Settings","सेटिंग":"Settings","इनबॉक्स":"Inbox","संगोष्ठी":"Literary Forum","रचनाएँ और परिचय":"Works & About","रचनाएँ":"Works","परिचय":"About","रचना लिखें":"Write a work","नई रचना":"New work","नई प्रकाशित रचनाएँ":"Newly published works","नए लेखक":"New writers","सक्रिय एवं लोकप्रिय लेखक":"Active and popular writers","साहित्य की श्रेणियाँ":"Literary categories","सभी देखें":"View all","रचनाओं की दुनिया":"Explore works","शास्त्रीय साहित्य एवं शोध":"Classical literature & research","शास्त्रीय विभाग में प्रवेश करें →":"Enter classical section →","यहाँ से शुरुआत करें":"Start here","अपनी पहली रचना लिखें या चुनी हुई श्रेणी बदलें।":"Write your first work or choose another category.","अभी कोई प्रकाशित रचना नहीं।":"No published works yet.","अभी लेखक सूची उपलब्ध नहीं है।":"No writers are available yet.","अधिकतम 20 नवीनतम":"Latest 20","सर्वाधिक पढ़े गए":"Most read","सर्वाधिक रचनाएँ":"Most works","सर्वाधिक फ़ॉलोअर्स":"Most followers","लॉगिन / खाता":"Login / Account","लॉगिन करें":"Log in","लॉगआउट":"Log out","नया खाता बनाएँ":"Create account","पहले से खाता है? लॉगिन करें":"Already have an account? Log in","बंद करें":"Close","ईमेल":"Email","पासवर्ड":"Password","Google से लॉगिन करें":"Continue with Google","Facebook से लॉगिन करें":"Continue with Facebook","या":"OR","रजिस्टर करें":"Sign up","साहित्य सूत्रधार में प्रवेश":"Welcome to Sahitya Sutradhar","साहित्य, संवेदना और सृजन का आपका अपना संसार":"Your home for literature, expression and creativity","आपकी साहित्यिक यात्रा यहीं से आरम्भ होती है।":"Your literary journey begins here.","आपका ईमेल पता":"Your email address","कम-से-कम 6 अक्षर":"At least 6 characters","प्रतीक्षा करें":"Please wait","कृपया प्रतीक्षा करें…":"Please wait…","लॉगिन सफल हुआ!":"Login successful!","लॉगआउट हो गया।":"You have logged out.","ईमेल सत्यापन":"Email verification","पहले लॉगिन करें।":"Please log in first.","रद्द करें":"Cancel","सहेजें":"Save","सुरक्षित करें":"Save","बदलें":"Change","हटाएँ":"Delete","खोजें":"Search","खोज मिटाएँ":"Clear search","शीर्षक लिखें":"Enter a title","अपनी रचना लिखें":"Write your work","रचना का शीर्षक":"Work title","रचना का प्रकार":"Work type","रचना का रूप":"Form","उपप्रकार":"Subtype","चुनें":"Choose","पहले रूप चुनें":"Choose a form first","प्रकाशित करें":"Publish","ड्राफ्ट सुरक्षित करें":"Save draft","परिवर्तन सुरक्षित करें":"Save changes","संगोष्ठी प्रकाशित करें":"Publish to Literary Forum","अपने विचार लिखें…":"Share your thoughts…","अभी कोई पोस्ट नहीं है।":"No posts yet.","पढ़ें":"Read","आगे पढ़ें":"Continue reading","वापस":"Back","अगला":"Next","पिछला":"Previous","भाग":"Part","क्रमशः जारी":"Ongoing","पूर्ण":"Completed","स्वतंत्र रचना":"Standalone work","नई धारावाहिक रचना":"New series","मौजूदा धारावाहिक में नया भाग":"Add a part to an existing series","धारावाहिक का नाम":"Series title","धारावाहिक का परिचय":"Series description","अपना धारावाहिक चुनें":"Choose your series","धारावाहिक चुनें":"Select a series","लेखक":"Author","पाठक":"Reader","अनाम पाठक":"Anonymous reader","रचना":"Work","रचनाकार":"Writer","अनुयायी":"Followers","फ़ॉलो करें":"Follow","फ़ॉलो करना बंद करें":"Unfollow","संदेश भेजें":"Send message","टिप्पणी":"Comment","टिप्पणी लिखें":"Write a comment","समीक्षा":"Review","रेटिंग":"Rating","साझा करें":"Share","रिपोर्ट करें":"Report","सूचनाएँ":"Notifications","कोई नई सूचना नहीं है।":"No new notifications.","अभी कुछ नहीं":"Nothing here yet","लोड हो रहा है…":"Loading…","डेटा उपलब्ध नहीं":"Data unavailable","नेटवर्क त्रुटि":"Network error","आप ऑफलाइन हैं।":"You are offline.","भाषा":"Language","प्रदर्शन भाषा":"Display language","पठन भाषा":"Reading language","डार्क मोड":"Dark mode","लाइट मोड":"Light mode","परिचय सुरक्षित नहीं हुआ":"Could not save introduction","नाम अपडेट हो गया।":"Name updated.","प्रोफ़ाइल अपडेट हो गई।":"Profile updated.","पहले जिस पाठ को सजाना है उसे चुनें।":"Select the text you want to format first.","चित्र तैयार नहीं हो सका।":"Could not prepare the image.","तस्वीर नहीं खुली":"Could not open the image","अपडेट नहीं हुआ":"Update failed","सफलतापूर्वक सुरक्षित":"Saved successfully"
 },
 mr:{
 "मुख्यपृष्ठ":"मुख्यपृष्ठ","मुख्यपृष्ठम्":"मुख्यपृष्ठ","पुस्तकालय":"वाचनालय","वाचनालय":"वाचनालय","लिखें":"लिहा","प्रोफ़ाइल":"प्रोफाइल","प्रोफाइल":"प्रोफाइल","सेटिंग्स":"सेटिंग्ज","सेटिंग":"सेटिंग्ज","इनबॉक्स":"इनबॉक्स","संगोष्ठी":"साहित्यसभा","रचनाएँ और परिचय":"रचना आणि परिचय","रचनाएँ":"रचना","परिचय":"परिचय","रचना लिखें":"रचना लिहा","नई रचना":"नवीन रचना","नई प्रकाशित रचनाएँ":"नवीन प्रकाशित रचना","नए लेखक":"नवीन लेखक","सक्रिय एवं लोकप्रिय लेखक":"सक्रिय आणि लोकप्रिय लेखक","साहित्य की श्रेणियाँ":"साहित्याचे प्रकार","सभी देखें":"सर्व पहा","रचनाओं की दुनिया":"साहित्यविश्व","शास्त्रीय साहित्य एवं शोध":"शास्त्रीय साहित्य आणि संशोधन","शास्त्रीय विभाग में प्रवेश करें →":"शास्त्रीय विभागात प्रवेश करा →","यहाँ से शुरुआत करें":"येथून सुरुवात करा","अपनी पहली रचना लिखें या चुनी हुई श्रेणी बदलें।":"तुमची पहिली रचना लिहा किंवा निवडलेला प्रकार बदला.","अभी कोई प्रकाशित रचना नहीं।":"अद्याप कोणतीही प्रकाशित रचना नाही.","अभी लेखक सूची उपलब्ध नहीं है।":"सध्या लेखकांची यादी उपलब्ध नाही.","अधिकतम 20 नवीनतम":"नवीनतम २०","सर्वाधिक पढ़े गए":"सर्वाधिक वाचलेले","सर्वाधिक रचनाएँ":"सर्वाधिक रचना","सर्वाधिक फ़ॉलोअर्स":"सर्वाधिक अनुयायी","लॉगिन / खाता":"लॉगिन / खाते","लॉगिन करें":"लॉगिन करा","लॉगआउट":"लॉगआउट","नया खाता बनाएँ":"नवीन खाते तयार करा","पहले से खाता है? लॉगिन करें":"आधीच खाते आहे? लॉगिन करा","बंद करें":"बंद करा","ईमेल":"ईमेल","पासवर्ड":"पासवर्ड","Google से लॉगिन करें":"Google द्वारे लॉगिन करा","Facebook से लॉगिन करें":"Facebook द्वारे लॉगिन करा","या":"किंवा","रजिस्टर करें":"नोंदणी करा","साहित्य सूत्रधार में प्रवेश":"साहित्य सूत्रधारमध्ये प्रवेश","साहित्य, संवेदना और सृजन का आपका अपना संसार":"साहित्य, संवेदना आणि सर्जनशीलतेचे आपले विश्व","आपकी साहित्यिक यात्रा यहीं से आरम्भ होती है।":"तुमचा साहित्यिक प्रवास येथून सुरू होतो.","आपका ईमेल पता":"तुमचा ईमेल पत्ता","कम-से-कम 6 अक्षर":"किमान ६ अक्षरे","प्रतीक्षा करें":"कृपया प्रतीक्षा करा","कृपया प्रतीक्षा करें…":"कृपया प्रतीक्षा करा…","लॉगिन सफल हुआ!":"लॉगिन यशस्वी झाले!","लॉगआउट हो गया।":"लॉगआउट झाले.","पहले लॉगिन करें।":"कृपया प्रथम लॉगिन करा.","रद्द करें":"रद्द करा","सहेजें":"जतन करा","सुरक्षित करें":"जतन करा","बदलें":"बदला","हटाएँ":"हटवा","खोजें":"शोधा","खोज मिटाएँ":"शोध पुसून टाका","शीर्षक लिखें":"शीर्षक लिहा","अपनी रचना लिखें":"तुमची रचना लिहा","रचना का शीर्षक":"रचनेचे शीर्षक","रचना का प्रकार":"रचनेचा प्रकार","रचना का रूप":"रचनेचे स्वरूप","उपप्रकार":"उपप्रकार","चुनें":"निवडा","पहले रूप चुनें":"आधी स्वरूप निवडा","प्रकाशित करें":"प्रकाशित करा","ड्राफ्ट सुरक्षित करें":"मसुदा जतन करा","परिवर्तन सुरक्षित करें":"बदल जतन करा","संगोष्ठी प्रकाशित करें":"साहित्यसभेत प्रकाशित करा","अपने विचार लिखें…":"तुमचे विचार मांडा…","अभी कोई पोस्ट नहीं है।":"अद्याप कोणतीही पोस्ट नाही.","पढ़ें":"वाचा","आगे पढ़ें":"पुढे वाचा","वापस":"मागे","अगला":"पुढील","पिछला":"मागील","भाग":"भाग","क्रमशः जारी":"मालिका सुरू","पूर्ण":"पूर्ण","स्वतंत्र रचना":"स्वतंत्र रचना","नई धारावाहिक रचना":"नवीन मालिका","मौजूदा धारावाहिक में नया भाग":"विद्यमान मालिकेत नवीन भाग","धारावाहिक का नाम":"मालिकेचे नाव","धारावाहिक का परिचय":"मालिकेचा परिचय","अपना धारावाहिक चुनें":"तुमची मालिका निवडा","धारावाहिक चुनें":"मालिका निवडा","लेखक":"लेखक","पाठक":"वाचक","अनाम पाठक":"अनामिक वाचक","रचना":"रचना","रचनाकार":"लेखक","अनुयायी":"अनुयायी","फ़ॉलो करें":"अनुसरण करा","फ़ॉलो करना बंद करें":"अनुसरण थांबवा","संदेश भेजें":"संदेश पाठवा","टिप्पणी":"टिप्पणी","टिप्पणी लिखें":"टिप्पणी लिहा","समीक्षा":"परीक्षण","रेटिंग":"गुणांकन","साझा करें":"शेअर करा","रिपोर्ट करें":"तक्रार नोंदवा","सूचनाएँ":"सूचना","कोई नई सूचना नहीं है।":"नवीन सूचना नाहीत.","लोड हो रहा है…":"लोड होत आहे…","डेटा उपलब्ध नहीं":"माहिती उपलब्ध नाही","नेटवर्क त्रुटि":"नेटवर्क त्रुटी","आप ऑफलाइन हैं।":"तुम्ही ऑफलाइन आहात.","भाषा":"भाषा","प्रदर्शन भाषा":"दर्शनी भाषा","पठन भाषा":"वाचन भाषा","डार्क मोड":"डार्क मोड","लाइट मोड":"लाइट मोड"
 },
 sa:{
 "मुख्यपृष्ठ":"मुखपृष्ठम्","मुख्यपृष्ठम्":"मुखपृष्ठम्","पुस्तकालय":"पुस्तकालयः","वाचनालय":"पुस्तकालयः","लिखें":"लिखतु","प्रोफ़ाइल":"परिचयः","प्रोफाइल":"परिचयः","सेटिंग्स":"व्यवस्थाः","सेटिंग":"व्यवस्थाः","इनबॉक्स":"सन्देशपेटिका","संगोष्ठी":"साहित्यगोष्ठी","रचनाएँ और परिचय":"रचनाः परिचयश्च","रचनाएँ":"रचनाः","परिचय":"परिचयः","रचना लिखें":"रचनां लिखतु","नई रचना":"नूतना रचना","नई प्रकाशित रचनाएँ":"नूतनाः प्रकाशिताः रचनाः","नए लेखक":"नूतनाः लेखकाः","सक्रिय एवं लोकप्रिय लेखक":"सक्रियाः प्रसिद्धाः लेखकाः","साहित्य की श्रेणियाँ":"साहित्यवर्गाः","सभी देखें":"सर्वं पश्यतु","रचनाओं की दुनिया":"रचनानां जगत्","शास्त्रीय साहित्य एवं शोध":"शास्त्रीयं साहित्यं अनुसन्धानं च","शास्त्रीय विभाग में प्रवेश करें →":"शास्त्रीयविभागे प्रविशतु →","यहाँ से शुरुआत करें":"अत्र आरभताम्","अपनी पहली रचना लिखें या चुनी हुई श्रेणी बदलें।":"प्रथमां रचनां लिखतु अथवा वर्गं परिवर्तयतु।","अभी कोई प्रकाशित रचना नहीं।":"अद्यापि कापि प्रकाशितरचना नास्ति।","अभी लेखक सूची उपलब्ध नहीं है।":"अद्य लेखकसूची उपलब्धा नास्ति।","लॉगिन / खाता":"प्रवेशः / खाता","लॉगिन करें":"प्रविशतु","लॉगआउट":"निर्गच्छतु","नया खाता बनाएँ":"नूतनं खातं रचयतु","पहले से खाता है? लॉगिन करें":"पूर्वमेव खातम् अस्ति? प्रविशतु","बंद करें":"पिधत्तु","ईमेल":"विद्युत्पत्रम्","पासवर्ड":"गुप्तशब्दः","Google से लॉगिन करें":"Google द्वारा प्रविशतु","Facebook से लॉगिन करें":"Facebook द्वारा प्रविशतु","या":"अथवा","रजिस्टर करें":"पञ्जीकरणं करोतु","साहित्य सूत्रधार में प्रवेश":"साहित्यसूत्रधारे स्वागतं भवतु","साहित्य, संवेदना और सृजन का आपका अपना संसार":"साहित्यस्य संवेदनायाः सृजनस्य च भवतः स्वकीयं जगत्","आपकी साहित्यिक यात्रा यहीं से आरम्भ होती है।":"भवतः साहित्ययात्रा अत्र आरभते।","आपका ईमेल पता":"भवतः विद्युत्पत्रसङ्केतः","कम-से-कम 6 अक्षर":"न्यूनातिन्यूनं षट् अक्षराणि","प्रतीक्षा करें":"प्रतीक्षां करोतु","कृपया प्रतीक्षा करें…":"कृपया प्रतीक्षां करोतु…","लॉगिन सफल हुआ!":"प्रवेशः सफलः अभवत्!","लॉगआउट हो गया।":"निर्गमनं सम्पन्नम्।","पहले लॉगिन करें।":"प्रथमं प्रविशतु।","रद्द करें":"निराकरोतु","सहेजें":"रक्षतु","सुरक्षित करें":"रक्षतु","बदलें":"परिवर्तयतु","हटाएँ":"अपनयतु","खोजें":"अन्वेषयतु","शीर्षक लिखें":"शीर्षकं लिखतु","अपनी रचना लिखें":"स्वरचनां लिखतु","रचना का शीर्षक":"रचनायाः शीर्षकम्","रचना का प्रकार":"रचनायाः प्रकारः","रचना का रूप":"रचनायाः स्वरूपम्","उपप्रकार":"उपप्रकारः","चुनें":"चिनोतु","पहले रूप चुनें":"प्रथमं स्वरूपं चिनोतु","प्रकाशित करें":"प्रकाशयतु","ड्राफ्ट सुरक्षित करें":"प्रारूपं रक्षतु","परिवर्तन सुरक्षित करें":"परिवर्तनानि रक्षतु","संगोष्ठी प्रकाशित करें":"साहित्यगोष्ठ्यां प्रकाशयतु","अपने विचार लिखें…":"स्वविचारान् लिखतु…","अभी कोई पोस्ट नहीं है।":"अद्यापि लेखः नास्ति।","पढ़ें":"पठतु","आगे पढ़ें":"अग्रे पठतु","वापस":"प्रतिनिवर्तताम्","अगला":"अग्रिमः","पिछला":"पूर्वः","भाग":"भागः","क्रमशः जारी":"क्रमशः प्रचलति","पूर्ण":"पूर्णम्","स्वतंत्र रचना":"स्वतन्त्रा रचना","नई धारावाहिक रचना":"नूतना धारावाहिकरचना","मौजूदा धारावाहिक में नया भाग":"विद्यमानधारावाहिके नवीनः भागः","धारावाहिक का नाम":"धारावाहिकस्य नाम","धारावाहिक का परिचय":"धारावाहिकस्य परिचयः","अपना धारावाहिक चुनें":"स्वधारावाहिकं चिनोतु","धारावाहिक चुनें":"धारावाहिकं चिनोतु","लेखक":"लेखकः","पाठक":"पाठकः","अनाम पाठक":"अनामपाठकः","रचना":"रचना","रचनाकार":"रचनाकारः","अनुयायी":"अनुगामिनः","संदेश भेजें":"सन्देशं प्रेषयतु","टिप्पणी":"टिप्पणी","टिप्पणी लिखें":"टिप्पणीं लिखतु","समीक्षा":"समीक्षा","रेटिंग":"मूल्याङ्कनम्","साझा करें":"वितरतु","रिपोर्ट करें":"निवेदयतु","सूचनाएँ":"सूचनाः","कोई नई सूचना नहीं है।":"नूतनाः सूचनाः न सन्ति।","लोड हो रहा है…":"लोड् भवति…","डेटा उपलब्ध नहीं":"दत्तांशः उपलब्धः नास्ति","नेटवर्क त्रुटि":"जालत्रुटिः","आप ऑफलाइन हैं।":"भवान् जालविहीनः अस्ति।","भाषा":"भाषा","प्रदर्शन भाषा":"प्रदर्शनभाषा","पठन भाषा":"पठनभाषा","डार्क मोड":"अन्धकारविधिः","लाइट मोड":"प्रकाशविधिः"
 }
};
Object.assign(UI_PHRASES.en,{
"साहित्य सूत्रधार — पढ़ें, लिखें, जुड़ें":"Sahitya Sutradhar — Read, Write, Connect",
"आप ऑफलाइन हैं। सहेजा हुआ वेबसाइट ढाँचा खुल सकता है; लॉगिन, रचनाएँ और क्लाउड सिंक के लिए इंटरनेट आवश्यक है।":"You are offline. The saved app shell may open; internet is required for login, works and cloud sync.","आपका साहित्यिक आँगन":"Your literary space","जहाँ शब्द मिलते हैं।":"Where words come together.","पढ़िए, लिखिए और अपनी रचनाओं को पाठकों तक पहुँचाइए।":"Read, write and share your creations with readers.","अपनी अगली पसंद खोजें":"Find your next favourite","किस तरह का साहित्य पढ़ना चाहेंगे?":"What would you like to read?","शीर्षक, लेखक, विषय या रचना के शब्दों से खोजें।":"Search by title, author, topic or words from a work.","नवीन सृजन":"Fresh creations","अधिकतम 20 नवीनतम":"Up to 20 latest works","नए स्वर":"New voices","साहित्य समुदाय":"Literary community","अपनी पसंद चुनें":"Choose your preferences","ज्ञान · परम्परा · सृजन":"Knowledge · Tradition · Creativity","पढ़ने के लिए":"For reading","आपकी आवाज़":"Your voice","धारावाहिक के प्रत्येक नए भाग का क्रमांक अपने-आप निर्धारित होगा।":"Each new series part will be numbered automatically.","श्रेणी (अधिकतम 4)":"Categories (up to 4)","रचना की भाषा":"Work language","रचना का कवर (अनुपात 9:16)":"Work cover (9:16 ratio)","फ़ॉर्मेटिंग के लिए पहले पाठ चुनें, फिर विकल्प लागू करें।":"Select text first, then apply a formatting option.","मसौदा सुरक्षित रहेगा":"Your draft will be saved","मैं पुष्टि करता/करती हूँ कि यह सामग्री प्रकाशित करने का अधिकार मेरे पास है और यह लागू कानूनों व मंच की सामग्री नीति का उल्लंघन नहीं करती।":"I confirm that I have the right to publish this content and that it complies with applicable laws and platform policies.","ड्राफ्ट आपके Supabase खाते में निजी रूप से सुरक्षित होगा। प्रकाशित रचना सभी पाठकों को दिखाई देगी।":"Drafts are stored privately in your Supabase account. Published works are visible to all readers.","पाठकों की प्रतिक्रिया":"Reader feedback","रेटिंग लोड हो रही है…":"Loading ratings…","रेटिंग चुनें":"Choose a rating","रेटिंग / समीक्षा सुरक्षित करें":"Save rating / review","अपनी रेटिंग हटाएँ":"Delete my rating","अपनी समीक्षा हटाएँ":"Delete my review","समीक्षाएँ और उन पर टिप्पणियाँ":"Reviews and comments","चुना अंश चित्र में शेयर करें":"Share selected excerpt as an image","पढ़ना पूरा किया":"Finished reading","निजी साहित्यिक संवाद":"Private literary messages","पाठकों और रचनाकारों के बीच निजी संदेश।":"Private messages between readers and writers.","संदेश अनुरोध":"Message requests","बातचीत":"Conversations","आपकी किताबें":"Your library","आपकी सेव की गई और बुकमार्क की गई रचनाएँ यहाँ दिखेंगी।":"Your saved and bookmarked works will appear here.","आपका साहित्यिक परिचय":"Your literary profile","0/1000 अक्षर":"0/1,000 characters","परिचय सुरक्षित करें":"Save introduction","प्रोफ़ाइल आँकड़े: फ़ॉलोअर्स और फ़ॉलोइंग":"Profile statistics: followers and following","पढ़े गए कुल शब्द":"Total words read","मेरी रचनाएँ":"My works","मेरी प्रकाशित रचनाएँ":"My published works","मेरे निजी ड्राफ्ट":"My private drafts","ये रचनाएँ केवल आपको दिखाई देती हैं।":"These works are visible only to you.","आपकी संगोष्ठी पोस्ट यहाँ दिखाई देंगी।":"Your Literary Forum posts will appear here.","रात में पढ़ने के लिए रंग बदलें।":"Change the colours for night reading.","इसी भाषा की रचनाएँ प्राथमिकता से दिखेंगी।":"Works in this language will be prioritised.","इन श्रेणियों की रचनाएँ प्राथमिकता से दिखेंगी।":"Works in these categories will be prioritised.","डेमो डेटा मिटाएँ":"Clear demo data","इस डिवाइस पर सुरक्षित स्थानीय रचनाएँ और प्रोफ़ाइल हटेंगी।":"Locally saved works and profile on this device will be removed.","लॉगिन, नया खाता या लॉगआउट।":"Login, create an account or log out.","लॉगिन और क्लाउड सिंक Supabase से जुड़े हैं।":"Login and cloud sync are powered by Supabase.","प्रोफ़ाइल DP तैयार करें":"Adjust profile picture","तस्वीर को खिसकाकर सही जगह रखें।":"Move the picture to position it.","ज़ूम करें":"Zoom","DP सुरक्षित करें":"Save profile picture","साहित्य का संसार सज रहा है…":"Preparing your literary world…"
});
Object.assign(UI_PHRASES.mr,{
"साहित्य सूत्रधार — पढ़ें, लिखें, जुड़ें":"साहित्य सूत्रधार — वाचा, लिहा, जोडा",
"आप ऑफलाइन हैं। सहेजा हुआ वेबसाइट ढाँचा खुल सकता है; लॉगिन, रचनाएँ और क्लाउड सिंक के लिए इंटरनेट आवश्यक है।":"तुम्ही ऑफलाइन आहात. जतन केलेली वेबसाइट उघडू शकते; लॉगिन, रचना आणि क्लाउड सिंकसाठी इंटरनेट आवश्यक आहे.","आपका साहित्यिक आँगन":"तुमचे साहित्यिक अंगण","जहाँ शब्द मिलते हैं।":"जिथे शब्द एकत्र येतात.","पढ़िए, लिखिए और अपनी रचनाओं को पाठकों तक पहुँचाइए।":"वाचा, लिहा आणि तुमच्या रचना वाचकांपर्यंत पोहोचवा.","अपनी अगली पसंद खोजें":"तुमची पुढील आवड शोधा","किस तरह का साहित्य पढ़ना चाहेंगे?":"तुम्हाला कोणते साहित्य वाचायला आवडेल?","शीर्षक, लेखक, विषय या रचना के शब्दों से खोजें।":"शीर्षक, लेखक, विषय किंवा रचनेतील शब्द शोधा.","नवीन सृजन":"नवीन साहित्यनिर्मिती","नए स्वर":"नवे स्वर","साहित्य समुदाय":"साहित्य समुदाय","अपनी पसंद चुनें":"तुमची आवड निवडा","ज्ञान · परम्परा · सृजन":"ज्ञान · परंपरा · निर्मिती","पढ़ने के लिए":"वाचनासाठी","आपकी आवाज़":"तुमचा आवाज","धारावाहिक के प्रत्येक नए भाग का क्रमांक अपने-आप निर्धारित होगा।":"मालिकेतील प्रत्येक नवीन भागाचा क्रमांक आपोआप ठरेल.","श्रेणी (अधिकतम 4)":"प्रकार (कमाल ४)","रचना की भाषा":"रचनेची भाषा","रचना का कवर (अनुपात 9:16)":"रचनेचे मुखपृष्ठ (९:१६)","फ़ॉर्मेटिंग के लिए पहले पाठ चुनें, फिर विकल्प लागू करें।":"मजकूराचे स्वरूप बदलण्यासाठी आधी मजकूर निवडा आणि नंतर पर्याय लागू करा.","मसौदा सुरक्षित रहेगा":"मसुदा जतन केला जाईल","पाठकों की प्रतिक्रिया":"वाचकांचा अभिप्राय","रेटिंग लोड हो रही है…":"गुणांकन लोड होत आहे…","रेटिंग चुनें":"गुणांकन निवडा","रेटिंग / समीक्षा सुरक्षित करें":"गुणांकन / अभिप्राय जतन करा","अपनी रेटिंग हटाएँ":"माझे गुणांकन हटवा","अपनी समीक्षा हटाएँ":"माझा अभिप्राय हटवा","समीक्षाएँ और उन पर टिप्पणियाँ":"अभिप्राय आणि त्यावरील टिप्पण्या","चुना अंश चित्र में शेयर करें":"निवडलेला मजकूर चित्ररूपात शेअर करा","पढ़ना पूरा किया":"वाचन पूर्ण केले","निजी साहित्यिक संवाद":"खासगी साहित्यिक संवाद","पाठकों और रचनाकारों के बीच निजी संदेश।":"वाचक आणि लेखक यांच्यातील खासगी संदेश.","संदेश अनुरोध":"संदेश विनंत्या","बातचीत":"संवाद","आपकी किताबें":"तुमचे वाचनालय","आपकी सेव की गई और बुकमार्क की गई रचनाएँ यहाँ दिखेंगी।":"तुम्ही जतन केलेल्या आणि बुकमार्क केलेल्या रचना येथे दिसतील.","आपका साहित्यिक परिचय":"तुमचा साहित्यिक परिचय","0/1000 अक्षर":"०/१००० अक्षरे","परिचय सुरक्षित करें":"परिचय जतन करा","प्रोफ़ाइल आँकड़े: फ़ॉलोअर्स और फ़ॉलोइंग":"प्रोफाइल आकडेवारी: अनुयायी आणि अनुसरण","पढ़े गए कुल शब्द":"एकूण वाचलेले शब्द","मेरी रचनाएँ":"माझ्या रचना","मेरी प्रकाशित रचनाएँ":"माझ्या प्रकाशित रचना","मेरे निजी ड्राफ्ट":"माझे खासगी मसुदे","ये रचनाएँ केवल आपको दिखाई देती हैं।":"या रचना फक्त तुम्हालाच दिसतात.","आपकी संगोष्ठी पोस्ट यहाँ दिखाई देंगी।":"तुमच्या साहित्यसभा पोस्ट येथे दिसतील.","रात में पढ़ने के लिए रंग बदलें।":"रात्री वाचनासाठी रंग बदला.","इसी भाषा की रचनाएँ प्राथमिकता से दिखेंगी।":"या भाषेतील रचनांना प्राधान्य दिले जाईल.","इन श्रेणियों की रचनाएँ प्राथमिकता से दिखेंगी।":"या प्रकारांतील रचनांना प्राधान्य दिले जाईल.","डेमो डेटा मिटाएँ":"डेमो माहिती पुसा","लॉगिन, नया खाता या लॉगआउट।":"लॉगिन, नवीन खाते किंवा लॉगआउट.","लॉगिन और क्लाउड सिंक Supabase से जुड़े हैं।":"लॉगिन आणि क्लाउड सिंक Supabase शी जोडलेले आहेत.","प्रोफ़ाइल DP तैयार करें":"प्रोफाइल फोटो समायोजित करा","तस्वीर को खिसकाकर सही जगह रखें।":"फोटो योग्य ठिकाणी हलवा.","ज़ूम करें":"झूम करा","DP सुरक्षित करें":"प्रोफाइल फोटो जतन करा","साहित्य का संसार सज रहा है…":"तुमचे साहित्यविश्व सजत आहे…"
});
Object.assign(UI_PHRASES.sa,{
"साहित्य सूत्रधार — पढ़ें, लिखें, जुड़ें":"साहित्यसूत्रधारः — पठतु, लिखतु, संयोजयतु",
"आप ऑफलाइन हैं। सहेजा हुआ वेबसाइट ढाँचा खुल सकता है; लॉगिन, रचनाएँ और क्लाउड सिंक के लिए इंटरनेट आवश्यक है।":"भवान् जालविहीनः अस्ति। संरक्षितं जालस्थलरूपं उद्घाटयितुं शक्यते; प्रवेशाय, रचनानां प्राप्तये, मेघसमन्वयाय च अन्तर्जालम् आवश्यकम्।",
"आपका साहित्यिक आँगन":"भवतः साहित्याङ्गणम्","जहाँ शब्द मिलते हैं।":"यत्र शब्दाः मिलन्ति।","पढ़िए, लिखिए और अपनी रचनाओं को पाठकों तक पहुँचाइए।":"पठतु, लिखतु, स्वकीयाः रचनाः पाठकेभ्यः प्रापयतु।","अपनी अगली पसंद खोजें":"अग्रिमां रुचिं अन्वेषयतु","किस तरह का साहित्य पढ़ना चाहेंगे?":"कीदृशं साहित्यं पठितुम् इच्छति?","शीर्षक, लेखक, विषय या रचना के शब्दों से खोजें।":"शीर्षकेन, लेखकेन, विषयेन अथवा रचनाशब्दैः अन्वेषयतु।","नवीन सृजन":"नूतनं सृजनम्","नए स्वर":"नूतनाः स्वराः","साहित्य समुदाय":"साहित्यसमुदायः","अपनी पसंद चुनें":"स्वरुचिं चिनोतु","ज्ञान · परम्परा · सृजन":"ज्ञानम् · परम्परा · सृजनम्","पढ़ने के लिए":"पठनाय","आपकी आवाज़":"भवतः स्वरः","धारावाहिक के प्रत्येक नए भाग का क्रमांक अपने-आप निर्धारित होगा।":"धारावाहिकस्य प्रत्येकस्य नूतनभागस्य क्रमाङ्कः स्वयमेव निर्धारितः भविष्यति।","श्रेणी (अधिकतम 4)":"वर्गः (अधिकतमं चत्वारः)","रचना की भाषा":"रचनायाः भाषा","रचना का कवर (अनुपात 9:16)":"रचनाचित्रम् (९:१६)","फ़ॉर्मेटिंग के लिए पहले पाठ चुनें, फिर विकल्प लागू करें।":"रूपविन्यासाय प्रथमं पाठं चिनोतु, ततः विकल्पं प्रयोजयतु।","मसौदा सुरक्षित रहेगा":"प्रारूपं सुरक्षितं भविष्यति","पाठकों की प्रतिक्रिया":"पाठकप्रतिक्रिया","रेटिंग लोड हो रही है…":"मूल्याङ्कनानि आगच्छन्ति…","रेटिंग चुनें":"मूल्याङ्कनं चिनोतु","रेटिंग / समीक्षा सुरक्षित करें":"मूल्याङ्कनं समीक्षां च रक्षतु","अपनी रेटिंग हटाएँ":"स्वमूल्याङ्कनम् अपनयतु","अपनी समीक्षा हटाएँ":"स्वसमीक्षाम् अपनयतु","समीक्षाएँ और उन पर टिप्पणियाँ":"समीक्षाः तासु टिप्पण्यश्च","चुना अंश चित्र में शेयर करें":"चयनितांशं चित्ररूपेण वितरतु","पढ़ना पूरा किया":"पठनं समाप्तम्","निजी साहित्यिक संवाद":"निजः साहित्यिकसंवादः","पाठकों और रचनाकारों के बीच निजी संदेश।":"पाठकानां रचनाकाराणां च मध्ये निजसन्देशाः।","संदेश अनुरोध":"सन्देशप्रार्थनाः","बातचीत":"सम्भाषणम्","आपकी किताबें":"भवतः पुस्तकालयः","आपकी सेव की गई और बुकमार्क की गई रचनाएँ यहाँ दिखेंगी।":"भवता संरक्षिताः चिह्निताश्च रचनाः अत्र दृश्यन्ते।","आपका साहित्यिक परिचय":"भवतः साहित्यिकपरिचयः","परिचय सुरक्षित करें":"परिचयं रक्षतु","प्रोफ़ाइल आँकड़े: फ़ॉलोअर्स और फ़ॉलोइंग":"परिचयस्य गणनाः: अनुगामिनः अनुसरणानि च","पढ़े गए कुल शब्द":"पठिताः कुलशब्दाः","मेरी रचनाएँ":"मम रचनाः","मेरी प्रकाशित रचनाएँ":"मम प्रकाशिताः रचनाः","मेरे निजी ड्राफ्ट":"मम निजप्रारूपाणि","ये रचनाएँ केवल आपको दिखाई देती हैं।":"एताः रचनाः केवलं भवते दृश्यन्ते।","आपकी संगोष्ठी पोस्ट यहाँ दिखाई देंगी।":"भवतः साहित्यगोष्ठीलेखाः अत्र दृश्यन्ते।","रात में पढ़ने के लिए रंग बदलें।":"रात्रौ पठनाय वर्णान् परिवर्तयतु।","इसी भाषा की रचनाएँ प्राथमिकता से दिखेंगी।":"अस्यां भाषायां रचनाः प्राथमिकतया दृश्यन्ते।","इन श्रेणियों की रचनाएँ प्राथमिकता से दिखेंगी।":"एतेषु वर्गेषु रचनाः प्राथमिकतया दृश्यन्ते।","डेमो डेटा मिटाएँ":"प्रदर्शनदत्तांशान् अपनयतु","लॉगिन, नया खाता या लॉगआउट।":"प्रवेशः, नूतनखातानिर्माणं निर्गमनं वा।","लॉगिन और क्लाउड सिंक Supabase से जुड़े हैं।":"प्रवेशः मेघसमन्वयश्च Supabase इत्यनेन सम्बद्धौ स्तः।","प्रोफ़ाइल DP तैयार करें":"परिचयचित्रं समायोजयतु","तस्वीर को खिसकाकर सही जगह रखें।":"चित्रं चालयित्वा सम्यक् स्थाने स्थापयतु।","ज़ूम करें":"विस्तारयतु","DP सुरक्षित करें":"चित्रं रक्षतु","साहित्य का संसार सज रहा है…":"साहित्यजगत् सज्जीभवति…"
});

const UI_WORDS={
 en:{"अभी":"Currently","नहीं":"not","उपलब्ध":"available","रचना":"work","रचनाएँ":"works","लेखक":"writer","पाठक":"reader","सुरक्षित":"saved","सफल":"successful","त्रुटि":"error","खाता":"account","प्रोफ़ाइल":"profile","सूचना":"notification","सूचनाएँ":"notifications","टिप्पणी":"comment","समीक्षा":"review","पसंद":"preference","भाषा":"language","पढ़ें":"read","लिखें":"write","खोजें":"search","बदलें":"change","हटाएँ":"delete","सहेजें":"save","प्रकाशित":"published","ड्राफ्ट":"draft","नया":"new","नई":"new","पुराना":"old","नाम":"name","ईमेल":"email","पासवर्ड":"password","लेख":"article","कहानी":"story","कविता":"poem","भाग":"part","धारावाहिक":"series","सभी":"all","कोई":"any","कृपया":"Please","पहले":"first","चुनें":"select","भेजें":"send","जारी":"ongoing","पूर्ण":"complete","खुला":"open","बंद":"close","लोड":"load","हो रहा है":"is in progress"},
 mr:{"अभी":"आत्ता","नहीं":"नाही","उपलब्ध":"उपलब्ध","रचना":"रचना","रचनाएँ":"रचना","लेखक":"लेखक","पाठक":"वाचक","सुरक्षित":"जतन","सफल":"यशस्वी","त्रुटि":"त्रुटी","खाता":"खाते","प्रोफ़ाइल":"प्रोफाइल","सूचना":"सूचना","सूचनाएँ":"सूचना","टिप्पणी":"टिप्पणी","समीक्षा":"परीक्षण","भाषा":"भाषा","पढ़ें":"वाचा","लिखें":"लिहा","खोजें":"शोधा","बदलें":"बदला","हटाएँ":"हटवा","सहेजें":"जतन करा","प्रकाशित":"प्रकाशित","ड्राफ्ट":"मसुदा","नया":"नवीन","नई":"नवीन","नाम":"नाव","ईमेल":"ईमेल","पासवर्ड":"पासवर्ड","कहानी":"कथा","कविता":"कविता","भाग":"भाग","धारावाहिक":"मालिका","सभी":"सर्व","कृपया":"कृपया","चुनें":"निवडा","भेजें":"पाठवा","जारी":"सुरू","पूर्ण":"पूर्ण","लोड":"लोड","हो रहा है":"सुरू आहे"},
 sa:{"अभी":"अधुना","नहीं":"न","उपलब्ध":"उपलब्धः","रचना":"रचना","रचनाएँ":"रचनाः","लेखक":"लेखकः","पाठक":"पाठकः","सुरक्षित":"रक्षित","सफल":"सफल","त्रुटि":"दोषः","खाता":"खातम्","प्रोफ़ाइल":"परिचयः","सूचना":"सूचना","सूचनाएँ":"सूचनाः","टिप्पणी":"टिप्पणी","समीक्षा":"समीक्षा","भाषा":"भाषा","पढ़ें":"पठतु","लिखें":"लिखतु","खोजें":"अन्वेषयतु","बदलें":"परिवर्तयतु","हटाएँ":"अपनयतु","सहेजें":"रक्षतु","प्रकाशित":"प्रकाशित","ड्राफ्ट":"प्रारूप","नया":"नूतन","नई":"नूतना","नाम":"नाम","ईमेल":"विद्युत्पत्रम्","पासवर्ड":"गुप्तशब्दः","कहानी":"कथा","कविता":"कविता","भाग":"भागः","धारावाहिक":"धारावाहिक","सभी":"सर्वे","कृपया":"कृपया","चुनें":"चिनोतु","भेजें":"प्रेषयतु","जारी":"प्रचलति","पूर्ण":"पूर्णम्","लोड":"लोड्"}
};
Object.assign(UI_WORDS.en,{"रोमांटिक":"Romance","कॉमेडी":"Comedy","हास्य-व्यंग्य":"Satire","प्रेम":"Love","सस्पेंस":"Suspense","थ्रिलर":"Thriller","एडवेंचर":"Adventure","साइंस":"Science","फिक्शन":"Fiction","फैंटेसी":"Fantasy","देशप्रेम":"Patriotism","शौर्य":"Valour","ओज":"Oratory","ऐतिहासिक":"Historical","पौराणिक":"Mythological","मिश्रित":"Mixed","रेखाचित्र":"Sketch","बालकथा":"Children’s story","मनोरंजन":"Entertainment","शिक्षाप्रद":"Educational","अन्य":"Other","गद्य":"Prose","पद्य":"Poetry","चंपू":"Champu","विवरण":"Details","संपादित":"Edit","रंग":"Colour","अक्षर":"Characters","श्रेणी":"Category","जोड़ें":"Add","खोलें":"Open","पिछला":"Previous","अगला":"Next","स्वतंत्र":"Standalone","संदेश":"Message","पसंद":"Like","ड्राफ्ट":"Draft","कवर":"Cover"});
Object.assign(UI_WORDS.mr,{"रोमांटिक":"रोमँटिक","कॉमेडी":"विनोदी","हास्य-व्यंग्य":"विनोदी व्यंग्य","प्रेम":"प्रेम","सस्पेंस":"रहस्य","थ्रिलर":"थरार","एडवेंचर":"साहस","साइंस":"विज्ञान","फिक्शन":"काल्पनिक","फैंटेसी":"कल्पनारम्य","देशप्रेम":"देशप्रेम","शौर्य":"शौर्य","ओज":"ओज","ऐतिहासिक":"ऐतिहासिक","पौराणिक":"पौराणिक","मिश्रित":"मिश्र","रेखाचित्र":"रेखाचित्र","बालकथा":"बालकथा","मनोरंजन":"मनोरंजन","शिक्षाप्रद":"बोधप्रद","अन्य":"इतर","गद्य":"गद्य","पद्य":"पद्य","चंपू":"चंपू","विवरण":"तपशील","संपादित":"संपादित","रंग":"रंग","अक्षर":"अक्षरे","श्रेणी":"प्रकार","जोड़ें":"जोडा","खोलें":"उघडा","पिछला":"मागील","अगला":"पुढील","स्वतंत्र":"स्वतंत्र","संदेश":"संदेश","पसंद":"आवड","ड्राफ्ट":"मसुदा","कवर":"मुखपृष्ठ"});
Object.assign(UI_WORDS.sa,{"रोमांटिक":"प्रणयात्मक","कॉमेडी":"हास्यम्","हास्य-व्यंग्य":"हास्यव्यङ्ग्यम्","प्रेम":"प्रेम","सस्पेंस":"कौतुकम्","थ्रिलर":"रोमाञ्चकम्","एडवेंचर":"साहसिकम्","साइंस":"विज्ञानम्","फिक्शन":"कल्पितम्","फैंटेसी":"कल्पनालोकः","देशप्रेम":"देशप्रेम","शौर्य":"शौर्यम्","ओज":"ओजः","ऐतिहासिक":"ऐतिहासिकम्","पौराणिक":"पौराणिकम्","मिश्रित":"मिश्रितम्","रेखाचित्र":"रेखाचित्रम्","बालकथा":"बालकथा","मनोरंजन":"मनोरञ्जनम्","शिक्षाप्रद":"शिक्षाप्रदम्","अन्य":"अन्यत्","गद्य":"गद्यम्","पद्य":"पद्यम्","चंपू":"चम्पूकाव्यम्","विवरण":"विवरणम्","संपादित":"सम्पादितम्","रंग":"वर्णः","अक्षर":"अक्षरम्","श्रेणी":"वर्गः","जोड़ें":"योजयतु","खोलें":"उद्घाटयतु","पिछला":"पूर्वः","अगला":"अग्रिमः","स्वतंत्र":"स्वतन्त्रम्","संदेश":"सन्देशः","पसंद":"रुचिः","ड्राफ्ट":"प्रारूपम्","कवर":"आवरणम्"});
function uiTranslate(value,lang=state?.profile?.uiLanguage||"hi"){
 const input=String(value??"");if(!input||lang==="hi")return input;
 const phrases=UI_PHRASES[lang]||{},words=UI_WORDS[lang]||{};
 if(phrases[input])return phrases[input];
 let out=input;
 for(const [src,dst] of Object.entries(phrases).sort((a,b)=>b[0].length-a[0].length))out=out.split(src).join(dst);
 for(const [src,dst] of Object.entries(words).sort((a,b)=>b[0].length-a[0].length))out=out.replaceAll(src,dst);
 return out;
}
function applyUILanguage(){
 const lang=state?.profile?.uiLanguage||"hi";
 document.documentElement.lang=lang;
 document.documentElement.dataset.uiLanguage=lang;
 if(!document.documentElement.dataset.ssTitleOriginal)document.documentElement.dataset.ssTitleOriginal=document.title;
 document.title=uiTranslate(document.documentElement.dataset.ssTitleOriginal,lang);
 const description=document.querySelector('meta[name="description"]');
 if(description){if(!description.dataset.ssOriginal)description.dataset.ssOriginal=description.content;description.content=uiTranslate(description.dataset.ssOriginal,lang);}
 const protectedSelector=".story-card h3,.story-card .excerpt,.story-card .story-author-link,.writer-card strong,.profile-card h2,.community-post-head strong,.reader-body,.reader-title,#readerTitle,#readerAuthor,.reader-author,.profile-name,.author-name,.user-content,.community-post p,.community-post-body,.post-body,.own-community-post p,.profile-bio,.story-excerpt,textarea,input,script,style,code";
 const translateNode=node=>{
  if(node.nodeType!==Node.TEXT_NODE||!node.nodeValue.trim())return;
  const parent=node.parentElement;if(!parent||parent.closest(protectedSelector))return;
  if(!node.dataset.ssOriginalText)node.dataset.ssOriginalText=node.nodeValue;
  const original=node.dataset.ssOriginalText;
  const translated=uiTranslate(original,lang);
  if(node.nodeValue!==translated)node.nodeValue=translated;
 };
 const walk=root=>{if(root.nodeType===Node.TEXT_NODE){translateNode(root);return;}if(root.nodeType!==Node.ELEMENT_NODE)return;if(root.closest?.(protectedSelector))return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))translateNode(n);};
 walk(document.body);
 document.querySelectorAll("input[placeholder],textarea[placeholder],button[aria-label],*[title],select[aria-label]").forEach(el=>{
  for(const attr of ["placeholder","aria-label","title"]){if(!el.hasAttribute(attr))continue;const key="ssOriginal"+attr;if(!el.dataset[key])el.dataset[key]=el.getAttribute(attr);el.setAttribute(attr,uiTranslate(el.dataset[key],lang));}
 });
 const authHeading=document.getElementById("authHeading");if(authHeading){const register=authHeading.dataset.authMode==="register";authHeading.textContent=uiTranslate(register?"नया खाता बनाएँ":"साहित्य सूत्रधार में प्रवेश",lang);}
 const authSubtitle=document.getElementById("authSubtitle");if(authSubtitle)authSubtitle.textContent=uiTranslate("साहित्य, संवेदना और सृजन का आपका अपना संसार",lang);
}

function emptyAccountState(){
  return {stories:[], profile:{name:"अनाम पाठक",intro:"",wordsRead:0,bookmarks:[],avatarUrl:"",readingLanguage:"hi",uiLanguage:"hi",preferredCategories:[]}, theme:"light", drafts:{title:"",body:"",type:"",subtype:"",categories:[]}};
}
function accountStorageKey(userId=currentUserId){ return STORAGE + "." + (userId || "guest"); }
function loadState(){
  try{
    let saved = JSON.parse(localStorage.getItem(accountStorageKey(null)) || "null");
    // पुराने साहित्य ग्राम खाते की कुंजी को हटाए बिना संगतता बनाए रखें।
    if(!saved){
      saved = JSON.parse(localStorage.getItem("sahityaGram.v1") || "null");
      if(saved){
        try{localStorage.setItem(accountStorageKey(null),JSON.stringify(saved));}catch(e){}
      }
    }
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
  return `<article class="story-card"><div class="cover-grid"><button class="cover-open" type="button" data-read="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.title)} पढ़ें">${s.coverUrl?`<img class="cover-thumb" src="${escapeHtml(s.coverUrl)}" alt="${escapeHtml(s.title)} कवर">`:`<div class="cover-placeholder">❀</div>`}</button><div><div>${cats}</div><h3>${escapeHtml(s.title)}</h3><p><button class="story-author-link" type="button" data-story-author="${escapeHtml(s.authorId||"")}">${escapeHtml(s.author||"अनाम लेखक")}</button> · ${escapeHtml(s.type||"रचना")}${s.subtype?" / "+escapeHtml(s.subtype):""}</p><p class="excerpt">${escapeHtml(excerpt)}${excerpt.length>=150?"…":""}</p><div class="story-meta"><span>◉ ${s.reads||0} पाठक</span><button type="button" data-work-detail="${escapeHtml(s.id)}">विवरण</button><button data-read="${escapeHtml(s.id)}">पढ़ें ↗</button>${isOwner && s.status === "published" ? `<button class="secondary-button" type="button" data-edit-work="${escapeHtml(s.id)}">संपादित करें ✎</button>` : ""}</div></div></div></article>`;
}
function renderStoryCards(items){
  const groups=new Map(), emitted=new Set(), output=[];
  for(const work of items){
    if(!work.seriesId){output.push(storyCard(work));continue;}
    const key=String(work.seriesId);
    if(emitted.has(key))continue;
    emitted.add(key);
    const parts=items.filter(x=>String(x.seriesId)===key&&x.status==="published")
      .sort((x,y)=>(Number(x.partNumber)||1)-(Number(y.partNumber)||1));
    const first=parts[0]||work, title=first.seriesTitle||first.title;
    const chapters=parts.map(part=>`<button type="button" class="series-part-link" data-read="${escapeHtml(part.id)}">भाग ${Number(part.partNumber)||1}: ${escapeHtml(part.title)}</button>`).join("");
    const cats=(first.categories||[]).map(c=>`<span class="tag">${escapeHtml(c)}</span>`).join(" ");
    output.push(`<article class="story-card series-story-card"><div class="cover-grid"><button class="cover-open" type="button" data-read="${escapeHtml(first.id)}" aria-label="${escapeHtml(title)} पढ़ें">${first.coverUrl?`<img class="cover-thumb" src="${escapeHtml(first.coverUrl)}" alt="">`:`<div class="cover-placeholder">❀</div>`}</button><div><div>${cats}<span class="tag">धारावाहिक · ${parts.length} भाग</span></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(first.author||"अनाम लेखक")}</p><div class="story-meta"><span>धारावाहिक · ${parts.length} भाग</span><button type="button" data-series-detail="${escapeHtml(key)}">विवरण और सभी भाग</button></div><div class="series-parts-list">${chapters}</div></div></div></article>`);
  }
  return output.join("");
}
function renderStories(){
  let list=[...state.stories].filter(s=>s.status==="published").sort((a,b)=>(b.created||0)-(a.created||0));
  const preferred=state.profile.preferredCategories||[];
  if(preferred.length)list.sort((a,b)=>Number((b.categories||[]).some(c=>preferred.includes(c)))-Number((a.categories||[]).some(c=>preferred.includes(c))));
  if(activeCategory!=="सभी")list=list.filter(s=>(s.categories||[]).includes(activeCategory));
  const query=(document.getElementById("workSearchInput")?.value||"").trim().toLocaleLowerCase("hi");
  if(query){
    list=list.filter(s=>[s.title,s.author,s.body,s.type,s.subtype,...(s.categories||[]) ]
      .some(value=>String(value||"").toLocaleLowerCase("hi").includes(query)));
  }
  document.getElementById("storyCount").textContent=`${list.length} रचनाएँ`;
  document.getElementById("storyList").innerHTML=renderStoryCards(list);
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
  const box=document.getElementById("latestWorksList");if(box){box.innerHTML=renderStoryCards(latest)||'<p class="muted">अभी कोई प्रकाशित रचना नहीं।</p>';bindReadButtons();}
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
    const latestBox=document.getElementById("latestWorksList");if(latestBox){latestBox.innerHTML=renderStoryCards(state.stories.filter(x=>x.status==="published").sort((a,b)=>b.created-a.created).slice(0,20));bindReadButtons();}
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
  const seriesMode = document.getElementById("seriesMode");
const seriesTitle = document.getElementById("seriesTitle");
const seriesDescription = document.getElementById("seriesDescription");
const existingSeries = document.getElementById("existingSeries");
const seriesStatus = document.getElementById("seriesStatus");

if (seriesMode) {
  seriesMode.value = s.seriesId ? "existing" : "standalone";
}

if (seriesTitle) seriesTitle.value = "";
if (seriesDescription) seriesDescription.value = "";

if (seriesStatus) {
  seriesStatus.value = s.seriesStatus || "ongoing";
}

updateSeriesEditor();

if (s.seriesId) {
  await loadMySeries();

  if (existingSeries) {
    existingSeries.value = s.seriesId;
    updateSelectedSeriesStatus();
  }
}
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
      .select("id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language,series_id,part_number,series_title")
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
    
let seriesRows = [];

const seriesIds = [
  ...new Set((works || []).map(w => w.series_id).filter(Boolean))
];

if (seriesIds.length) {
  const { data, error: seriesError } = await supabaseClient
    .from("work_series")
    .select("id,title,description,status")
    .in("id", seriesIds);

  if (seriesError) throw seriesError;
  seriesRows = data || [];
}
    
    const cloudStories = (works || []).map(w => {
      const profile = profiles.find(p => p.id === w.author_id);
      const seriesInfo = seriesRows.find(
  item => item.id === w.series_id
);
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
        seriesId: w.series_id || null,
partNumber: w.part_number || 1,
seriesTitle: w.series_title || "",
        seriesStatus: seriesInfo?.status || "ongoing",
seriesDescription: seriesInfo?.description || "",
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
    const payload={author_id:user.id,title:title||"शीर्षक रहित मसौदा",content:body,work_type:getDatabaseWorkType(type,subtype),main_form:type||"गद्य",subtype:subtype||null,status:"draft",self_declaration_accepted:false,content_language:language};
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


async function loadMySeries(){
  const select = document.getElementById("existingSeries");
  if(!select || !supabaseClient) return;

  const {data:{user}} = await supabaseClient.auth.getUser();

  if(!user){
    toast("धारावाहिक देखने के लिए पहले लॉगिन करें।");
    return;
  }

  const {data,error} = await supabaseClient
    .from("work_series")
    .select("id,title,status")
    .eq("author_id",user.id)
    .order("created_at",{ascending:false});

  if(error){
    toast("धारावाहिक लोड नहीं हुए: "+error.message);
    return;
  }

  select.innerHTML =
    '<option value="">धारावाहिक चुनें</option>' +
    (data||[]).map(s=>`
      <option value="${escapeHtml(s.id)}"
        data-status="${escapeHtml(s.status)}">
        ${escapeHtml(s.title)} — ${s.status==="completed"?"पूर्ण":"क्रमशः जारी"}
      </option>
    `).join("");

  if(!data?.length){
    toast("आपका कोई पुराना धारावाहिक नहीं मिला।");
  }
}

function updateSeriesEditor(){
  const mode = document.getElementById("seriesMode")?.value || "standalone";

  document.getElementById("newSeriesFields")
    ?.classList.toggle("hidden",mode!=="new");

  document.getElementById("existingSeriesFields")
    ?.classList.toggle("hidden",mode!=="existing");

  document.getElementById("seriesStatusField")
    ?.classList.toggle("hidden",mode==="standalone");

  if(mode==="existing"){
    loadMySeries();
  }
}

function updateSelectedSeriesStatus(){
  const select = document.getElementById("existingSeries");
  const selected = select?.selectedOptions?.[0];

  if(selected?.dataset.status){
    document.getElementById("seriesStatus").value =
      selected.dataset.status;
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

  const seriesMode = document.getElementById("seriesMode")?.value || "standalone";
  const seriesTitleInput = document.getElementById("seriesTitle");
  const seriesDescriptionInput = document.getElementById("seriesDescription");
  const existingSeriesSelect = document.getElementById("existingSeries");
  const seriesStatus = document.getElementById("seriesStatus")?.value || "ongoing";

  if (!title || !body || !type || !categoryNames.length) {
    toast("शीर्षक, सामग्री, विधा और कम-से-कम एक श्रेणी भरें।");
    return;
  }

  if (type !== "चंपू काव्य" && !subtype) {
    toast("कृपया रचना का उपप्रकार चुनें।");
    return;
  }

  if (!editingWorkId && seriesMode === "new") {
    if (!seriesTitleInput?.value.trim()) {
      toast("कृपया धारावाहिक का नाम लिखें।");
      return;
    }
  }

  if (!editingWorkId && seriesMode === "existing" && !existingSeriesSelect?.value) {
    toast("कृपया अपना धारावाहिक चुनें।");
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

  let createdSeriesId = null;
  let publishedWorkId = null;

  try {
    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError) throw authError;

    const user = authData?.user;
    if (!user) {
      toast("रचना प्रकाशित करने के लिए पहले लॉगिन करें।");
      return;
    }

    const currentEditingWork = editingWorkId
      ? state.stories.find(x => String(x.id) === String(editingWorkId))
      : null;
    const needsAuthorDeclaration = !editingWorkId || !currentEditingWork || currentEditingWork.status === "draft";
    if (needsAuthorDeclaration && !window.confirm(
      "लेखक की स्व-घोषणा\n\nमैं पुष्टि करता/करती हूँ कि यह रचना मेरी मौलिक रचना है, अथवा इसे साहित्य सूत्रधार पर प्रकाशित कराने की वैध अनुमति मेरे पास है। प्रस्तुत सामग्री के अधिकार और उसकी जिम्मेदारी मेरी है।\n\nक्या आप इस घोषणा से सहमत होकर रचना प्रकाशित करना चाहते हैं?"
    )) return;

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

    let seriesId = null;
    let finalSeriesTitle = null;
    let partNumber = 1;

    // नई धारावाहिक रचना बनाना
    if (!editingWorkId && seriesMode === "new") {
      const { data: newSeries, error: seriesError } =
        await supabaseClient
          .from("work_series")
          .insert({
            author_id: user.id,
            title: seriesTitleInput.value.trim(),
            description: seriesDescriptionInput?.value.trim() || "",
            status: seriesStatus
          })
          .select("id,title")
          .single();

      if (seriesError) throw seriesError;

      seriesId = newSeries.id;
      finalSeriesTitle = newSeries.title;
      partNumber = 1;
      createdSeriesId = newSeries.id;
    }

    // मौजूदा धारावाहिक में नया भाग जोड़ना
    if (!editingWorkId && seriesMode === "existing") {
      const selectedId = existingSeriesSelect.value;

      const { data: selectedSeries, error: selectedError } =
        await supabaseClient
          .from("work_series")
          .select("id,title")
          .eq("id", selectedId)
          .eq("author_id", user.id)
          .single();

      if (selectedError) throw selectedError;

      seriesId = selectedSeries.id;
      finalSeriesTitle = selectedSeries.title;

      const { data: lastParts, error: partsError } =
        await supabaseClient
          .from("works")
          .select("part_number")
          .eq("series_id", seriesId)
          .order("part_number", { ascending: false })
          .limit(1);

      if (partsError) throw partsError;

      partNumber = (lastParts?.[0]?.part_number || 0) + 1;
    }

    // पुरानी प्रकाशित रचना को मौजूदा धारावाहिक में जोड़ना
    if (editingWorkId && seriesMode === "existing") {
      const selectedId = existingSeriesSelect?.value;

      if (!selectedId) {
        throw new Error("कृपया धारावाहिक चुनें।");
      }

      const { data: selectedSeries, error: selectedError } =
        await supabaseClient
          .from("work_series")
          .select("id,title")
          .eq("id", selectedId)
          .eq("author_id", user.id)
          .single();

      if (selectedError) throw selectedError;

      seriesId = selectedSeries.id;
      finalSeriesTitle = selectedSeries.title;

      const { data: lastParts, error: partsError } =
        await supabaseClient
          .from("works")
          .select("part_number")
          .eq("series_id", seriesId)
          .neq("id", editingWorkId)
          .order("part_number", { ascending: false })
          .limit(1);

      if (partsError) throw partsError;

      partNumber = (lastParts?.[0]?.part_number || 0) + 1;
    }
    
    let coverUrl = null;

    if (coverFile) {
      coverUrl = await uploadSutradharImage(coverFile, "covers");
    }

    let work;

    if (editingWorkId) {
      const existing = state.stories.find(
        x => String(x.id) === String(editingWorkId)
      );

      if (!existing || existing.authorId !== user.id) {
        throw new Error("केवल अपनी रचना संपादित कर सकते हैं।");
      }

      const updateData = {
        title,
        content: body,
        work_type: getDatabaseWorkType(type, subtype),
        main_form: type,
        subtype: subtype || null,
        content_language: contentLanguage,
        status: existing.status === "draft" ? "draft" : "published"
      };

      if (coverUrl) updateData.cover_url = coverUrl;
      if (editingWorkId && seriesMode === "existing") {
  updateData.series_id = seriesId;
  updateData.part_number = partNumber;
  updateData.series_title = finalSeriesTitle;
      }

      // धारावाहिक से हटाकर स्वतंत्र रचना बनाना
if (editingWorkId && seriesMode === "standalone") {
  updateData.series_id = null;
  updateData.part_number = 1;
  updateData.series_title = null;
}
      
      const { data, error: workError } = await supabaseClient
        .from("works")
        .update(updateData)
        .eq("id", editingWorkId)
        .eq("author_id", user.id)
        .select()
        .single();

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
          status: "draft",
          self_declaration_accepted: false,
          content_language: contentLanguage,
          cover_url: coverUrl,
          series_id: seriesId,
          part_number: partNumber,
          series_title: finalSeriesTitle
        })
        .select()
        .single();

      if (workError) throw workError;

      work = data;
      publishedWorkId = data.id;
    }

    // धारावाहिक की स्थिति अपडेट करना
    if (seriesId) {
      const { error: statusError } = await supabaseClient
        .from("work_series")
        .update({
          status: seriesStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", seriesId)
        .eq("author_id", user.id);

      if (statusError) throw statusError;
    }

    const desiredCategoryIds = categoryNames.map(
      name => categoryMap.get(name)
    );

    let linkError = null;

    if (editingWorkId) {
      const { data: oldLinks, error: oldLinksError } =
        await supabaseClient
          .from("work_categories")
          .select("category_id")
          .eq("work_id", work.id);

      if (oldLinksError) throw oldLinksError;

      const oldIds = (oldLinks || []).map(x => x.category_id);
      const addIds = desiredCategoryIds.filter(id => !oldIds.includes(id));
      const removeIds = oldIds.filter(id => !desiredCategoryIds.includes(id));

      if (addIds.length) {
        const result = await supabaseClient
          .from("work_categories")
          .insert(addIds.map(category_id => ({
            work_id: work.id,
            category_id
          })));

        linkError = result.error;
      }

      if (!linkError && removeIds.length) {
        const result = await supabaseClient
          .from("work_categories")
          .delete()
          .eq("work_id", work.id)
          .in("category_id", removeIds);

        linkError = result.error;
      }

    } else {
      const result = await supabaseClient
        .from("work_categories")
        .insert(
          desiredCategoryIds.map(category_id => ({
            work_id: work.id,
            category_id
          }))
        );

      linkError = result.error;
    }

    if (linkError) {
      console.error("श्रेणी लिंक सेव नहीं हुए:", linkError);
      throw new Error("रचना की श्रेणियाँ पूरी तरह सुरक्षित नहीं हुईं: " + linkError.message);
    }

    if (needsAuthorDeclaration) {
      const { error: declarationError } = await supabaseClient.rpc(
        "confirm_own_work_publication",
        { p_work_id: work.id }
      );
      if (declarationError) throw declarationError;
      publishedWorkId = work.id;
    }

    toast(
      editingWorkId
        ? (needsAuthorDeclaration ? "आपकी स्व-घोषणा दर्ज हुई और रचना प्रकाशित हो गई।" : "आपकी प्रकाशित रचना के बदलाव सुरक्षित हो गए।")
        : seriesId
          ? `धारावाहिक का भाग ${partNumber} आपकी स्व-घोषणा के बाद प्रकाशित हो गया!`
          : "आपकी स्व-घोषणा दर्ज हुई और रचना सफलतापूर्वक प्रकाशित हो गई!"
    );

    editingWorkId = null;

    state.drafts = {
      title: "",
      body: "",
      type: "",
      subtype: "",
      categories: []
    };

    saveState();

    if (document.getElementById("seriesMode")) {
      document.getElementById("seriesMode").value = "standalone";
      if (seriesTitleInput) seriesTitleInput.value = "";
      if (seriesDescriptionInput) seriesDescriptionInput.value = "";
      if (existingSeriesSelect) existingSeriesSelect.value = "";
      if (document.getElementById("seriesStatus")) {
        document.getElementById("seriesStatus").value = "ongoing";
      }
      updateSeriesEditor();
    }

    document.getElementById("writeDialog").close();
    await loadCloudWorks();

  } catch (error) {
    console.error("रचना प्रकाशित करने में समस्या:", error);

    // यदि नई धारावाहिक एंट्री बनी लेकिन रचना प्रकाशित नहीं हुई,
    // तो खाली धारावाहिक एंट्री हटा दें।
    if (createdSeriesId && !publishedWorkId) {
      await supabaseClient
        .from("work_series")
        .delete()
        .eq("id", createdSeriesId)
        .eq("author_id", currentUserId);
    }

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
let readerProgressUserId=undefined;
let readerProgressSaveTimer=null;
let readerProgressSaveInFlight=false;
let readerProgressSavePending=false;
let readerProgressCloudWarningShown=false;
function reportReaderProgressCloudError(error){
 console.warn("क्लाउड पठन-प्रगति सिंक उपलब्ध नहीं:",error?.message||error);
 if(!readerProgressCloudWarningShown){
  readerProgressCloudWarningShown=true;
  toast("पठन-प्रगति इस डिवाइस में सुरक्षित है, लेकिन क्लाउड सिंक नहीं हो पाया।");
 }
}
function parseReaderProgressStore(key){
 try{const value=JSON.parse(localStorage.getItem(key)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
 catch{return {};}
}
function readerProgressStorageKey(userId=readerProgressUserId){
 if(userId===undefined)return READER_PROGRESS_KEY;
 return `${READER_PROGRESS_KEY}.v2.${userId||"guest"}`;
}
function loadReaderProgress(){
 const key=readerProgressStorageKey(),saved=localStorage.getItem(key);
 if(saved!==null)return parseReaderProgressStore(key);
 // पुराने v1 डेटा को पहले उपयोगकर्ता/गेस्ट के स्थानीय दायरे में कॉपी करें; मूल v1 key कभी नहीं मिटती।
 let initial={};
 if(readerProgressUserId===undefined)return parseReaderProgressStore(READER_PROGRESS_KEY);
 const legacyOwner=localStorage.getItem(READER_PROGRESS_KEY+".legacy_owner");
 if(!legacyOwner){
  initial=parseReaderProgressStore(READER_PROGRESS_KEY);
  if(readerProgressUserId){
   const guest=parseReaderProgressStore(READER_PROGRESS_KEY+".v2.guest");
   for(const [id,item] of Object.entries(guest)){
    const prior=initial[id];
    initial[id]=prior?{...prior,...(Number(item.updatedAt)>Number(prior.updatedAt)?item:{}),seen:[...new Set([...(prior.seen||[]),...(item.seen||[])])],words:Math.max(Number(prior.words)||0,Number(item.words)||0)}:item;
   }
   try{localStorage.setItem(READER_PROGRESS_KEY+".legacy_owner",readerProgressUserId);}catch{}
  }
 }
 try{localStorage.setItem(key,JSON.stringify(initial));}catch{}
 return initial;
}
function saveAllReaderProgress(all){try{localStorage.setItem(readerProgressStorageKey(),JSON.stringify(all));}catch(error){console.warn("स्थानीय पठन-प्रगति सुरक्षित नहीं हुई:",error);}}
function saveReaderProgress(id,entry){const all=loadReaderProgress();all[String(id)]=entry;saveAllReaderProgress(all);}
function readerProgressFor(id){return loadReaderProgress()[String(id)]||{page:0,seen:[],words:0,ratio:0,totalPages:0,updatedAt:0};}
function readerProgressRatio(entry){
 if(Number.isFinite(Number(entry?.ratio)))return Math.max(0,Math.min(1,Number(entry.ratio)));
 const total=Number(entry?.totalPages)||0,page=Number(entry?.page)||0;
 return total>0?Math.max(0,Math.min(1,(page+1)/total)):0;
}
function scheduleCloudReaderProgressSave(id=currentReaderId){
 if(!readerProgressUserId||!supabaseClient||!id)return;
 clearTimeout(readerProgressSaveTimer);
 const targetUserId=readerProgressUserId;
 readerProgressSaveTimer=setTimeout(()=>flushCloudReaderProgress(id,targetUserId),650);
}
async function flushCloudReaderProgress(id=currentReaderId,expectedUserId=readerProgressUserId){
 clearTimeout(readerProgressSaveTimer);readerProgressSaveTimer=null;
 if(!expectedUserId||expectedUserId!==readerProgressUserId||!supabaseClient||!id)return;
 if(readerProgressSaveInFlight){readerProgressSavePending=true;return;}
 const userId=readerProgressUserId,progress=readerProgressFor(id),ratio=readerProgressRatio(progress);
 if(!progress.updatedAt&&!progress.words&&!progress.page)return;
 readerProgressSaveInFlight=true;
 try{
  // last_position stores a device-independent position (0–10,000 basis points).
  const payload={user_id:userId,work_id:id,last_position:Math.round(ratio*10000),words_read:Math.max(0,Math.round(Number(progress.words)||0)),updated_at:new Date(Number(progress.updatedAt)||Date.now()).toISOString()};
  const {error}=await supabaseClient.from("reading_progress").upsert(payload,{onConflict:"user_id,work_id"});
  if(error)throw error;
 }catch(error){reportReaderProgressCloudError(error);}
 finally{
  readerProgressSaveInFlight=false;
  if(readerProgressSavePending){readerProgressSavePending=false;scheduleCloudReaderProgressSave(id);}
 }
}
async function loadCloudReaderProgress(id,userId=readerProgressUserId){
 if(!supabaseClient||!id||!userId)return readerProgressFor(id);
 try{
  const {data,error}=await supabaseClient.from("reading_progress")
   .select("user_id,work_id,last_position,words_read,updated_at")
   .eq("user_id",userId).eq("work_id",id).maybeSingle();
  if(error)throw error;
  const local=readerProgressFor(id);
  if(!data){if(local.updatedAt||local.words||local.page)scheduleCloudReaderProgressSave(id);return local;}
  const cloudTime=Date.parse(data.updated_at||"")||0,localTime=Number(local.updatedAt)||0;
  const cloudRatio=Math.max(0,Math.min(1,(Number(data.last_position)||0)/10000));
  if(cloudTime>localTime){
   const merged={...local,ratio:cloudRatio,words:Math.max(Number(local.words)||0,Number(data.words_read)||0),updatedAt:cloudTime};
   saveReaderProgress(id,merged);return merged;
  }
  const merged={...local,words:Math.max(Number(local.words)||0,Number(data.words_read)||0)};
  if(localTime>cloudTime)scheduleCloudReaderProgressSave(id);
  saveReaderProgress(id,merged);return merged;
 }catch(error){reportReaderProgressCloudError(error);return readerProgressFor(id);}
}
async function loadCloudReaderProgressForUser(userId){
 if(!supabaseClient||!userId)return;
 try{
  const {data,error}=await supabaseClient.from("reading_progress")
   .select("user_id,work_id,last_position,words_read,updated_at")
   .eq("user_id",userId).order("updated_at",{ascending:false}).limit(500);
  if(error)throw error;
  const all=loadReaderProgress();
  for(const row of data||[]){
   const id=String(row.work_id),local=all[id]||{page:0,seen:[],words:0,ratio:0,totalPages:0,updatedAt:0};
   const cloudTime=Date.parse(row.updated_at||"")||0,localTime=Number(local.updatedAt)||0;
   const words=Math.max(Number(local.words)||0,Number(row.words_read)||0);
   if(cloudTime>localTime){
    all[id]={...local,ratio:Math.max(0,Math.min(1,(Number(row.last_position)||0)/10000)),words,updatedAt:cloudTime};
   }else{
    all[id]={...local,words};
    if(localTime>cloudTime)scheduleCloudReaderProgressSave(id);
   }
  }
  saveAllReaderProgress(all);renderLibrary();
 }catch(error){reportReaderProgressCloudError(error);}
}
function readerUsesVerticalScroll(){
 return document.body.classList.contains("mobile-full-app") && window.matchMedia("(max-width: 760px)").matches;
}
function readerPageMetrics(){
 const el=document.getElementById(readerUsesVerticalScroll()?"readerPage":"readerBody");if(!el)return;
 const vertical=readerUsesVerticalScroll();
 const extent=vertical?el.scrollHeight:el.scrollWidth;
 const size=vertical?el.clientHeight:el.clientWidth;
 const offset=vertical?el.scrollTop:el.scrollLeft;
 readerPagesTotal=Math.max(1,Math.ceil(extent/Math.max(1,size)));
 readerPageIndex=Math.min(readerPagesTotal-1,Math.max(0,Math.round(offset/Math.max(1,size))));
 const status=document.getElementById("readerPageStatus");if(status)status.textContent=`पृष्ठ ${readerPageIndex+1} / ${readerPagesTotal}`;
 const prev=document.getElementById("readerPrevPage"),next=document.getElementById("readerNextPage");
 if(prev)prev.disabled=readerPageIndex===0;if(next)next.disabled=readerPageIndex>=readerPagesTotal-1;
}
function readerGoPage(index,direction){
 const vertical=readerUsesVerticalScroll(),el=document.getElementById(vertical?"readerPage":"readerBody");if(!el)return;
 const next=Math.max(0,Math.min(readerPagesTotal-1,index));
 if(!vertical){el.classList.remove("flip-next","flip-prev");void el.offsetWidth;el.classList.add(direction==="prev"?"flip-prev":"flip-next");}
 el.scrollTo(vertical?{top:next*el.clientHeight,behavior:"smooth"}:{left:next*el.clientWidth,behavior:"smooth"});
 readerPageIndex=next;readerPageMetrics();recordReaderPage(next);
}
async function recordReaderPage(page){
 const id=String(currentReaderId),seen=readerSeenPages;
 if(!id||id==="null")return;
 const wasSeen=seen.has(page);seen.add(page);
 const ratio=readerPagesTotal<=1?1:Math.max(0,Math.min(1,(page+1)/readerPagesTotal));
 const progress=readerProgressFor(id);
 progress.page=page;progress.seen=[...seen];progress.totalPages=readerPagesTotal;progress.ratio=ratio;
 progress.words=Math.max(Number(progress.words)||0,Math.ceil(readerWordsTotal*ratio));
 progress.updatedAt=Date.now();saveReaderProgress(id,progress);scheduleCloudReaderProgressSave(id);
 if(!wasSeen&&readerTrack&&supabaseClient){
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(user&&user.id!==state.stories.find(x=>String(x.id)===id)?.authorId){
   const pageWords=Math.max(0,Math.ceil(readerWordsTotal/readerPagesTotal));
   const {error}=await supabaseClient.from("work_reads").insert({work_id:id,reader_id:user.id,words_count:pageWords});
   if(error)console.warn("पृष्ठ-पठन रिकॉर्ड सेव नहीं हुआ",error.message);
  }
 }
}
function setupReaderPagination(id){
 const body=document.getElementById("readerBody"),saved=readerProgressFor(id);
 const scroller=document.getElementById(readerUsesVerticalScroll()?"readerPage":"readerBody");
 readerSeenPages=new Set(saved.seen||[]);readerWordsTotal=wordCount(body.innerText||"");readerPagesTotal=1;readerPageIndex=0;
 const storedRatio=readerProgressRatio(saved),hasRatio=Number.isFinite(Number(saved.ratio))&&Number(saved.updatedAt)>0;
 const legacyPage=Number(saved.page)||0;
 if(readerUsesVerticalScroll())scroller.scrollTop=0;else scroller.scrollLeft=0;
 requestAnimationFrame(()=>{
  readerPageMetrics();
  const target=hasRatio?Math.round(storedRatio*Math.max(0,readerPagesTotal-1)):Math.min(legacyPage,readerPagesTotal-1);
  if(readerUsesVerticalScroll())scroller.scrollTop=target*scroller.clientHeight;else scroller.scrollLeft=target*scroller.clientWidth;
  readerPageMetrics();recordReaderPage(target);
 });
}

function renderReaderSeriesNav(work){
  const box = document.getElementById("readerSeriesNav");
  if(!box) return;

  if(!work?.seriesId){
    box.classList.add("hidden");
    return;
  }

  const parts = state.stories
    .filter(x =>
      String(x.seriesId) === String(work.seriesId) &&
      x.status === "published"
    )
    .sort((a,b) => (a.partNumber || 1) - (b.partNumber || 1));

  const index = parts.findIndex(
    x => String(x.id) === String(work.id)
  );

  if(index < 0){
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");

  document.getElementById("readerSeriesTitle").textContent =
    work.seriesTitle || "धारावाहिक";

  document.getElementById("readerSeriesPart").textContent =
  `भाग ${work.partNumber || 1} / ${parts.length} · ${
    work.seriesStatus === "completed" ? "पूर्ण" : "क्रमशः जारी"
  }`;

  document.getElementById("readerPrevPart").disabled = index === 0;
  document.getElementById("readerNextPart").disabled =
    index === parts.length - 1;
}

async function navigateReaderSeries(direction){
  const current = state.stories.find(
    x => String(x.id) === String(currentReaderId)
  );

  if(!current?.seriesId) return;

  const parts = state.stories
    .filter(x =>
      String(x.seriesId) === String(current.seriesId) &&
      x.status === "published"
    )
    .sort((a,b) => (a.partNumber || 1) - (b.partNumber || 1));

  const index = parts.findIndex(
    x => String(x.id) === String(current.id)
  );

  const nextIndex = index + direction;
  if(index < 0 || nextIndex < 0 || nextIndex >= parts.length) return;

  await finishReading(false);
  await openReader(parts[nextIndex].id);
}

function anonymousPreview(work){
  const body=String(work.body||"");
  const parts=work.seriesId?state.stories.filter(x=>String(x.seriesId)===String(work.seriesId)&&x.status==="published").sort((a,b)=>(Number(a.partNumber)||1)-(Number(b.partNumber)||1)):[];
  const partNo=Number(work.partNumber)||1;
  if(parts.length && partNo===1) return {html:formatMarkup(body),locked:false};
  if(parts.length && partNo>3) return {html:"",locked:true};
  const ratio=parts.length?0.5:0.4;
  const total=wordCount(body), target=Math.max(1,Math.floor(total*ratio));
  if(typeof Intl!=="undefined"&&Intl.Segmenter){
    const seg=new Intl.Segmenter("hi",{granularity:"word"});let count=0,end=0;
    for(const item of seg.segment(body)){if(item.isWordLike){count++;if(count>=target){end=item.index+item.segment.length;break;}}}
    if(!end)end=body.length;
    return {html:formatMarkup(body.slice(0,end)),locked:true};
  }
  const words=body.match(/\S+\s*/g)||[];return {html:formatMarkup(words.slice(0,target).join("")),locked:true};
}
async function openReader(id){
  const s=state.stories.find(x=>String(x.id)===String(id));if(!s)return;
  if(currentReaderId&&String(currentReaderId)!==String(id))await flushCloudReaderProgress(currentReaderId);
  currentReaderId=id;readingStartedAt=Date.now();
  renderReaderSeriesNav(s);
  const {data:{user}} = supabaseClient ? await supabaseClient.auth.getUser() : {data:{user:null}};
  readerProgressUserId=user?.id||null;
  if(s.source==="supabase" && s.status==="published" && !user){
    const preview=anonymousPreview(s);
    if(preview.locked){
    readerTrack=false;
    document.getElementById("readerTitle").textContent=s.title;
    document.getElementById("readerCategory").textContent=[s.type,s.subtype,...(s.categories||[])].filter(Boolean).join(" · ");
    document.getElementById("readerAuthor").textContent=s.author||"अनाम लेखक";
    document.getElementById("readerAuthorAvatar").innerHTML=s.authorAvatar?`<img src="${escapeHtml(s.authorAvatar)}" alt="">`:escapeHtml((s.author||"अ").trim().slice(0,1));
    const previewCover=document.getElementById("readerCoverSlot");previewCover.innerHTML=s.coverUrl?`<img class="cover-thumb" src="${escapeHtml(s.coverUrl)}" alt="कवर">`:`<div class="cover-placeholder">कवर नहीं</div>`;
    document.getElementById("readerBody").innerHTML=preview.html+(preview.html?'<p class="login-preview-prompt">… आगे पढ़ने के लिए खाता बनाएँ या लॉगिन करें।</p>':'<p class="login-preview-prompt">इस भाग को पढ़ने के लिए लॉगिन करें।</p>');
    document.getElementById("readerWords").textContent=`रचना में कुल ${wordCount(s.body)} शब्द`;
    document.getElementById("feedbackPanel").classList.add("hidden");
    document.getElementById("editWorkAction")?.classList.add("hidden");document.getElementById("workOwnerAction")?.classList.add("hidden");
    document.getElementById("readerDialog").showModal();
    return;
    }
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
  const owner = !!s.authorId && user?.id === s.authorId;
  const action = document.getElementById("workOwnerAction");
  if(action){ action.classList.toggle("hidden",!owner); action.textContent=s.status==="draft"?"पुनः प्रकाशित करें":"अप्रकाशित करके ड्राफ्ट में रखें"; }
  const editAction = document.getElementById("editWorkAction");
  if(editAction) editAction.classList.toggle("hidden",!owner);
  const panel=document.getElementById("feedbackPanel");
  if(panel) panel.classList.toggle("hidden",s.source!=="supabase" || s.status==="draft");
  if(user&&s.source==="supabase")await loadCloudReaderProgress(id,user.id);
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
    const [{data:ratings,error:re},{data:reviews,error:ve}] = await Promise.all([
      supabaseClient.from("ratings").select("id,user_id,rating,created_at").eq("work_id",workId),
      supabaseClient.from("reviews").select("id,user_id,review_text,created_at,updated_at").eq("work_id",workId).order("created_at",{ascending:false})
    ]);

    if(re)throw re;
    if(ve)throw ve;

    const rows=ratings||[];
    const allReviews=reviews||[];
    const avg=rows.length?rows.reduce((a,x)=>a+Number(x.rating),0)/rows.length:0;

    summary.textContent=`★ ${avg?avg.toFixed(1):"—"} / 5 (${avg?Math.round(avg*20):0}%) · ${rows.length} रेटिंग · ${allReviews.length} समीक्षाएँ`;

    const {data:{user}}=await supabaseClient.auth.getUser();

    const myRating=rows.find(x=>x.user_id===user?.id);
    console.log("मेरी रेटिंग:", myRating, "लॉगिन यूज़र:", user?.id);
    
    const myReview=allReviews.find(x=>x.user_id===user?.id);

    document.getElementById("ratingInput").value=myRating?.rating||"";
    document.getElementById("reviewInput").value=myReview?.review_text||"";

    const feedbackForm=document.querySelector("#feedbackPanel .feedback-form");
    const currentWork=state.stories.find(x=>String(x.id)===String(workId));
    const isWorkOwner=!!user && currentWork?.authorId===user.id;

    if(feedbackForm){
      feedbackForm.classList.toggle("hidden",isWorkOwner);
    }

    const deleteRatingButton=document.getElementById("deleteMyRating");
    const deleteReviewButton=document.getElementById("deleteMyReview");

if(deleteRatingButton){
  deleteRatingButton.classList.toggle("hidden",!myRating);
}

if(deleteReviewButton){
  deleteReviewButton.classList.toggle("hidden",!myReview);
}

    if(deleteReviewButton){
      deleteReviewButton.classList.toggle("hidden",isWorkOwner||!myReview);
    }

    const userIds=[...new Set([...allReviews.map(x=>x.user_id),...rows.map(x=>x.user_id)])];
    let profiles=[];

    if(userIds.length){
      const q=await supabaseClient.from("profiles").select("id,display_name,username,avatar_url").in("id",userIds);
      if(!q.error)profiles=q.data||[];
    }

    const ratingPeople=rows.map(r=>{
      const who=profiles.find(p=>p.id===r.user_id);
      return `<button class="tag profile-link" type="button" data-person-profile="${escapeHtml(r.user_id)}"><span class="mini-avatar">${who?.avatar_url?`<img src="${escapeHtml(who.avatar_url)}" alt="">`:escapeHtml((who?.display_name||who?.username||"प").slice(0,1))}</span>${escapeHtml(who?.display_name||who?.username||"पाठक")} · ${"★".repeat(Number(r.rating))}</button>`;
    }).join(" ");

    if(!allReviews.length){
      reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div><p class="muted">अभी कोई समीक्षा नहीं है।</p>`;
      reviewsBox.querySelectorAll("[data-person-profile]").forEach(b=>b.addEventListener("click",()=>openAuthorProfile(b.dataset.personProfile)));
      return;
    }

    reviewsBox.innerHTML=`<div><b>रेटिंग देने वाले:</b><p>${ratingPeople||"अभी कोई रेटिंग नहीं।"}</p></div>`;

    reviewsBox.innerHTML+=(allReviews).map(r=>{
      const who=profiles.find(p=>p.id===r.user_id);
      return `<article class="review-card" data-review-id="${escapeHtml(r.id)}"><button class="profile-link" type="button" data-person-profile="${escapeHtml(r.user_id)}"><span class="mini-avatar">${who?.avatar_url?`<img src="${escapeHtml(who.avatar_url)}" alt="">`:escapeHtml((who?.display_name||who?.username||"प").slice(0,1))}</span><strong>${escapeHtml(who?.display_name||who?.username||"पाठक")}</strong></button><p>${escapeHtml(r.review_text)}</p><small>${new Date(r.created_at).toLocaleDateString("hi-IN")}</small><div class="review-comments" id="reviewComments-${r.id}">कमेंट लोड हो रहे हैं…</div><form class="review-comment-form" data-review-comment="${r.id}"><input name="comment" maxlength="1500" placeholder="इस समीक्षा पर टिप्पणी करें…" required><button type="submit">भेजें</button></form></article>`;
    }).join("");

    reviewsBox.querySelectorAll("[data-person-profile]").forEach(b=>b.addEventListener("click",()=>openAuthorProfile(b.dataset.personProfile)));

    for(const r of allReviews) await loadReviewComments(r.id,workId);

  }catch(e){
    summary.textContent="फीडबैक लोड नहीं हुआ: "+e.message;
  }
}


async function loadReviewComments(reviewId,workId){
  const box=document.getElementById(`reviewComments-${reviewId}`);if(!box)return;
  const {data,error}=await supabaseClient.from("comments").select("id,user_id,comment_text,created_at").eq("review_id",reviewId).eq("work_id",workId).order("created_at");
  if(error){box.textContent="कमेंट लोड नहीं हुए: "+error.message;return;}
  const ids=[...new Set((data||[]).map(x=>x.user_id))];let people=[];
  if(ids.length){const q=await supabaseClient.from("profiles").select("id,display_name,username").in("id",ids);if(!q.error)people=q.data||[];}
  box.innerHTML=(data||[]).length?(data||[]).map(c=>{const u=people.find(p=>p.id===c.user_id);return `<p class="review-comment" data-work-comment-id="${escapeHtml(c.id)}"><button class="story-author-link" type="button" data-writer="${escapeHtml(c.user_id)}">${escapeHtml(u?.display_name||u?.username||"पाठक")}</button>: ${escapeHtml(c.comment_text)}</p>`;}).join(""):'<p class="muted">अभी कोई टिप्पणी नहीं।</p>';
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
async function deleteMyFeedback(type) {
  if (!supabaseClient || !currentReaderId) return;

  const isRating = type === "rating";
  const table = isRating ? "ratings" : "reviews";
  const itemName = isRating ? "रेटिंग" : "समीक्षा";

  if (!confirm(`क्या आप अपनी ${itemName} हटाना चाहते हैं?`)) return;

  try {
    const { data: { user }, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError) throw authError;
    if (!user) {
      toast("पहले लॉगिन करें।");
      return;
    }

    const currentWork = state.stories.find(
      x => String(x.id) === String(currentReaderId)
    );

    if (!currentWork) {
  toast("रचना उपलब्ध नहीं है।");
  return;
    }

    const button = document.getElementById(
      isRating ? "deleteMyRating" : "deleteMyReview"
    );

    if (button) button.disabled = true;

    const { data, error } = await supabaseClient
      .from(table)
      .delete()
      .eq("work_id", currentReaderId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      toast(`आपकी ${itemName} नहीं मिली या हटाई नहीं जा सकी।`);
      return;
    }

    if (isRating) {
      document.getElementById("ratingInput").value = "";
    } else {
      document.getElementById("reviewInput").value = "";
    }

    toast(`आपकी ${itemName} हटा दी गई।`);
    await loadWorkFeedback(currentReaderId);

  } catch (error) {
    toast(`${itemName} नहीं हटाई जा सकी: ${error.message}`);
  } finally {
    const button = document.getElementById(
      isRating ? "deleteMyRating" : "deleteMyReview"
    );
    if (button) button.disabled = false;
  }
}
async function setCurrentWorkStatus(){
  const s=state.stories.find(x=>x.id===currentReaderId);if(!s||!s.authorId||!supabaseClient)return;
  const next=s.status==="draft"?"published":"draft";
  const msg=next==="draft"
    ? "क्या इस रचना को अप्रकाशित करके निजी ड्राफ्ट में रखना चाहते हैं?"
    : "लेखक की स्व-घोषणा\n\nमैं पुष्टि करता/करती हूँ कि यह रचना मेरी मौलिक रचना है, अथवा इसे प्रकाशित कराने की वैध अनुमति मेरे पास है और सामग्री के अधिकारों की जिम्मेदारी मेरी है।\n\nक्या आप सहमत होकर इसे पुनः प्रकाशित करना चाहते हैं?";
  if(!confirm(msg))return;
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user||user.id!==s.authorId){toast("केवल रचनाकार यह बदलाव कर सकता है।");return;}
  let error=null;
  if(next==="published"){
    const result=await supabaseClient.rpc("confirm_own_work_publication",{p_work_id:s.id});
    error=result.error;
  }else{
    const result=await supabaseClient.from("works").update({status:"draft",self_declaration_accepted:false,updated_at:new Date().toISOString()}).eq("id",s.id).eq("author_id",user.id);
    error=result.error;
  }
  if(error){toast("स्थिति नहीं बदली: "+error.message);return;}
  s.status=next;saveState();document.getElementById("readerDialog").close();await loadCloudWorks();
  toast(next==="draft"?"रचना निजी ड्राफ्ट में चली गई।":"आपकी स्व-घोषणा दर्ज हुई और रचना पुनः प्रकाशित हो गई।");
}
async function submitReviewComment(form){
  const reviewId=Number(form.dataset.reviewComment), textValue=new FormData(form).get("comment")?.toString().trim();
  if(!textValue||!supabaseClient||!currentReaderId)return;
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("कमेंट करने के लिए लॉगिन करें।");return;}
  const {error}=await supabaseClient.from("comments").insert({user_id:user.id,work_id:currentReaderId,review_id:reviewId,comment_text:textValue});
  if(error){toast("कमेंट सुरक्षित नहीं हुआ: "+error.message);return;}
  form.reset();await loadReviewComments(reviewId,currentReaderId);toast("टिप्पणी प्रकाशित हो गई।");
}

async function finishReading(showNotice=true){
  const id=currentReaderId,s=state.stories.find(x=>String(x.id)===String(id));
  if(id){readerPageMetrics();await recordReaderPage(readerPageIndex);await flushCloudReaderProgress(id);}
  const dialog=document.getElementById("readerDialog");if(dialog?.open)dialog.close();
  if(showNotice&&s)toast(`पठन सुरक्षित: ${readerSeenPages.size} पृष्ठ देखे गए।`);
}

function toggleBookmark(){
  if(!currentReaderId)return;
  const list=state.profile.bookmarks||(state.profile.bookmarks=[]);
  const i=list.indexOf(currentReaderId);
  if(i>=0)list.splice(i,1);else list.push(currentReaderId);
  saveState();document.getElementById("bookmarkButton").textContent=i>=0?"♧":"♥";renderLibrary();toast(i>=0?"बुकमार्क हटाया गया":"पुस्तकालय में बुकमार्क किया गया");
}
function readingProgressCard(work,progress){
  const ratio=readerProgressRatio(progress),percent=Math.max(0,Math.min(100,Math.round(ratio*100)));
  const cats=(work.categories||[]).map(c=>`<span class="tag">${escapeHtml(c)}</span>`).join(" ");
  const excerpt=String(work.body||"").replace(/\s+/g," ").slice(0,105);
  return `<article class="story-card reading-resume-card"><div class="cover-grid"><button class="cover-open" type="button" data-read="${escapeHtml(work.id)}" aria-label="${escapeHtml(work.title)} वहीं से पढ़ें">${work.coverUrl?`<img class="cover-thumb" src="${escapeHtml(work.coverUrl)}" alt="${escapeHtml(work.title)} कवर">`:`<div class="cover-placeholder">❀</div>`}</button><div><div>${cats}</div><h3>${escapeHtml(work.title)}</h3><p>${escapeHtml(work.author||"अनाम लेखक")}</p><p class="excerpt">${escapeHtml(excerpt)}${excerpt.length>=105?"…":""}</p><div class="resume-progress-track" role="progressbar" aria-label="पठन प्रगति" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><div class="resume-progress-meta"><small>${percent>=100?"पूरा पढ़ा गया":"लगभग "+percent+"% पढ़ा गया"}${progress.words?" · "+Number(progress.words).toLocaleString("hi-IN")+" शब्द":""}</small><button type="button" data-read="${escapeHtml(work.id)}">${percent>=100?"फिर से पढ़ें":"वहीं से पढ़ें ↗"}</button></div></div></div></article>`;
}
function renderLibrary(){
  const ids=state.profile.bookmarks||[];
  const list=state.stories.filter(s=>ids.some(id=>String(id)===String(s.id)));
  const progressItems=state.stories
    .filter(s=>s.status==="published"&&s.source==="supabase")
    .map(work=>({work,progress:readerProgressFor(work.id)}))
    .filter(x=>Number(x.progress.updatedAt)>0||Number(x.progress.words)>0||Number(x.progress.page)>0)
    .sort((a,b)=>(Number(b.progress.updatedAt)||0)-(Number(a.progress.updatedAt)||0));
  const resumeHtml=progressItems.length?`<section class="library-subsection"><h2>पढ़ना जारी रखें</h2><div class="story-list">${progressItems.map(x=>readingProgressCard(x.work,x.progress)).join("")}</div></section>`:"";
  const bookmarksHtml=list.length?`<section class="library-subsection"><h2>आपका पुस्तकालय</h2><div class="story-list">${renderStoryCards(list)}</div></section>`:`<div class="empty-state"><span class="empty-flower">✿</span><h3>आपका पुस्तकालय खाली है</h3><p>किसी रचना को खोलकर बुकमार्क करें। वह यहाँ दिखाई देगी।</p></div>`;
  document.getElementById("libraryList").innerHTML=resumeHtml+bookmarksHtml;
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
  const box = document.getElementById("communityPostsList");
  if (!box || !supabaseClient) return;

  const { data: posts, error } = await supabaseClient
    .from("community_posts")
    .select("id,author_id,body,image_url,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    box.innerHTML = '<p class="muted">समुदाय पोस्ट लोड नहीं हो सकीं।</p>';
    console.warn(error);
    return;
  }

  const ids = [...new Set((posts || []).map(p => p.author_id))];
  let profiles = [];

  if (ids.length) {
    const q = await supabaseClient
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .in("id", ids);
    profiles = q.data || [];
  }

  const { data: { user } } = await supabaseClient.auth.getUser();
  const postIds = (posts || []).map(p => p.id);
  let likes = [];

  if (postIds.length) {
    const q = await supabaseClient
      .from("post_likes")
      .select("post_id,user_id")
      .in("post_id", postIds);
    likes = q.data || [];
  }

  box.innerHTML = (posts || []).map(p => {
    const who = profiles.find(x => x.id === p.author_id);
    const mine = likes.some(
      x => x.post_id === p.id && x.user_id === user?.id
    );
    const count = likes.filter(x => x.post_id === p.id).length;

    return `
      <article class="community-post">

        <div class="community-post-head">
          <span class="mini-avatar">
            ${who?.avatar_url
              ? `<img src="${escapeHtml(who.avatar_url)}" alt="">`
              : escapeHtml((who?.display_name || who?.username || "अ").slice(0,1))
            }
          </span>

          <button
            class="story-author-link"
            type="button"
            data-writer="${escapeHtml(p.author_id)}"
          >
            ${escapeHtml(who?.display_name || who?.username || "लेखक")}
          </button>

          <small>${new Date(p.created_at).toLocaleDateString("hi-IN")}</small>
        </div>

        ${p.body ? `<p>${escapeHtml(p.body)}</p>` : ""}

        ${p.image_url ? `
          <div class="community-post-image">
            <img
              src="${escapeHtml(p.image_url)}"
              alt="समुदाय पोस्ट की तस्वीर"
              loading="lazy"
            >
          </div>
        ` : ""}

        <button
          type="button"
          data-post-like="${escapeHtml(p.id)}"
          data-liked="${mine ? "1" : "0"}"
        >
          ${mine ? "♥ पसंद किया" : "♡ पसंद करें"} · ${count}
        </button>

        <div class="community-post-comments">
          <form data-comment-form="${escapeHtml(p.id)}">
            <input
              name="comment"
              maxlength="1000"
              placeholder="अपना कमेंट लिखें…"
              required
            >
            <button type="submit">भेजें</button>
          </form>

          <div id="community-comments-${escapeHtml(p.id)}">
            <p class="muted">कमेंट लोड हो रहे हैं…</p>
          </div>
        </div>

      </article>
    `;
  }).join("") || '<p class="muted">अभी कोई पोस्ट नहीं है। पहली पोस्ट आप लिख सकते हैं।</p>';

  box.querySelectorAll("[data-writer]").forEach(b => {
    b.addEventListener("click", () =>
      openAuthorProfile(b.dataset.writer)
    );
  });

  box.querySelectorAll("[data-post-like]").forEach(b => {
    b.addEventListener("click", () =>
      togglePostLike(b.dataset.postLike, b.dataset.liked === "1")
    );
  });

  box.querySelectorAll("[data-comment-form]").forEach(form => {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      await publishCommunityPostComment(
        form.dataset.commentForm,
        form.elements.comment.value
      );
    });
  });

  for (const p of posts || []) {
    const container = document.getElementById(
      `community-comments-${p.id}`
    );

    if (container) {
      await loadCommunityPostComments(p.id, container);
    }
  }
}
async function togglePostLike(postId,liked){
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("पोस्ट पसंद करने के लिए लॉगिन करें।");return;}
  const q=liked?await supabaseClient.from("post_likes").delete().eq("post_id",postId).eq("user_id",user.id):await supabaseClient.from("post_likes").insert({post_id:postId,user_id:user.id});
  if(q.error){toast("पसंद सुरक्षित नहीं हुई: "+q.error.message);return;}await loadCommunityPosts();
}
async function loadCommunityPostComments(postId, container){
  const { data: comments, error } = await supabaseClient
    .from("community_post_comments")
    .select("id,post_id,user_id,parent_comment_id,comment_text,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if(error){
    container.innerHTML = '<p class="muted">कमेंट लोड नहीं हो सके।</p>';
    console.warn(error);
    return;
  }

  const ids = [...new Set((comments || []).map(c => c.user_id))];
  let profiles = [];

  if(ids.length){
    const q = await supabaseClient
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .in("id", ids);

    profiles = q.data || [];
  }

  const renderComment = (c, isReply = false) => {
    const who = profiles.find(p => p.id === c.user_id);
    const name = who?.display_name || who?.username || "पाठक";

    return `
      <div class="community-comment ${isReply ? "community-reply" : ""}"
     data-community-comment-id="${escapeHtml(c.id)}">
        <strong>${escapeHtml(name)}</strong>
        <p>${escapeHtml(c.comment_text)}</p>
        ${!isReply ? `
          <button type="button" data-comment-reply="${escapeHtml(c.id)}">
            जवाब दें
          </button>
        ` : ""}
      </div>
    `;
  };

  const roots = (comments || []).filter(c => !c.parent_comment_id);

  container.innerHTML = roots.map(c => `
    ${renderComment(c)}
    <div class="community-replies">
      ${(comments || [])
        .filter(r => r.parent_comment_id === c.id)
        .map(r => renderComment(r, true))
        .join("")}
      <form data-reply-form="${escapeHtml(c.id)}" hidden>
        <input name="reply" maxlength="1000" placeholder="अपना जवाब लिखें…" required>
        <button type="submit">जवाब भेजें</button>
      </form>
    </div>
  `).join("") || '<p class="muted">अभी कोई कमेंट नहीं है।</p>';

  container.querySelectorAll("[data-comment-reply]").forEach(button => {
    button.addEventListener("click", () => {
      const form = container.querySelector(
        `[data-reply-form="${button.dataset.commentReply}"]`
      );
      if(form) form.hidden = !form.hidden;
    });
  });

  container.querySelectorAll("[data-reply-form]").forEach(form => {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      await publishCommunityPostComment(
        postId,
        form.elements.reply.value,
        form.dataset.replyForm
      );
    });
  });
}

async function publishCommunityPostComment(postId, text, parentCommentId = null){
  const commentText = text.trim();

  if(!commentText){
    toast("कमेंट या जवाब लिखें।");
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  if(!user){
    toast("कमेंट करने के लिए लॉगिन करें।");
    return;
  }

  const { error } = await supabaseClient
    .from("community_post_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      parent_comment_id: parentCommentId,
      comment_text: commentText
    });

  if(error){
    toast("कमेंट प्रकाशित नहीं हुआ: " + error.message);
    return;
  }

  await loadCommunityPosts();
  toast("आपका कमेंट प्रकाशित हो गया।");
}
async function publishCommunityPost(){
  const field = document.getElementById("communityPostText");
  const imageInput = document.getElementById("communityPostImage");
  const body = field?.value.trim() || "";
  const file = imageInput?.files?.[0] || null;

  if (!body && !file) {
    toast("पोस्ट में कुछ लिखें या तस्वीर चुनें।");
    return;
  }

  if (wordCount(body) > 2000) {
    toast("पोस्ट अधिकतम 2,000 शब्दों की हो सकती है।");
    return;
  }

  if (!supabaseClient) {
    toast("सर्वर से कनेक्शन उपलब्ध नहीं है।");
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    toast("पोस्ट प्रकाशित करने के लिए लॉगिन करें।");
    return;
  }

  let imageUrl = null;

  if (file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast("केवल JPG, PNG या WebP तस्वीर चुनें।");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast("तस्वीर अधिकतम 8 MB की हो सकती है।");
      return;
    }

    try {
      imageUrl = await uploadSutradharImage(file, "community");
    } catch (error) {
      toast("तस्वीर अपलोड नहीं हुई: " + error.message);
      return;
    }

    if (!imageUrl) {
      toast("तस्वीर अपलोड नहीं हो सकी।");
      return;
    }
  }

  const { error } = await supabaseClient
    .from("community_posts")
    .insert({
      author_id: user.id,
      body: body || " ",
      image_url: imageUrl,
      status: "published"
    });

  if (error) {
    toast("पोस्ट प्रकाशित नहीं हुई: " + error.message);
    return;
  }

  field.value = "";

  if (imageInput) imageInput.value = "";

  const preview = document.getElementById("communityImagePreview");
  if (preview) preview.innerHTML = "";

  await loadCommunityPosts();
  toast("आपकी पोस्ट प्रकाशित हो गई।");
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

async function toggleAuthorBlock(authorId, isBlocked){
  const { data: { user } } = await supabaseClient.auth.getUser();

  if(!user){
    toast("ब्लॉक करने के लिए पहले लॉगिन करें।");
    return;
  }

  const result = isBlocked
    ? await supabaseClient
        .from("author_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_user_id", authorId)
    : await supabaseClient
        .from("author_blocks")
        .insert({
          blocker_id: user.id,
          blocked_user_id: authorId
        });

  if(result.error){
    toast("ब्लॉक सेटिंग अपडेट नहीं हुई: " + result.error.message);
    return;
  }

  toast(isBlocked ? "ब्लॉक हटा दिया गया।" : "रचनाकार ब्लॉक कर दिया गया।");

  await openAuthorProfile(authorId);
}

async function openAuthorProfile(authorId=null){
  const currentStory=state.stories.find(x=>x.id===currentReaderId);
  const targetId=authorId||currentStory?.authorId;
  if(!targetId||!supabaseClient)return;

  const [
    {data:works,error:worksError},
    {data:profile,error:profileError},
    {data:{user}}
  ]=await Promise.all([
    supabaseClient.from("works")
      .select("id,author_id,title,content,work_type,main_form,subtype,status,created_at,cover_url,content_language")
      .eq("author_id",targetId)
      .eq("status","published")
      .order("created_at",{ascending:false}),
    supabaseClient.from("profiles")
      .select("id,display_name,username,avatar_url,bio")
      .eq("id",targetId)
      .maybeSingle(),
    supabaseClient.auth.getUser()
  ]);

    const { data: blockRecord, error: blockError } =
    user && user.id !== targetId
      ? await supabaseClient
          .from("author_blocks")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_user_id", targetId)
          .maybeSingle()
      : { data: null, error: null };

  if(blockError){
    toast("ब्लॉक स्थिति लोड नहीं हो सकी।");
    return;
  }

  const {data:blockedByRecord,error:blockedByError} = user && user.id !== targetId
  ? await supabaseClient
      .from("author_blocks")
      .select("id")
      .eq("blocker_id",targetId)
      .eq("blocked_user_id",user.id)
      .maybeSingle()
  : {data:null,error:null};

if(blockedByError){
  toast("ब्लॉक स्थिति लोड नहीं हो सकी।");
  return;
}

const cannotMessage = !!blockRecord || !!blockedByRecord;
  
  const isBlocked = !!blockRecord;
  if(worksError||profileError){
    toast("रचनाकार की प्रोफ़ाइल लोड नहीं हो सकी।");
    return;
  }

  const [
    {count:followerCount,error:followerError},
    {count:followingCount,error:followingError},
    {data:follow,error:followError}
  ]=await Promise.all([
    supabaseClient.from("author_follows")
      .select("follower_id",{count:"exact",head:true})
      .eq("author_id",targetId),
    supabaseClient.from("author_follows")
      .select("author_id",{count:"exact",head:true})
      .eq("follower_id",targetId),
    user&&user.id!==targetId
      ?supabaseClient.from("author_follows")
        .select("author_id")
        .eq("follower_id",user.id)
        .eq("author_id",targetId)
        .maybeSingle()
      :Promise.resolve({data:null,error:null})
  ]);

  if(followerError||followingError||followError){
    toast("फ़ॉलो आँकड़े लोड नहीं हो सके।");
    return;
  }
  
  const { data: communityPosts, error: communityPostsError } =
    await supabaseClient
      .from("community_posts")
      .select("id,author_id,body,image_url,created_at")
      .eq("author_id", targetId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

  if(communityPostsError){
    toast("संगोष्ठी की पोस्ट लोड नहीं हो सकीं।");
    return;
}

    
  const communityPostIds = (communityPosts || []).map(p => p.id);

  let communityLikes = [];
  let communityComments = [];
  let communityCommentProfiles = [];

  if(communityPostIds.length){
    const [likesResult, commentsResult] = await Promise.all([
      supabaseClient.from("post_likes")
        .select("post_id,user_id")
        .in("post_id", communityPostIds),

      supabaseClient.from("community_post_comments")
        .select("id,post_id,user_id,parent_comment_id,comment_text,created_at")
        .in("post_id", communityPostIds)
        .order("created_at", { ascending: true })
    ]);

    if(likesResult.error || commentsResult.error){
      toast("पोस्ट के लाइक या कमेंट लोड नहीं हो सके।");
      return;
    }

    communityLikes = likesResult.data || [];
    communityComments = commentsResult.data || [];

    const commenterIds = [...new Set(communityComments.map(c => c.user_id))];

    if(commenterIds.length){
      const profilesResult = await supabaseClient.from("profiles")
        .select("id,display_name,username")
        .in("id", commenterIds);

      if(profilesResult.error){
        toast("कमेंट करने वालों की जानकारी लोड नहीं हो सकी।");
        return;
      }

      communityCommentProfiles = profilesResult.data || [];
    }
  }

  const communityPostList = (communityPosts || []).map(p => {
    const postComments = communityComments.filter(c => c.post_id === p.id);
    const rootComments = postComments.filter(c => !c.parent_comment_id);
    const likeCount = communityLikes.filter(l => l.post_id === p.id).length;

    const renderProfileComment = (c, isReply = false) => {
      const commenter = communityCommentProfiles.find(x => x.id === c.user_id);
      const commenterName = commenter?.display_name || commenter?.username || "पाठक";

      return `
     <div class="community-comment ${isReply ? "community-reply" : ""}"
     data-community-comment-id="${escapeHtml(c.id)}">
          <strong>${escapeHtml(commenterName)}</strong>
          <p>${escapeHtml(c.comment_text)}</p>
          <small>${new Date(c.created_at).toLocaleDateString("hi-IN")}</small>
        </div>
      `;
    };

    return `
      <article class="community-post" data-community-post-id="${escapeHtml(p.id)}">
        ${user && user.id===targetId ? `<div class="community-owner-actions">${!p.image_url?`<button type="button" data-profile-edit-post="${escapeHtml(p.id)}">✎ एडिट करें</button>`:""}<button type="button" class="danger-button" data-profile-delete-post="${escapeHtml(p.id)}">डिलीट करें</button></div>` : ""}
        ${p.body ? `<p>${escapeHtml(p.body)}</p>` : ""}

        ${p.image_url ? `
          <div class="community-post-image">
            <img src="${escapeHtml(p.image_url)}"
                 alt="रचनाकार की संगोष्ठी पोस्ट"
                 loading="lazy">
          </div>
        ` : ""}

        <div class="community-post-stats">
          ♥ ${likeCount} पसंद · ${postComments.length} कमेंट
        </div>

        <div class="community-post-comments">
          ${rootComments.map(c => `
            ${renderProfileComment(c)}
            <div class="community-replies">
              ${postComments
                .filter(r => r.parent_comment_id === c.id)
                .map(r => renderProfileComment(r, true))
                .join("")}
              <button type="button" class="text-button" data-profile-reply="${escapeHtml(c.id)}">जवाब दें</button>
              <form data-profile-reply-form="${escapeHtml(c.id)}" hidden>
                <input name="reply" maxlength="1000" placeholder="अपना जवाब लिखें…" required>
                <button type="submit">जवाब भेजें</button>
              </form>
            </div>
          `).join("") || '<p class="muted">अभी कोई कमेंट नहीं है।</p>'}
          <form data-profile-comment-form="${escapeHtml(p.id)}" class="profile-community-comment-form">
            <input name="comment" maxlength="1000" placeholder="इस पोस्ट पर कमेंट लिखें…" required>
            <button type="submit">कमेंट भेजें</button>
          </form>
        </div>

        <small>${new Date(p.created_at).toLocaleDateString("hi-IN")}</small>
      </article>
    `;
  }).join("");

  
  const workIds = (works || []).map(w => w.id);

  let authorRatings = [];
  let authorReviews = [];
  let reviewerProfiles = [];

  if(workIds.length){
    const [ratingsResult, reviewsResult] = await Promise.all([
      supabaseClient.from("ratings")
        .select("id,work_id,user_id,rating,created_at")
        .in("work_id", workIds),

      supabaseClient.from("reviews")
        .select("id,work_id,user_id,review_text,created_at")
        .in("work_id", workIds)
        .order("created_at", { ascending: false })
    ]);

    if(ratingsResult.error || reviewsResult.error){
      toast("रेटिंग और समीक्षाएँ लोड नहीं हो सकीं।");
      return;
    }

    authorRatings = ratingsResult.data || [];
    authorReviews = reviewsResult.data || [];

    const reviewerIds = [
      ...new Set([
        ...authorRatings.map(r => r.user_id),
        ...authorReviews.map(r => r.user_id)
      ])
    ];

    if(reviewerIds.length){
      const result = await supabaseClient.from("profiles")
        .select("id,display_name,username")
        .in("id", reviewerIds);

      if(result.error){
        toast("पाठकों की जानकारी लोड नहीं हो सकी।");
        return;
      }

      reviewerProfiles = result.data || [];
    }
  }
  
  
  const name=profile?.display_name||profile?.username||"रचनाकार";
  
  const list=(works||[]).map(w=>{
    const ratings = authorRatings.filter(r => r.work_id === w.id);
    const reviews = authorReviews.filter(r => r.work_id === w.id);

    const average = ratings.length
      ? (ratings.reduce((sum,r) => sum + Number(r.rating),0) / ratings.length).toFixed(1)
      : "अभी रेटिंग नहीं";

    return `
      <article class="story-card">
        <h3>${escapeHtml(w.title)}</h3>
        <p>${wordCount(w.content)} शब्द</p>

        <div class="work-rating-summary">
        <strong>${ratings.length ? "★ " + average : "अभी रेटिंग नहीं"}</strong>
          <span>(${ratings.length} रेटिंग)</span>
        </div>

        <div class="work-public-reviews">
          <strong>पाठकों की समीक्षाएँ (${reviews.length})</strong>

          ${reviews.map(r=>{
            const reviewer = reviewerProfiles.find(p => p.id === r.user_id);
            const reviewerName = reviewer?.display_name || reviewer?.username || "पाठक";

            return `
              <div class="work-public-review">
                <strong>${escapeHtml(reviewerName)}</strong>
                <p>${escapeHtml(r.review_text)}</p>
                <small>${new Date(r.created_at).toLocaleDateString("hi-IN")}</small>
              </div>
            `;
          }).join("") || '<p class="muted">अभी कोई लिखित समीक्षा नहीं है।</p>'}
        </div>

        <button class="primary-button" data-read="${escapeHtml(w.id)}">पढ़ें</button>
      </article>
    `;
  }).join("");
  

  const d=document.createElement("section");
  d.className="author-profile-page";
  d.setAttribute("role","region");
  d.setAttribute("aria-label",`${name || "लेखक"} की पूरी प्रोफ़ाइल`);
  // पुराने event handlers के close/remove calls को सुरक्षित रखने के लिए छोटे compatibility methods
  d.close=()=>d.remove();
  d.showModal=()=>d.classList.add("is-open");
  d.innerHTML=`
    <div class="author-profile-inner">
      <button class="close-button" id="authorClose">×</button>

      <div class="profile-card">
        <div class="profile-avatar">
          ${profile?.avatar_url
            ?`<img src="${escapeHtml(profile.avatar_url)}" alt="">`
            :escapeHtml(name.slice(0,1))}
        </div>
        <div>
          <h2>${escapeHtml(name)}</h2>
          <p>
            <button type="button" class="profile-stat-button" data-follow-list="followers">
              ${followerCount||0}
            </button>
            फ़ॉलोअर्स
            &nbsp; · &nbsp;
            <button type="button" class="profile-stat-button" data-follow-list="following">
              ${followingCount||0}
            </button>
            फ़ॉलोइंग
          </p>
        </div>
      </div>

      <p>${escapeHtml(profile?.bio||"")}</p>

            ${user&&user.id!==targetId?`
        <button class="primary-button" id="followAuthor">
          ${follow?"अनफ़ॉलो":"फ़ॉलो करें"}
        </button>
<button
  type="button"
  class="secondary-button"
  id="messageAuthor"
  ${!follow || cannotMessage ? "disabled" : ""}
>
  संदेश भेजें
</button>

${!follow && !cannotMessage
  ? '<small class="muted">संदेश भेजने के लिए पहले इस रचनाकार को फ़ॉलो करें।</small>'
  : ""}
  ${blockedByRecord
  ? '<p class="muted" style="color:#d9534f;">आपको इस रचनाकार ने ब्लॉक किया है। आप इन्हें निजी संदेश नहीं भेज सकते।</p>'
  : ""}

        <button class="secondary-button" id="blockAuthor">
          ${isBlocked?"अनब्लॉक करें":"ब्लॉक करें"}
        </button>

        <button class="secondary-button" id="reportAuthor">
          प्रोफ़ाइल रिपोर्ट करें
        </button>
      `:""}

      <div class="profile-section-tabs" role="tablist" aria-label="प्रोफ़ाइल अनुभाग">
        <button type="button" class="profile-section-tab active" data-profile-pane="works">रचनाएँ (${(works||[]).length})</button>
        <button type="button" class="profile-section-tab" data-profile-pane="community">संगोष्ठी (${(communityPosts||[]).length})</button>
      </div>
      <section data-profile-panel="works">
        <h3>प्रकाशित रचनाएँ</h3>
        <div class="story-list">${list||"<p>अभी कोई प्रकाशित रचना नहीं।</p>"}</div>
      </section>
      <section data-profile-panel="community" class="hidden">
        <h3>संगोष्ठी</h3>
        <div class="community-posts">${communityPostList || "<p>अभी कोई संगोष्ठी पोस्ट नहीं है।</p>"}</div>
      </section>
    </div>
  `;

  document.body.appendChild(d);
  d.showModal();

  d.querySelectorAll("[data-profile-pane]").forEach(tab=>tab.addEventListener("click",()=>{
    const pane=tab.dataset.profilePane;
    d.querySelectorAll("[data-profile-pane]").forEach(x=>x.classList.toggle("active",x===tab));
    d.querySelectorAll("[data-profile-panel]").forEach(x=>x.classList.toggle("hidden",x.dataset.profilePanel!==pane));
  }));
  d.querySelectorAll("[data-profile-edit-post]").forEach(button=>button.addEventListener("click",async()=>{
    if(!user||user.id!==targetId){toast("केवल पोस्ट का लेखक इसे संपादित कर सकता है।");return;}
    const postId=button.dataset.profileEditPost;
    const {data:post,error}=await supabaseClient.from("community_posts")
      .select("id,body,image_url").eq("id",postId).eq("author_id",user.id).maybeSingle();
    if(error||!post){toast("पोस्ट उपलब्ध नहीं है।");return;}
    if(post.image_url){toast("फोटो वाली पोस्ट संपादित नहीं की जा सकती।");return;}
    const value=prompt("अपनी लिखित पोस्ट संपादित करें:",post.body||"");
    if(value===null)return;
    const body=value.trim();
    if(!body){toast("पोस्ट खाली नहीं हो सकती।");return;}
    if(wordCount(body)>2000){toast("पोस्ट अधिकतम 2,000 शब्दों की हो सकती है।");return;}
    const result=await supabaseClient.from("community_posts").update({body})
      .eq("id",postId).eq("author_id",user.id).is("image_url",null);
    if(result.error){toast("पोस्ट अपडेट नहीं हुई: "+result.error.message);return;}
    toast("लिखित पोस्ट अपडेट हो गई।");d.remove();await openAuthorProfile(targetId);
  }));
  d.querySelectorAll("[data-profile-delete-post]").forEach(button=>button.addEventListener("click",async()=>{
    if(!user||user.id!==targetId){toast("केवल पोस्ट का लेखक इसे डिलीट कर सकता है।");return;}
    if(!confirm("क्या आप यह संगोष्ठी पोस्ट डिलीट करना चाहते हैं?"))return;
    const result=await supabaseClient.from("community_posts").delete()
      .eq("id",button.dataset.profileDeletePost).eq("author_id",user.id);
    if(result.error){toast("पोस्ट डिलीट नहीं हुई: "+result.error.message);return;}
    toast("संगोष्ठी पोस्ट डिलीट हो गई।");d.remove();await openAuthorProfile(targetId);
  }));
  d.querySelectorAll("[data-profile-comment-form]").forEach(form=>form.addEventListener("submit",async e=>{
    e.preventDefault();
    await publishCommunityPostComment(form.dataset.profileCommentForm,form.elements.comment.value);
    d.remove();
    await openAuthorProfile(targetId);
  }));
  d.querySelectorAll("[data-profile-reply]").forEach(button=>button.addEventListener("click",()=>{
    const form=d.querySelector(`[data-profile-reply-form="${button.dataset.profileReply}"]`);
    if(form)form.hidden=!form.hidden;
  }));
  d.querySelectorAll("[data-profile-reply-form]").forEach(form=>form.addEventListener("submit",async e=>{
    e.preventDefault();
    const post=form.closest("[data-community-post-id]");
    if(!post)return;
    await publishCommunityPostComment(post.dataset.communityPostId,form.elements.reply.value,form.dataset.profileReplyForm);
    d.remove();
    await openAuthorProfile(targetId);
  }));

  d.querySelector("#authorClose").onclick=()=>{
    d.close();
    d.remove();
  };

  d.querySelectorAll("[data-read]").forEach(b=>{
    b.onclick=()=>{
      const id=b.dataset.read;
      d.close();
      d.remove();
      openReader(id);
    };
  });

  d.querySelectorAll("[data-follow-list]").forEach(b=>{
    b.onclick=()=>{
      openFollowList(targetId,b.dataset.followList);
    };
  });

    d.querySelector("#blockAuthor")?.addEventListener("click",async()=>{
    const action = isBlocked ? "अनब्लॉक" : "ब्लॉक";

    if(!confirm(`क्या आप इस रचनाकार को ${action} करना चाहते हैं?`)){
      return;
    }

    d.close();
    d.remove();

    await toggleAuthorBlock(targetId, isBlocked);
  });
  
  d.querySelector("#followAuthor")?.addEventListener("click",async()=>{
    const button=d.querySelector("#followAuthor");
    button.disabled=true;

    const result=follow
      ?await supabaseClient.from("author_follows")
        .delete()
        .eq("follower_id",user.id)
        .eq("author_id",targetId)
      :await supabaseClient.from("author_follows")
        .insert({follower_id:user.id,author_id:targetId});

    if(result.error){
      button.disabled=false;
      toast("फ़ॉलो अपडेट नहीं हुआ: "+result.error.message);
      return;
    }

    d.close();
    d.remove();

    await refreshFollowCounts(targetId);

    toast(follow?"फ़ॉलो हटाया गया।":"रचनाकार को फ़ॉलो किया गया।");
    openAuthorProfile(targetId);
  });

  d.querySelector("#messageAuthor")?.addEventListener("click",async()=>{
  if(!user || !follow || cannotMessage) return;

  d.close();
  d.remove();

  await startInboxRequest(targetId);
});
  
  d.querySelector("#reportAuthor")?.addEventListener("click",async()=>{
    const reason=prompt("प्रोफ़ाइल रिपोर्ट का कारण लिखें:");
    if(!reason)return;
    const details=prompt("विवरण अधिकतम 100 शब्दों में लिखें:");
    if(!details)return;
    if(wordCount(details)>100){
      toast("रिपोर्ट अधिकतम 100 शब्दों की हो सकती है।");
      return;
    }
    const {error}=await supabaseClient.from("content_reports").insert({
      reporter_id:user.id,
      target_type:"profile",
      target_profile_id:targetId,
      reason:reason.slice(0,100),
      details
    });
    toast(error?"रिपोर्ट नहीं भेजी: "+error.message:"प्रोफ़ाइल रिपोर्ट भेज दी गई।");
  });
}

async function startInboxRequest(recipientId){
  const {data:{user}} = await supabaseClient.auth.getUser();

  if(!user){
    toast("पहले लॉगिन करें।");
    return;
  }

  currentUserId = user.id;

  const {data:existing,error:existingError} = await supabaseClient
    .from("message_requests")
    .select("id,sender_id,recipient_id,status")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  if(existingError){
    toast("पुरानी बातचीत की जाँच नहीं हो सकी।");
    return;
  }

  if(existing){
    if(existing.status==="accepted"){
      switchTab("inbox");
      await openInboxConversation(existing.id);
    }else if(existing.status==="pending"){
      toast(
        existing.sender_id===user.id
          ? "आपका संदेश अनुरोध पहले से भेजा जा चुका है।"
          : "इस रचनाकार का संदेश अनुरोध आपके इनबॉक्स में है।"
      );
    }else{
      toast("इस रचनाकार के साथ पुराना संदेश अनुरोध अस्वीकार या ब्लॉक किया गया है।");
    }
    return;
  }

  const message = prompt("अपना पहला निजी संदेश लिखें:");

  if(!message || !message.trim()) return;

  const text = message.trim();

  if(text.length>5000){
    toast("संदेश अधिकतम 5000 अक्षरों का हो सकता है।");
    return;
  }

  const {data:request,error:requestError} = await supabaseClient
    .from("message_requests")
    .insert({
      sender_id:user.id,
      recipient_id:recipientId,
      status:"pending"
    })
    .select("id")
    .single();

  if(requestError){
    toast("संदेश अनुरोध नहीं भेजा गया: "+requestError.message);
    return;
  }

  const {error:messageError} = await supabaseClient
    .from("messages")
    .insert({
      request_id:request.id,
      sender_id:user.id,
      message_text:text,
      is_read:false
    });

  if(messageError){
    toast("अनुरोध बन गया, लेकिन पहला संदेश नहीं भेजा जा सका: "+messageError.message);
    return;
  }

  toast("संदेश अनुरोध भेज दिया गया।");
  loadNotificationBadge();
}

async function openFollowList(profileId, type){
  if(!supabaseClient||!profileId)return;

  const isFollowers=type==="followers";
  const title=isFollowers?"फ़ॉलोअर्स":"फ़ॉलोइंग";

  const d=document.createElement("dialog");
  d.className="modal";
  d.innerHTML=`
    <div class="reader-page">
      <button class="close-button" id="followListClose">×</button>
      <h2>${title}</h2>
      <div id="followListContent">
        <p class="muted">सूची लोड हो रही है…</p>
      </div>
    </div>
  `;

  document.body.appendChild(d);
  d.showModal();

  d.querySelector("#followListClose").onclick=()=>{
    d.close();
    d.remove();
  };

  const content=d.querySelector("#followListContent");

  try{
    const {data:rows,error}=await supabaseClient
      .from("author_follows")
      .select(isFollowers?"follower_id":"author_id")
      .eq(isFollowers?"author_id":"follower_id",profileId);

    if(error)throw error;

    const ids=[...new Set((rows||[]).map(x=>
      isFollowers?x.follower_id:x.author_id
    ).filter(Boolean))];

    if(!ids.length){
      content.innerHTML=`<p class="muted">अभी कोई ${title.toLowerCase()} नहीं हैं।</p>`;
      return;
    }

    const {data:profiles,error:profileError}=await supabaseClient
      .from("profiles")
      .select("id,display_name,username,avatar_url,bio")
      .in("id",ids);

    if(profileError)throw profileError;

    const ordered=ids.map(id=>(profiles||[]).find(p=>p.id===id)).filter(Boolean);

    content.innerHTML=ordered.map(p=>{
      const name=p.display_name||p.username||"रचनाकार";
      return `
        <button type="button" class="writer-card"
          data-follow-profile="${escapeHtml(p.id)}">
          <span class="mini-avatar">
            ${p.avatar_url
              ?`<img src="${escapeHtml(p.avatar_url)}" alt="">`
              :escapeHtml(name.slice(0,1))}
          </span>
          <span class="writer-card-main">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(p.bio||"साहित्य सूत्रधार के सदस्य")}</small>
          </span>
          <span class="tag">प्रोफ़ाइल ↗</span>
        </button>
      `;
    }).join("")||`<p class="muted">प्रोफ़ाइल उपलब्ध नहीं हैं।</p>`;

    content.querySelectorAll("[data-follow-profile]").forEach(b=>{
      b.onclick=()=>{
        const id=b.dataset.followProfile;
        d.close();
        d.remove();
        openAuthorProfile(id);
      };
    });

  }catch(error){
    console.error("फ़ॉलो सूची लोड नहीं हुई:",error);
    content.innerHTML=`
      <p class="muted">सूची लोड नहीं हो सकी। ${escapeHtml(error.message||"")}</p>
    `;
  }
}

async function refreshFollowCounts(profileId){
  if(!supabaseClient||!profileId)return;

  const [
    {count:followerCount,error:followerError},
    {count:followingCount,error:followingError}
  ]=await Promise.all([
    supabaseClient.from("author_follows")
      .select("follower_id",{count:"exact",head:true})
      .eq("author_id",profileId),

    supabaseClient.from("author_follows")
      .select("author_id",{count:"exact",head:true})
      .eq("follower_id",profileId)
  ]);

  if(followerError||followingError){
    console.error("फ़ॉलो आँकड़े अपडेट नहीं हुए:",followerError||followingError);
    return;
  }

  if(profileId===currentUserId){
    const followers=document.getElementById("myFollowerCount");
    const following=document.getElementById("myFollowingCount");

    if(followers)followers.textContent=(followerCount||0).toLocaleString("hi-IN");
    if(following)following.textContent=(followingCount||0).toLocaleString("hi-IN");
  }
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
// Google/Facebook आदि से प्राप्त वास्तविक नाम प्रोफ़ाइल में भरें।
const authUser = latestAuth.data.user;
const meta = authUser.user_metadata || {};

const identityMeta = authUser.identities?.find(
  x => x.provider === authUser.app_metadata?.provider
)?.identity_data || {};

const oauthName = String(
  meta.full_name ||
  meta.name ||
  meta.display_name ||
  meta.username ||
  identityMeta.full_name ||
  identityMeta.name ||
  identityMeta.username ||
  ""
).trim().slice(0, 60);

const savedName = String(data?.display_name || "").trim();

// Google/Facebook की प्रोफ़ाइल फ़ोटो प्राप्त करें।
const providerPicture =
  meta.picture?.data?.url ||
  meta.picture ||
  meta.avatar_url ||
  identityMeta.picture?.data?.url ||
  identityMeta.picture ||
  identityMeta.avatar_url ||
  "";

const oauthAvatar = String(providerPicture).trim();
const savedAvatar = String(data?.avatar_url || "").trim();

if (oauthAvatar && !savedAvatar) {
  const avatarUpdate = data
    ? await supabaseClient
        .from("profiles")
        .update({ avatar_url: oauthAvatar })
        .eq("id", profileUserId)
    : await supabaseClient
        .from("profiles")
        .upsert(
          {
            id: profileUserId,
            avatar_url: oauthAvatar
          },
          { onConflict: "id" }
        );

  if (!avatarUpdate.error) {
    if (data) {
      data.avatar_url = oauthAvatar;
    }

    state.profile.avatarUrl = oauthAvatar;
  } else {
    console.warn(
      "OAuth DP सुरक्षित नहीं हुई:",
      avatarUpdate.error.message
    );
  }
}
  
  
const isDefaultName =
  !savedName ||
  ["अनाम पाठक", "anonymous reader"].includes(savedName.toLowerCase());

if (oauthName && isDefaultName) {
  const nameUpdate = data
    ? await supabaseClient
        .from("profiles")
        .update({ display_name: oauthName })
        .eq("id", profileUserId)
    : await supabaseClient
        .from("profiles")
        .upsert(
          { id: profileUserId, display_name: oauthName },
          { onConflict: "id" }
        );

  if (!nameUpdate.error) {
    if (data) {
      data.display_name = oauthName;
    }

    state.profile.name = oauthName;
  } else {
    console.warn(
      "OAuth नाम प्रोफ़ाइल में सुरक्षित नहीं हुआ:",
      nameUpdate.error.message
    );
  }
}
  if (data) {
    state.profile.name =
      data.display_name || oauthName || "अनाम पाठक";
    state.profile.avatarUrl = data.avatar_url || oauthAvatar || "";
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
  const followingEl=document.getElementById("myFollowingCount");

  if(followerEl)followerEl.textContent="0";
  if(followingEl)followingEl.textContent="0";

  if(currentUserId&&supabaseClient){
    refreshFollowCounts(currentUserId);
  }
  document.getElementById("myStoryList").innerHTML=mine.length?renderStoryCards(mine):'<p class="muted">अभी आपने कोई रचना प्रकाशित नहीं की है।</p>';
  const draftBox=document.getElementById("myDraftList");
  if(draftBox) draftBox.innerHTML=drafts.length?drafts.map(d=>`<article class="story-card"><h3>${escapeHtml(d.title)}</h3><p>निजी ड्राफ्ट</p><div class="story-meta"><button type="button" data-edit-work="${escapeHtml(d.id)}">संपादित करें</button><button type="button" data-republish="${escapeHtml(d.id)}">स्व-घोषणा करके प्रकाशित करें</button></div></article>`).join(""):'<p class="muted">कोई निजी ड्राफ्ट नहीं।</p>';
  bindReadButtons();
  document.querySelectorAll("[data-republish]").forEach(b=>b.addEventListener("click",()=>{currentReaderId=b.dataset.republish;setCurrentWorkStatus();}));
  const profileRoot=document.getElementById("profileView");
  profileRoot?.querySelectorAll("[data-own-profile-pane]").forEach(tab=>tab.onclick=()=>{
    const pane=tab.dataset.ownProfilePane;
    profileRoot.querySelectorAll("[data-own-profile-pane]").forEach(x=>x.classList.toggle("active",x===tab));
    profileRoot.querySelectorAll("[data-own-profile-panel]").forEach(x=>x.classList.toggle("hidden",x.dataset.ownProfilePanel!==pane));
    if(pane==="community")loadOwnCommunityPosts();
  });
  const publishBtn=document.getElementById("ownCommunityPublish");
  if(publishBtn)publishBtn.onclick=publishOwnCommunityPost;
} 

async function loadOwnCommunityPosts(){
  const box=document.getElementById("ownCommunityPosts"); if(!box)return;
  if(!currentUserId||!supabaseClient){box.innerHTML='<p class="muted">संगोष्ठी के लिए लॉगिन करें।</p>';return;}
  box.innerHTML='<p class="muted">संगोष्ठी पोस्ट लोड हो रही हैं…</p>';
  const {data,error}=await supabaseClient.from("community_posts").select("id,body,image_url,created_at").eq("author_id",currentUserId).eq("status","published").order("created_at",{ascending:false});
  if(error){box.innerHTML='<p class="muted">संगोष्ठी पोस्ट लोड नहीं हो सकीं।</p>';return;}
  box.innerHTML=(data||[]).map(post=>`<article class="community-post"><p>${escapeHtml(post.body||"")}</p>${post.image_url?`<img src="${escapeHtml(post.image_url)}" alt="संगोष्ठी पोस्ट" loading="lazy">`:""}<small>${new Date(post.created_at).toLocaleString()}</small></article>`).join("")||'<p class="muted">अभी आपकी कोई संगोष्ठी पोस्ट नहीं है।</p>';
}
async function publishOwnCommunityPost(){
  const field=document.getElementById("ownCommunityPostText"),body=field?.value.trim();
  if(!body){toast("कृपया संगोष्ठी के लिए कुछ लिखें।");return;}
  if(!supabaseClient||!currentUserId){toast("संगोष्ठी प्रकाशित करने के लिए पहले लॉगिन करें।");return;}
  const {error}=await supabaseClient.from("community_posts").insert({author_id:currentUserId,body,status:"published"});
  if(error){toast("संगोष्ठी प्रकाशित नहीं हुई: "+error.message);return;}
  field.value="";await loadOwnCommunityPosts();toast("संगोष्ठी प्रकाशित हो गई।");
}

async function loadInbox(){
  if(!supabaseClient){
    toast("सर्वर से कनेक्शन उपलब्ध नहीं है।");
    return;
  }

  const {data:{user}} = await supabaseClient.auth.getUser();

  if(!user){
    toast("इनबॉक्स के लिए पहले लॉगिन करें।");
    document.getElementById("openAuthButton")?.click();
    return;
  }

  currentUserId = user.id;

  const notice = document.getElementById("inboxNotice");
  if(notice) notice.textContent = "संदेश लोड हो रहे हैं…";

  await loadInboxRequests();
  await loadInboxConversations();
}

async function loadInboxRequests(){
  const box = document.getElementById("inboxRequestsList");
  if(!box || !currentUserId) return;

  const {data,error} = await supabaseClient
    .from("message_requests")
    .select("id,sender_id,recipient_id,status,created_at")
    .eq("recipient_id",currentUserId)
    .eq("status","pending")
    .order("created_at",{ascending:false});

  if(error){
    box.innerHTML = '<p class="muted">अनुरोध लोड नहीं हुए।</p>';
    console.error("Inbox requests:",error);
    return;
  }

  inboxRequestsCache = data || [];

  if(!inboxRequestsCache.length){
    box.innerHTML = '<p class="muted">कोई नया संदेश अनुरोध नहीं है।</p>';
    return;
  }

  const ids = [...new Set(inboxRequestsCache.map(r=>r.sender_id))];

  const {data:profiles,error:profileError} = await supabaseClient
    .from("profiles")
    .select("id,display_name,username,avatar_url")
    .in("id",ids);

  if(profileError){
    console.error("Inbox profiles:",profileError);
  }

  const profileMap = new Map((profiles||[]).map(p=>[p.id,p]));

  box.innerHTML = inboxRequestsCache.map(r=>{
    const p = profileMap.get(r.sender_id)||{};
    const name = escapeHtml(p.display_name||p.username||"रचनाकार");

    return `
      <article class="story-card">
        <h3>${name}</h3>
        <p>आपको नया निजी संदेश अनुरोध मिला है।</p>
        <div class="story-meta">
          <button type="button" data-inbox-open-request="${r.id}">
            संदेश देखें
          </button>
          <button type="button" data-inbox-accept="${r.id}">
            स्वीकारें
          </button>
          <button type="button" data-inbox-reject="${r.id}">
            अस्वीकारें
          </button>
          <button type="button" data-inbox-block="${r.id}">
            ब्लॉक करें
          </button>
        </div>
      </article>`;
  }).join("");

  box.querySelectorAll("[data-inbox-open-request]").forEach(b=>{
    b.onclick=()=>openInboxConversation(Number(b.dataset.inboxOpenRequest));
  });

  box.querySelectorAll("[data-inbox-accept]").forEach(b=>{
    b.onclick=()=>respondInboxRequest(Number(b.dataset.inboxAccept),"accepted");
  });

  box.querySelectorAll("[data-inbox-reject]").forEach(b=>{
    b.onclick=()=>respondInboxRequest(Number(b.dataset.inboxReject),"rejected");
  });

  box.querySelectorAll("[data-inbox-block]").forEach(b=>{
    b.onclick=()=>respondInboxRequest(Number(b.dataset.inboxBlock),"blocked");
  });
}

async function respondInboxRequest(requestId,status){
  if(!["accepted","rejected","blocked"].includes(status)) return;

  const {data:{user}} = await supabaseClient.auth.getUser();
  if(!user) return;

  const request = inboxRequestsCache.find(r=>r.id===requestId);
  if(!request || request.recipient_id!==user.id) return;

  if(status==="blocked"){
    const {error:blockError} = await supabaseClient
      .from("author_blocks")
      .insert({
        blocker_id:user.id,
        blocked_user_id:request.sender_id
      });

    if(blockError && blockError.code!=="23505"){
      toast("ब्लॉक नहीं कर सके: "+blockError.message);
      return;
    }
  }

  const {error} = await supabaseClient
    .from("message_requests")
    .update({status})
    .eq("id",requestId)
    .eq("recipient_id",user.id)
    .eq("status","pending");

  if(error){
    toast("अनुरोध अपडेट नहीं हुआ: "+error.message);
    return;
  }

  toast(
    status==="accepted" ? "संदेश अनुरोध स्वीकार हुआ।" :
    status==="rejected" ? "संदेश अनुरोध अस्वीकार हुआ।" :
    "उपयोगकर्ता ब्लॉक किया गया।"
  );

  await loadInboxRequests();
  await loadInboxConversations();
}

async function loadInboxConversations(){
  const box = document.getElementById("inboxConversationsList");
  if(!box || !currentUserId) return;

  const {data,error} = await supabaseClient
    .from("message_requests")
    .select("id,sender_id,recipient_id,status,created_at")
    .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
    .eq("status","accepted")
    .order("updated_at",{ascending:false});

  if(error){
    box.innerHTML='<p class="muted">बातचीत लोड नहीं हुई।</p>';
    console.error("Inbox conversations:",error);
    return;
  }

  const requests=data||[];

  if(!requests.length){
    box.innerHTML='<p class="muted">अभी कोई स्वीकार की गई बातचीत नहीं है।</p>';
    return;
  }

  const ids=[...new Set(requests.map(r=>
    r.sender_id===currentUserId?r.recipient_id:r.sender_id
  ))];

  const {data:profiles,error:profileError}=await supabaseClient
    .from("profiles")
    .select("id,display_name,username,avatar_url")
    .in("id",ids);

  if(profileError) console.error(profileError);

  const map=new Map((profiles||[]).map(p=>[p.id,p]));

  box.innerHTML=requests.map(r=>{
    const otherId=r.sender_id===currentUserId?r.recipient_id:r.sender_id;
    const p=map.get(otherId)||{};
    return `
      <button type="button" class="writer-card"
        data-inbox-conversation="${r.id}">
        <span class="writer-card-main">
          <strong>${escapeHtml(p.display_name||p.username||"रचनाकार")}</strong>
          <small>निजी बातचीत खोलें</small>
        </span>
        <span>खोलें ↗</span>
      </button>`;
  }).join("");

  box.querySelectorAll("[data-inbox-conversation]").forEach(b=>{
    b.onclick=()=>openInboxConversation(Number(b.dataset.inboxConversation));
  });
}

async function openInboxConversation(requestId){
  const request=inboxRequestsCache.find(r=>r.id===requestId)
    || (await supabaseClient
      .from("message_requests")
      .select("id,sender_id,recipient_id,status")
      .eq("id",requestId)
      .single()).data;

  if(!request) return;

  if(![request.sender_id,request.recipient_id].includes(currentUserId)){
    toast("इस बातचीत की अनुमति नहीं है।");
    return;
  }

  inboxCurrentRequestId=request.id;
  inboxCurrentOtherUserId=
    request.sender_id===currentUserId
      ? request.recipient_id
      : request.sender_id;

  const {data:profile}=await supabaseClient
    .from("profiles")
    .select("display_name,username")
    .eq("id",inboxCurrentOtherUserId)
    .maybeSingle();

  document.getElementById("inboxContactName").textContent=
    profile?.display_name||profile?.username||"रचनाकार";

  document.getElementById("inboxRequestsList").classList.add("hidden");
  document.getElementById("inboxConversationsList").classList.add("hidden");
  document.getElementById("inboxConversation").classList.remove("hidden");

  await loadInboxMessages();
}

async function loadInboxMessages(){
  const box=document.getElementById("inboxMessagesList");
  if(!box || !inboxCurrentRequestId) return;

  const {data,error}=await supabaseClient
    .from("messages")
    .select("id,request_id,sender_id,message_text,created_at,is_read")
    .eq("request_id",inboxCurrentRequestId)
    .order("created_at",{ascending:true});

  if(error){
    box.innerHTML='<p class="muted">संदेश लोड नहीं हुए।</p>';
    console.error("Inbox messages:",error);
    return;
  }

  inboxMessagesCache=data||[];

  box.innerHTML=inboxMessagesCache.map(m=>`
    <div class="inbox-message ${m.sender_id===currentUserId?"mine":"theirs"}">
      <p>${escapeHtml(m.message_text)}</p>
      <small>${new Date(m.created_at).toLocaleString("hi-IN")}</small>
    </div>
  `).join("")||'<p class="muted">अभी कोई संदेश नहीं है।</p>';

  box.scrollTop=box.scrollHeight;

  const unread=inboxMessagesCache
    .filter(m=>m.sender_id!==currentUserId&&!m.is_read)
    .map(m=>m.id);

if(unread.length){
  const {error:readError} = await supabaseClient
    .from("messages")
    .update({is_read:true})
    .in("id",unread);

  if(readError){
    console.warn("Messages read status:",readError);
  }else{
    await loadNotificationBadge();
  }
}
}

async function sendInboxMessage(event){
  event.preventDefault();

  const input=document.getElementById("inboxMessageText");
  const message=input.value.trim();

  if(!message || !inboxCurrentRequestId) return;

  if(!currentUserId){
    toast("पहले लॉगिन करें।");
    return;
  }

  if(message.length>5000){
    toast("संदेश अधिकतम 5000 अक्षरों का हो सकता है।");
    return;
  }

  const {data:{user}}=await supabaseClient.auth.getUser();
  if(!user || user.id!==currentUserId) return;

  const {error}=await supabaseClient
    .from("messages")
    .insert({
      request_id:inboxCurrentRequestId,
      sender_id:user.id,
      message_text:message,
      is_read:false
    });

  if(error){
    toast("संदेश नहीं भेजा गया: "+error.message);
    return;
  }

  input.value="";
  await loadInboxMessages();
  loadNotificationBadge();
}

function showInboxMode(mode){
  inboxCurrentMode=mode;

  const conversation=document.getElementById("inboxConversation");
  conversation?.classList.add("hidden");

  document.getElementById("inboxRequestsList")
    ?.classList.toggle("hidden",mode!=="requests");

  document.getElementById("inboxConversationsList")
    ?.classList.toggle("hidden",mode!=="messages");

  if(mode==="requests") loadInboxRequests();
  else loadInboxConversations();
}

function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  document.querySelector(".app-shell").classList.toggle("hidden",tab!=="home");
  ["library","profile","settings","inbox","community"].forEach(t=>{
  const view=document.getElementById(t+"View");
  if(view) view.classList.toggle("hidden",tab!==t);
});
  if(tab==="community")loadCommunityPosts();
  if(tab==="write"){openWrite();document.querySelector('[data-tab="home"]').classList.remove("active");}
  if(tab==="library")renderLibrary();
  if(tab==="inbox")loadInbox();
  if(tab==="settings")renderPreferredCategories();
  if(tab==="profile")renderProfile();
  window.scrollTo({top:0,behavior:"smooth"});
}
function applyTheme(){document.body.classList.toggle("dark",state.theme==="dark");}

/* =========================================
   SAHITYA SUTRADHAR — REUSABLE LOADER
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

let loaderStartedAt = Date.now();
let loaderQuoteIndex = 0;
let loaderQuoteTimer = null;
let loaderTypingTimer = null;
let loaderHideTimer = null;
let loaderFallbackTimer = null;

function writeLoaderQuote() {
  const quote = loaderQuotes[loaderQuoteIndex];
  const quoteEl = document.getElementById("loaderQuote");
  const authorEl = document.getElementById("loaderAuthor");

  if (!quoteEl || !authorEl) return;

  clearInterval(loaderTypingTimer);

  quoteEl.textContent = "";
  authorEl.textContent = "";

  let position = 0;

  loaderTypingTimer = setInterval(() => {
    quoteEl.textContent = quote.text.slice(0, position + 1);
    position++;

    if (position >= quote.text.length) {
      clearInterval(loaderTypingTimer);
      authorEl.textContent = quote.author;
    }
  }, 65);

  loaderQuoteIndex =
    (loaderQuoteIndex + 1) % loaderQuotes.length;
}

function showAppLoader() {
  const loader = document.getElementById("appLoader");
  if (!loader) return;
  if (window.__sutradharLoaderAlreadyShown) return;
  window.__sutradharLoaderAlreadyShown = true;

  clearTimeout(loaderHideTimer);
  clearTimeout(loaderFallbackTimer);

  loader.classList.remove("loader-hidden");

  loaderStartedAt = Date.now();

  writeLoaderQuote();

  clearInterval(loaderQuoteTimer);
  loaderQuoteTimer = setInterval(writeLoaderQuote, 8500);

  // किसी असामान्य नेटवर्क समस्या में Loader हमेशा अटका न रहे।
  loaderFallbackTimer = setTimeout(hideAppLoader, 15000);
}

function hideAppLoader() {
  const loader = document.getElementById("appLoader");

  if (!loader || loader.classList.contains("loader-hidden")) return;

  clearTimeout(loaderHideTimer);
  clearTimeout(loaderFallbackTimer);

  const elapsed = Date.now() - loaderStartedAt;
  const minimumDisplay = 2500;

  loaderHideTimer = setTimeout(() => {
    loader.classList.add("loader-hidden");

    clearInterval(loaderQuoteTimer);
    clearInterval(loaderTypingTimer);
  }, Math.max(0, minimumDisplay - elapsed));
}

// Loader प्रति ब्राउज़र/ऐप टैब सत्र में केवल पहली बार दिखेगा।
const SUTRADHAR_LOADER_SESSION_KEY = "ss_mobile_loader_seen_v1";
if (sessionStorage.getItem(SUTRADHAR_LOADER_SESSION_KEY) === "1") {
  window.__sutradharLoaderAlreadyShown = true;
  document.getElementById("appLoader")?.classList.add("loader-hidden");
} else {
  window.__sutradharLoaderAlreadyShown = false;
  sessionStorage.setItem(SUTRADHAR_LOADER_SESSION_KEY, "1");
  showAppLoader();
}

async function loadNotificationBadge(){
  if(!supabaseClient) return;

  const {data:{user}} = await supabaseClient.auth.getUser();

  const badge = document.getElementById("notificationBadge");
  const inboxBadge = document.getElementById("inboxBadge");

  if(!user){
    if(badge) badge.hidden = true;
    if(inboxBadge) inboxBadge.classList.add("hidden");
    return;
  }

  // सामान्य नोटिफिकेशन की संख्या
  if(badge){
    const {count,error} = await supabaseClient
      .from("notifications")
      .select("id",{count:"exact",head:true})
      .eq("recipient_id",user.id)
      .eq("is_read",false);

    if(error){
      console.warn("Notifications:",error);
    }else{
      badge.textContent = count > 99 ? "99+" : count;
      badge.hidden = !count;
    }
  }

  // इनबॉक्स में आए अपठित संदेशों की संख्या
  if(inboxBadge){
    const {count,error} = await supabaseClient
      .from("messages")
      .select("id",{count:"exact",head:true})
      .eq("is_read",false)
      .neq("sender_id",user.id);

    if(error){
      console.warn("Inbox unread messages:",error);
    }else{
      inboxBadge.textContent = count > 99 ? "99+" : count;
      inboxBadge.classList.toggle("hidden",!count);
    }
  }
}


async function openNotifications(){
  if(!supabaseClient){
    toast("सर्वर से कनेक्शन उपलब्ध नहीं है।");
    return;
  }

  const {data:{user}} = await supabaseClient.auth.getUser();

  if(!user){
    toast("नोटिफिकेशन देखने के लिए पहले लॉगिन करें।");
    return;
  }

  const {data:notifications,error} = await supabaseClient
    .from("notifications")
    .select("id,actor_id,notification_type,message,related_work_id,related_post_id,related_community_comment_id,related_work_comment_id,related_review_id,is_read,created_at")
    .eq("recipient_id",user.id)
    .order("created_at",{ascending:false})
    .limit(50);

  if(error){
    toast("नोटिफिकेशन लोड नहीं हुए: "+error.message);
    return;
  }

  const actorIds = [...new Set((notifications||[])
    .map(n=>n.actor_id).filter(Boolean))];

  let profiles = [];

  if(actorIds.length){
    const result = await supabaseClient
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .in("id",actorIds);

    if(result.error){
      toast("पाठकों की जानकारी लोड नहीं हुई।");
      return;
    }

    profiles = result.data||[];
  }

  const dialog = document.createElement("dialog");
  dialog.className = "modal";

  const items = (notifications||[]).map(n=>{
  const actor = profiles.find(p=>p.id===n.actor_id);
  const actorName = actor?.display_name||actor?.username||"एक पाठक";

  return `
    <article class="notification-item ${n.is_read?"":"unread"}"
      data-notification-id="${n.id}"
      data-notification-type="${escapeHtml(n.notification_type||"")}"
      data-actor-id="${escapeHtml(n.actor_id||"")}"
      data-work-id="${escapeHtml(n.related_work_id||"")}"
      data-post-id="${escapeHtml(n.related_post_id||"")}"
      data-community-comment-id="${escapeHtml(n.related_community_comment_id||"")}"
      data-review-id="${escapeHtml(n.related_review_id||"")}"
      data-work-comment-id="${escapeHtml(n.related_work_comment_id||"")}">
      <strong>${escapeHtml(actorName)}</strong>
      <p>${escapeHtml(n.message)}</p>
      <small>${new Date(n.created_at).toLocaleString("hi-IN")}</small>
    </article>
  `;
}).join("");

  dialog.innerHTML = `
    <div class="reader-page">
      <button class="close-button" id="notificationsClose">×</button>
      <h2>🔔 नोटिफिकेशन</h2>
      <div class="notifications-list">
        ${items||'<p class="muted">अभी कोई नोटिफिकेशन नहीं है।</p>'}
      </div>
    </div>
  `;

  document.body.appendChild(dialog);
  dialog.showModal();

  dialog.querySelector("#notificationsClose").onclick=()=>{
    dialog.close();
    dialog.remove();
  };

  const unreadIds = (notifications||[])
    .filter(n=>!n.is_read)
    .map(n=>n.id);

  if(unreadIds.length){
    const {error:updateError} = await supabaseClient
      .from("notifications")
      .update({is_read:true})
      .in("id",unreadIds)
      .eq("recipient_id",user.id);

    if(!updateError){
      await loadNotificationBadge();
    }
  }

  dialog.querySelectorAll(".notification-item").forEach(item=>{
  item.addEventListener("click",async()=>{
    const type = item.dataset.notificationType;
    const actorId = item.dataset.actorId;
    const workId = item.dataset.workId;
    const postId = item.dataset.postId;
    const commentId = item.dataset.communityCommentId;
    const reviewId = item.dataset.reviewId;

    dialog.close();
    dialog.remove();

    // नई फ़ॉलो रिक्वेस्ट / फ़ॉलोअर
    if(type === "follow" && actorId){
      await openAuthorProfile(actorId);
      return;
    }

    // रचना से संबंधित नोटिफिकेशन
if(["new_work","rating","review","work_comment","review_comment"].includes(type) && workId){
  await openReader(workId);

  if(type === "review_comment" && commentId){
    const target = [...document.querySelectorAll("#readerDialog [data-work-comment-id]")]
      .find(el => el.dataset.workCommentId === commentId);

    target?.scrollIntoView({behavior:"smooth",block:"center"});
  }
  else if(type === "review" && reviewId){
    const target = [...document.querySelectorAll("#readerDialog [data-review-id]")]
      .find(el => el.dataset.reviewId === reviewId);

    target?.scrollIntoView({behavior:"smooth",block:"center"});
  }

  return;
}

    // नई संगोष्ठी पोस्ट
    if(type === "new_post" && actorId){
      await openAuthorProfile(actorId);

      if(postId){
        const post = [...document.querySelectorAll("[data-community-post-id]")]
          .find(el=>el.dataset.communityPostId === postId);

        post?.scrollIntoView({behavior:"smooth",block:"center"});
      }
      return;
    }

    // संगोष्ठी पोस्ट पर पसंद या कमेंट
    if(["post_like","post_comment"].includes(type)){
      await openAuthorProfile(user.id);

      if(postId){
        const post = [...document.querySelectorAll("[data-community-post-id]")]
          .find(el=>el.dataset.communityPostId === postId);

        post?.scrollIntoView({behavior:"smooth",block:"center"});
      }

      if(commentId){
        const comment = [...document.querySelectorAll("[data-community-comment-id]")]
          .find(el=>el.dataset.communityCommentId === commentId);

        comment?.scrollIntoView({behavior:"smooth",block:"center"});
      }
    }
  });
});

  dialog.addEventListener("close",()=>dialog.remove());
}

function init(){
  applyTheme();renderCategoriesForm();renderChips();renderStories();renderProfile();renderLibrary();applyUILanguage();

  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  document.getElementById("inboxMessagesTab")
  ?.addEventListener("click",()=>showInboxMode("messages"));

document.getElementById("inboxRequestsTab")
  ?.addEventListener("click",()=>showInboxMode("requests"));

document.getElementById("inboxBack")
  ?.addEventListener("click",()=>{
    document.getElementById("inboxConversation").classList.add("hidden");
    showInboxMode(inboxCurrentMode);
  });

document.getElementById("inboxMessageForm")
  ?.addEventListener("submit",sendInboxMessage);

  const workSearchInput=document.getElementById("workSearchInput");
  workSearchInput?.addEventListener("input",renderStories);
  document.getElementById("workSearchClear")?.addEventListener("click",()=>{
    if(workSearchInput){workSearchInput.value="";renderStories();workSearchInput.focus();}
  });
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.go)));

document.getElementById("inboxNotificationsTab")?.addEventListener("click",()=>{switchTab("inbox");openNotifications();});

loadNotificationBadge();

if(supabaseClient){
  supabaseClient.auth.onAuthStateChange(()=>{
    setTimeout(loadNotificationBadge,0);
  });
}
  document.querySelectorAll("[data-follow-list]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(!currentUserId){
        toast("पहले लॉगिन करें।");
        return;
      }

      openFollowList(currentUserId,button.dataset.followList);
    });
  });
  
  
  document.getElementById("settingsShortcut")?.addEventListener("click",()=>switchTab("settings"));
  document.getElementById("readerAuthorLink")?.addEventListener("click",()=>openAuthorProfile());
  document.getElementById("reportWork")?.addEventListener("click",async()=>{const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;const reason=prompt("समस्या का प्रकार लिखें (आपत्तिजनक/कॉपीराइट/अन्य):");if(!reason)return;const details=prompt("अपनी समस्या अधिकतम 100 शब्दों में लिखें:");if(!details)return;if(wordCount(details)>100){toast("रिपोर्ट अधिकतम 100 शब्दों की हो सकती है।");return;}const {data:{user}}=await supabaseClient.auth.getUser();if(!user){toast("रिपोर्ट के लिए लॉगिन करें।");return;}const {error}=await supabaseClient.from("content_reports").insert({reporter_id:user.id,target_type:"work",target_work_id:s.id,reason:reason.slice(0,100),details});toast(error?"रिपोर्ट नहीं भेजी: "+error.message:"रिपोर्ट भेज दी गई।");});
  document.getElementById("shareWork")?.addEventListener("click",async()=>{const s=state.stories.find(x=>x.id===currentReaderId);if(!s)return;const url=location.href.split("#")[0]+"#work-"+s.id;const share={title:s.title,text:`${s.title} — ${s.author}`,url};if(navigator.share){try{await navigator.share(share);}catch(e){}}else{await navigator.clipboard?.writeText(url);toast("रचना लिंक कॉपी हुई।");}});
  document.getElementById("shareExcerptImage")?.addEventListener("click",shareExcerptAsImage);
  document.getElementById("workLikeButton")?.addEventListener("click",toggleWorkLike);
  document.getElementById("publishCommunityPost")?.addEventListener("click",publishCommunityPost);
  document.getElementById("communityPostImage")?.addEventListener("change", e => {
  const file = e.target.files?.[0];
  const preview = document.getElementById("communityImagePreview");

  if (!preview) return;

  preview.innerHTML = "";

  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast("केवल JPG, PNG या WebP तस्वीर चुनें।");
    e.target.value = "";
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    toast("तस्वीर अधिकतम 8 MB की हो सकती है।");
    e.target.value = "";
    return;
  }

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.alt = "पोस्ट की तस्वीर का प्रीव्यू";
  img.style.maxWidth = "100%";
  img.style.maxHeight = "260px";
  img.style.borderRadius = "12px";

  preview.appendChild(img);
});
  // संगोष्ठी की सूची अब उसी समय लोड होगी जब उपयोगकर्ता उसका टैब खोलेगा।
  document.getElementById("settingsAuthButton")?.addEventListener("click",()=>document.getElementById("openAuthButton")?.click());
  const ownAvatar=document.getElementById("profileAvatar");
  const avatarPicker=document.getElementById("avatarUpload");
  if(ownAvatar&&avatarPicker){
    ownAvatar.setAttribute("role","button");
    ownAvatar.setAttribute("tabindex","0");
    ownAvatar.setAttribute("aria-label","प्रोफ़ाइल तस्वीर बदलें");
    ownAvatar.title="DP बदलने के लिए छुएँ";
    ownAvatar.style.cursor="pointer";
    ownAvatar.addEventListener("click",()=>avatarPicker.click());
    ownAvatar.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();avatarPicker.click();}});
  }
  document.getElementById("avatarUpload")?.addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;

  toast("तस्वीर चुनी गई: " + file.name);

  try {
    await openAvatarCropEditor(file);
  } catch (error) {
    toast("DP Editor Error: " + error.message);
  }

  e.target.value = "";
});
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
  document.getElementById("seriesMode")?.addEventListener("change",updateSeriesEditor);

document.getElementById("existingSeries")?.addEventListener("change",updateSelectedSeriesStatus);

updateSeriesEditor();
 document.getElementById("storyForm").addEventListener("submit",publishStory);
  document.getElementById("saveDraftCloud")?.addEventListener("click",saveCloudDraft);
  document.getElementById("storyTitle").addEventListener("input",saveDraftFromForm);
  document.getElementById("storyBody").addEventListener("input",saveDraftFromForm);
  document.getElementById("formSubType").addEventListener("change",saveDraftFromForm);
  document.getElementById("formCategories").addEventListener("change",saveDraftFromForm);
  document.getElementById("closeWrite").addEventListener("click",()=>document.getElementById("writeDialog").close());
  document.getElementById("closeReader").addEventListener("click",()=>finishReading());
  document.getElementById("readerDialog")?.addEventListener("cancel",event=>{event.preventDefault();finishReading();});
  document.getElementById("readerPrevPage")?.addEventListener("click",()=>readerGoPage(readerPageIndex-1,"prev"));
  document.getElementById("readerNextPage")?.addEventListener("click",()=>readerGoPage(readerPageIndex+1,"next"));
  document.getElementById("readerPrevPart")
  ?.addEventListener("click",()=>navigateReaderSeries(-1));

document.getElementById("readerNextPart")
  ?.addEventListener("click",()=>navigateReaderSeries(1));
  document.getElementById("readerBody")?.addEventListener("scroll",()=>{if(!readerUsesVerticalScroll()){readerPageMetrics();recordReaderPage(readerPageIndex);}},{passive:true});
  document.getElementById("readerPage")?.addEventListener("scroll",()=>{if(readerUsesVerticalScroll()){readerPageMetrics();recordReaderPage(readerPageIndex);}},{passive:true});
  document.getElementById("readerFontSize")?.addEventListener("input",e=>{
    const body=document.getElementById("readerBody");
    const ratio=readerPagesTotal>1?readerPageIndex/(readerPagesTotal-1):0;
    body.style.fontSize=e.target.value+"px";
    requestAnimationFrame(()=>{
      readerPageMetrics();
      const target=Math.round(ratio*Math.max(0,readerPagesTotal-1));
      const scroller=document.getElementById(readerUsesVerticalScroll()?"readerPage":"readerBody");
      if(readerUsesVerticalScroll())scroller.scrollTop=target*scroller.clientHeight;else scroller.scrollLeft=target*scroller.clientWidth;
      readerPageMetrics();recordReaderPage(target);
    });
  });
  let readerResizeTimer;
  window.addEventListener("resize",()=>{
    if(!document.getElementById("readerDialog")?.open)return;
    clearTimeout(readerResizeTimer);
    const ratio=readerPagesTotal>1?readerPageIndex/(readerPagesTotal-1):0;
    readerResizeTimer=setTimeout(()=>{
      const body=document.getElementById("readerBody");
      readerPageMetrics();
      const target=Math.round(ratio*Math.max(0,readerPagesTotal-1));
      const scroller=document.getElementById(readerUsesVerticalScroll()?"readerPage":"readerBody");
      if(readerUsesVerticalScroll())scroller.scrollTop=target*scroller.clientHeight;else scroller.scrollLeft=target*scroller.clientWidth;
      readerPageMetrics();recordReaderPage(target);
    },180);
  });
  document.getElementById("readerBody")?.addEventListener("touchstart",e=>{if(!readerUsesVerticalScroll())window.__readerTouchX=e.changedTouches[0].clientX;},{passive:true});
  document.getElementById("readerBody")?.addEventListener("touchend",e=>{if(readerUsesVerticalScroll())return;const dx=e.changedTouches[0].clientX-(window.__readerTouchX||e.changedTouches[0].clientX);if(Math.abs(dx)>55)readerGoPage(readerPageIndex+(dx<0?1:-1),dx<0?"next":"prev");},{passive:true});

  document.getElementById("finishReading").addEventListener("click",finishReading);
  document.getElementById("bookmarkButton").addEventListener("click",toggleBookmark);
  document.getElementById("submitFeedback")?.addEventListener("click",submitRatingReview);
  document.getElementById("deleteMyRating")?.addEventListener("click", () => deleteMyFeedback("rating"));
document.getElementById("deleteMyReview")?.addEventListener("click", () => deleteMyFeedback("review"));
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
      navigator.serviceWorker.register("./sw.js?v=20261110-login-resilience-2", {updateViaCache:"none"})
        .then(async registration => {
          console.log("साहित्य सूत्रधार PWA तैयार है।", registration.scope);
          try { await registration.update(); } catch (_) {}
          navigator.serviceWorker.addEventListener("controllerchange",()=>{
            try {
              const activeScript=registration.active?.scriptURL||"sahitya-sutradhar-v20";
              const key="ss_sw_controller_script";
              if(sessionStorage.getItem(key)!==activeScript){sessionStorage.setItem(key,activeScript);location.reload();}
            } catch (_) {}
          });
          document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")registration.update().catch(()=>{});});
          window.addEventListener("focus",()=>registration.update().catch(()=>{}));
        })
        .catch(error => {
          console.error("PWA Service Worker रजिस्टर नहीं हुआ:", error);
        });
    });
  }
}
function openWorkFromHash(){
  const match=location.hash.match(/^#work-(.+)$/);
if(!match)return;

const id=decodeURIComponent(match[1]);

if(state.stories.some(x=>String(x.id)===String(id))){
  history.replaceState(null,"",location.pathname+location.search);
  openReader(id);
}
}
function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme();}
/* साहित्य सूत्रधार: Supabase लॉगिन */

(function setupSahityaGramAuth() {
  const dialog = document.getElementById("authDialog");
  const form = document.getElementById("authForm");

  if (!dialog || !form) {
    console.error("लॉगिन फ़ॉर्म उपलब्ध नहीं है।");
    return;
  }

  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");
  const message = document.getElementById("authMessage");
  const submit = document.getElementById("authSubmit");
  const register = document.getElementById("authRegister");
  const google = document.getElementById("authGoogle");
  const facebook = document.getElementById("authFacebook");
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
    document.getElementById("authHeading").dataset.authMode = mode;
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
    if (!supabaseClient?.auth) {
      showMessage("लॉगिन सेवा अभी उपलब्ध नहीं है। इंटरनेट कनेक्शन जाँचकर पृष्ठ फिर खोलें।");
      return null;
    }
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
  
  facebook?.addEventListener("click", async () => {
    if (!supabaseClient) { showMessage("Supabase कनेक्शन उपलब्ध नहीं है।"); return; }
    showMessage("Facebook लॉगिन खोला जा रहा है...");
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) showMessage("Facebook लॉगिन त्रुटि: " + error.message);
  });

  close.addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!supabaseClient?.auth) {
      showMessage("लॉगिन सेवा से संपर्क नहीं हो पा रहा है। इंटरनेट कनेक्शन जाँचें और पुनः प्रयास करें।");
      return;
    }
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
  setTimeout(() => dialog.close(), 700);
      }
    } catch (error) {
      showMessage("त्रुटि: " + error.message);
    } finally {
      submit.disabled = false;
    }
  });
    
  async function syncCurrentAccount(sessionUser){
  const version = ++authSyncVersion;

  try {
    const nextId = sessionUser?.id || null;

    if (currentUserId !== nextId) {
      clearTimeout(readerProgressSaveTimer);
      readerProgressSaveTimer=null;
      readerProgressSavePending=false;
      readerProgressUserId=nextId;
      switchAccountState(nextId);
    }

    if (!nextId) {
      state = emptyAccountState();
      currentUserId = null;
      readerProgressUserId=null;
      saveState();
      renderProfile();
      renderStories();
      renderLibrary();

      await loadCloudWorks();
      if (version !== authSyncVersion) return;

      await loadCommunityPosts();
      if (version !== authSyncVersion) return;

      if (location.hash.startsWith("#work-")) {
  history.replaceState(null, "", location.pathname + location.search);
      }
      return;
    }

    await loadCloudProfile();
    if (version !== authSyncVersion) return;

    await loadCloudWorks();
    if (version !== authSyncVersion) return;

    readerProgressUserId=nextId;
    await loadCloudReaderProgressForUser(nextId);
    if (version !== authSyncVersion) return;
    renderProfile();

    await loadCommunityPosts();
    if (version !== authSyncVersion) return;

    if (location.hash.startsWith("#work-")) {
  history.replaceState(null, "", location.pathname + location.search);
    }

  } catch (error) {
    console.error("शुरुआती डेटा लोड नहीं हुआ:", error);
  } finally {
    if (version === authSyncVersion) {
      hideAppLoader();
    }
  }
  }

  
if (!supabaseClient?.auth) {
    showMessage("लॉगिन सेवा लोड नहीं हुई। कृपया इंटरनेट कनेक्शन जाँचें और पृष्ठ पुनः खोलें।");
    console.error("Supabase client उपलब्ध नहीं है; लॉगिन फ़ॉर्म सक्रिय है लेकिन प्रमाणीकरण संभव नहीं।");
    return;
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {

  // लॉगिन/लॉगआउट पर ऐप-लॉन्च Loader दोबारा नहीं दिखेगा।

  // Auth callback के बाहर डेटा लोड करें।
  setTimeout(() => {
    refreshAuth();
    syncCurrentAccount(session?.user || null);
  }, 0);
});
  

  supabaseClient.auth.getSession().then(({data,error})=>{
    if(error) console.error("सेशन लोड नहीं हुआ:",error.message);
    syncCurrentAccount(data?.session?.user || null);
  });
})();

/* =====================================
   SAHITYA SUTRADHAR — DP CROP EDITOR
===================================== */

let avatarCropImage = null;
let avatarCropObjectURL = null;
let avatarCropZoom = 1;
let avatarCropRotation = 0;
let avatarCropX = 0;
let avatarCropY = 0;
let avatarCropDragging = false;
let avatarCropLastX = 0;
let avatarCropLastY = 0;

function renderAvatarCrop() {
  const canvas = document.getElementById("avatarCropCanvas");
  if (!canvas || !avatarCropImage) return;

  const ctx = canvas.getContext("2d");
  const size = 400;
  const img = avatarCropImage;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#211a18";
  ctx.fillRect(0, 0, size, size);

  const rad = avatarCropRotation * Math.PI / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const rotatedWidth = img.width * cos + img.height * sin;
  const rotatedHeight = img.width * sin + img.height * cos;

  const baseScale = Math.max(
    size / rotatedWidth,
    size / rotatedHeight
  );

  const scale = baseScale * avatarCropZoom;

  ctx.save();
  ctx.translate(size / 2 + avatarCropX, size / 2 + avatarCropY);
  ctx.rotate(rad);
  ctx.scale(scale, scale);

  ctx.drawImage(
    img,
    -img.width / 2,
    -img.height / 2
  );

  ctx.restore();
}

function closeAvatarCropEditor() {
  const dialog = document.getElementById("avatarCropDialog");

  if (dialog?.open) dialog.close();

  avatarCropImage = null;

  if (avatarCropObjectURL) {
    URL.revokeObjectURL(avatarCropObjectURL);
    avatarCropObjectURL = null;
  }
}

async function openAvatarCropEditor(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast("केवल JPG, PNG या WebP चित्र चुनें।");
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    toast("चित्र 8 MB से छोटा होना चाहिए।");
    return;
  }

  const dialog = document.getElementById("avatarCropDialog");

  if (!dialog) {
    toast("DP क्रॉप एडिटर नहीं मिला।");
    return;
  }

  try {
    if (avatarCropObjectURL) {
      URL.revokeObjectURL(avatarCropObjectURL);
    }

    avatarCropObjectURL = URL.createObjectURL(file);

    const img = new Image();
    img.src = avatarCropObjectURL;
    await img.decode();

    avatarCropImage = img;
    avatarCropZoom = 1;
    avatarCropRotation = 0;
    avatarCropX = 0;
    avatarCropY = 0;

    document.getElementById("avatarZoom").value = 1;

    renderAvatarCrop();

    if (!dialog.dataset.bound) {
      dialog.dataset.bound = "true";

      document.getElementById("avatarZoom").addEventListener("input", e => {
        avatarCropZoom = Number(e.target.value);
        renderAvatarCrop();
      });

      document.getElementById("cropRotateLeft").addEventListener("click", () => {
        avatarCropRotation = (avatarCropRotation - 90 + 360) % 360;
        renderAvatarCrop();
      });

      document.getElementById("cropRotateRight").addEventListener("click", () => {
        avatarCropRotation = (avatarCropRotation + 90) % 360;
        renderAvatarCrop();
      });

      document.getElementById("cropClose").addEventListener("click", closeAvatarCropEditor);
      document.getElementById("cropCancel").addEventListener("click", closeAvatarCropEditor);

      const canvas = document.getElementById("avatarCropCanvas");

      canvas.addEventListener("pointerdown", e => {
        if (!avatarCropImage) return;

        avatarCropDragging = true;
        avatarCropLastX = e.clientX;
        avatarCropLastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      });

      canvas.addEventListener("pointermove", e => {
        if (!avatarCropDragging) return;

        const rect = canvas.getBoundingClientRect();
        const factor = 400 / rect.width;

        avatarCropX += (e.clientX - avatarCropLastX) * factor;
        avatarCropY += (e.clientY - avatarCropLastY) * factor;

        avatarCropLastX = e.clientX;
        avatarCropLastY = e.clientY;

        renderAvatarCrop();
      });

      canvas.addEventListener("pointerup", () => {
        avatarCropDragging = false;
      });

      canvas.addEventListener("pointercancel", () => {
        avatarCropDragging = false;
      });

      document.getElementById("cropSave").addEventListener("click", async () => {
        if (!avatarCropImage) return;

        const button = document.getElementById("cropSave");
        button.disabled = true;
        button.textContent = "सुरक्षित हो रहा है…";

        try {
          if (!supabaseClient) throw new Error("Supabase कनेक्शन उपलब्ध नहीं है।");

          const canvas = document.getElementById("avatarCropCanvas");

          const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(result => {
              if (result) resolve(result);
              else reject(new Error("चित्र तैयार नहीं हो पाया।"));
            }, "image/jpeg", 0.92);
          });

          const croppedFile = new File(
            [blob],
            "profile-avatar.jpg",
            { type: "image/jpeg" }
          );

          const url = await uploadSutradharImage(croppedFile, "avatars");

          const { data: { user } } = await supabaseClient.auth.getUser();

          if (!user) throw new Error("पहले लॉगिन करें।");

          const { error } = await supabaseClient
            .from("profiles")
            .update({ avatar_url: url })
            .eq("id", user.id);

          if (error) throw error;

          state.profile.avatarUrl = url;
          saveState();
          renderProfile();

          closeAvatarCropEditor();
          toast("प्रोफ़ाइल DP अपडेट हो गई।");

        } catch (err) {
          toast("DP अपडेट नहीं हुई: " + err.message);
        } finally {
          button.disabled = false;
          button.textContent = "DP सुरक्षित करें";
        }
      });
    }

    dialog.showModal();

  } catch (err) {
    toast("तस्वीर नहीं खुली: " + err.message);
  }
}


/* Final interface localization: includes dynamic UI generated after initial load. */
(function installSutradharLocalization(){
 if(!document.body)return;
 let scheduled=false;
 const refresh=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;applyUILanguage();});};
 const prepareImages=root=>{
  const images=[];
  if(root?.matches?.("img"))images.push(root);
  root?.querySelectorAll?.("img").forEach(img=>images.push(img));
  images.forEach(img=>{if(!img.closest(".reader-page,.reader-modal")){if(!img.hasAttribute("loading"))img.loading="lazy";img.decoding="async";}});
 };
 prepareImages(document);
 const observer=new MutationObserver(records=>{
  let relevant=false;
  for(const r of records){if(r.type==="childList"){relevant=true;r.addedNodes.forEach(prepareImages);}else if(r.type==="characterData")relevant=true;}
  if(relevant)refresh();
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 const languageSelect=document.getElementById("layoutLanguage");
 if(languageSelect){languageSelect.addEventListener("change",()=>{state.profile.uiLanguage=languageSelect.value;saveState();applyUILanguage();});}
 const originalToast=toast;
 toast=function(message){return originalToast(uiTranslate(message));};
 const nativeAlert=window.alert.bind(window),nativeConfirm=window.confirm.bind(window),nativePrompt=window.prompt.bind(window);
 window.alert=message=>nativeAlert(uiTranslate(message));
 window.confirm=message=>nativeConfirm(uiTranslate(message));
 window.prompt=(message,defaultValue)=>nativePrompt(uiTranslate(message),defaultValue);
 window.addEventListener("pageshow",refresh);
 window.addEventListener("focus",refresh);
 applyUILanguage();
})();

// पहले सभी आवश्यक इवेंट-हैंडलर (विशेषकर लॉगिन) रजिस्टर हों, फिर ऐप initialize हो।
init();
