"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseProductImageUploadOptions {
  businessId: string;
}

/**
 * Uploads a product image directly from the browser to the
 * `product-images` bucket (see supabase/migrations/0008), scoped under
 * <businessId>/ so storage RLS can authorize it. Returns the public URL
 * to store in `products.image_url`.
 */
export function useProductImageUpload({ businessId }: UseProductImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    setIsUploading(true);
    setError(null);

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5MB.");
      }

      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${businessId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  return { upload, isUploading, error };
}
