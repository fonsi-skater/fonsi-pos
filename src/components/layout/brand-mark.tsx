import { cn } from "@/lib/utils";

/**
 * The one recurring brand glyph — a violet rounded square with the "F"
 * mark — paired with the wordmark in the display face. Used in the
 * sidebar (dark ground) and the auth pages (light ground); both pass
 * their own text color since the mark's background is always the same
 * solid primary violet regardless of surrounding theme.
 */
export function BrandMark({ withWordmark = true, className }: { withWordmark?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="bg-primary text-primary-foreground font-display flex size-8 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
        aria-hidden={withWordmark}
      >
        F
      </div>
      {withWordmark && <span className="font-display text-lg font-semibold tracking-tight">Fonsi POS</span>}
    </div>
  );
}
