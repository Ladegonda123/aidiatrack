import React from "react";
import {
  Image,
  ImageStyle,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { COLORS } from "../utils/colors";

interface Props {
  photoUrl?: string | null;
  name: string;
  size?: number;
  style?: ViewStyle;
}

const getInitials = (name: string): string => {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const Avatar: React.FC<Props> = ({ photoUrl, name, size = 40, style }) => {
  const initials = getInitials(name);
  const fontSize = size * 0.35;
  const borderRadius = size / 2;

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius },
          style as ImageStyle,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
  },
  placeholder: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default Avatar;
