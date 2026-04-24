import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import LanguageDropdown from "../../components/LanguageDropdown";
import { updateProfile } from "../../api/authAPI";
import { uploadProfilePhoto } from "../../api/uploadAPI";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";
import { formatDate } from "../../utils/formatters";
import { saveUser } from "../../utils/storage";
import { RootStackParamList } from "../../types";

const ProfileScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, updateLanguage, setUser } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<boolean>(false);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(
    user?.reminderEnabled ?? true,
  );
  const [reminderTimes, setReminderTimes] = useState<string[]>(
    user?.reminderTimes ?? ["07:00", "13:00", "20:00"],
  );
  const [savingReminder, setSavingReminder] = useState<boolean>(false);
  const lang = i18n.language as "en" | "rw";

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    setReminderEnabled(user?.reminderEnabled ?? true);
    setReminderTimes(user?.reminderTimes ?? ["07:00", "13:00", "20:00"]);
  }, [user?.reminderEnabled, user?.reminderTimes]);

  const isValidTime = (time: string): boolean =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  const handleLogout = (): void => {
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: () => {
          logout().catch(() => undefined);
        },
      },
    ]);
  };

  const handlePickPhoto = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t("profile.photoPermission"),
        t("profile.photoPermissionMsg"),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as ImagePicker.MediaType[],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      setUploadingPhoto(true);
      const updatedUser = await uploadProfilePhoto(result.assets[0].uri);
      setPhotoError(false);
      setUser((prev) =>
        prev ? { ...prev, photoUrl: updatedUser.photoUrl } : prev,
      );

      if (user) {
        await saveUser({ ...user, photoUrl: updatedUser.photoUrl });
      }
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleTimeChange = (index: number, value: string): void => {
    const updated = [...reminderTimes];
    updated[index] = value;
    setReminderTimes(updated);
  };

  const handleAddTime = (): void => {
    if (reminderTimes.length >= 5) {
      return;
    }
    setReminderTimes((prev) => [...prev, "08:00"]);
  };

  const handleRemoveTime = (index: number): void => {
    if (reminderTimes.length <= 1) {
      return;
    }
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveReminders = async (): Promise<void> => {
    const validTimes = reminderTimes.filter(isValidTime);
    if (validTimes.length === 0) {
      return;
    }

    try {
      setSavingReminder(true);
      await updateProfile({
        reminderEnabled,
        reminderTimes: validTimes,
      });
      setUser((prev) =>
        prev ? { ...prev, reminderEnabled, reminderTimes: validTimes } : prev,
      );
      Alert.alert(t("profile.reminderSaved"), t("profile.reminderSavedMsg"));
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setSavingReminder(false);
    }
  };

  const infoRows = [
    {
      icon: "person-outline",
      label: t("profile.fullName"),
      value: user?.fullName ?? "--",
    },
    {
      icon: "mail-outline",
      label: t("profile.email"),
      value: user?.email ?? "--",
    },
    {
      icon: "call-outline",
      label: t("profile.phone"),
      value: user?.phone ?? "--",
    },
    {
      icon: "male-female-outline",
      label: t("profile.gender"),
      value: user?.gender ?? "--",
    },
    {
      icon: "calendar-outline",
      label: t("profile.memberSince"),
      value: user?.createdAt ? formatDate(user.createdAt, lang) : "--",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => {
                handlePickPhoto().catch(() => undefined);
              }}
              activeOpacity={0.85}
            >
              {user?.photoUrl && !photoError ? (
                <Image
                  source={{ uri: user.photoUrl }}
                  style={styles.avatarImage}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
              {uploadingPhoto ? (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : null}
            </TouchableOpacity>

            <Text style={styles.profileName}>{user?.fullName}</Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleBadgeInner}>
                <Text style={styles.roleEmoji}>
                  {user?.role === "PATIENT" ? "🏥" : "👨‍⚕️"}
                </Text>
                <Text style={styles.roleText}>
                  {user?.role === "PATIENT"
                    ? t("auth.register.rolePatient")
                    : t("auth.register.roleDoctor")}
                </Text>
              </View>
            </View>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.infoRow, styles.infoRowBorder]}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <View style={styles.infoLeft}>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.infoLabel}>{t("profile.editProfile")}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {infoRows.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  index < infoRows.length - 1 && styles.infoRowBorder,
                ]}
              >
                <View style={styles.infoLeft}>
                  <Ionicons
                    name={row.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.infoLabel}>{row.label}</Text>
                </View>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
            <View style={styles.languageRow}>
              <View style={styles.infoLeft}>
                <Ionicons
                  name="language-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.infoLabel}>{t("profile.language")}</Text>
              </View>
              <LanguageDropdown onLanguageChange={updateLanguage} />
            </View>
          </View>

          {user?.role === "PATIENT" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("profile.reminders")}</Text>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <View style={styles.infoLeft}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.infoLabel}>
                    {t("profile.dailyReminder")}
                  </Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={(val) => {
                    setReminderEnabled(val);
                    updateProfile({ reminderEnabled: val })
                      .then(() => {
                        setUser((prev) =>
                          prev ? { ...prev, reminderEnabled: val } : prev,
                        );
                      })
                      .catch(() => {
                        setReminderEnabled(!val);
                        Alert.alert(t("common.error"));
                      });
                  }}
                  trackColor={{
                    false: COLORS.border,
                    true: `${COLORS.primary}80`,
                  }}
                  thumbColor={
                    reminderEnabled ? COLORS.primary : COLORS.textSecondary
                  }
                />
              </View>

              {reminderEnabled ? (
                <>
                  <Text style={styles.reminderHelp}>
                    {t("profile.reminderHelp")}
                  </Text>

                  {reminderTimes.map((time, index) => (
                    <View key={`${index}-${time}`} style={styles.timeSlotRow}>
                      <Ionicons
                        name="alarm-outline"
                        size={18}
                        color={COLORS.primary}
                      />
                      <TextInput
                        style={[
                          styles.timeSlotInput,
                          !isValidTime(time)
                            ? styles.timeSlotInputError
                            : undefined,
                        ]}
                        value={time}
                        onChangeText={(val) => handleTimeChange(index, val)}
                        placeholder="HH:MM"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                      <Text style={styles.timeSlotFormat}>
                        {isValidTime(time) ? "✓" : "HH:MM"}
                      </Text>
                      {reminderTimes.length > 1 ? (
                        <TouchableOpacity
                          onPress={() => handleRemoveTime(index)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={COLORS.danger}
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}

                  {reminderTimes.length < 5 ? (
                    <TouchableOpacity
                      style={styles.addTimeButton}
                      onPress={handleAddTime}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={COLORS.primary}
                      />
                      <Text style={styles.addTimeText}>
                        {t("profile.addReminderTime")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.saveReminderButton,
                      savingReminder ? { opacity: 0.7 } : undefined,
                    ]}
                    onPress={() => {
                      handleSaveReminders().catch(() => undefined);
                    }}
                    disabled={savingReminder}
                  >
                    {savingReminder ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveReminderText}>
                        {t("profile.saveReminders")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("profile.security")}</Text>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => navigation.navigate("ChangePassword")}
            >
              <View style={styles.infoLeft}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.infoLabel}>
                  {t("profile.changePassword")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {user?.role === "DOCTOR" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("profile.doctorActionsTitle")}
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate("AssignPatient")}
                activeOpacity={0.85}
              >
                <View style={styles.actionButtonLeft}>
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <View>
                    <Text style={styles.actionButtonText}>
                      {t("profile.assignPatient")}
                    </Text>
                    <Text style={styles.actionButtonSubtext}>
                      {t("profile.assignPatientHint")}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          {user?.role === "PATIENT" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("profile.patientActionsTitle")}
              </Text>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => navigation.navigate("Medications")}
              >
                <View style={styles.infoLeft}>
                  <Ionicons
                    name="medkit-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.infoLabel}>{t("medications.title")}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>{t("profile.logout")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  profileHeader: {
    backgroundColor: COLORS.card,
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roleEmoji: {
    fontSize: 14,
  },
  roleText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    maxWidth: 180,
    textAlign: "right",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  actionButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reminderHelp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: "italic",
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeSlotInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    textAlign: "center",
  },
  timeSlotInputError: {
    borderBottomColor: COLORS.danger,
    color: COLORS.danger,
  },
  timeSlotFormat: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
    minWidth: 36,
  },
  addTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  addTimeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  saveReminderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  saveReminderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 32,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: `${COLORS.danger}08`,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ProfileScreen;
