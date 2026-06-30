// Maxsus kirish nuqtasi (main = index.js). Avval Android widget task handler'ni
// ro'yxatdan o'tkazamiz, so'ng expo-router entry'ni yuklaymiz. Tartib muhim,
// shuning uchun require() (ESM import emas).

const { Platform } = require("react-native");

if (Platform.OS === "android") {
  try {
    const { registerWidgetTaskHandler } = require("react-native-android-widget");
    const { widgetTaskHandler } = require("./src/widgets/task-handler");
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    // Widget kutubxonasi yo'q bo'lsa — ilova baribir ishlaydi.
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[widgets] task handler registration failed:", e);
    }
  }
}

require("expo-router/entry");
