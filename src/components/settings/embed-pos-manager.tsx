"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, MonitorSmartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { createEmbedToken, revokeEmbedToken } from "@/server/actions/embed";
import type { EmbedTokenSummary } from "@/server/repositories/embed";

interface Branch {
  id: string;
  name: string;
}

export function EmbedPosManager({
  branches,
  initialTokens,
}: {
  branches: Branch[];
  initialTokens: EmbedTokenSummary[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!branchId) return;
    startTransition(async () => {
      const result = await createEmbedToken({ branchId, label: label.trim() || null });
      if (result.success && result.embedUrl) {
        setNewLink(result.embedUrl);
        setLabel("");
        setTokens((prev) => [
          {
            id: crypto.randomUUID(),
            branchId,
            branchName: branches.find((b) => b.id === branchId)?.name ?? "Branch",
            label: label.trim() || null,
            isActive: true,
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        toast.error(result.message ?? "Could not create the embed link.");
      }
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const result = await revokeEmbedToken(id);
      if (result.success) {
        setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: false } : t)));
      } else {
        toast.error(result.message ?? "Could not revoke that link.");
      }
    });
  }

  function copyLink() {
    if (!newLink) return;
    navigator.clipboard.writeText(newLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (branches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Add a branch first — an embed link is always scoped to one branch.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="embed-branch">Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger id="embed-branch" className="w-48">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="embed-label">Label (optional)</Label>
          <Input
            id="embed-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Main website checkout widget"
            className="w-64"
          />
        </div>
        <Button onClick={handleGenerate} disabled={isPending || !branchId}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <MonitorSmartphone className="size-4" />}
          Generate embed link
        </Button>
      </div>

      {newLink && (
        <div className="bg-muted space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">
            Copy this now — it won&apos;t be shown again. Anyone with this link can process sales for
            that branch.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={newLink} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copyLink}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Embed it with:{" "}
            <code className="bg-background rounded px-1 py-0.5">
              {`<iframe src="${newLink}"></iframe>`}
            </code>
          </p>
        </div>
      )}

      {tokens.length > 0 && (
        <div className="divide-y rounded-md border">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{t.label || t.branchName}</p>
                <p className="text-muted-foreground text-xs">
                  {t.branchName} · created {formatDate(t.createdAt)}
                  {t.lastUsedAt ? ` · last used ${formatDate(t.lastUsedAt, true)}` : " · never used"}
                  {!t.isActive && " · revoked"}
                </p>
              </div>
              {t.isActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleRevoke(t.id)}
                  aria-label="Revoke embed link"
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
