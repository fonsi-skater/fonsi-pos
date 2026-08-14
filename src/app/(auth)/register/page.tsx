"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { signUp, type AuthActionState } from "@/server/actions/auth";

const initialState: AuthActionState = { success: false };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your business</CardTitle>
          <CardDescription>Set up Fonsi POS for your business in a few minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" name="businessName" placeholder="Acme Traders Ltd" required />
              {state.fieldErrors?.businessName && (
                <p className="text-destructive text-sm">{state.fieldErrors.businessName[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@business.com" required />
              {state.fieldErrors?.email && (
                <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
              {state.fieldErrors?.password && (
                <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
              )}
            </div>
            {state.message && (
              <p className={state.success ? "text-success text-sm" : "text-destructive text-sm"}>
                {state.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating business..." : "Create business"}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
