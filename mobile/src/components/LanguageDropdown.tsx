import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "../utils/colors";
import { saveLanguage } from "../utils/storage";
import { Language } from "../types";

interface Props {
  onLanguageChange?: (lang: Language) => void;
}

const LANGUAGES = [
  { code: "rw" as Language, label: "Kinyarwanda", short: "KIN" },
  { code: "en" as Language, label: "English", short: "ENG" },
];

const LanguageDropdown: React.FC<Props> = ({ onLanguageChange }) => {
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 60,
    right: 16,
  });
  const triggerRef = useRef<View | null>(null);

  const current =
    LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const handleOpen = (): void => {
    if (triggerRef.current) {
      triggerRef.current.measureInWindow(
        (_x: number, y: number, _width: number, height: number) => {
          setDropdownPosition({
            top: y + height + 6,
            right: 16,
          });
        },
      );
    }

    setVisible(true);
  };

  const handleSelect = async (lang: Language): Promise<void> => {
    await i18n.changeLanguage(lang);
    await saveLanguage(lang);
    onLanguageChange?.(lang);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef as any}
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={styles.globe}>🌐</Text>
        <Text style={styles.triggerText}>{current.short}</Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable
            style={[
              styles.dropdown,
              {
                position: "absolute",
                top: dropdownPosition.top,
                right: dropdownPosition.right,
              },
            ]}
          >
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.option,
                  lang.code === i18n.language && styles.optionActive,
                ]}
                onPress={() => {
                  handleSelect(lang.code).catch(() => undefined);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    lang.code === i18n.language && styles.optionTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
                {lang.code === i18n.language && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  globe: { fontSize: 14 },
  triggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  caret: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  dropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionActive: {
    backgroundColor: "#EBF5FB",
  },
  optionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
  },
});

export default LanguageDropdown;
