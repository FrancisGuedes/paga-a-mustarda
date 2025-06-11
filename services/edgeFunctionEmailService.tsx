// services/edgeFunctionEmailService.ts
import { supabase } from "../config/supabase"; // Ajuste o caminho para a sua configuração do Supabase
import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Define a estrutura de uma resposta bem-sucedida ou com erro da invocação da função.
 */
interface InvokeResult {
    success: boolean;
    data: any | null; // O corpo da resposta em caso de sucesso
    error: {
        message: string;
        status?: number; // O código de status HTTP, se disponível
        context?: any; // O objeto de erro completo para depuração
    } | null;
}

/**
 * Invoca uma Supabase Edge Function com tratamento de erros e logging consistentes.
 *
 * @param functionName O nome da Edge Function a ser invocada (ex: 'invite-friend-email').
 * @param body O payload (objeto) a ser enviado no corpo do pedido.
 * @returns Um objeto `InvokeResult` com o resultado da operação.
 */
export const invokeEdgeFunction = async (
        functionName: string,
        body: { [key: string]: any }
    ): Promise<InvokeResult> => {
        //console.log(`[invokeEdgeFunction] A invocar a Edge Function '${functionName}' com o payload:`, body);

    try {
        // Tenta invocar a função
        const { data, error } = await supabase
            .functions
            .invoke(functionName, { body});

        // Se o Supabase client retornar um erro, lança-o para o bloco catch
        if (error) {
            throw error;
        }

        // Se a chamada for bem-sucedida (status 2xx), retorna os dados
        //console.log(`[invokeEdgeFunction] Função '${functionName}' invocada com sucesso. Resposta:`, data);
        return { 
            success: true, 
            data, 
            error: null 
        };
    } catch (error: any) {
        let statusCode: number | undefined;
        let errorMessage = error.message || "Ocorreu um erro desconhecido.";
        let errorContext = error;

        // Se o erro for uma instância de FunctionsHttpError, podemos extrair mais detalhes
        if (error instanceof FunctionsHttpError) {
            statusCode = error.context.status;
            try {
                // O corpo do erro enviado pela sua função está frequentemente em context.json()
                const bodyAsJson = await error.context.json();
                // A mensagem de erro da sua função pode estar numa propriedade 'error' ou 'message'
                errorMessage = bodyAsJson?.error || bodyAsJson?.message || errorMessage;
                errorContext = bodyAsJson;
            } catch (e) {
                // Ignora se o corpo do erro não for JSON
                console.warn("Não foi possível fazer o parse do corpo do erro da Edge Function como JSON.");
            }
        }

        console.error(`Erro ao invocar '${functionName}'. Status: ${statusCode || "N/A"}, Mensagem: ${errorMessage}`, errorContext);

        // Retorna um objeto de erro estruturado
        return {
            success: false,
            data: null,
            error: {
                message: errorMessage,
                status: statusCode,
                context: errorContext,
            },
        };
    }
};
