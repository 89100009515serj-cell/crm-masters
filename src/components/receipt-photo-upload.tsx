"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadReceiptPhotos, deleteReceiptPhoto } from "@/server-actions/receipt-photos";
import { useToast } from "@/components/toast";

const MAX_PHOTOS = 3;

export function ReceiptPhotoUpload({
  requestId,
  initialUrls,
  onChange,
}: {
  requestId: string;
  initialUrls: string[];
  onChange?: (urls: string[]) => void;
}) {
  const { show } = useToast();
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);

    const formData = new FormData();
    formData.set("requestId", requestId);
    Array.from(files).forEach((f) => formData.append("photos", f));

    startTransition(async () => {
      try {
        const updated = await uploadReceiptPhotos(formData);
        setUrls(updated);
        onChange?.(updated);
        show("Фото загружено");
      } catch (e2) {
        const message = e2 instanceof Error ? e2.message : "Не удалось загрузить фото";
        setError(message);
        show(message, "error");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function handleDelete(url: string) {
    startTransition(async () => {
      try {
        const updated = await deleteReceiptPhoto(requestId, url);
        setUrls(updated);
        onChange?.(updated);
      } catch (e2) {
        show(e2 instanceof Error ? e2.message : "Не удалось удалить фото", "error");
      }
    });
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        Фото чека ({urls.length}/{MAX_PHOTOS})
      </label>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {urls.map((url) => (
            <div key={url} className="relative group">
              <Image
                src={url}
                alt="Фото чека"
                width={120}
                height={120}
                className="w-full h-24 object-cover rounded-lg border border-slate-200"
              />
              <button
                type="button"
                onClick={() => handleDelete(url)}
                disabled={isPending}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/80 disabled:opacity-50"
                aria-label="Удалить фото"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {urls.length < MAX_PHOTOS && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={handleSelect}
          disabled={isPending}
          className="w-full text-sm"
        />
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <p className="text-[11px] text-slate-400 mt-1">JPG или PNG, до 8MB, максимум {MAX_PHOTOS} фото</p>
    </div>
  );
}
