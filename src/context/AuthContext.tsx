import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import type { User, UserRole } from '../types/auth';

const { NotificationModule } = NativeModules;

export const ONBOARDING_STORAGE_PREFIX = '@SyncPay:hasCompletedOnboarding_';

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

type LocalUser = Omit<User, 'role'>;

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function normalizeRole(role: unknown): UserRole {
  return role === 'admin' ? 'admin' : 'user';
}

async function fetchProfileRole(authUser: SupabaseAuthUser): Promise<UserRole> {
  // Apenas em modo de desenvolvimento permite o fallback de admin por e-mail de teste
  if (__DEV__ && authUser.email === 'miguel.dev@test.com') {
    return 'admin';
  }

  if (!supabase) {
    return 'user';
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error || !data) {
      return 'user';
    }

    return normalizeRole(data.role);
  } catch {
    return 'user';
  }
}

async function toAppUser(authUser: SupabaseAuthUser): Promise<User> {
  const profileRole = await fetchProfileRole(authUser);
  const metadataName = authUser.user_metadata?.display_name ?? authUser.user_metadata?.name;
  const name =
    typeof metadataName === 'string' && metadataName.trim().length > 0
      ? metadataName.trim()
      : authUser.email?.split('@')[0] ?? 'SyncPay User';

  return {
    id: authUser.id,
    name,
    email: authUser.email ?? '',
    createdAt: authUser.created_at ? new Date(authUser.created_at).getTime() : Date.now(),
    role: profileRole,
  };
}

function toLocalUser(user: LocalUser): User {
  return { ...user, role: 'user' };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true);

  const checkOnboardingStatus = useCallback(async (userId: string) => {
    try {
      const val = await AsyncStorage.getItem(`${ONBOARDING_STORAGE_PREFIX}${userId}`);
      setHasCompletedOnboarding(val === 'true');
    } catch {
      setHasCompletedOnboarding(false);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return;
    try {
      await AsyncStorage.setItem(`${ONBOARDING_STORAGE_PREFIX}${user.id}`, 'true');
      setHasCompletedOnboarding(true);
    } catch (e) {
      console.error('Erro ao salvar status de onboarding:', e);
      setHasCompletedOnboarding(true);
    }
  }, [user?.id]);

  const resetOnboarding = useCallback(async () => {
    if (!user?.id) return;
    try {
      await AsyncStorage.removeItem(`${ONBOARDING_STORAGE_PREFIX}${user.id}`);
      setHasCompletedOnboarding(false);
    } catch (e) {
      console.error('Erro ao resetar onboarding:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      checkOnboardingStatus(user.id);
    } else {
      setHasCompletedOnboarding(true);
    }
  }, [user?.id, checkOnboardingStatus]);

  const checkLocalSession = useCallback(async () => {
    try {
      if (NotificationModule?.getActiveUser) {
        const activeUser: LocalUser | null = await NotificationModule.getActiveUser();
        if (activeUser?.id) {
          const appUser = toLocalUser(activeUser);
          setUser(appUser);
          await checkOnboardingStatus(appUser.id);
        }
      }
    } catch (error) {
      console.log('No local session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [checkOnboardingStatus]);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      checkLocalSession();
      return undefined;
    }

    let isMounted = true;

    const applySession = async (session: Session | null) => {
      const nextUser = session?.user ? await toAppUser(session.user) : null;
      if (isMounted) {
        setUser(nextUser);
        if (nextUser?.id) {
          await checkOnboardingStatus(nextUser.id);
        }
      }
    };

    const initializeSession = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          throw error;
        }
        await applySession(data.session);
      } catch (error) {
        console.error('Unable to restore Supabase session:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSession();

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      applySession(session).catch(error => {
        console.error('Unable to refresh authenticated user:', error);
      });
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [checkLocalSession, checkOnboardingStatus]);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          return { success: false, error: error?.message || 'Unable to authenticate.' };
        }

        const appUser = await toAppUser(data.user);
        setUser(appUser);
        await checkOnboardingStatus(appUser.id);
        return { success: true };
      }

      if (!NotificationModule?.loginUser) {
        return { success: false, error: 'Native module is unavailable.' };
      }

      const loggedUser: LocalUser = await NotificationModule.loginUser(email, password);
      const appUser = toLocalUser(loggedUser);
      setUser(appUser);
      await checkOnboardingStatus(appUser.id);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to authenticate.',
      };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name, name } },
        });
        if (error || !data.user) {
          return { success: false, error: error?.message || 'Unable to create account.' };
        }

        const appUser = await toAppUser(data.user);
        setUser(appUser);
        // Novo registro: garante que o onboarding é acionado
        await AsyncStorage.removeItem(`${ONBOARDING_STORAGE_PREFIX}${appUser.id}`);
        setHasCompletedOnboarding(false);
        return { success: true };
      }

      if (!NotificationModule?.registerUser) {
        return { success: false, error: 'Native module is unavailable.' };
      }

      const newUser: LocalUser = await NotificationModule.registerUser(name, email, password);
      const appUser = toLocalUser(newUser);
      setUser(appUser);
      // Novo registro: garante que o onboarding é acionado
      await AsyncStorage.removeItem(`${ONBOARDING_STORAGE_PREFIX}${appUser.id}`);
      setHasCompletedOnboarding(false);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to create account.',
      };
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      if (NotificationModule?.logoutUser) {
        await NotificationModule.logoutUser();
      }
    } catch (error) {
      console.error('Unable to logout:', error);
    } finally {
      setUser(null);
      setHasCompletedOnboarding(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        hasCompletedOnboarding,
        completeOnboarding,
        resetOnboarding,
        login,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
