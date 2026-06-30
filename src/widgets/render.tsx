// Widget nomi + snapshot + o'lcham → JSX element. Task handler ham, sync ham shu
// mapper'ni ishlatadi, shunda chizish logikasi bitta joyda.

import React from "react";

import {
  SearchWidget,
  UpcomingWidget,
  ScheduleWidget,
  StatsWidget,
  type WInfo,
} from "./widgets";
import { WIDGET_NAMES, type WidgetSnapshot } from "./types";

export function renderForWidget(
  name: string,
  snap: WidgetSnapshot,
  widgetInfo?: WInfo,
): React.JSX.Element {
  switch (name) {
    case WIDGET_NAMES.upcoming:
      return <UpcomingWidget snap={snap} widgetInfo={widgetInfo} />;
    case WIDGET_NAMES.schedule:
      return <ScheduleWidget snap={snap} widgetInfo={widgetInfo} />;
    case WIDGET_NAMES.stats:
      return <StatsWidget snap={snap} widgetInfo={widgetInfo} />;
    case WIDGET_NAMES.search:
    default:
      return <SearchWidget snap={snap} widgetInfo={widgetInfo} />;
  }
}
