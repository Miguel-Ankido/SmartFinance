import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NativeModules } from 'react-native';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import type { User, UserRole } from '../types/auth';

const { NotificationModule } = NativeModules;

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
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
  // Se for o e-mail de desenvolvimento, garante permissão de admin imediatamente
  if (authUser.email === 'miguel.dev@test.com') {
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

  const checkLocalSession = useCallback(async () => {
    try {
      if (NotificationModule?.getActiveUser) {
        const activeUser: LocalUser | null = await NotificationModule.getActiveUser();
        if (activeUser?.id) {
          setUser(toLocalUser(activeUser));
        }
      }
    } catch (error) {
      console.log('No local session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, [checkLocalSession]);

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

        setUser(await toAppUser(data.user));
        return { success: true };
      }

      if (!NotificationModule?.loginUser) {
        return { success: false, error: 'Native module is unavailable.' };
      }

      const loggedUser: LocalUser = await NotificationModule.loginUser(email, password);
      setUser(toLocalUser(loggedUser));
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

        setUser(await toAppUser(data.user));
        return { success: true };
      }

      if (!NotificationModule?.registerUser) {
        return { success: false, error: 'Native module is unavailable.' };
      }

      const newUser: LocalUser = await NotificationModule.registerUser(name, email, password);
      setUser(toLocalUser(newUser));
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
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
