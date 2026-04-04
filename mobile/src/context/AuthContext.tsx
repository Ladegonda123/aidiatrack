import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import i18n from "../i18n";
import {
  getMe,
  login as loginRequest,
  register as registerRequest,
  RegisterData,
  updateProfile,
} from "../api/authAPI";
import {
  getToken,
  removeToken,
  removeUser,
  saveLanguage,
  saveToken,
  saveUser,
} from "../utils/storage";
import { Language, User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateLanguage: (lang: Language) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const bootstrapAuth = async (): Promise<void> => {
      try {
        const storedToken = await getToken();

        if (!storedToken) {
          setLoading(false);
          return;
        }

        setToken(storedToken);
        const me = await getMe();
        setUser(me);
        await saveUser(me);
        await i18n.changeLanguage(me.language);
      } catch {
        await removeToken();
        await removeUser();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth().catch(() => {
      setLoading(false);
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await loginRequest(email, password);
      setUser(response.user);
      setToken(response.token);
      await saveToken(response.token);
      await saveUser(response.user);
      await saveLanguage(response.user.language);
      await i18n.changeLanguage(response.user.language);
    },
    [],
  );

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    const response = await registerRequest(data);
    setUser(response.user);
    setToken(response.token);
    await saveToken(response.token);
    await saveUser(response.user);
    await saveLanguage(response.user.language);
    await i18n.changeLanguage(response.user.language);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await removeToken();
    await removeUser();
    setToken(null);
    setUser(null);
    await i18n.changeLanguage("rw");
  }, []);

  const updateLanguage = useCallback(async (lang: Language): Promise<void> => {
    const updatedUser = await updateProfile({ language: lang });
    await i18n.changeLanguage(lang);
    await saveLanguage(lang);
    await saveUser(updatedUser);
    setUser(updatedUser);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateLanguage,
    }),
    [loading, login, logout, register, token, updateLanguage, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
