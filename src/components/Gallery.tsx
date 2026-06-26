import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { Colors } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

interface BusinessImage {
  id: string;
  image_url: string;
  is_primary: boolean | null;
}

export function Gallery({ providerId, title }: { providerId: string; title: string }) {
  const [images, setImages] = useState<BusinessImage[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    supabase
      .from("business_images")
      .select("id, image_url, is_primary")
      .eq("provider_id", providerId)
      .order("is_primary", { ascending: false })
      .then(({ data }) => {
        if (on) setImages((data as BusinessImage[]) ?? []);
      });
    return () => {
      on = false;
    };
  }, [providerId]);

  if (images.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {images.map((img) => (
          <Pressable key={img.id} onPress={() => setActive(img.image_url)}>
            <Image source={{ uri: img.image_url }} style={styles.thumb} contentFit="cover" transition={150} />
          </Pressable>
        ))}
      </ScrollView>

      <Sheet visible={!!active} onClose={() => setActive(null)}>
        {active && (
          <View style={styles.viewer}>
            <Image source={{ uri: active }} style={styles.full} contentFit="contain" />
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, paddingLeft: spacing.lg },
  title: { marginBottom: spacing.md, paddingRight: spacing.lg },
  row: { gap: spacing.sm, paddingRight: spacing.lg },
  thumb: { width: 150, height: 110, borderRadius: radius.md, backgroundColor: Colors.skeleton },
  viewer: { alignItems: "center", justifyContent: "center" },
  full: { width: "100%", height: 360, borderRadius: radius.md },
});
