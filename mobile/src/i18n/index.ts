import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./en.json";
import rw from "./rw.json";

const initI18n = async (): Promise<void> => {
  const savedLang = await AsyncStorage.getItem("aidiatrack_language");
  const lng = savedLang ?? "rw";

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      rw: { translation: rw },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
};

initI18n().catch(() => undefined);

export default i18n;
