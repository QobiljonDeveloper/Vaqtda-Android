// Rasm tanlash (galereya) + Supabase Storage'ga yuklash.
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

export interface PickOptions {
  aspect?: [number, number];
  allowsEditing?: boolean;
  quality?: number;
}

/** Galereyadan rasm tanlaydi. Ruxsat berilmasa yoki bekor qilinsa null. */
export async function pickImage(opts: PickOptions = {}): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: opts.allowsEditing ?? true,
    aspect: opts.aspect ?? [1, 1],
    quality: opts.quality ?? 0.7,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0];
}

/**
 * Galereyadan KO'P rasm tanlaydi (web ImageUploader bilan parity).
 * Ruxsat berilmasa yoki bekor qilinsa bo'sh massiv.
 */
export async function pickImages(opts: { quality?: number; selectionLimit?: number } = {}): Promise<
  ImagePicker.ImagePickerAsset[]
> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: opts.selectionLimit ?? 10,
    quality: opts.quality ?? 0.7,
  });
  if (res.canceled || !res.assets?.length) return [];
  return res.assets;
}

function extFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  const fromName = asset.fileName?.split(".").pop();
  if (fromName) return fromName.toLowerCase();
  const fromMime = asset.mimeType?.split("/").pop();
  return (fromMime || "jpg").toLowerCase();
}

/** Tanlangan rasmni bucket'ga yuklaydi va public URL qaytaradi. */
export async function uploadImage(
  bucket: string,
  pathPrefix: string,
  asset: ImagePicker.ImagePickerAsset
): Promise<string> {
  const ext = extFromAsset(asset);
  const path = `${pathPrefix}.${ext}`;
  const contentType = asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`;

  // RN'da File yo'q — uri'ni ArrayBuffer'ga o'qiymiz.
  const resp = await fetch(asset.uri);
  const arrayBuffer = await resp.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
