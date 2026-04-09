import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { assignDoctor, DoctorListItem, listDoctors } from "../../api/doctorAPI";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";
import { RootStackParamList } from "../../types";

const SelectDoctorScreen = (): React.JSX.Element => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorListItem | null>(
    null,
  );
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDoctors = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await listDoctors();
      setDoctors(data);

      if (user?.doctorId) {
        const currentDoctor =
          data.find((doctor) => doctor.id === user.doctorId) ?? null;
        setSelectedDoctor(currentDoctor);
      }
    } catch {
      setDoctors([]);
      setSelectedDoctor(null);
    } finally {
      setLoading(false);
    }
  }, [user?.doctorId]);

  useEffect(() => {
    loadDoctors().catch(() => {
      setLoading(false);
    });
  }, [loadDoctors]);

  const filteredDoctors = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (search.length === 0) {
      return doctors;
    }

    return doctors.filter(
      (doctor) =>
        doctor.fullName.toLowerCase().includes(search) ||
        doctor.email.toLowerCase().includes(search) ||
        (doctor.phone ?? "").toLowerCase().includes(search),
    );
  }, [doctors, query]);

  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (isAxiosError(error)) {
        const message =
          typeof error.response?.data?.message === "string"
            ? error.response?.data?.message
            : "";

        if (
          message === "Doctor not found" ||
          message === "The selected user is not a doctor"
        ) {
          return t("common.error");
        }

        if (message === "Valid doctorId is required") {
          return t("selectDoctor.invalidSelection");
        }
      }

      return t("common.error");
    },
    [t],
  );

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!selectedDoctor) {
      Alert.alert(t("common.error"), t("selectDoctor.invalidSelection"));
      return;
    }

    try {
      setSubmitting(true);
      await assignDoctor(selectedDoctor.id);
      await refreshUser();
      Alert.alert(t("selectDoctor.title"), t("selectDoctor.success"), [
        {
          text: t("common.ok"),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: unknown) {
      Alert.alert(t("common.error"), getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [getErrorMessage, navigation, refreshUser, selectedDoctor, t]);

  const renderDoctor = ({
    item,
  }: {
    item: DoctorListItem;
  }): React.JSX.Element => {
    const isSelected = selectedDoctor?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.doctorCard, isSelected && styles.doctorCardSelected]}
        onPress={() => setSelectedDoctor(item)}
        activeOpacity={0.85}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{item.fullName}</Text>
          <Text style={styles.doctorEmail}>{item.email}</Text>
          {item.phone ? (
            <Text style={styles.doctorPhone}>{item.phone}</Text>
          ) : null}
        </View>
        <View style={styles.doctorMeta}>
          {isSelected ? (
            <View style={styles.selectedPill}>
              <Text style={styles.selectedPillText}>
                {t("selectDoctor.selected")}
              </Text>
            </View>
          ) : null}
          <Ionicons
            name={isSelected ? "checkmark-circle" : "chevron-forward"}
            size={18}
            color={isSelected ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t("selectDoctor.title")}</Text>
            <Text style={styles.headerSubtitle}>
              {t("selectDoctor.subtitle")}
            </Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={18}
              color={COLORS.textSecondary}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholder={t("selectDoctor.searchPlaceholder")}
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.centerStateText}>
                {t("selectDoctor.loading")}
              </Text>
            </View>
          ) : filteredDoctors.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.centerIcon}>👨‍⚕️</Text>
              <Text style={styles.centerStateText}>
                {t("selectDoctor.noDoctors")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredDoctors}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderDoctor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={() => {
              handleConfirm().catch(() => undefined);
            }}
            disabled={submitting || loading}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>
              {submitting ? t("common.loading") : t("selectDoctor.button")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  centerIcon: {
    fontSize: 42,
  },
  centerStateText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  doctorCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doctorCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  doctorEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  doctorPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  doctorMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  selectedPill: {
    backgroundColor: `${COLORS.primary}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  selectedPillText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  footer: {
    padding: 16,
    paddingTop: 8,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default SelectDoctorScreen;
