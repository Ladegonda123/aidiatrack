import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TOKEN: "aidiatrack_token",
  USER: "aidiatrack_user",
  LANGUAGE: "aidiatrack_language",
};

export const saveToken = (token: string): Promise<void> =>
  AsyncStorage.setItem(KEYS.TOKEN, token);

export const getToken = (): Promise<string | null> =>
  AsyncStorage.getItem(KEYS.TOKEN);

export const removeToken = (): Promise<void> =>
  AsyncStorage.removeItem(KEYS.TOKEN);

export const saveUser = (user: object): Promise<void> =>
  AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));

export const getUser = async (): Promise<unknown | null> => {
  const storedUser = await AsyncStorage.getItem(KEYS.USER);
  return storedUser ? JSON.parse(storedUser) : null;
};

export const removeUser = (): Promise<void> =>
  AsyncStorage.removeItem(KEYS.USER);

export const saveLanguage = (lang: string): Promise<void> =>
  AsyncStorage.setItem(KEYS.LANGUAGE, lang);

export const getLanguage = (): Promise<string | null> =>
  AsyncStorage.getItem(KEYS.LANGUAGE);
