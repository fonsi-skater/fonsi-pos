// The embeddable POS surface (see docs/ARCHITECTURE.md §Embedding).
// This route intentionally shares layout with nothing else in the app —
// no sidebar, no admin navigation — so it can be safely dropped into an
// <iframe src="https://pos.example.com/embed"> on a business's own site.
// TODO (Phase 6+): render the real POS screen here, scoped to the
// business/branch resolved from the embed token/session.
export default function EmbedPosPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Embedded POS — implemented in Phase 6.</p>
    </div>
  );
}
