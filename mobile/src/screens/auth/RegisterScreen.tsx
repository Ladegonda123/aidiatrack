import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList, UserRole } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role] = useState<UserRole>("PATIENT");
  const [loading, setLoading] = useState<boolean>(false);

  const onRegister = async (): Promise<void> => {
    try {
      setLoading(true);
      await register({
        fullName,
        email: email.trim(),
        password,
        role,
        language: "rw",
      });
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.register.title")}</Text>
      <Text style={styles.subtitle}>{t("auth.register.subtitle")}</Text>

      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t("auth.register.fullNamePlaceholder")}
      />
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={t("auth.register.emailPlaceholder")}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder={t("auth.register.passwordPlaceholder")}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={onRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? t("common.loading") : t("auth.register.button")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>
          {t("auth.register.hasAccount")} {t("auth.register.login")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: COLORS.card,
    fontWeight: "700",
  },
  link: {
    color: COLORS.primary,
    textAlign: "center",
  },
});

export default RegisterScreen;
