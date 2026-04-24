import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import {
  getPredictionHistory,
  getRiskAssessment,
} from "../../api/predictionAPI";
import { COLORS, getRiskColor } from "../../utils/colors";
import { formatDateTime, timeAgo } from "../../utils/formatters";
import { Prediction } from "../../types";

const PredictionsScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "rw";
  const navigation = useNavigation();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentRisk, setCurrentRisk] = useState<{
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    riskFactors: string[];
    confidence: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [assessingRisk, setAssessingRisk] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadPredictions = useCallback(async (silent = false): Promise<void> => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const data = await getPredictionHistory();
      setPredictions(data);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRiskAssessment = useCallback(async (): Promise<void> => {
    try {
      setAssessingRisk(true);
      const result = await getRiskAssessment();
      setCurrentRisk(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("enough data") || message.includes("400")) {
        Alert.alert(
          t("predictions.notEnoughData"),
          t("predictions.logMoreReadings") ??
            "Log at least 5 health readings for risk assessment",
        );
      }
    } finally {
      setAssessingRisk(false);
    }
  }, [t]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadPredictions(true);
  }, [loadPredictions]);

  useEffect(() => {
    loadPredictions(false).catch(() => {
      setLoading(false);
    });
  }, [loadPredictions]);

  useRefreshOnFocus(
    useCallback(() => loadPredictions(true), [loadPredictions]),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("predictions.title")}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.riskCard}>
            <View style={styles.riskCardHeader}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.riskCardTitle}>
                {t("predictions.riskAssessmentTitle")}
              </Text>
            </View>

            {currentRisk ? (
              <View style={styles.riskResult}>
                <View
                  style={[
                    styles.riskLevelBadge,
                    { backgroundColor: getRiskColor(currentRisk.riskLevel) },
                  ]}
                >
                  <Text style={styles.riskLevelText}>
                    {currentRisk.riskLevel}
                  </Text>
                </View>

                <View style={styles.riskFactorsList}>
                  {(currentRisk.riskFactors ?? []).map((factor, index) => (
                    <View key={index} style={styles.riskFactorItem}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={14}
                        color={getRiskColor(currentRisk.riskLevel)}
                      />
                      <Text style={styles.riskFactorText}>{factor}</Text>
                    </View>
                  ))}

                  {(currentRisk.riskFactors ?? []).length === 0 ? (
                    <Text style={styles.noRiskFactors}>
                      {t("predictions.noRiskFactors")}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.riskConfidence}>
                  {t("predictions.confidence", {
                    value: Math.round((currentRisk.confidence ?? 0) * 100),
                  })}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.assessButton}
                onPress={() => {
                  handleRiskAssessment().catch(() => undefined);
                }}
                disabled={assessingRisk}
                activeOpacity={0.8}
              >
                {assessingRisk ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="analytics-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.assessButtonText}>
                      {t("predictions.runAssessment")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.historyTitle}>
            {t("predictions.historyTitle")}
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loader}
            />
          ) : predictions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🤖</Text>
              <Text style={styles.emptyText}>{t("predictions.noData")}</Text>
            </View>
          ) : (
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    onRefresh().catch(() => undefined);
                  }}
                  colors={[COLORS.primary]}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.predictionCard}>
                  <View style={styles.predictionCardHeader}>
                    <View
                      style={[
                        styles.riskPill,
                        {
                          backgroundColor: `${getRiskColor(item.riskLevel)}20`,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.riskDot,
                          { backgroundColor: getRiskColor(item.riskLevel) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.riskPillText,
                          { color: getRiskColor(item.riskLevel) },
                        ]}
                      >
                        {item.riskLevel}
                      </Text>
                    </View>
                    <Text style={styles.predictionTime}>
                      {timeAgo(item.createdAt, lang)}
                    </Text>
                  </View>

                  {item.predictedGlucose ? (
                    <View style={styles.glucoseRow}>
                      <Ionicons
                        name="trending-up-outline"
                        size={16}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.glucoseLabel}>
                        {t("predictions.predictedValue", {
                          value: item.predictedGlucose.toFixed(1),
                        })}
                      </Text>
                      <Text style={styles.hoursLabel}>
                        {t("predictions.inHours", {
                          hours: item.predictionHours,
                        })}
                      </Text>
                    </View>
                  ) : null}

                  {item.confidence ? (
                    <Text style={styles.confidenceText}>
                      {t("predictions.confidence", {
                        value: Math.round(item.confidence * 100),
                      })}
                    </Text>
                  ) : null}

                  <Text style={styles.predictionDate}>
                    {formatDateTime(item.createdAt, lang)}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  riskCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  riskCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  riskCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  riskResult: { gap: 12 },
  riskLevelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskLevelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  riskFactorsList: { gap: 6 },
  riskFactorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  riskFactorText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  noRiskFactors: {
    fontSize: 13,
    color: COLORS.success,
    fontStyle: "italic",
  },
  riskConfidence: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
  assessButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  assessButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loader: { marginTop: 40 },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  predictionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  predictionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  riskPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  predictionTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  glucoseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  glucoseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
  },
  hoursLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  confidenceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  predictionDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default PredictionsScreen;
