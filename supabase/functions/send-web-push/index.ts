
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sahityasutradhar.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sutradhar-internal-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const internalToken = Deno.env.get("SUTRADHAR_PUSH_INTERNAL_TOKEN");

  if (
    !internalToken ||
    req.headers.get("x-sutradhar-internal-token") !== internalToken
  ) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const subject = Deno.env.get("VAPID_SUBJECT")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = await req.json();
    const record = payload.record;

    if (
      !record?.id ||
      !record?.recipient_id ||
      !record?.message
    ) {
      return new Response("Invalid webhook payload", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, subscription")
      .eq("user_id", record.recipient_id);

    if (error) throw error;

    let failed = 0;

    for (const item of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify({
            title: record.title || "सूत्रधार",
            body: record.message,
            url: record.target_url || "/mobile-app.html",
          }),
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;

        if (status === 404 || status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", item.id);
        } else {
          failed++;
          console.error("Push delivery failed:", err);
        }
      }
    }

    if (failed > 0) {
      return new Response("Some notifications failed", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { error: deleteError } = await supabase
      .from("push_delivery_queue")
      .delete()
      .eq("id", record.id);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({
        success: true,
        delivered_to: (subscriptions ?? []).length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Push function error:", error);

    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
