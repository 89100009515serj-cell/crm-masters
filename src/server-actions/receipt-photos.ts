"use server";

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_PHOTOS = 3;
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "receipts");

async function assertMasterOwnsRequest(requestId: string, masterId: string) {
  const request = await prisma.request.findUniqueOrThrow({ where: { id: requestId } });
  if (request.assignedMasterId !== masterId) {
    throw new ForbiddenError("Это не ваша заявка");
  }
  if (request.status === "COMPLETED") {
    throw new ForbiddenError("Заявка уже завершена, фото нельзя менять");
  }
  return request;
}

/**
 * Загружает 1–3 фото чека для заявки. Возвращает обновлённый список URL.
 * Принимает FormData с полем requestId и одним или несколькими полями "photos".
 */
export async function uploadReceiptPhotos(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MASTER") {
    throw new ForbiddenError("Доступно только мастеру");
  }

  const requestId = String(formData.get("requestId"));
  const request = await assertMasterOwnsRequest(requestId, session.user.id);

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    throw new Error("Файлы не выбраны");
  }

  const existingCount = request.receiptPhotoUrls.length;
  if (existingCount + files.length > MAX_PHOTOS) {
    throw new Error(`Можно загрузить не более ${MAX_PHOTOS} фото`);
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Разрешены только файлы JPG и PNG");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("Размер файла не должен превышать 8MB");
    }
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const newUrls: string[] = [];
  for (const file of files) {
    const ext = file.type === "image/png" ? "png" : "jpg";
    const fileName = `${requestId}-${randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    newUrls.push(`/uploads/receipts/${fileName}`);
  }

  const updatedUrls = [...request.receiptPhotoUrls, ...newUrls];

  await prisma.request.update({
    where: { id: requestId },
    data: { receiptPhotoUrls: updatedUrls },
  });

  return updatedUrls;
}

export async function deleteReceiptPhoto(requestId: string, url: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MASTER") {
    throw new ForbiddenError("Доступно только мастеру");
  }

  const request = await assertMasterOwnsRequest(requestId, session.user.id);

  if (!request.receiptPhotoUrls.includes(url)) {
    throw new Error("Фото не найдено");
  }

  const updatedUrls = request.receiptPhotoUrls.filter((u) => u !== url);

  await prisma.request.update({
    where: { id: requestId },
    data: { receiptPhotoUrls: updatedUrls },
  });

  try {
    const filePath = path.join(process.cwd(), "public", url);
    await unlink(filePath);
  } catch {
    // файл уже мог быть удалён вручную — не критично
  }

  return updatedUrls;
}
