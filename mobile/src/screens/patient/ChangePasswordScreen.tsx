import React, { useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { RootStackParamList } from "../../types";
import { changePassword } from "../../api/authAPI";
import { COLORS } from "../../utils/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ChangePassword">;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "mismatch",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const ChangePasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState<boolean>(false);
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t("auth.changePassword.title"),
      headerStyle: {
        backgroundColor: COLORS.card,
      },
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.textPrimary,
      },
      headerTintColor: COLORS.primary,
      headerShadowVisible: false,
      headerBackTitle: "",
    });
  }, [navigation, t]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordValues): Promise<void> => {
    try {
      setSaving(true);
      await changePassword(values.currentPassword, values.newPassword);
      Alert.alert(t("auth.changePassword.success"), undefined, [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const message =
          typeof error.response?.data?.message === "string"
            ? error.response.data.message
            : "";
        if (message === "Current password is incorrect") {
          Alert.alert(t("auth.changePassword.wrongCurrent"));
          return;
        }
      }

      Alert.alert(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const PasswordField = ({
    name,
    placeholder,
    visible,
    setVisible,
  }: {
    name: keyof ChangePasswordValues;
    placeholder: string;
    visible: boolean;
    setVisible: (value: boolean) => void;
  }): React.JSX.Element => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            secureTextEntry={!visible}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setVisible(!visible)}
          >
            <MaterialCommunityIcons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
      >
        <View style={styles.formCard}>

            <Text style={styles.label}>{t("auth.changePassword.current")}</Text>
            <PasswordField
              name="currentPassword"
              placeholder={t("auth.changePassword.current")}
              visible={showCurrent}
              setVisible={setShowCurrent}
            />
            {errors.currentPassword ? (
              <Text style={styles.errorText}>{t("common.required")}</Text>
            ) : null}

            <Text style={styles.label}>{t("auth.changePassword.new")}</Text>
            <PasswordField
              name="newPassword"
              placeholder={t("auth.changePassword.new")}
              visible={showNew}
              setVisible={setShowNew}
            />

            <Text style={styles.label}>{t("auth.changePassword.confirm")}</Text>
            <PasswordField
              name="confirmPassword"
              placeholder={t("auth.changePassword.confirm")}
              visible={showConfirm}
              setVisible={setShowConfirm}
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{t("common.error")}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {t("auth.changePassword.button")}
                </Text>
              )}
            </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 28, paddingTop: 16 },
  formCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  label: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.textPrimary,
  },
  eyeButton: { paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  button: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});

export default ChangePasswordScreen;
