import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";

function toDate(hhmm: string): Date {
  const [h, m] = (hhmm || "09:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState(() => toDate(value));

  const onAndroidChange = (e: DateTimePickerEvent, d?: Date) => {
    setShow(false);
    if (e.type === "set" && d) onChange(toHHMM(d));
  };

  return (
    <>
      <Pressable
        style={styles.field}
        onPress={() => {
          setTemp(toDate(value));
          setShow(true);
        }}
      >
        <Text variant="bodyStrong" color={Colors.primaryDarker}>
          {value}
        </Text>
      </Pressable>

      {Platform.OS === "android" && show && (
        <DateTimePicker value={toDate(value)} mode="time" is24Hour display="clock" onChange={onAndroidChange} />
      )}

      {Platform.OS === "ios" && (
        <Sheet visible={show} onClose={() => setShow(false)}>
          <DateTimePicker
            value={temp}
            mode="time"
            is24Hour
            display="spinner"
            onChange={(_, d) => {
              if (d) setTemp(d);
            }}
          />
          <Button
            label="OK"
            onPress={() => {
              onChange(toHHMM(temp));
              setShow(false);
            }}
          />
        </Sheet>
      )}
    </>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  field: {
    backgroundColor: Colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minWidth: 78,
  },
});
