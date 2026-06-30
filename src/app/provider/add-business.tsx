import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { MapCard } from "@/components/MapCard";
import { Avatar, Button, IconButton, Input, SelectField, Text } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useThemedStyles, useColors } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useCategories } from "@/hooks/useProviders";
import { useMyProvider } from "@/hooks/useMyProvider";
import { useRegions } from "@/hooks/useRegions";
import { makeSlug } from "@/lib/business";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import { pickImage, pickImages, uploadImage } from "@/lib/upload";

const BUCKET = "business_images";

interface GalleryImage {
  /** Mavjud DB yozuvi id'si (yangi rasmda yo'q) */
  dbId?: string;
  /** Ko'rsatish uchun URL (mavjud) yoki lokal asset uri (yangi) */
  uri: string;
  /** Yangi tanlangan rasm bo'lsa true (yuklanishi kerak) */
  isNew: boolean;
  is_primary: boolean;
}

export default function AddBusinessScreen() {
  const styles = useThemedStyles(makeStyles);
  const Colors = useColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { provider, loading, refetch } = useMyProvider();
  const categories = useCategories();
  const regions = useRegions();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<string | null>(null);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [removedDbIds, setRemovedDbIds] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  // Mavjud biznesni prefill + galereyani yuklash
  useEffect(() => {
    if (!provider) return;
    setName(localize(provider.business_name));
    setSlug(provider.slug);
    setSlugEdited(true);
    setCategoryId(provider.category_id);
    setRegionId(provider.region_id);
    setAbout(localize(provider.about));
    setPhone(provider.phone_number ?? "");
    setLocation(provider.location);

    supabase
      .from("business_images")
      .select("id, image_url, is_primary")
      .eq("provider_id", provider.id)
      .then(({ data }) => {
        if (!data) return;
        setImages(
          data.map((r) => ({
            dbId: r.id,
            uri: r.image_url,
            isNew: false,
            is_primary: !!r.is_primary,
          }))
        );
      });
  }, [provider]);

  const catOptions: SelectOption[] = useMemo(
    () => categories.map((c) => ({ id: c.id, label: localize(c.name) })),
    [categories]
  );
  const regionOptions: SelectOption[] = useMemo(
    () => regions.map((r) => ({ id: r.id, label: localize(r.name) })),
    [regions]
  );

  const onName = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(makeSlug(v));
  };

  // ── Galereya boshqaruvi (web ImageUploader bilan parity) ────────────────────
  const onAddImages = async () => {
    const assets = await pickImages({ selectionLimit: 10 });
    if (!assets.length) return;
    setImages((prev) => {
      const next = [...prev];
      assets.forEach((a) => {
        const isFirst = next.length === 0;
        next.push({ uri: a.uri, isNew: true, is_primary: isFirst });
      });
      return next;
    });
  };

  const setPrimary = (index: number) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.dbId) setRemovedDbIds((ids) => [...ids, removed.dbId!]);
      const filtered = prev.filter((_, i) => i !== index);
      // Agar asosiy rasm o'chirilgan bo'lsa — qolganlardan birinchisini asosiy qilamiz
      if (removed?.is_primary && filtered.length > 0 && !filtered.some((x) => x.is_primary)) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };

  // Logo (avatar) — alohida tezkor tanlov, asosiy galereya rasmidan mustaqil emas,
  // lekin web kabi asosiy rasm avatar_url'ni belgilaydi. Qulaylik uchun bitta tugma.
  const onLogo = async () => {
    const asset = await pickImage({ aspect: [1, 1] });
    if (!asset || !user) return;
    setImages((prev) => {
      const next = [...prev];
      // Logoni asosiy qilib oldinga qo'shamiz
      next.unshift({ uri: asset.uri, isNew: true, is_primary: true });
      return next.map((img, i) => ({ ...img, is_primary: i === 0 }));
    });
  };

  const primaryUri = images.find((i) => i.is_primary)?.uri ?? null;

  const onSubmit = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert(t("ab.business_name"), t("common.required"));
      return;
    }
    if (!categoryId) {
      Alert.alert(t("ab.category"), t("common.required"));
      return;
    }
    // Yangi biznesda kamida 1 ta rasm (web bilan bir xil)
    if (!provider && images.length === 0) {
      Alert.alert(t("ab.images"), t("ab.need_image"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        business_name: name.trim(),
        slug: makeSlug(slug || name),
        category_id: categoryId,
        region_id: regionId,
        location,
        about: about.trim() || null,
        phone_number: phone.trim() || null,
      };

      // 1) Provider insert/update
      let providerId: string;
      if (provider) {
        const { error } = await supabase.from("providers").update(payload).eq("id", provider.id);
        if (error) throw error;
        providerId = provider.id;
      } else {
        const { data, error } = await supabase.from("providers").insert(payload).select("id").single();
        if (error) throw error;
        providerId = data.id;
      }

      // 2) O'chirilgan mavjud rasmlarni DB'dan tozalash
      if (removedDbIds.length) {
        await supabase.from("business_images").delete().in("id", removedDbIds);
      }

      // 3) Yangi rasmlarni yuklash + business_images'ga yozish
      let primaryPublicUrl: string | null = null;
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.isNew) {
          setUploading(true);
          const url = await uploadImage(BUCKET, `${user.id}/${Date.now()}-${i}`, {
            uri: img.uri,
          } as any);
          await supabase.from("business_images").insert({
            provider_id: providerId,
            image_url: url,
            is_primary: img.is_primary,
          });
          if (img.is_primary) primaryPublicUrl = url;
        } else if (img.dbId) {
          // Mavjud rasmning asosiy bayrog'ini yangilash
          await supabase.from("business_images").update({ is_primary: img.is_primary }).eq("id", img.dbId);
          if (img.is_primary) primaryPublicUrl = img.uri;
        }
      }
      setUploading(false);

      // 4) Asosiy rasm avatar_url bo'ladi (web bilan bir xil)
      if (primaryPublicUrl) {
        await supabase.from("providers").update({ avatar_url: primaryPublicUrl }).eq("id", providerId);
      }

      setSaving(false);
      await refetch();
      Alert.alert(t("settings.saved"), undefined, [
        { text: t("booking.ok"), onPress: () => router.replace("/provider/dashboard") },
      ]);
    } catch (e: any) {
      setUploading(false);
      setSaving(false);
      Alert.alert(t("common.error"), e?.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle">{provider ? t("ab.edit_title") : t("ab.title")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo (asosiy rasm ko'rinishi) */}
        <View style={styles.logoBox}>
          <Avatar uri={primaryUri} name={name} size={88} rounded={false} />
          <Button
            label={t("settings.avatar")}
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon="image-outline"
            onPress={onLogo}
          />
        </View>

        <Input label={t("ab.business_name")} placeholder={t("ab.business_name_ph")} value={name} onChangeText={onName} />
        <Input
          label={t("ab.slug")}
          value={slug}
          onChangeText={(v) => {
            setSlug(v);
            setSlugEdited(true);
          }}
          autoCapitalize="none"
        />
        <Text variant="caption" muted style={styles.hint}>
          {t("ab.slug_hint")}
        </Text>

        <SelectField
          label={t("ab.category")}
          placeholder={t("ab.category")}
          value={categoryId}
          options={catOptions}
          onSelect={setCategoryId}
          icon="grid-outline"
        />
        <SelectField
          label={t("search.region")}
          placeholder={t("ab.select_region")}
          value={regionId}
          options={regionOptions}
          onSelect={setRegionId}
          icon="location-outline"
        />

        <Input label={t("ab.about")} placeholder={t("ab.about_ph")} value={about} onChangeText={setAbout} multiline />
        <Input label={t("ab.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" />

        {/* ── Galereya boshqaruvi ── */}
        <Text variant="bodyStrong" style={styles.label}>
          {t("ab.images")}
        </Text>
        <Text variant="caption" muted style={styles.hint}>
          {t("ab.images_hint")}
        </Text>

        <View style={styles.grid}>
          {images.map((img, index) => (
            <View key={`${img.dbId ?? img.uri}-${index}`} style={styles.thumbCard}>
              <Image source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" />

              {img.is_primary && (
                <View style={styles.primaryBadge}>
                  <Ionicons name="star" size={11} color={Colors.white} />
                  <Text variant="caption" color={Colors.white}>
                    {t("profile.featured")}
                  </Text>
                </View>
              )}

              <Pressable style={styles.removeBtn} onPress={() => removeImage(index)} hitSlop={6}>
                <Ionicons name="close" size={16} color={Colors.white} />
              </Pressable>

              {!img.is_primary && (
                <Pressable style={styles.makePrimary} onPress={() => setPrimary(index)}>
                  <Text variant="caption" color={Colors.primaryDark}>
                    {t("ab.set_primary")}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          <Pressable style={styles.addThumb} onPress={onAddImages} disabled={uploading}>
            <Ionicons name="add" size={28} color={Colors.primary} />
            <Text variant="caption" color={Colors.primary}>
              {t("ab.add_images")}
            </Text>
          </Pressable>
        </View>

        {/* Joylashuv */}
        <Text variant="bodyStrong" style={styles.label}>
          {t("booking.location")}
        </Text>
        <Button
          label={location ? t("ab.change_location") : t("ab.set_location")}
          variant="outline"
          icon="map-outline"
          onPress={() => setLocOpen(true)}
        />
        {!!location && <MapCard location={location} label={t("profile.open_map")} title={name} />}

        <View style={styles.submit}>
          <Button label={t("ab.submit")} onPress={onSubmit} loading={saving || uploading} size="lg" />
        </View>
      </ScrollView>

      <LocationPickerSheet
        visible={locOpen}
        onClose={() => setLocOpen(false)}
        value={location}
        onSave={setLocation}
      />
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge },
  logoBox: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  hint: { marginTop: -spacing.xs },
  label: { marginTop: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumbCard: {
    width: "31%",
    aspectRatio: 0.78,
    borderRadius: radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    ...shadow.sm,
  },
  thumb: { width: "100%", flex: 1 },
  primaryBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger,
  },
  makePrimary: {
    backgroundColor: Colors.primarySoft,
    paddingVertical: 6,
    alignItems: "center",
  },
  addThumb: {
    width: "31%",
    aspectRatio: 0.78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  submit: { marginTop: spacing.lg },
});
