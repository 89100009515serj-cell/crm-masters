"use client";

import Image from "next/image";
import { Modal } from "@/components/modal";

export function ReceiptPhotosModal({
  open,
  onClose,
  urls,
}: {
  open: boolean;
  onClose: () => void;
  urls: string[];
}) {
  return (
    <Modal open={open} onClose={onClose} title="Фото чека">
      {urls.length === 0 ? (
        <p className="text-sm text-slate-400">Фото не загружены</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <Image
                src={url}
                alt="Фото чека"
                width={300}
                height={300}
                className="w-full h-40 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition"
              />
            </a>
          ))}
        </div>
      )}
    </Modal>
  );
}
