
const VAPID_PUBLIC_KEY = "5268013282945d8b81066c706c4117ffb90950d3bc675b0e4878d79671ccc1f9";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from(
    [...rawData].map(char => char.charCodeAt(0))
  );
}

async function enableSutradharPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("आपका ब्राउज़र Push Notifications समर्थित नहीं करता।");
    return;
  }

  if (VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY") {
    alert("VAPID Public Key अभी सेट नहीं हुई है।");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("सूचनाओं की अनुमति नहीं मिली।");
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const { data: { user } } = await window.supabaseClient.auth.getUser();

    if (!user) {
      alert("पहले अपने खाते में लॉगिन करें।");
      return;
    }

    const { error } = await window.supabaseClient
      .from("push_subscriptions")
      .upsert({
        user_id: user.id,
        subscription: subscription.toJSON()
      }, { onConflict: "user_id" });

    if (error) throw error;

    alert("सूचनाएँ सफलतापूर्वक चालू हो गईं!");
  } catch (error) {
    console.error("Push setup error:", error);
    alert("सूचनाएँ चालू नहीं हो सकीं: " + error.message);
  }
}
