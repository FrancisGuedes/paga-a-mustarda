// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from '../config/supabase'; // Ajuste o caminho conforme necessário

export interface User {
  id: string;
  email: string | null;
  displayName?: string | null;
  avatar_url?: string | null;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
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

// Função para converter User do Supabase para o nosso formato
export const mapSupabaseUserToUser = (supabaseUser: SupabaseUser): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    displayName: supabaseUser.user_metadata?.display_name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.email?.split('@')[0] ||
      'Utilizador',
    avatar_url: supabaseUser.user_metadata?.avatar_url || null,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authInternal, setAuthInternal] = useState<AuthState>({
    user: null,
    isLoading: true, // Começa como true para verificar a sessão
    error: null,
  });

  // Carregar a sessão mock ao iniciar
  /*  useEffect(() => {
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
  }, []); */

  // Carregar sessão do Supabase ao iniciar
  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Erro ao carregar sessão:", error.message);
        setAuthInternal({ user: null, isLoading: false, error: error.message });
        return;
      }

      const user = session?.user ? mapSupabaseUserToUser(session.user) : null;
      setAuthInternal({ user, isLoading: false, error: null });
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      const user = session?.user ? mapSupabaseUserToUser(session.user) : null;
      setAuthInternal({ user, isLoading: false, error: null });
    });

    return () => subscription.unsubscribe();
  }, []);

  /* const login = async (email: string, password: string) => {
    setAuthInternal((prev) => ({ ...prev, isLoading: true, error: null }));
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        // Simulação de validação
        console.log("Tentativa de login com:", { email, password });
        if (email === "test@test.com" && password === "1234") {
          console.log("Validado login com:", { email, password });
          const mockUser: User = {
            id: "04b170f9-794c-4f64-8d46-c9fa3c31a382",
            email: email,
            displayName: email.split("@")[0] || "Utilizador Teste",
          };
          try {
            await AsyncStorage.setItem(
              USER_SESSION_KEY,
              JSON.stringify(mockUser)
            );
            setAuthInternal({ user: mockUser, isLoading: false, error: null });
            Alert.alert("Login Mock", "Login efetuado com sucesso!");
            resolve();
          } catch (e) {
            console.error("Falha ao guardar sessão mock", e);
            setAuthInternal((prev) => ({
              ...prev,
              isLoading: false,
              error: "Erro ao guardar sessão.",
            }));
            reject(new Error("Erro ao guardar sessão."));
          }
        } else {
          console.log("NAO Validado login com:", { email, password });
          const errorMsg = "Email ou password inválidos (mock).";
          setAuthInternal((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMsg,
          }));
          Alert.alert("Erro de Login Mock", errorMsg);
          reject(new Error(errorMsg));
        }
      }, 1000); // Simula um delay de rede
    });
  }; */

  const login = async (email: string, password: string) => {
    setAuthInternal((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const errorMsg =
          error.message === "Invalid login credentials"
            ? "Email ou password inválidos."
            : error.message;

        setAuthInternal((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
        Alert.alert("Erro de Login", errorMsg);
        throw new Error(errorMsg);
      }

      if (data.user) {
        // O estado será atualizado automaticamente pelo onAuthStateChange
        Alert.alert("Login", "Login efetuado com sucesso!");
      }
    } catch (error) {
      setAuthInternal((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setAuthInternal((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "your-app-scheme://auth/callback", // Configure conforme necessário
        },
      });

      if (error) {
        setAuthInternal((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
        Alert.alert("Erro", error.message);
        throw new Error(error.message);
      }

      Alert.alert("Login Google", "Redirecionando para Google...");
    } catch (error) {
      setAuthInternal((prev) => ({ ...prev, isLoading: false }));
      // Para desenvolvimento, vamos usar um fallback mock
      Alert.alert(
        "Em desenvolvimento",
        "Login com Google será implementado em breve"
      );
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    setAuthInternal((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      /* console.log("[register] Tentativa de registo com:", {
        email,
        password,
        displayName,
      }); */
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName,
            full_name: displayName,
          },
        },
      });
      //console.log("[REGISTER] Resultado do registo data:", data);

      if (error) {
        const errorMsg =
          error.message === "User already registered"
            ? "Este email já está registado."
            : error.message;

        setAuthInternal((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
        Alert.alert("Erro de Registo", errorMsg);
        throw new Error(errorMsg);
      }

      if (data.user && !data.session) {
        // Utilizador criado mas precisa confirmar email
        setAuthInternal((prev) => ({ ...prev, isLoading: false }));
        Alert.alert(
          "Verifique o seu email",
          "Foi enviado um link de confirmação para o seu email. Por favor, clique no link para ativar a sua conta."
        );
      } else if (data.session) {
        // Utilizador criado e logado automaticamente
        Alert.alert("Registo", "Conta registada com sucesso!");
      }

      if (data.user) {
        // [START] Registo de user na tabela PROFILES
        const { error: insertError1 } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            full_name: displayName,
            email: email,
            phone_number: data.user.phone,
          });
        // [END] Registo de user na tabela FRIENDS

        if (insertError1) throw insertError1;
        //console.log(`[REGISTER] Tabela profiles inserida para ${displayName}.`);

        // [START] Registo de user na tabela FRIENDS: A -> B
        /* const bodyPayload = {
          email: data.user.email, // O email do amigo que está a ser convidado
          registered_user_id: data.user.id,
        }; */

        //console.log("[REGISTER] invocar link-invitations");
        const { data: functionResponse, error: functionError } =
          await supabase
            .functions
            .invoke("link-invitations")
            .catch((err) => {
              console.error(
                `Erro ao invocar função 'link-invitations' para ${email}:`,
                err
              );
              throw new Error(
                `Erro ao invocar função 'link-invitations' para ${email}: ${err.message}`
              );
          });
        //console.log("[REGISTER] response:", functionResponse);
        if (functionError) {
          console.error("Erro ao tentar associar convites de amigos:", functionError.message);
          // TODO: NAO enviar email!
        }
        // [END] Registo de user na tabela FRIENDS
      }

      // [START] Envio de email de boas-vindas
      const bodyPayload = {
        toEmail: email,
        toName: displayName || email.split("@")[0] || "Utilizador",
        nome: displayName,
        link: "https://www.google.com", // TODO: alterar para APP
      };

      /* console.log(
        `A invocar função 'invitation-email' com payload:`,
        bodyPayload
      ); */

      await supabase.functions
        .invoke("welcome-register-email", {
          body: bodyPayload,
        })
        .catch((err) => {
          console.error(
            `Erro ao invocar função 'welcome-register-email' para ${email}:`,
            err
          );
          throw new Error(
            `Erro ao invocar função 'welcome-register-email' para ${email}: ${err.message}`
          );
        });
      // [END] Envio de email de boas-vindas
    } catch (error) {
      setAuthInternal((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  /* const logout = async () => {
    setAuthInternal((prev) => ({ ...prev, isLoading: true, error: null }));
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          await AsyncStorage.removeItem(USER_SESSION_KEY);
          setAuthInternal({ user: null, isLoading: false, error: null });
          Alert.alert("Logout Mock", "Logout efetuado com sucesso!");
          resolve();
        } catch (e) {
          console.error("Falha ao remover sessão mock", e);
          // Mesmo com erro ao remover, desloga o utilizador da UI
          setAuthInternal({
            user: null,
            isLoading: false,
            error: "Erro ao limpar sessão, mas deslogado.",
          });
          resolve();
        }
      }, 500);
    });
  }; */

  const logout = async () => {
    setAuthInternal((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthInternal((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
        Alert.alert("Erro", error.message);
        throw new Error(error.message);
      }

      // O estado será atualizado automaticamente pelo onAuthStateChange
      Alert.alert("Logout", "Logout efetuado com sucesso!");
    } catch (error) {
      setAuthInternal((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ auth: authInternal, login, loginWithGoogle, register, logout }}
    >
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
