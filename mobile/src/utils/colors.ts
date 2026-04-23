export const COLORS = {
  primary: "#2E86C1",
  primaryDark: "#1A5276",
  success: "#27AE60",
  warning: "#F39C12",
  danger: "#E74C3C",
  background: "#F8F9FA",
  card: "#FFFFFF",
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C8D",
  border: "#E8E8E8",
};

export const getBgColor = (mgDl: number): string => {
  if (mgDl < 70) return COLORS.danger;
  if (mgDl < 140) return COLORS.success;
  if (mgDl < 200) return COLORS.warning;
  return COLORS.danger;
};

export const getRiskColor = (risk: "LOW" | "MEDIUM" | "HIGH"): string => {
  if (risk === "LOW") return COLORS.success;
  if (risk === "MEDIUM") return COLORS.warning;
  return COLORS.danger;
};
