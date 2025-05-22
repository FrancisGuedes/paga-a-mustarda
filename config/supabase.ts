    import "react-native-url-polyfill/auto";
    import { AppState } from 'react-native'
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import { createClient } from '@supabase/supabase-js';

    const supabaseUrl = "https://ncvlubknpixgudajyhoy.supabase.co" //process.env.EXPO_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdmx1YmtucGl4Z3VkYWp5aG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMzI2MTYsImV4cCI6MjA2MjkwODYxNn0.usY9DtWoBfuD47v_FYqzyGVhu1AzENLGKJ2rXXr6gGY" //process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error(
        'Supabase URL ou Anon Key não estão definidos. Verifique as suas variáveis de ambiente ou o ficheiro de configuração.'
        );
    }

    export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
            storage: AsyncStorage, // Usa AsyncStorage para guardar a sessão (útil quando integrar auth)
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    });
    
// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})