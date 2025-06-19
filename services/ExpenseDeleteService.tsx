// services/ExpenseDeleteService.ts
import { supabase } from "../config/supabase";

export interface DeleteExpenseParams {
    expenseId: string;
    expenseUserShare: number;
    friendId: string;
    userId: string;
}

export interface ExpenseDeleteResult {
    success: boolean;
    error?: string;
    data?: {
        balanceA?: number;
        balanceB?: number;
    };
}

export class ExpenseDeleteService {
    /**
     * Método principal para deletar uma despesa
     * Verifica se o amigo está registado e chama o método apropriado
     */
    static async deleteExpense(
        params: DeleteExpenseParams
    ): Promise<ExpenseDeleteResult> {
        try {
        console.log(
            "[ExpenseDeleteService] Iniciando delete da despesa:",
            params.expenseId
        );

        // Verificar se o amigo está registado
        const { data: friendData, error: friendDataError } = await supabase
            .from("friends")
            .select("id, registered_user_id")
            .eq("user_id", params.userId)
            .eq("id", params.friendId)
            .single();

        if (friendDataError) {
            return { success: false, error: friendDataError.message };
        }

        const isRegistered = friendData?.registered_user_id !== null;

        if (isRegistered) {
            return await this.deleteBidirectionalExpense(params, friendData);
        } else {
            return await this.deleteUnidirectionalExpense(params);
        }
        } catch (error: any) {
        console.error("[ExpenseDeleteService] Erro no delete:", error);
        return { success: false, error: error.message };
        }
    }

    /**
     * Delete bidirecional usando Edge Function
     */
    private static async deleteBidirectionalExpense(
        params: DeleteExpenseParams,
        friendData: { id: any; registered_user_id: any }
    ): Promise<ExpenseDeleteResult> {
        try {
        console.log(
            "[ExpenseDeleteService] Delete bidirecional - usando Edge Function"
        );

        // Encontrar amizade recíproca
        const { data: reciprocalFriend } = await supabase
            .from("friends")
            .select("id")
            .eq("user_id", friendData.registered_user_id)
            .eq("registered_user_id", params.userId)
            .single();

        // Chamar Edge Function
        const { data, error } = await supabase.functions.invoke(
            "delete-bidirectional-expense",
            {
            body: {
                expenseId: params.expenseId,
                expenseUserShare: params.expenseUserShare,
                friendData: {
                id: friendData.id,
                registered_user_id: friendData.registered_user_id,
                },
                reciprocalFriendId: reciprocalFriend?.id,
            },
            }
        );

        if (error) {
            console.error("[ExpenseDeleteService] Erro na Edge Function:", error);
            return {
            success: false,
            error: "Não foi possível eliminar a despesa bidirecional.",
            };
        }

        console.log(
            "[ExpenseDeleteService] Delete bidirecional concluído:",
            data
        );
        return {
            success: true,
            data: {
            balanceA: data?.data?.balanceA,
            balanceB: data?.data?.balanceB,
            },
        };
        } catch (error: any) {
        console.error(
            "[ExpenseDeleteService] Erro no delete bidirecional:",
            error
        );
        return { success: false, error: error.message };
        }
    }

    /**
     * Delete unidirecional (amigo não registado)
     */
    private static async deleteUnidirectionalExpense(
        params: DeleteExpenseParams
    ): Promise<ExpenseDeleteResult> {
        try {
        console.log(
            "[ExpenseDeleteService] Delete unidirecional - amigo não registado"
        );

        // 1. Eliminar a despesa
        const { error: deleteError } = await supabase
            .from("expenses")
            .delete()
            .eq("id", params.expenseId)
            .eq("user_id", params.userId);

        if (deleteError) {
            console.error(
            "[ExpenseDeleteService] Erro ao eliminar despesa:",
            deleteError
            );
            return {
            success: false,
            error: "Não foi possível eliminar a despesa.",
            };
        }

        // 2. Atualizar saldo do amigo
        const { data: friendData, error: friendFetchError } = await supabase
            .from("friends")
            .select("balance")
            .eq("user_id", params.userId)
            .eq("id", params.friendId)
            .single();

        if (friendFetchError && friendFetchError.code !== "PGRST116") {
            return { success: false, error: friendFetchError.message };
        }

        const currentFriendBalance = friendData?.balance || 0;
        const newFriendBalance = currentFriendBalance - params.expenseUserShare;

        const { error: friendUpdateError } = await supabase
            .from("friends")
            .update({
            balance: newFriendBalance,
            updated_at: new Date().toISOString(),
            })
            .eq("user_id", params.userId)
            .eq("id", params.friendId);

        if (friendUpdateError) {
            return { success: false, error: friendUpdateError.message };
        }

        console.log(
            "[ExpenseDeleteService] Saldo atualizado para:",
            newFriendBalance
        );
        return {
            success: true,
            data: { balanceA: newFriendBalance },
        };
        } catch (error: any) {
        console.error(
            "[ExpenseDeleteService] Erro no delete unidirecional:",
            error
        );
        return { success: false, error: error.message };
        }
    }
}
