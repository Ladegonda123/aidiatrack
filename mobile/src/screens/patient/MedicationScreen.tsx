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
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  addMedication,
  deleteMedication,
  getMyMedications,
} from "../../api/medicationAPI";
import { COLORS } from "../../utils/colors";
import { Medication, RootStackParamList } from "../../types";

const schema = z.object({
  drugName: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.enum(["once daily", "twice daily", "three times daily"]),
});

type FormData = z.infer<typeof schema>;
type Frequency = FormData["frequency"];

const FREQUENCY_OPTIONS: {
  value: Frequency;
  labelKey:
    | "medications.frequencyOnce"
    | "medications.frequencyTwice"
    | "medications.frequencyThrice";
  reminders: number;
}[] = [
  {
    value: "once daily",
    labelKey: "medications.frequencyOnce",
    reminders: 1,
  },
  {
    value: "twice daily",
    labelKey: "medications.frequencyTwice",
    reminders: 2,
  },
  {
    value: "three times daily",
    labelKey: "medications.frequencyThrice",
    reminders: 3,
  },
];

const PRESET_TIMES = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "13:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "21:00",
  "22:00",
];

const MedicationScreen = (): React.JSX.Element => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "Medications">
    >();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      drugName: "",
      dosage: "",
      frequency: "once daily",
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadMedications = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getMyMedications();
      setMedications(data.filter((item) => item.isActive));
    } catch {
      setMedications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedications().catch(() => undefined);
  }, [loadMedications]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  }, [loadMedications]);

  const handleFrequencyChange = useCallback(
    (freq: Frequency, onChange: (value: Frequency) => void): void => {
      onChange(freq);
      const count = freq === "once daily" ? 1 : freq === "twice daily" ? 2 : 3;
      const defaults = ["08:00", "14:00", "20:00"];
      setReminderTimes(defaults.slice(0, count));
    },
    [],
  );

  const frequencyLabelByValue = useMemo(
    () => ({
      "once daily": t("medications.frequencyOnce"),
      "twice daily": t("medications.frequencyTwice"),
      "three times daily": t("medications.frequencyThrice"),
    }),
    [t],
  );

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      try {
        setSubmitting(true);
        await addMedication({
          drugName: data.drugName,
          dosage: data.dosage,
          frequency: data.frequency,
          reminderTimes,
        });
        setShowAddModal(false);
        reset();
        setReminderTimes(["08:00"]);
        await loadMedications();
      } catch {
        Alert.alert(t("common.error"));
      } finally {
        setSubmitting(false);
      }
    },
    [loadMedications, reminderTimes, reset, t],
  );

  const handleDelete = useCallback(
    (medication: Medication): void => {
      Alert.alert(t("medications.delete"), t("medications.deleteConfirm"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("medications.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMedication(medication.id);
              await loadMedications();
            } catch {
              Alert.alert(t("common.error"));
            }
          },
        },
      ]);
    },
    [loadMedications, t],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("medications.title")}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : medications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medkit-outline" size={56} color={COLORS.primary} />
            <Text style={styles.emptyText}>
              {t("medications.noMedications")}
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddText}>{t("medications.add")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={medications}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.medCard}>
                <View style={styles.medLeft}>
                  <View style={styles.medIconCircle}>
                    <Ionicons
                      name="medkit-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>{item.drugName}</Text>
                    <Text style={styles.medDosage}>
                      {item.dosage} •{" "}
                      {frequencyLabelByValue[item.frequency as Frequency]}
                    </Text>

                    <View style={styles.timesRow}>
                      {item.reminderTimes.map((time, index) => (
                        <View
                          key={`${item.id}-${time}-${index}`}
                          style={styles.timeChip}
                        >
                          <Ionicons
                            name="alarm-outline"
                            size={11}
                            color={COLORS.primary}
                          />
                          <Text style={styles.timeChipText}>{time}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={COLORS.danger}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("medications.add")}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView
                keyboardShouldPersistTaps="always"
                enableOnAndroid
                extraScrollHeight={40}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
              >
                <Text style={styles.fieldLabel}>
                  {t("medications.drugName")}
                </Text>
                <Controller
                  control={control}
                  name="drugName"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        errors.drugName && styles.inputError,
                      ]}
                      placeholder={t("medications.drugNamePlaceholder")}
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />

                <Text style={styles.fieldLabel}>{t("medications.dosage")}</Text>
                <Controller
                  control={control}
                  name="dosage"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={[styles.input, errors.dosage && styles.inputError]}
                      placeholder={t("medications.dosagePlaceholder")}
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />

                <Text style={styles.fieldLabel}>
                  {t("medications.frequency")}
                </Text>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.frequencyRow}>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.freqButton,
                            value === option.value && styles.freqButtonActive,
                          ]}
                          onPress={() =>
                            handleFrequencyChange(option.value, onChange)
                          }
                        >
                          <Text
                            style={[
                              styles.freqText,
                              value === option.value && styles.freqTextActive,
                            ]}
                          >
                            {t(option.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                />

                <Text style={styles.fieldLabel}>
                  {t("medications.reminderTimes")}
                </Text>
                {reminderTimes.map((time, index) => (
                  <View key={index} style={styles.timePickerRow}>
                    <Text style={styles.timePickerLabel}>
                      {t("medications.reminder")} {index + 1}
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.presetChips}
                      keyboardShouldPersistTaps="always"
                    >
                      {PRESET_TIMES.map((preset) => (
                        <TouchableOpacity
                          key={preset}
                          style={[
                            styles.presetChip,
                            time === preset
                              ? styles.presetChipActive
                              : undefined,
                          ]}
                          onPress={() => {
                            const updated = [...reminderTimes];
                            updated[index] = preset;
                            setReminderTimes(updated);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              time === preset
                                ? styles.presetChipTextActive
                                : undefined,
                            ]}
                          >
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={styles.customTimeRow}>
                      <Ionicons
                        name="alarm-outline"
                        size={16}
                        color={COLORS.primary}
                      />
                      <TextInput
                        style={styles.customTimeInput}
                        value={time}
                        onChangeText={(val) => {
                          const updated = [...reminderTimes];
                          updated[index] = val;
                          setReminderTimes(updated);
                        }}
                        placeholder="HH:MM"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="numeric"
                        maxLength={5}
                        returnKeyType="done"
                        blurOnSubmit={false}
                        onBlur={() => {
                          const raw = time.replace(":", "");
                          if (!time.includes(":") && raw.length === 4) {
                            const formatted = `${raw.slice(0, 2)}:${raw.slice(2)}`;
                            const updated = [...reminderTimes];
                            updated[index] = formatted;
                            setReminderTimes(updated);
                          }
                        }}
                      />
                      <Text style={styles.customTimeHint}>
                        {t("medications.orType")}
                      </Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.submitText}>{t("common.save")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </KeyboardAwareScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  loader: { marginTop: 40 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  medCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  medLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  medIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  medInfo: { flex: 1 },
  medName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  medDosage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timeChipText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalContent: {
    padding: 20,
    gap: 6,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: COLORS.danger },
  frequencyRow: {
    gap: 8,
  },
  freqButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  freqButtonActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  freqText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  freqTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  timePickerRow: {
    marginBottom: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  presetChips: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  presetChipTextActive: {
    color: "#FFFFFF",
  },
  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  customTimeInput: {
    width: 70,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
    textAlign: "center",
  },
  customTimeHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default MedicationScreen;
