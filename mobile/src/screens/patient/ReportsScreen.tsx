import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BarChart, LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { getHealthHistory, getHealthSummary } from "../../api/healthAPI";
import { getDietRecommendations } from "../../api/dietAPI";
import { COLORS } from "../../utils/colors";
import { formatDate } from "../../utils/formatters";
import {
  DietRecommendation,
  HealthRecord,
  HealthSummary,
  RootStackParamList,
} from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;

type Period = "7d" | "30d";

const ReportsScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Reports">>();
  const [period, setPeriod] = useState<Period>("7d");
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [diet, setDiet] = useState<DietRecommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const lang = i18n.language as "en" | "rw";

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [historyData, summaryData, dietData] = await Promise.all([
        getHealthHistory(1, 30),
        getHealthSummary(),
        getDietRecommendations().catch(() => null),
      ]);

      setRecords(historyData);
      setSummary(summaryData);
      setDiet(dietData);
    } catch {
      setRecords([]);
      setSummary(null);
      setDiet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const filteredRecords = useMemo((): HealthRecord[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (period === "7d" ? 7 : 30));

    return records
      .filter((record) => new Date(record.recordedAt) >= cutoff)
      .slice(0, period === "7d" ? 7 : 30)
      .reverse();
  }, [records, period]);

  const lineChartData = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { labels: ["--"], datasets: [{ data: [0] }] };
    }

    return {
      labels: filteredRecords.map(
        (record) => formatDate(record.recordedAt, lang).split(" ")[0],
      ),
      datasets: [
        {
          data: filteredRecords.map((record) => record.bloodGlucose),
          color: (opacity = 1) => `rgba(46, 134, 193, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: [t("dashboard.mgdlUnit")],
    };
  }, [filteredRecords, lang, t]);

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    const values = filteredRecords.map((record) => record.bloodGlucose);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const inRange = values.filter((value) => value >= 70 && value < 140).length;
    const inRangePercent = Math.round((inRange / values.length) * 100);

    return {
      avg: avg.toFixed(1),
      max: max.toFixed(1),
      min: min.toFixed(1),
      inRangePercent,
      total: values.length,
    };
  }, [filteredRecords]);

  const barChartData = useMemo(() => {
    if (!stats) {
      return {
        labels: [t("reports.lowest"), t("reports.avgBg"), t("reports.highest")],
        datasets: [{ data: [0, 0, 0] }],
      };
    }

    return {
      labels: [t("reports.lowest"), t("reports.avgBg"), t("reports.highest")],
      datasets: [
        {
          data: [Number(stats.min), Number(stats.avg), Number(stats.max)],
        },
      ],
    };
  }, [stats, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("reports.title")}</Text>

          <View style={styles.periodToggle}>
            {(["7d", "30d"] as Period[]).map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.periodButton,
                  period === value && styles.periodButtonActive,
                ]}
                onPress={() => setPeriod(value)}
              >
                <Text
                  style={[
                    styles.periodText,
                    period === value && styles.periodTextActive,
                  ]}
                >
                  {value === "7d"
                    ? t("reports.sevenDays")
                    : t("reports.thirtyDays")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadData();
                  setRefreshing(false);
                }}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.content}
          >
            {stats ? (
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, styles.statCardWide]}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={22}
                    color={COLORS.primary}
                  />
                  <Text style={styles.statValue}>{stats.avg}</Text>
                  <Text style={styles.statUnit}>{t("dashboard.mgdlUnit")}</Text>
                  <Text style={styles.statLabel}>{t("reports.avgBg")}</Text>
                </View>

                <View style={styles.statsRight}>
                  <View style={styles.statCard}>
                    <Text
                      style={[
                        styles.statValue,
                        { color: COLORS.danger, fontSize: 18 },
                      ]}
                    >
                      {stats.max}
                    </Text>
                    <Text style={styles.statLabel}>{t("reports.highest")}</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text
                      style={[
                        styles.statValue,
                        { color: COLORS.success, fontSize: 18 },
                      ]}
                    >
                      {stats.min}
                    </Text>
                    <Text style={styles.statLabel}>{t("reports.lowest")}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {stats ? (
              <View style={styles.card}>
                <View style={styles.inRangeRow}>
                  <View>
                    <Text style={styles.inRangePercent}>
                      {stats.inRangePercent}%
                    </Text>
                    <Text style={styles.inRangeLabel}>
                      {t("reports.inRange")}
                    </Text>
                  </View>

                  <View style={styles.inRangeBar}>
                    <View
                      style={[
                        styles.inRangeBarFill,
                        {
                          width: `${stats.inRangePercent}%`,
                          backgroundColor:
                            stats.inRangePercent >= 70
                              ? COLORS.success
                              : stats.inRangePercent >= 50
                                ? COLORS.warning
                                : COLORS.danger,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={styles.readingsCount}>
                  {stats.total} {t("reports.readings")}
                </Text>
              </View>
            ) : null}

            {filteredRecords.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("reports.bgTrend")}</Text>
                <LineChart
                  data={lineChartData}
                  width={CHART_WIDTH}
                  height={200}
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
                  withShadow={false}
                  segments={4}
                />
                <Text style={styles.chartNote}>{t("reports.normalRange")}</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="bar-chart-outline"
                  size={48}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyText}>{t("reports.noData")}</Text>
              </View>
            )}

            {stats ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("reports.summaryBars")}</Text>
                <BarChart
                  data={barChartData}
                  width={CHART_WIDTH}
                  height={210}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero
                  chartConfig={{
                    backgroundColor: COLORS.card,
                    backgroundGradientFrom: COLORS.card,
                    backgroundGradientTo: COLORS.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(46, 134, 193, ${opacity})`,
                    labelColor: () => COLORS.textSecondary,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                />
              </View>
            ) : null}

            {diet ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("reports.dietAdvice")}</Text>
                <Text style={styles.dietAdvice}>{diet.advice}</Text>

                {diet.foodsToEat.length > 0 ? (
                  <View style={styles.foodSection}>
                    <View style={styles.foodHeader}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={COLORS.success}
                      />
                      <Text
                        style={[
                          styles.foodSectionTitle,
                          { color: COLORS.success },
                        ]}
                      >
                        {t("reports.recommended")}
                      </Text>
                    </View>

                    {diet.foodsToEat.map((food) => (
                      <Text key={food} style={styles.foodItem}>
                        {food}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {diet.foodsToAvoid.length > 0 ? (
                  <View style={styles.foodSection}>
                    <View style={styles.foodHeader}>
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={COLORS.danger}
                      />
                      <Text
                        style={[
                          styles.foodSectionTitle,
                          { color: COLORS.danger },
                        ]}
                      >
                        {t("reports.avoid")}
                      </Text>
                    </View>

                    {diet.foodsToAvoid.map((food) => (
                      <Text key={food} style={styles.foodItem}>
                        {food}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {summary ? (
              <View style={styles.summaryMetaRow}>
                <Text style={styles.summaryMetaText}>
                  {t("dashboard.totalRecords")}: {summary.totalRecords}
                </Text>
              </View>
            ) : null}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 3,
    alignSelf: "center",
  },
  periodButton: {
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 17,
  },
  periodButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  periodText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  periodTextActive: {
    color: COLORS.primary,
  },
  loader: { marginTop: 60 },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardWide: {
    flex: 1.2,
    justifyContent: "center",
  },
  statsRight: {
    flex: 1,
    gap: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: "600",
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
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  inRangePercent: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.primary,
  },
  inRangeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inRangeBar: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  inRangeBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  readingsCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
  chart: {
    borderRadius: 10,
  },
  chartNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  dietAdvice: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  foodSection: { gap: 6 },
  foodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  foodSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  foodItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingLeft: 4,
    lineHeight: 20,
  },
  summaryMetaRow: {
    alignItems: "flex-end",
    marginTop: 2,
  },
  summaryMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default ReportsScreen;
