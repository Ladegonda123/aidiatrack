import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import axiosInstance from "../api/axiosInstance";
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
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateLanguage: (lang: Language) => Promise<void>;
  refreshUser: () => Promise<void>;
  chatUnreadCount: number;
  setChatUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshChatUnread: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);
  const tokenRef = useRef<string | null>(null);

  // Keep ref in sync with token state.
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const refreshChatUnread = useCallback(async (): Promise<void> => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    try {
      const response = await axiosInstance.get("/chat/unread-count");
      const count = response.data?.data?.unreadCount ?? 0;
      setChatUnreadCount(count);
    } catch {
      // silent fail
    }
  }, []);

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
        await saveLanguage(me.language);
        await i18n.changeLanguage(me.language);
        await refreshChatUnread();
      } catch {
        await removeToken();
        await removeUser();
        setToken(null);
        setUser(null);
        setChatUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth().catch(() => {
      setLoading(false);
    });
  }, [refreshChatUnread]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await loginRequest(email, password);
      setUser(response.user);
      setToken(response.token);
      await saveToken(response.token);
      await saveUser(response.user);
      await saveLanguage(response.user.language);
      await i18n.changeLanguage(response.user.language);
      await refreshChatUnread();
    },
    [refreshChatUnread],
  );

  const register = useCallback(
    async (data: RegisterData): Promise<void> => {
      const response = await registerRequest(data);
      setUser(response.user);
      setToken(response.token);
      await saveToken(response.token);
      await saveUser(response.user);
      await saveLanguage(response.user.language);
      await i18n.changeLanguage(response.user.language);
      await refreshChatUnread();
    },
    [refreshChatUnread],
  );

  const logout = useCallback(async (): Promise<void> => {
    await removeToken();
    await removeUser();
    setToken(null);
    setUser(null);
    setChatUnreadCount(0);
    await i18n.changeLanguage("rw");
  }, []);

  const updateLanguage = useCallback(async (lang: Language): Promise<void> => {
    try {
      // 1. Change i18n immediately for UI responsiveness
      await i18n.changeLanguage(lang);

      // 2. Save to local storage
      await saveLanguage(lang);

      // 3. Update backend silently — do NOT await this
      //    Awaiting causes re-render timing issues
      updateProfile({ language: lang }).catch(() => {});

      // 4. Update only the language field in user state
      //    Use functional update to avoid stale closure
      setUser((prev) => (prev ? { ...prev, language: lang } : prev));
    } catch (error) {
      // Silent failure — language already changed locally
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    const me = await getMe();
    setUser(me);
    await saveUser(me);
    await saveLanguage(me.language);
    await i18n.changeLanguage(me.language);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      setUser,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      chatUnreadCount,
      setChatUnreadCount,
      refreshChatUnread,
      updateLanguage,
    }),
    [
      chatUnreadCount,
      loading,
      login,
      logout,
      refreshChatUnread,
      refreshUser,
      register,
      setChatUnreadCount,
      token,
      updateLanguage,
      user,
    ],
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
