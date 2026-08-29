"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { slugify } from "@/lib/utils";

export interface AuthActionState {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.error("[signIn] Supabase error:", error.message);
    return { success: false, message: "Invalid email or password." };
  }

  redirect("/dashboard");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { businessName, email, password } = parsed.data;
  const supabase = await createClient();

  // 1. Create the auth user.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    return {
      success: false,
      message: signUpError?.message ?? "Could not create your account. Please try again.",
    };
  }

  // 2. Create the business + the owner membership.
  //
  // Deliberately uses the admin (service-role) client, not the
  // session-scoped one: if the Supabase project has "Confirm email"
  // enabled (the default for new projects), signUp() above creates the
  // user but returns no session until they click the confirmation link
  // — so auth.uid() is null for the rest of this request, and both
  // `businesses` and `business_members`'s RLS insert policies require
  // auth.uid() is not null. Using the RLS-scoped client here would fail
  // for exactly the accounts most likely to be brand new (this was a
  // real bug: registration silently failed whenever email confirmation
  // was on). signUpData.user.id is already a verified real user ID from
  // Supabase Auth's own response, not client-supplied, so bypassing RLS
  // for just these two inserts — attributed to that specific, just-created
  // user — doesn't weaken anything; nothing here is client-controlled.
  const admin = createAdminClient();

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      name: businessName,
      slug: slugify(businessName),
      created_by: signUpData.user.id,
    })
    .select("id")
    .single();

  if (businessError || !business) {
    console.error("[signUp] business insert error:", businessError);
    return {
      success: false,
      message:
        "Your account was created, but we couldn't set up your business. Please contact support.",
    };
  }

  // 3. Make this user the business_owner of the new business.
  const { error: memberError } = await admin.from("business_members").insert({
    business_id: business.id,
    user_id: signUpData.user.id,
    role: "business_owner",
  });

  if (memberError) {
    console.error("[signUp] business_members insert error:", memberError);
    return {
      success: false,
      message:
        "Your business was created, but we couldn't finish setting up your account. Please contact support.",
    };
  }

  // If email confirmation is required, session will be null here.
  if (!signUpData.session) {
    return {
      success: true,
      message: "Check your email to confirm your account before signing in.",
    };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
