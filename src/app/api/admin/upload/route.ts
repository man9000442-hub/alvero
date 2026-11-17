import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/x-icon",
]);

const ALLOWED_FOLDERS = new Set([
  "products",
  "categories",
  "banners",
  "brand",
]);

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Must have write permission on at least one media-bearing module
  const canUpload =
    auth.profile.role === "OWNER" ||
    auth.profile.role === "ADMIN" ||
    auth.profile.role === "PRODUCT_MANAGER";
  if (!canUpload) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!isAdminSupabaseConfigured()) {
    return NextResponse.json(
      { error: "STORAGE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") || "products");
    const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "products";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "webp";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = createSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("alvero-media")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("alvero-media")
      .getPublicUrl(fileName);

    await writeAuditLog({
      actor: auth.profile,
      action: "MEDIA_UPLOADED",
      entityType: "storage",
      entityId: fileName,
    });

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      path: fileName,
    });
  } catch {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
