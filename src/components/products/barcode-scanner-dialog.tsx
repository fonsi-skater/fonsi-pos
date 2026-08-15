"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BarcodeScannerDialogProps {
  onScan: (barcode: string) => void;
  trigger?: React.ReactNode;
}

/**
 * Camera-based barcode scanner. Opens a dialog, streams the device camera
 * through ZXing's MultiFormatReader, and calls onScan() with the decoded
 * text the moment a barcode is recognized (then closes automatically).
 *
 * Falls back gracefully with an error message if camera access is denied
 * or unavailable — the manual barcode text field elsewhere in the product
 * form always remains usable regardless.
 */
export function BarcodeScannerDialog({ onScan, trigger }: BarcodeScannerDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, err, controls) => {
        controlsRef.current = controls;
        if (result) {
          onScan(result.getText());
          controls.stop();
          setOpen(false);
        }
        // NotFoundException fires continuously while no barcode is in
        // frame — that's expected, not a real error.
      })
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't access the camera. Check permissions, or type the barcode manually.");
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="icon" aria-label="Scan barcode">
            <ScanBarcode className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan barcode</DialogTitle>
          <DialogDescription>Point the camera at a product barcode.</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <video ref={videoRef} className="bg-muted aspect-video w-full rounded-md" muted playsInline />
        )}
      </DialogContent>
    </Dialog>
  );
}
