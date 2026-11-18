/* सूत्रधार reader deterrence: best-effort browser controls, not DRM */
(function(){
  const inside=e=>!!e.target.closest?.("#readerDialog .reader-page,.author-profile-page .ss-admin-books");
  ["contextmenu","copy","cut","dragstart","selectstart"].forEach(type=>document.addEventListener(type,e=>{if(inside(e)){e.preventDefault();}},true));
  document.addEventListener("keydown",e=>{
    if(!inside(e))return;
    const k=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&["c","x","s","p","u"].includes(k)){e.preventDefault();e.stopPropagation();}
  },true);
})();
