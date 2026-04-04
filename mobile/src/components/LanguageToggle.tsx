import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { updateProfile } from "../api/authAPI";
import { useAuth } from "../hooks/useAuth";
import { Language } from "../types";
import { COLORS } from "../utils/colors";
import { saveLanguage } from "../utils/storage";

interface LanguageToggleProps {
  style?: ViewStyle;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ style }) => {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();

  const currentLanguage: Language = i18n.language === "en" ? "en" : "rw";

  const handleLanguagePress = async (lang: Language): Promise<void> => {
    if (lang === currentLanguage) {
      return;
    }

    await i18n.changeLanguage(lang);
    await saveLanguage(lang);

    if (user) {
      try {
        await updateProfile({ language: lang });
      } catch {
        // Keep local language change even if remote profile update fails.
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        accessibilityRole="button"
        style={[
          styles.button,
          currentLanguage === "rw"
            ? styles.buttonActive
            : styles.buttonInactive,
        ]}
        onPress={() => {
          handleLanguagePress("rw").catch(() => undefined);
        }}
      >
        <Text
          style={[
            styles.buttonText,
            currentLanguage === "rw"
              ? styles.buttonTextActive
              : styles.buttonTextInactive,
          ]}
        >
          {t("common.languageKinShort")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        style={[
          styles.button,
          currentLanguage === "en"
            ? styles.buttonActive
            : styles.buttonInactive,
        ]}
        onPress={() => {
          handleLanguagePress("en").catch(() => undefined);
        }}
      >
        <Text
          style={[
            styles.buttonText,
            currentLanguage === "en"
              ? styles.buttonTextActive
              : styles.buttonTextInactive,
          ]}
        >
          {t("common.languageEngShort")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    minWidth: 56,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonActive: {
    backgroundColor: COLORS.primary,
  },
  buttonInactive: {
    backgroundColor: COLORS.card,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 12,
  },
  buttonTextActive: {
    color: COLORS.card,
  },
  buttonTextInactive: {
    color: COLORS.primary,
  },
});

export default LanguageToggle;
