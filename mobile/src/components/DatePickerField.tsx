import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../utils/colors";

interface Props {
  value: string;
  onChange: (dateString: string) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

const DatePickerField: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Select date",
  maximumDate = new Date(),
  minimumDate,
}) => {
  const [show, setShow] = useState(false);

  const currentDate = value ? new Date(value) : new Date(1990, 0, 1);
  const isValidDate = !!value && !isNaN(new Date(value).getTime());

  const displayValue = isValidDate
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }

    if (event.type === "dismissed") {
      setShow(false);
      return;
    }

    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    }

    if (Platform.OS === "ios") {
      setShow(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={displayValue ? COLORS.textPrimary : COLORS.textSecondary}
        />
        <Text style={[styles.triggerText, !displayValue && styles.placeholder]}>
          {displayValue ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate ?? new Date(1920, 0, 1)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  placeholder: {
    color: COLORS.textSecondary,
  },
});

export default DatePickerField;
