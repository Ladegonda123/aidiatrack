import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getMyPatients } from "../../api/doctorAPI";
import Avatar from "../../components/Avatar";
import { COLORS } from "../../utils/colors";
import { RootStackParamList, User } from "../../types";

interface PatientsPayload {
  patients?: User[];
}

const DoctorChatList = (): React.JSX.Element => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [patients, setPatients] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadPatients = useCallback(async (): Promise<void> => {
    try {
      const data = await getMyPatients();
      const list = Array.isArray(data)
        ? data
        : ((data as PatientsPayload).patients ?? []);
      setPatients(list);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients().catch(() => {
      setLoading(false);
    });
  }, [loadPatients]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  }, [loadPatients]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("chat.titleDoctor")}</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>
              {t("doctor.dashboard.noPatients")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={patients}
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
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.patientRow}
                onPress={() => {
                  navigation.navigate("DoctorChat", {
                    patientId: item.id,
                    patientName: item.fullName,
                    patientPhotoUrl: item.photoUrl ?? null,
                  });
                }}
                activeOpacity={0.7}
              >
                <Avatar
                  photoUrl={item.photoUrl ?? null}
                  name={item.fullName}
                  size={44}
                  style={styles.patientAvatar}
                />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{item.fullName}</Text>
                  <Text style={styles.patientEmail}>{item.email}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
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
    paddingVertical: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  loader: { marginTop: 40 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  patientAvatar: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  patientInfo: { flex: 1 },
  patientName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  patientEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  separator: { height: 10 },
});

export default DoctorChatList;
