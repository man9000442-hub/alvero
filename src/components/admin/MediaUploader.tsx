"use client";

import React, { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

async function compressImageClientSide(file: File): Promise<File> {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/x-icon"
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1800;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webp"),
            { type: "image/webp" },
          );
          resolve(webpFile);
        },
        "image/webp",
        0.86,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export function MediaUploader({
  folder = "products",
  onUploaded,
  label = "Upload Image",
}: {
  folder?: "products" | "categories" | "banners" | "brand";
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [progress, setProgress] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setProgress(15);
    try {
      const compressed = await compressImageClientSide(rawFile);
      setProgress(45);

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("folder", folder);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(90);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Upload failed", "error");
        return;
      }

      onUploaded(data.url);
      showToast("Image uploaded to Supabase Storage", "success");
    } catch {
      showToast("Upload failed", "error");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 h-10 px-4 border border-black bg-white hover:bg-black hover:text-white text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer disabled:opacity-50"
      >
        {progress !== null ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        <span>{progress !== null ? `${progress}%` : label}</span>
      </button>
      {progress !== null && (
        <div className="w-full h-1 bg-[#E5E5E5]">
          <div
            className="h-full bg-black transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
