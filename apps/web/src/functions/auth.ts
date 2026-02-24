import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "@/env";
import { isAdminEmail } from "@/functions/admin";
import {
  getSupabaseAdminClient,
  getSupabaseDesktopFlowClient,
  getSupabaseServerClient,
} from "@/functions/supabase";

const shared = z.object({
  flow: z.enum(["desktop", "web"]).default("desktop"),
  scheme: z.string().optional(),
  redirect: z.string().optional(),
});

export const doAuth = createServerFn({ method: "POST" })
  .inputValidator(
    shared.extend({
      provider: z.enum(["google", "github"]),
      rra: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const params = new URLSearchParams({ flow: data.flow });
    if (data.scheme) params.set("scheme", data.scheme);
    if (data.redirect) params.set("redirect", data.redirect);

    const scopes = data.provider === "github" && data.rra ? "repo" : undefined;

    const { data: authData, error } = await supabase.auth.signInWithOAuth({
      provider: data.provider,
      options: {
        redirectTo: `${env.VITE_APP_URL}/callback/auth?${params.toString()}`,
        scopes,
      },
    });

    if (error) {
      return { error: true, message: error.message };
    }

    return { success: true, url: authData.url };
  });

export const doMagicLinkAuth = createServerFn({ method: "POST" })
  .inputValidator(
    shared.extend({
      email: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const params = new URLSearchParams({ flow: data.flow });
    if (data.scheme) params.set("scheme", data.scheme);
    if (data.redirect) params.set("redirect", data.redirect);

    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${env.VITE_APP_URL}/callback/auth?${params.toString()}`,
      },
    });

    if (error) {
      return { error: true, message: error.message };
    }

    return { success: true };
  });

export const fetchUser = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error: _error } = await supabase.auth.getUser();

  if (!data.user?.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
});

export const signOutFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  },
);

export const exchangeOAuthCode = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string(),
      flow: z.enum(["desktop", "web"]).default("web"),
    }),
  )
  .handler(async ({ data }) => {
    const supabase =
      data.flow === "desktop"
        ? getSupabaseDesktopFlowClient()
        : getSupabaseServerClient();
    const { data: authData, error } =
      await supabase.auth.exchangeCodeForSession(data.code);

    if (error || !authData.session) {
      return { success: false, error: error?.message || "Unknown error" };
    }

    const email = authData.session.user.email;
    if (authData.session.provider_token && email && isAdminEmail(email)) {
      const githubUsername =
        authData.session.user.user_metadata?.user_name ||
        authData.session.user.user_metadata?.preferred_username;
      await supabase.from("admins").upsert({
        id: authData.session.user.id,
        github_token: authData.session.provider_token,
        github_username: githubUsername,
        updated_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    };
  });

export const doPasswordSignUp = createServerFn({ method: "POST" })
  .inputValidator(
    shared.extend({
      email: z.string().email(),
      password: z.string().min(6),
    }),
  )
  .handler(async ({ data }) => {
    const supabase =
      data.flow === "desktop"
        ? getSupabaseDesktopFlowClient()
        : getSupabaseServerClient();

    const params = new URLSearchParams({ flow: data.flow });
    if (data.scheme) params.set("scheme", data.scheme);
    if (data.redirect) params.set("redirect", data.redirect);

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${env.VITE_APP_URL}/callback/auth?${params.toString()}`,
      },
    });

    if (error) {
      return { error: true, message: error.message };
    }

    if (authData.session) {
      return {
        success: true,
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      };
    }

    return { success: true, needsConfirmation: true };
  });

export const doPasswordSignIn = createServerFn({ method: "POST" })
  .inputValidator(
    shared.extend({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const supabase =
      data.flow === "desktop"
        ? getSupabaseDesktopFlowClient()
        : getSupabaseServerClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { error: true, message: error.message };
    }

    if (!authData.session) {
      return { error: true, message: "No session returned" };
    }

    return {
      success: true,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    };
  });

export const exchangeOtpToken = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token_hash: z.string(),
      type: z.enum(["email", "recovery"]),
      flow: z.enum(["desktop", "web"]).default("web"),
    }),
  )
  .handler(async ({ data }) => {
    const supabase =
      data.flow === "desktop"
        ? getSupabaseDesktopFlowClient()
        : getSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: data.type,
    });

    if (error || !authData.session) {
      return { success: false, error: error?.message || "Unknown error" };
    }

    return {
      success: true,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    };
  });

export const createDesktopSession = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    try {
      const admin = getSupabaseAdminClient();
      const { data: linkData, error: linkError } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email: data.email,
        });

      if (linkError || !linkData.properties?.hashed_token) {
        console.error(
          "[createDesktopSession] generateLink failed:",
          linkError?.message ?? "no hashed_token",
        );
        return null;
      }

      const supabase = getSupabaseDesktopFlowClient();
      const { data: authData, error } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "email",
      });

      if (error || !authData.session) {
        console.error(
          "[createDesktopSession] verifyOtp failed:",
          error?.message ?? "no session",
        );
        return null;
      }

      return {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      };
    } catch (e) {
      console.error("[createDesktopSession] unexpected error:", e);
      return null;
    }
  });

export const doPasswordResetRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${env.VITE_APP_URL}/callback/auth?flow=web&type=recovery`,
    });

    if (error) {
      return { error: true, message: error.message };
    }

    return { success: true };
  });

export const doUpdatePassword = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      password: z.string().min(6),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      return { error: true, message: error.message };
    }

    return { success: true };
  });

export const updateUserEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase.auth.updateUser({
      email: data.email,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message:
        "A confirmation email has been sent to your new email address. Please check your inbox and click the link to confirm the change.",
    };
  });
