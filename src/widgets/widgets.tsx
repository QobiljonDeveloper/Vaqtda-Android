// Home-screen widget UI'lari — react-native-android-widget primitivlari bilan.
// Bu komponentlar HEADLESS kontekstda chiziladi: hook/context/RN core yo'q,
// faqat FlexWidget/TextWidget. Barcha matn snapshot'dan tayyor keladi.

import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

import { WIDGET_LINKS, type WidgetSnapshot } from "./types";

// Widget'ning joriy o'lchami (dp). Tizim beradi; ba'zan 0 bo'lishi mumkin.
export type WInfo = { width: number; height: number };

// Oq karta — har qanday fon rasmida o'qiladi (och/qorong'i ekranda ham).
const W = {
  card: "#FFFFFF",
  text: "#1A1C1A",
  muted: "#5F6B5F",
  subtle: "#8A938A",
  primary: "#406749",
  primaryDark: "#2F5239",
  soft: "#E8F0E9",
  divider: "#EDEEE9",
} as const;

const ROOT_BASE = {
  backgroundColor: W.card,
  borderRadius: 24,
  padding: 16,
  flexDirection: "column",
} as const;

// MUHIM: root o'lchamini "match_parent" QILMAYMIZ — ba'zi launcher'larda u 0 ga
// o'lchanadi va native Bitmap.createBitmap(0,0) xato berib widget BO'SH qoladi.
// Tizim bergan widgetInfo.width/height (dp) ishlatamiz, 0 bo'lsa zaxira o'lcham.
function rootDims(info?: WInfo) {
  return { width: info?.width || 320, height: info?.height || 150 };
}

// ── 1) Qidirish (foydalanuvchi) ──────────────────────────────────────────────
export function SearchWidget({ snap, widgetInfo }: { snap: WidgetSnapshot; widgetInfo?: WInfo }) {
  const ru = snap.lang === "ru";
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_LINKS.search }}
      style={{ ...ROOT_BASE, ...rootDims(widgetInfo), justifyContent: "center" }}
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          width: "match_parent",
        }}
      >
        <TextWidget text="Vaqtda" style={{ fontSize: 13, color: W.primary, fontWeight: "bold" }} />
        <TextWidget
          text="AI"
          style={{
            fontSize: 11,
            color: W.primaryDark,
            fontWeight: "bold",
            backgroundColor: W.soft,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: W.soft,
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 12,
          width: "match_parent",
        }}
      >
        <TextWidget
          text={ru ? "Поиск услуг…" : "Xizmat qidiring…"}
          style={{ fontSize: 15, color: W.muted }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// ── 2) Keyingi bron (foydalanuvchi) ──────────────────────────────────────────
export function UpcomingWidget({ snap, widgetInfo }: { snap: WidgetSnapshot; widgetInfo?: WInfo }) {
  const ru = snap.lang === "ru";
  const nb = snap.nextBooking;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_LINKS.bookings }}
      style={{ ...ROOT_BASE, ...rootDims(widgetInfo) }}
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          width: "match_parent",
        }}
      >
        <TextWidget
          text={ru ? "Ближайшая запись" : "Keyingi bron"}
          style={{ fontSize: 13, color: W.muted, fontWeight: "bold" }}
        />
        {snap.upcomingCount > 0 ? (
          <TextWidget
            text={String(snap.upcomingCount)}
            style={{
              fontSize: 12,
              color: W.primaryDark,
              fontWeight: "bold",
              backgroundColor: W.soft,
              borderRadius: 12,
              paddingHorizontal: 9,
              paddingVertical: 2,
            }}
          />
        ) : (
          <TextWidget text="" style={{ fontSize: 12, color: W.card }} />
        )}
      </FlexWidget>

      {nb ? (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
          <TextWidget
            text={nb.providerName}
            style={{ fontSize: 18, color: W.text, fontWeight: "bold" }}
          />
          <TextWidget
            text={`${nb.dateLabel} · ${nb.timeLabel}`}
            style={{ fontSize: 14, color: W.primaryDark, fontWeight: "bold", marginTop: 4 }}
          />
        </FlexWidget>
      ) : (
        <TextWidget
          text={
            snap.signedIn
              ? ru
                ? "Нет предстоящих записей"
                : "Bo'lajak bron yo'q"
              : ru
                ? "Войдите в приложение"
                : "Ilovaga kiring"
          }
          style={{ fontSize: 14, color: W.subtle, marginTop: 6 }}
        />
      )}
    </FlexWidget>
  );
}

// ── 3) Bugungi jadval (provayder) ────────────────────────────────────────────
export function ScheduleWidget({ snap, widgetInfo }: { snap: WidgetSnapshot; widgetInfo?: WInfo }) {
  const ru = snap.lang === "ru";

  let body: React.ReactNode;
  if (!snap.isProvider) {
    body = (
      <TextWidget
        text={ru ? "Вы не поставщик" : "Siz provayder emassiz"}
        style={{ fontSize: 14, color: W.subtle, marginTop: 6 }}
      />
    );
  } else if (snap.schedule.length === 0) {
    body = (
      <TextWidget
        text={ru ? "Сегодня свободно" : "Bugun bo'sh"}
        style={{ fontSize: 14, color: W.subtle, marginTop: 6 }}
      />
    );
  } else {
    body = (
      <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
        {snap.schedule.map((e, i) => (
          <FlexWidget
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              width: "match_parent",
              paddingVertical: 6,
            }}
          >
            <TextWidget
              text={e.time}
              style={{ fontSize: 14, color: W.primaryDark, fontWeight: "bold", width: 52 }}
            />
            <TextWidget text={e.label} style={{ fontSize: 14, color: W.text }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_LINKS.dashboard }}
      style={{ ...ROOT_BASE, ...rootDims(widgetInfo) }}
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          width: "match_parent",
        }}
      >
        <TextWidget
          text={ru ? "Сегодня" : "Bugungi jadval"}
          style={{ fontSize: 14, color: W.text, fontWeight: "bold" }}
        />
        <TextWidget
          text={ru ? `${snap.todayCount} записей` : `${snap.todayCount} bron`}
          style={{ fontSize: 12, color: W.muted }}
        />
      </FlexWidget>
      {body}
    </FlexWidget>
  );
}

// ── 4) Statistika (provayder) ────────────────────────────────────────────────
function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
      <TextWidget text={value} style={{ fontSize: 16, color: W.text, fontWeight: "bold" }} />
      <TextWidget text={label} style={{ fontSize: 11, color: W.muted, marginTop: 2 }} />
    </FlexWidget>
  );
}

export function StatsWidget({ snap, widgetInfo }: { snap: WidgetSnapshot; widgetInfo?: WInfo }) {
  const ru = snap.lang === "ru";
  const s = snap.stats;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_LINKS.stats }}
      style={{ ...ROOT_BASE, ...rootDims(widgetInfo) }}
    >
      <TextWidget
        text={ru ? "Статистика" : "Statistika"}
        style={{ fontSize: 13, color: W.muted, fontWeight: "bold", marginBottom: 8 }}
      />
      {s ? (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
          <TextWidget text={s.revenue} style={{ fontSize: 20, color: W.text, fontWeight: "bold" }} />
          <FlexWidget
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
              width: "match_parent",
            }}
          >
            <StatCell label={ru ? "Брони" : "Bronlar"} value={String(s.total)} />
            <StatCell label={ru ? "Клиенты" : "Mijozlar"} value={String(s.clients)} />
            <StatCell label={ru ? "Рейтинг" : "Reyting"} value={`★ ${s.rating}`} />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <TextWidget
          text={ru ? "Вы не поставщик" : "Siz provayder emassiz"}
          style={{ fontSize: 14, color: W.subtle, marginTop: 6 }}
        />
      )}
    </FlexWidget>
  );
}
