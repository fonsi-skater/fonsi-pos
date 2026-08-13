import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// TODO (Phase 2): wire up React Hook Form + Zod + Supabase Auth sign-in.
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to Fonsi POS</CardTitle>
          <CardDescription>Enter your email and password to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@business.com" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" disabled />
          </div>
          <Button className="w-full" disabled>
            Sign in (Phase 2)
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            No account?{" "}
            <Link href="/register" className="text-foreground underline underline-offset-4">
              Create a business
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
