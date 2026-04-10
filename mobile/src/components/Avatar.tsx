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

const Avatar: React.FC<Props> = ({ photoUrl, name, size = 40, style }) => {
  const fontSize = size * 0.4;
  const borderRadius = size / 2;
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

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
      <Text style={[styles.letter, { fontSize }]}>{initial}</Text>
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
