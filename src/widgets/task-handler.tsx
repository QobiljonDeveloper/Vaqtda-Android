// Widget task handler — Android tizimi widget hodisalarini (qo'shildi, yangilash,
// o'lcham o'zgardi) shu yerga yuboradi. Headless ishlaydi. Snapshot'ni o'qib,
// mos widget'ni chizamiz. Bosish OPEN_URI orqali native ochiladi — JS kerak emas.

import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { renderForWidget } from "./render";
import { readSnapshot } from "./storage";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetInfo, widgetAction } = props;

  switch (widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const snap = await readSnapshot();
      // widgetInfo (width/height dp) ni uzatamiz — root o'lchami shundan olinadi.
      props.renderWidget(renderForWidget(widgetInfo.widgetName, snap, widgetInfo));
      break;
    }
    // WIDGET_CLICK: OPEN_URI native ishlaydi. WIDGET_DELETED: tozalash shart emas.
    default:
      break;
  }
}
