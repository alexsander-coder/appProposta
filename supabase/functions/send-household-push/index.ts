// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PushRequest = {
  householdId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  excludeUserId?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase env vars ausentes");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuario invalido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as PushRequest;
    if (!payload.householdId || !payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: "Payload invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await userClient
      .from("household_members")
      .select("id")
      .eq("household_id", payload.householdId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Sem acesso a household" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = adminClient
      .from("push_subscriptions")
      .select("id, user_id, expo_push_token")
      .eq("household_id", payload.householdId)
      .eq("permission_status", "granted");

    if (payload.excludeUserId) {
      query.neq("user_id", payload.excludeUserId);
    }

    const { data: subscriptions, error: subsError } = await query;
    if (subsError) {
      throw subsError;
    }

    const tokens = (subscriptions ?? []).map((s) => s.expo_push_token);
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default",
      priority: "high",
    }));

    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const expoJson = (await expoRes.json()) as {
      data?: { status: string; details?: { error?: string } }[];
    };

    const invalidTokens: string[] = [];
    (expoJson.data ?? []).forEach((item, idx) => {
      if (
        item.status === "error" &&
        item.details?.error === "DeviceNotRegistered"
      ) {
        invalidTokens.push(tokens[idx]);
      }
    });

    if (invalidTokens.length > 0) {
      await adminClient
        .from("push_subscriptions")
        .delete()
        .in("expo_push_token", invalidTokens);
    }

    return new Response(
      JSON.stringify({ sent: tokens.length, invalidTokens: invalidTokens.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
