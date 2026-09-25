import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NativeModules } from 'react-native';

const { NotificationModule } = NativeModules;

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkActiveSession = useCallback(async () => {
    try {
      if (NotificationModule?.getActiveUser) {
        const activeUser: User | null = await NotificationModule.getActiveUser();
        if (activeUser && activeUser.id) {
          setUser(activeUser);
        }
      }
    } catch (e) {
      console.log('Sem sessão ativa');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!NotificationModule?.loginUser) {
        return { success: false, error: 'Módulo nativo não disponível.' };
      }
      const loggedUser: User = await NotificationModule.loginUser(email, password);
      setUser(loggedUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao autenticar.' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!NotificationModule?.registerUser) {
        return { success: false, error: 'Módulo nativo não disponível.' };
      }
      const newUser: User = await NotificationModule.registerUser(name, email, password);
      setUser(newUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao registrar usuário.' };
    }
  };

  const logout = async () => {
    try {
      if (NotificationModule?.logoutUser) {
        await NotificationModule.logoutUser();
      }
    } catch (e) {
      console.error('Erro ao deslogar:', e);
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