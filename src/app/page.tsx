import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
        Fonsi POS
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        The operations platform for businesses that never stop moving
      </h1>
      <p className="text-muted-foreground max-w-xl text-lg">
        Point of sale, inventory, customers, and reporting — built for
        Kenyan SMEs, and built to work offline when the connection doesn&apos;t.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/register">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
