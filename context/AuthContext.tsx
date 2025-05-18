// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Definição do tipo para o utilizador mock
// Pode expandir isto conforme necessário
export interface User {
  id: string;
  email: string | null;
  displayName?: string | null;
  // Adicione outros campos mock se precisar
}

// Definição do tipo para o estado da autenticação
export interface AuthState {
  user: User | null;
  isLoading: boolean; // Para o estado inicial de carregamento da sessão e durante operações
  error: string | null; // Para mensagens de erro
}

// Definição do tipo para o valor do contexto
interface AuthContextProps {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const USER_SESSION_KEY = 'paga_a_mostarda_mock_user_session';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authInternal, setAuthInternal] = useState<AuthState>({
    user: null,
    isLoading: true, // Começa como true para verificar a sessão
    error: null,
  });

  // Carregar a sessão mock ao iniciar
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const storedUserJson = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (storedUserJson) {
          const storedUser = JSON.parse(storedUserJson) as User;
          setAuthInternal({ user: storedUser, isLoading: false, error: null });
        } else {
          setAuthInternal({ user: null, isLoading: false, error: null });
        }
      } catch (e) {
        console.error("Falha ao carregar sessão mock do AsyncStorage", e);
        setAuthInternal({ user: null, isLoading: false, error: null });
      }
    };

    loadStoredSession();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthInternal(prev => ({ ...prev, isLoading: true, error: null }));
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        // Simulação de validação
        if (email === 'teste@exemplo.com' && password === 'password') {
          const mockUser: User = {
            id: 'mock-user-123',
            email: email,
            displayName: email.split('@')[0] || 'Utilizador Teste',
          };
          try {
            await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(mockUser));
            setAuthInternal({ user: mockUser, isLoading: false, error: null });
            Alert.alert('Login Mock', 'Login efetuado com sucesso!');
            resolve();
          } catch (e) {
            console.error("Falha ao guardar sessão mock", e);
            setAuthInternal(prev => ({ ...prev, isLoading: false, error: 'Erro ao guardar sessão.' }));
            reject(new Error('Erro ao guardar sessão.'));
          }
        } else {
          const errorMsg = 'Email ou password inválidos (mock).';
          setAuthInternal(prev => ({ ...prev, isLoading: false, error: errorMsg }));
          Alert.alert('Erro de Login Mock', errorMsg);
          reject(new Error(errorMsg));
        }
      }, 1000); // Simula um delay de rede
    });
  };

  const loginWithGoogle = async () => {
    setAuthInternal(prev => ({ ...prev, isLoading: true, error: null }));
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        const mockUser: User = {
          id: 'mock-google-user-456',
          email: 'google.user@exemplo.com',
          displayName: 'Utilizador Google Mock',
        };
        try {
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(mockUser));
          setAuthInternal({ user: mockUser, isLoading: false, error: null });
          Alert.alert('Login Google Mock', 'Login com Google efetuado com sucesso!');
          resolve();
        } catch (e) {
          console.error("Falha ao guardar sessão mock Google", e);
          setAuthInternal(prev => ({ ...prev, isLoading: false, error: 'Erro ao guardar sessão Google.' }));
          resolve(); // Resolve mesmo com erro de storage para não bloquear UI
        }
      }, 1500);
    });
  };

  const register = async (email: string, password: string, displayName?: string) => {
    setAuthInternal(prev => ({ ...prev, isLoading: true, error: null }));
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        const mockUser: User = {
          id: `mock-user-${Date.now()}`,
          email: email,
          displayName: displayName || email.split('@')[0],
        };
        try {
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(mockUser));
          setAuthInternal({ user: mockUser, isLoading: false, error: null });
          Alert.alert('Registo Mock', 'Conta registada com sucesso!');
          resolve();
        } catch (e) {
          console.error("Falha ao guardar sessão mock registo", e);
          setAuthInternal(prev => ({ ...prev, isLoading: false, error: 'Erro ao guardar sessão de registo.' }));
          resolve();
        }
      }, 1000);
    });
  };

  const logout = async () => {
    setAuthInternal(prev => ({ ...prev, isLoading: true, error: null }));
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          await AsyncStorage.removeItem(USER_SESSION_KEY);
          setAuthInternal({ user: null, isLoading: false, error: null });
          Alert.alert('Logout Mock', 'Logout efetuado com sucesso!');
          resolve();
        } catch (e) {
          console.error("Falha ao remover sessão mock", e);
          // Mesmo com erro ao remover, desloga o utilizador da UI
          setAuthInternal({ user: null, isLoading: false, error: 'Erro ao limpar sessão, mas deslogado.' });
          resolve();
        }
      }, 500);
    });
  };

  return (
    <AuthContext.Provider value={{ auth: authInternal, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
