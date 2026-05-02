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
import { registerForPushNotifications } from "../utils/registerPushToken";
import { chatEvents, CHAT_EVENTS } from "../utils/chatEvents";
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
  refreshUserProfile: () => Promise<void>;
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
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  const tokenRef = useRef<string | null>(null);
  const userIdRef = useRef<number | null>(null);
  const activeChatUserIdRef = useRef<number | null>(null);

  // Keep ref in sync with token state.
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    activeChatUserIdRef.current = activeChatUserId;
  }, [activeChatUserId]);

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

  const refreshUserProfile = useCallback(async (): Promise<void> => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    try {
      const response = await axiosInstance.get("/auth/me");
      const freshUser = response.data?.data?.user ?? response.data?.data;

      if (freshUser) {
        setUser(freshUser);
        await saveUser(freshUser);
        if (typeof freshUser.language === "string") {
          await saveLanguage(freshUser.language);
          await i18n.changeLanguage(freshUser.language);
        }
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    const handleChatOpened = (data: { withUserId: number }): void => {
      setActiveChatUserId(data.withUserId);
      activeChatUserIdRef.current = data.withUserId;
    };

    const handleChatClosed = (): void => {
      setActiveChatUserId(null);
      activeChatUserIdRef.current = null;
    };

    const handleNewMessage = (data: {
      senderId: number;
      content: string;
      timestamp: string;
    }): void => {
      console.log(
        "[AuthContext] handleNewMessage:",
        "senderId:",
        data.senderId,
        "myId:",
        userIdRef.current,
        "activeChatId:",
        activeChatUserIdRef.current,
      );

      if (data.senderId === userIdRef.current) return;
      if (activeChatUserIdRef.current === data.senderId) return;

      console.log("[AuthContext] incrementing badge");

      setChatUnreadCount((prev) => prev + 1);
    };

    chatEvents.on(CHAT_EVENTS.CHAT_OPENED, handleChatOpened);
    chatEvents.on(CHAT_EVENTS.CHAT_CLOSED, handleChatClosed);
    chatEvents.on(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);

    return () => {
      chatEvents.off(CHAT_EVENTS.CHAT_OPENED, handleChatOpened);
      chatEvents.off(CHAT_EVENTS.CHAT_CLOSED, handleChatClosed);
      chatEvents.off(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    };
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

      if (!response.token) {
        throw new Error("Login failed: no token returned");
      }

      setUser(response.user);
      setToken(response.token);
      await saveToken(response.token);
      await saveUser(response.user);
      await saveLanguage(response.user.language);
      await i18n.changeLanguage(response.user.language);
      await refreshChatUnread();
      await registerForPushNotifications();
    },
    [refreshChatUnread],
  );

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    // Just call API — do not set user or token
    await registerRequest(data);
    // Registration succeeds — user must now log in
  }, []);

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

  const refreshUser = refreshUserProfile;

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
      refreshUserProfile,
    }),
    [
      chatUnreadCount,
      loading,
      login,
      logout,
      refreshChatUnread,
      refreshUser,
      refreshUserProfile,
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
