import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MapCard } from "@/components/MapCard";
import { Avatar, Button, IconButton, Input, SelectField, Text } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useCategories } from "@/hooks/useProviders";
import { useMyProvider } from "@/hooks/useMyProvider";
import { useRegions } from "@/hooks/useRegions";
import { makeSlug } from "@/lib/business";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import { pickImage, uploadImage } from "@/lib/upload";

export default function AddBusinessScreen() {
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mavjud biznesni prefill
  useEffect(() => {
    if (provider) {
      setName(localize(provider.business_name));
      setSlug(provider.slug);
      setSlugEdited(true);
      setCategoryId(provider.category_id);
      setRegionId(provider.region_id);
      setAbout(localize(provider.about));
      setPhone(provider.phone_number ?? "");
      setLocation(provider.location);
      setAvatarUrl(provider.avatar_url);
    }
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

  const onLogo = async () => {
    if (!user) return;
    const asset = await pickImage({ aspect: [1, 1] });
    if (!asset) return;
    setUploading(true);
    try {
      const url = await uploadImage("business_images", `${user.id}/logo-${Date.now()}`, asset);
      setAvatarUrl(url);
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  const onLocate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("search.location_denied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
    } finally {
      setLocating(false);
    }
  };

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
    setSaving(true);
    const payload = {
      user_id: user.id,
      business_name: name.trim(),
      slug: makeSlug(slug || name),
      category_id: categoryId,
      region_id: regionId,
      location,
      about: about.trim() || null,
      phone_number: phone.trim() || null,
      avatar_url: avatarUrl,
    };

    let error;
    if (provider) {
      ({ error } = await supabase.from("providers").update(payload).eq("id", provider.id));
    } else {
      ({ error } = await supabase.from("providers").insert(payload));
    }
    setSaving(false);

    if (error) {
      Alert.alert(t("common.error"), error.message);
      return;
    }
    await refetch();
    Alert.alert(t("settings.saved"), undefined, [
      { text: t("booking.ok"), onPress: () => router.replace("/provider/dashboard") },
    ]);
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
        {/* Logo */}
        <View style={styles.logoBox}>
          <Avatar uri={avatarUrl} name={name} size={88} rounded={false} />
          <Button
            label={t("settings.avatar")}
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon="image-outline"
            loading={uploading}
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

        {/* Joylashuv */}
        <Text variant="bodyStrong" style={styles.label}>
          {t("booking.location")}
        </Text>
        <Button
          label={t("profile.open_map")}
          variant="outline"
          icon="navigate-outline"
          loading={locating}
          onPress={onLocate}
        />
        {!!location && <MapCard location={location} label={location} title={name} />}

        <View style={styles.submit}>
          <Button label={t("ab.submit")} onPress={onSubmit} loading={saving} size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  submit: { marginTop: spacing.lg },
});
