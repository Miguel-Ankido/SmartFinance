import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import type { User, UserRole } from '../types/auth';
import { normalizeOtpCode } from '../utils/profileBudgetUtils';

const { NotificationModule } = NativeModules;

export const ONBOARDING_STORAGE_PREFIX = '@SyncPay:hasCompletedOnboarding_';
const MAX_METADATA_AVATAR_LEN = 512;

export function translateMobileAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de acessar a conta.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Este e-mail já está cadastrado.';
  }
  if (lower.includes('password should be at least')) {
    return 'A senha deve possuir no mínimo 6 caracteres.';
  }
  if (lower.includes('new password should be different')) {
    return 'A nova senha deve ser diferente da senha anterior.';
  }
  if (lower.includes('token has expired') || lower.includes('otp_expired') || lower.includes('invalid otp') || lower.includes('token is invalid')) {
    return 'Código inválido ou expirado. Confira o código recebido no e-mail ou solicite um novo.';
  }
  if (lower.includes('only request this after') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Muitas solicitações em sequência. Aguarde alguns segundos e tente novamente.';
  }
  if (lower.includes('invalid email')) {
    return 'Informe um endereço de e-mail válido.';
  }
  return message;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  updateUserProfile: (data: {
    name: string;
    avatarUrl?: string;
    monthlyIncome?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    monthlyIncome?: number,
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordResetCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyPasswordResetCode: (
    email: string,
    code: string,
  ) => Promise<{ success: boolean; error?: string }>;
  completePasswordReset: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  cancelPasswordRecovery: () => Promise<void>;
  logout: () => Promise<void>;
}

type LocalUser = Omit<User, 'role'>;

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function normalizeRole(role: unknown): UserRole {
  return role === 'admin' ? 'admin' : 'user';
}

interface ProfileRecord {
  found: boolean;
  role: UserRole;
  name?: string;
  avatarUrl?: string;
  hasAvatarField?: boolean;
  monthlyIncome?: number;
  updatedAt?: number;
}

async function fetchProfileRecord(authUser: SupabaseAuthUser): Promise<ProfileRecord> {
  const devAdminFallback = __DEV__ && authUser.email === 'miguel.dev@test.com' ? 'admin' : 'user';

  if (!supabase) {
    return { found: false, role: devAdminFallback };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, name, avatar_url, monthly_income, updated_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      const updatedAt =
        typeof data.updated_at === 'string' && !Number.isNaN(Date.parse(data.updated_at))
          ? Date.parse(data.updated_at)
          : 0;
      const role = devAdminFallback === 'admin' ? 'admin' : normalizeRole(data.role);
      return {
        found: true,
        role,
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : undefined,
        avatarUrl:
          typeof data.avatar_url === 'string' && data.avatar_url.trim()
            ? data.avatar_url.trim()
            : undefined,
        hasAvatarField: data.avatar_url !== undefined,
        monthlyIncome:
          data.monthly_income !== null &&
          data.monthly_income !== undefined &&
          Number(data.monthly_income) > 0
            ? Number(data.monthly_income)
            : undefined,
        updatedAt,
      };
    }

    const { data: minData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle();

    return {
      found: false,
      role: devAdminFallback === 'admin' ? 'admin' : normalizeRole(minData?.role),
    };
  } catch {
    return { found: false, role: devAdminFallback };
  }
}

async function enrichUserProfile(
  baseUser: User,
  cloudUpdatedAt = 0,
  cloudFound = false,
): Promise<User> {
  try {
    const cached = await AsyncStorage.getItem(`@SyncPay:user_profile_${baseUser.id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const localUpdatedAt = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0;

      // Só sobrescreve os dados da nuvem se estivermos offline ou se o cache local for mais recente
      if (!cloudFound || localUpdatedAt > cloudUpdatedAt) {
        return {
          ...baseUser,
          name: parsed.name || baseUser.name,
          avatarUrl:
            parsed.avatarUrl !== undefined
              ? parsed.avatarUrl ?? undefined
              : baseUser.avatarUrl,
          monthlyIncome:
            parsed.monthlyIncome !== undefined
              ? parsed.monthlyIncome === null
                ? undefined
                : Number(parsed.monthlyIncome)
              : baseUser.monthlyIncome,
        };
      }
    }
  } catch {
    // fallback
  }
  return baseUser;
}

async function toAppUser(authUser: SupabaseAuthUser): Promise<User> {
  const profile = await fetchProfileRecord(authUser);
  const metadataName = authUser.user_metadata?.display_name ?? authUser.user_metadata?.name;
  const fallbackName =
    typeof metadataName === 'string' && metadataName.trim().length > 0
      ? metadataName.trim()
      : authUser.email?.split('@')[0] ?? 'SyncPay User';

  const metadataIncome =
    authUser.user_metadata?.monthly_income !== undefined && authUser.user_metadata?.monthly_income !== null
      ? Number(authUser.user_metadata.monthly_income)
      : undefined;

  const metadataAvatar =
    typeof authUser.user_metadata?.avatar_url === 'string' && authUser.user_metadata.avatar_url.trim()
      ? authUser.user_metadata.avatar_url.trim()
      : undefined;

  const cloudAvatar = profile.found
    ? profile.avatarUrl ?? (profile.hasAvatarField ? undefined : metadataAvatar)
    : metadataAvatar;

  const base: User = {
    id: authUser.id,
    name: profile.name || fallbackName,
    email: authUser.email ?? '',
    createdAt: authUser.created_at ? new Date(authUser.created_at).getTime() : Date.now(),
    role: profile.role,
    avatarUrl: cloudAvatar,
    monthlyIncome: profile.monthlyIncome ?? metadataIncome,
  };

  return enrichUserProfile(base, profile.updatedAt ?? 0, profile.found);
}

function toLocalUser(user: LocalUser): User {
  return { ...user, role: 'user' };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const isPasswordRecoveryRef = useRef(false);
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

  const updateUserProfile = useCallback(
    async (data: {
      name: string;
      avatarUrl?: string;
      monthlyIncome?: number;
    }): Promise<{ success: boolean; error?: string }> => {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        return { success: false, error: 'O nome não pode ficar em branco.' };
      }

      if (!user) {
        return { success: false, error: 'Usuário não autenticado.' };
      }

      try {
        const incomeVal = data.monthlyIncome !== undefined ? Number(data.monthlyIncome) : user.monthlyIncome;
        const cleanAvatar = data.avatarUrl?.trim() || undefined;
        const nowTs = Date.now();
        const updatedUser: User = {
          ...user,
          name: trimmedName,
          avatarUrl: cleanAvatar,
          monthlyIncome: incomeVal,
        };

        setUser(updatedUser);

        await AsyncStorage.setItem(
          `@SyncPay:user_profile_${user.id}`,
          JSON.stringify({
            name: updatedUser.name,
            avatarUrl: cleanAvatar ?? null,
            monthlyIncome: updatedUser.monthlyIncome ?? null,
            updatedAt: nowTs,
          }),
        );

        if (isSupabaseConfigured && supabase) {
          try {
            // Fotos em base64 ficam apenas em public.profiles e AsyncStorage para não inflar o JWT
            const metadataAvatar =
              cleanAvatar && cleanAvatar.length <= MAX_METADATA_AVATAR_LEN ? cleanAvatar : null;

            await supabase.auth.updateUser({
              data: {
                name: updatedUser.name,
                display_name: updatedUser.name,
                avatar_url: metadataAvatar,
                monthly_income: updatedUser.monthlyIncome ?? null,
              },
            });

            await supabase
              .from('profiles')
              .upsert(
                {
                  id: user.id,
                  name: updatedUser.name,
                  avatar_url: cleanAvatar ?? null,
                  monthly_income: updatedUser.monthlyIncome ?? null,
                  updated_at: new Date(nowTs).toISOString(),
                },
                { onConflict: 'id' },
              );
          } catch (cloudErr) {
            console.log('[AuthContext] Perfil salvo localmente (nuvem offline):', cloudErr);
          }
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Erro ao atualizar perfil.' };
      }
    },
    [user],
  );

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
          const appUser = await enrichUserProfile(toLocalUser(activeUser));
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

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        isPasswordRecoveryRef.current = true;
        if (isMounted) {
          setIsPasswordRecovery(true);
        }
      }
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
      const cleanEmail = email.trim().toLowerCase();
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error || !data.user) {
          return {
            success: false,
            error: translateMobileAuthError(error?.message || 'Credenciais inválidas.'),
          };
        }

        isPasswordRecoveryRef.current = false;
        setIsPasswordRecovery(false);
        const appUser = await toAppUser(data.user);
        setUser(appUser);
        await checkOnboardingStatus(appUser.id);
        return { success: true };
      }

      if (!NotificationModule?.loginUser) {
        return { success: false, error: 'Módulo local indisponível.' };
      }

      const loggedUser: LocalUser = await NotificationModule.loginUser(cleanEmail, password);
      const appUser = toLocalUser(loggedUser);
      setUser(appUser);
      await checkOnboardingStatus(appUser.id);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? translateMobileAuthError(error.message)
            : 'Não foi possível entrar.',
      };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    monthlyIncome?: number,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: cleanName,
              name: cleanName,
              monthly_income: monthlyIncome !== undefined && monthlyIncome > 0 ? monthlyIncome : undefined,
            },
          },
        });
        if (error || !data.user) {
          return {
            success: false,
            error: translateMobileAuthError(error?.message || 'Não foi possível criar a conta.'),
          };
        }

        const appUser = await toAppUser(data.user);
        if (monthlyIncome !== undefined && monthlyIncome > 0) {
          appUser.monthlyIncome = monthlyIncome;
          await AsyncStorage.setItem(
            `@SyncPay:user_profile_${appUser.id}`,
            JSON.stringify({
              name: appUser.name,
              avatarUrl: appUser.avatarUrl ?? null,
              monthlyIncome,
              updatedAt: Date.now(),
            }),
          );
        }

        setUser(appUser);
        // Novo registro: garante que o onboarding é acionado
        await AsyncStorage.removeItem(`${ONBOARDING_STORAGE_PREFIX}${appUser.id}`);
        setHasCompletedOnboarding(false);
        return { success: true };
      }

      if (!NotificationModule?.registerUser) {
        return { success: false, error: 'Módulo local indisponível.' };
      }

      const newUser: LocalUser = await NotificationModule.registerUser(cleanName, cleanEmail, password);
      const appUser = toLocalUser(newUser);
      if (monthlyIncome !== undefined && monthlyIncome > 0) {
        appUser.monthlyIncome = monthlyIncome;
        await AsyncStorage.setItem(
          `@SyncPay:user_profile_${appUser.id}`,
          JSON.stringify({
            name: appUser.name,
            avatarUrl: appUser.avatarUrl ?? null,
            monthlyIncome,
            updatedAt: Date.now(),
          }),
        );
      }
      setUser(appUser);
      // Novo registro: garante que o onboarding é acionado
      await AsyncStorage.removeItem(`${ONBOARDING_STORAGE_PREFIX}${appUser.id}`);
      setHasCompletedOnboarding(false);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? translateMobileAuthError(error.message)
            : 'Não foi possível criar a conta.',
      };
    }
  };

  const requestPasswordResetCode = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Informe um e-mail cadastrado válido.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'O envio de código por e-mail requer conexão com o Supabase configurado.',
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        return { success: false, error: translateMobileAuthError(error.message) };
      }
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? translateMobileAuthError(error.message)
            : 'Falha ao enviar o código de recuperação.',
      };
    }
  };

  const verifyPasswordResetCode = async (
    email: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = normalizeOtpCode(code);

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }
    if (cleanCode.length < 6) {
      return { success: false, error: 'Digite o código numérico completo enviado para o seu e-mail.' };
    }
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Serviço de autenticação indisponível no modo offline.' };
    }

    isPasswordRecoveryRef.current = true;
    setIsPasswordRecovery(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery',
      });

      if (error || !data.session) {
        isPasswordRecoveryRef.current = false;
        setIsPasswordRecovery(false);
        return {
          success: false,
          error: translateMobileAuthError(error?.message || 'Código inválido ou expirado.'),
        };
      }

      return { success: true };
    } catch (error: unknown) {
      isPasswordRecoveryRef.current = false;
      setIsPasswordRecovery(false);
      return {
        success: false,
        error:
          error instanceof Error
            ? translateMobileAuthError(error.message)
            : 'Não foi possível validar o código.',
      };
    }
  };

  const completePasswordReset = async (
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Serviço de autenticação indisponível.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: translateMobileAuthError(error.message) };
      }

      await supabase.auth.signOut().catch(() => {});
      isPasswordRecoveryRef.current = false;
      setIsPasswordRecovery(false);
      setUser(null);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? translateMobileAuthError(error.message)
            : 'Erro ao atualizar a senha.',
      };
    }
  };

  const cancelPasswordRecovery = async () => {
    const wasRecovering = isPasswordRecoveryRef.current;
    isPasswordRecoveryRef.current = false;
    setIsPasswordRecovery(false);
    if (wasRecovering && isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      isPasswordRecoveryRef.current = false;
      setIsPasswordRecovery(false);
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
        isPasswordRecovery,
        hasCompletedOnboarding,
        completeOnboarding,
        resetOnboarding,
        updateUserProfile,
        login,
        register,
        requestPasswordResetCode,
        verifyPasswordResetCode,
        completePasswordReset,
        cancelPasswordRecovery,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
