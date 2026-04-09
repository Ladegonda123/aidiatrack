import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getPatientDetail } from "../../api/doctorAPI";
import { COLORS, getBgColor, getRiskColor } from "../../utils/colors";
import { formatDate, timeAgo } from "../../utils/formatters";
import {
  RootStackParamList,
  HealthRecord,
  Medication,
  Prediction,
  User,
} from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RouteType = RouteProp<RootStackParamList, "PatientDetail">;

interface PatientDetailResponse {
  patient?: User & {
    healthRecords?: HealthRecord[];
    predictions?: Prediction[];
    medications?: Medication[];
  };
  healthRecords?: HealthRecord[];
  records?: HealthRecord[];
  predictions?: Prediction[];
  medications?: Medication[];
}

const calculateAge = (dob: string): number => {
  return Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
};

const PatientDetailScreen = (): React.JSX.Element => {
  const route = useRoute<RouteType>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t, i18n } = useTranslation();
  const { patientId, patientName } = route.params;
  const lang = i18n.language as "en" | "rw";

  const [patient, setPatient] = useState<
    PatientDetailResponse["patient"] | null
  >(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<Prediction | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadPatientDetail = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = (await getPatientDetail(patientId)) as PatientDetailResponse;
      const resolvedPatient =
        data.patient ?? (data as PatientDetailResponse).patient ?? null;
      setPatient(resolvedPatient);
      const records =
        data.healthRecords ??
        data.records ??
        resolvedPatient?.healthRecords ??
        [];
      setHealthRecords(Array.isArray(records) ? records : []);
      const meds = data.medications ?? resolvedPatient?.medications ?? [];
      setMedications(
        Array.isArray(meds)
          ? meds.filter((medication) => medication.isActive)
          : [],
      );
      const preds = data.predictions ?? resolvedPatient?.predictions ?? [];
      setLatestPrediction(
        Array.isArray(preds) && preds.length > 0 ? preds[0] : null,
      );
    } catch {
      setPatient(null);
      setHealthRecords([]);
      setMedications([]);
      setLatestPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatientDetail().catch(() => {
      setLoading(false);
    });
  }, [loadPatientDetail]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadPatientDetail();
    setRefreshing(false);
  }, [loadPatientDetail]);

  const chartData = useMemo(() => {
    const records = healthRecords.slice(0, 7).reverse();
    if (records.length === 0) {
      return { labels: [], datasets: [{ data: [] as number[] }] };
    }

    return {
      labels: records.map(
        (record) => formatDate(record.recordedAt, lang).split(" ")[0],
      ),
      datasets: [
        {
          data: records.map((record) => record.bloodGlucose),
          color: (opacity = 1) => `rgba(46, 134, 193, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }, [healthRecords, lang]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerName}>{patientName}</Text>
            <Text style={styles.headerSub}>
              {t("doctor.patientDetail.title")}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => {
              navigation.navigate("DoctorChat", { patientId, patientName });
            }}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  onRefresh().catch(() => undefined);
                }}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.content}
          >
            <View style={styles.card}>
              <View style={styles.patientHeader}>
                <View style={styles.bigAvatar}>
                  <Text style={styles.bigAvatarText}>
                    {patientName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientMeta}>
                  <Text style={styles.patientFullName}>{patientName}</Text>
                  {patient?.gender ? (
                    <Text style={styles.metaText}>{patient.gender}</Text>
                  ) : null}
                  {patient?.dateOfBirth ? (
                    <Text style={styles.metaText}>
                      {calculateAge(patient.dateOfBirth)}{" "}
                      {t("doctor.patientDetail.yearsOld")}
                    </Text>
                  ) : null}
                  {patient?.phone ? (
                    <Text style={styles.metaText}>📞 {patient.phone}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {latestPrediction ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("doctor.patientDetail.lastPrediction")}
                </Text>
                <View style={styles.predictionRow}>
                  <View
                    style={[
                      styles.riskCircle,
                      {
                        backgroundColor: getRiskColor(
                          latestPrediction.riskLevel,
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.riskCircleText}>
                      {latestPrediction.riskLevel}
                    </Text>
                  </View>
                  <View style={styles.predictionInfo}>
                    {latestPrediction.predictedGlucose ? (
                      <Text style={styles.predictedBg}>
                        {t("predictions.predictedValue", {
                          value: latestPrediction.predictedGlucose.toFixed(1),
                        })}
                      </Text>
                    ) : null}
                    {latestPrediction.confidence ? (
                      <Text style={styles.confidence}>
                        {t("predictions.confidence", {
                          value: Math.round(latestPrediction.confidence * 100),
                        })}
                      </Text>
                    ) : null}
                    <Text style={styles.predictionTime}>
                      {timeAgo(latestPrediction.createdAt, lang)}
                    </Text>
                    {(latestPrediction.riskFactors ?? []).length > 0 ? (
                      <View style={styles.riskFactors}>
                        {(latestPrediction.riskFactors ?? []).map(
                          (factor, index) => (
                            <Text key={index} style={styles.riskFactor}>
                              • {factor}
                            </Text>
                          ),
                        )}
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}

            {chartData.labels.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("doctor.patientDetail.bgHistory")}
                </Text>
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 64}
                  height={180}
                  chartConfig={{
                    backgroundColor: COLORS.card,
                    backgroundGradientFrom: COLORS.card,
                    backgroundGradientTo: COLORS.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(46, 134, 193, ${opacity})`,
                    labelColor: () => COLORS.textSecondary,
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: COLORS.primary,
                    },
                    propsForBackgroundLines: {
                      stroke: COLORS.border,
                      strokeDasharray: "4",
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines
                  withOuterLines={false}
                  withVerticalLabels
                  withHorizontalLabels
                />
                <Text style={styles.chartNote}>
                  {t("doctor.patientDetail.normalRange")}
                </Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t("doctor.patientDetail.recentReadings")}
              </Text>
              {healthRecords.length === 0 ? (
                <Text style={styles.noDataText}>
                  {t("doctor.patientDetail.noRecords")}
                </Text>
              ) : (
                healthRecords.slice(0, 5).map((record, index) => (
                  <View
                    key={record.id}
                    style={[
                      styles.recordRow,
                      index < healthRecords.length - 1
                        ? styles.recordRowBorder
                        : undefined,
                    ]}
                  >
                    <View
                      style={[
                        styles.recordBgDot,
                        { backgroundColor: getBgColor(record.bloodGlucose) },
                      ]}
                    />
                    <View style={styles.recordInfo}>
                      <Text
                        style={[
                          styles.recordBg,
                          { color: getBgColor(record.bloodGlucose) },
                        ]}
                      >
                        {record.bloodGlucose.toFixed(1)} mg/dL
                      </Text>
                      {record.mealDesc ? (
                        <Text style={styles.recordMeal} numberOfLines={1}>
                          🍽 {record.mealDesc}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.recordTime}>
                      {timeAgo(record.recordedAt, lang)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t("doctor.patientDetail.medications")}
              </Text>
              {medications.length === 0 ? (
                <Text style={styles.noDataText}>
                  {t("medications.noMedications")}
                </Text>
              ) : (
                medications.map((medication, index) => (
                  <View
                    key={medication.id}
                    style={[
                      styles.medRow,
                      index < medications.length - 1
                        ? styles.recordRowBorder
                        : undefined,
                    ]}
                  >
                    <Text style={styles.medIcon}>💊</Text>
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>
                        {medication.drugName} {medication.dosage}
                      </Text>
                      <Text style={styles.medFreq}>{medication.frequency}</Text>
                    </View>
                    <View style={styles.medTimes}>
                      {medication.reminderTimes.map((time, index) => (
                        <Text key={index} style={styles.medTime}>
                          {time}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => {
                navigation.navigate("DoctorChat", { patientId, patientName });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
              <Text style={styles.messageButtonText}>
                {t("doctor.patientDetail.messageButton")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerCenter: { flex: 1 },
  headerName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 1,
  },
  chatButton: { padding: 4 },
  loader: { marginTop: 60 },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  bigAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  bigAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
  },
  patientMeta: { flex: 1, gap: 3 },
  patientFullName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  riskCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  riskCircleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  predictionInfo: { flex: 1, gap: 4 },
  predictedBg: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  confidence: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  predictionTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  riskFactors: { gap: 2, marginTop: 4 },
  riskFactor: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8,
  },
  chartNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  recordRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordBgDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordInfo: { flex: 1 },
  recordBg: {
    fontSize: 15,
    fontWeight: "600",
  },
  recordMeal: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  recordTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  medIcon: { fontSize: 22 },
  medInfo: { flex: 1 },
  medName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  medFreq: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  medTimes: { alignItems: "flex-end", gap: 2 },
  medTime: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  noDataText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  messageButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default PatientDetailScreen;
