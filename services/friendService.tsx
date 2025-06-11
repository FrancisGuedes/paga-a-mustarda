// services/friendsService.ts
import { mapSupabaseUserToUser } from "@/context/AuthContext";
import { supabase } from "../config/supabase"; // Ajuste o caminho se necessário
import type { User as supabaseUser } from "@supabase/supabase-js";

// Reutiliza a interface ContactItem que definiu em AddFriendFlowScreen
interface ContactItem {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string | null;
    phoneNumbers?: Array<{ number?: string; label: string; id: string }>;
}

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

/**
 * Adiciona uma lista de contactos como amigos de forma recíproca.
 * @param contactsToAdd - O array de objectos de contacto a adicionar.
 * @param currentUser - O objeto do utilizador autenticado atual.
 * @returns Um objeto com o resultado da operação.
 */
export const addFriendsReciprocally = async (
    contactsToAdd: ContactItem[],
    currentUser: AuthState["user"]
) => {
    if (!currentUser || contactsToAdd.length === 0) {
        return {
            success: false,
            error: new Error("Utilizador ou contactos em falta."),
        };
    }

    const user = currentUser; //mapSupabaseUserToUser(currentUser);
    
    const results = [];
    //console.log("[addFriendsReciprocally] A processar contactos:", contactsToAdd);
    for (const contact of contactsToAdd) {
        //console.log("[addFriendsReciprocally] contact:", contact);
        const contactEmail = contact.email;
        if (!contactEmail) {
            console.warn(`A ignorar contacto "${contact.name}" por não ter email.`);
            results.push({
                name: contact.name,
                status: "skipped",
                reason: "No email",
            });
            continue;
        }

        try {
            //console.log(`[addFriendsReciprocally][START] A processar ${contact.name} (${contactEmail})...`);

            // 1. Verificar se o amigo já é um utilizador da plataforma
            const { data: friendUser, error: friendUserError } = await supabase
                .from("profiles") // Assumindo que tem uma tabela 'profiles' com 'email'
                .select("id")
                .eq("email", contactEmail)
                .single();
            //console.log(`[addFriendsReciprocally][1] Verificar se o amigo já é um utilizador da plataforma | friendUser: ${friendUser}`);

            if (friendUserError && friendUserError.code !== "PGRST116") {
                // PGRST116: no rows found
                throw friendUserError;
            }

            const friendUserId = friendUser?.id || null;
            /* console.log(
                `[addFriendsReciprocally] O amigo ${contact.name} ${friendUserId
                    ? `já é um utilizador (ID: ${friendUserId})`
                    : "ainda não é um utilizador"
                }.`
            ); */

            // 2. Criar a amizade para o utilizador atual (A -> B)
            const conflictTarget = friendUserId ? 'user_id, registered_user_id' : 'user_id, email';

            /* const { data: updatedInvitation, error: insertError1 } = await supabase
                .from("friends")
                .upsert(
                    {
                        user_id: user.id,
                        name: contact.name,
                        phone_number: contact.phoneNumbers?.[0]?.number || null,
                        email: contactEmail,
                        registered_user_id: friendUserId,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: conflictTarget}
                )
                .select('id, user_id')
                .single(); */ // Usa upsert para evitar duplicados se o amigo já foi adicionado pelo email


            // 2.a. Verificar se já existe
            const conflictColumns = friendUserId 
            ? { user_id: user.id, registered_user_id: friendUserId }
            : { user_id: user.id, email: contactEmail, registered_user_id: null };

            const { data: existingFriend } = await supabase
                .from("friends")
                .select("id")
                .match(conflictColumns)
                .single();

            let updatedInvitationData;
            //console.log(`[addFriendsReciprocally][2.a.] Verificar se já existe amizade A -> B ${updatedInvitationData?.user_id}.`);

            if (existingFriend) {
                // 2.b. UPDATE se existe
                const { data: updatedInvitation, error: insertError1 } = await supabase
                .from("friends")
                .update({
                    name: contact.name,
                    phone_number: contact.phoneNumbers?.[0]?.number || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingFriend.id)
                .select('id, user_id')
                .single();
                updatedInvitationData = updatedInvitation;
                if (insertError1) throw insertError1;
                //console.log(`[addFriendsReciprocally][2.b. UPDATE] Amizade A -> B ${updatedInvitationData?.user_id}.`);

            } else {
            // 2.c INSERT se não existe
            const { data: updatedInvitation, error: insertError2 } = await supabase
                .from("friends")
                .insert({
                    user_id: user.id,
                    name: contact.name,
                    phone_number: contact.phoneNumbers?.[0]?.number || null,
                    email: contactEmail,
                    registered_user_id: friendUserId,
                    updated_at: new Date().toISOString(),
                })
                .select('id, user_id')
                .single();
                updatedInvitationData = updatedInvitation;
                if (insertError2) throw insertError2;
                //console.log(`[addFriendsReciprocally][2.c INSERT] Amizade A -> B ${updatedInvitationData}.`);
            }            
            
            if (!updatedInvitationData) {
                console.warn("[addFriendsReciprocally] Convite pendente não encontrado.");
            }

            // 3. Se o amigo já é um utilizador, criar a amizade recíproca (B -> A)
            //console.log(`[addFriendsReciprocally][3] Se o amigo já é um utilizador, criar a amizade recíproca (B -> A) | friendUserId: ${friendUserId}.`);
            if (friendUserId) {
                const inviterId = updatedInvitationData?.user_id; // ID do Utilizador A
                const originalFriendRecordId = updatedInvitationData?.id; // ID da linha de amizade A -> B

                // 3.a. Obter os dados do utilizador atual (A)
                const currentUserEmail = user.email;
                //console.log(`[addFriendsReciprocally][3.a.] (B -> A) Obter os dados do utilizador atual (A) | friendUserId: ${friendUserId}.`);

                const currentUserName =
                    user.displayName ||
                    currentUserEmail ||
                    "Um amigo";

                const { data: reciprocalFriendRecord, error: insertError2 } = await supabase
                    .from("friends")
                    .upsert(
                        {
                            user_id: friendUserId, // Dono: B
                            name: currentUserName, // O nome do amigo (do ponto de vista de B) é o do utilizador atual: A
                            email: currentUserEmail,
                            registered_user_id: user.id, // O amigo é o utilizador atual: A
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: "user_id, registered_user_id" }
                    )
                    .select('id, balance')
                    .single(); // Usa upsert para evitar duplicados

                if (insertError2) throw insertError2;
                //console.log(`[addFriendsReciprocally][3.a.] Amizade recíproca B -> A criada/atualizada para ${contact.name}.`);
                if (!reciprocalFriendRecord) 
                    throw new Error(`Falha ao criar/obter registo de amizade recíproco para: ${currentUserName}`);
                
                // 3.b. Encontrar todas as despesas existentes criadas por A com B
                const { data: existingExpenses, error: expensesError } = await supabase
                    .from('expenses')
                    .select('*')
                    .eq('user_id', inviterId)
                    .eq('friend_id', originalFriendRecordId);
                
                if (expensesError) throw expensesError;
                //console.log(`[addFriendsReciprocally][3.b.] Amizade recíproca B -> A | Encontrar todas as despesas existentes criadas por A com B ${existingExpenses}.`);
                

                if (existingExpenses && existingExpenses.length > 0) {
                   // console.log(`[addFriendsReciprocally][3.b.] Amizade recíproca B -> A | Encontradas ${existingExpenses.length} despesas para espelhar.`);
                    // 3c. Preparar as despesas espelhadas para o novo utilizador (B)
                    const mirroredExpenses = existingExpenses.map(exp => ({
                        user_id: friendUserId, // Dono: B
                        friend_id: reciprocalFriendRecord.id, // O amigo é o utilizador atual: A.id, // O ID da amizade B -> A
                        description: exp.description,
                        total_amount: exp.total_amount,
                        user_share: -exp.user_share, // INVERTE o user_share
                        date: exp.date,
                        paid_by_user: !exp.paid_by_user, // INVERTE quem pagou
                        split_option_id: exp.split_option_id,
                        category_icon: exp.category_icon,
                    }));
            
                    // Inserir todas as despesas espelhadas de uma vez
                    //console.log(`[addFriendsReciprocally][3.c.] Amizade recíproca B -> A | Inserir todas as despesas espelhadas de uma vez: ${mirroredExpenses}`);

                    const { error: insertMirroredError } = await supabase
                        .from('expenses')
                        .insert(mirroredExpenses);
            
                    if (insertMirroredError) throw insertMirroredError;
                    // 3d. Calcular o novo saldo para a amizade recíproca (B -> A)
                    // O saldo de B com A é simplesmente a soma invertida dos user_shares de A
                    const newBalanceForB = existingExpenses.reduce((acc, exp) => acc - exp.user_share, 0);
                    //console.log(`[addFriendsReciprocally][3.d.] Amizade recíproca B -> A | Calcular o novo saldo para a amizade recíproca (B -> A): ${newBalanceForB}`);

                    const { error: updateBalanceError } = await supabase
                        .from('friends')
                        .update({ balance: newBalanceForB })
                        .eq('id', reciprocalFriendRecord.id);

                    //console.log(`[addFriendsReciprocally][3.d.] Amizade recíproca B -> A | Saldo atualizado: ${newBalanceForB}`);

                    if (updateBalanceError) throw updateBalanceError;
                    //console.log(`[addFriendsReciprocally][END] Despesas espelhadas e saldo de ${newBalanceForB}€ atualizado para o novo utilizador.`);
                }
            }
            results.push({ name: contact.name, status: "success" });
        } catch (error: any) {
            console.error(`Erro ao adicionar o amigo ${contact.name}:`, error);
            results.push({
                name: contact.name,
                status: "failed",
                error: error.message,
            });
        }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failedCount = results.length - successCount;

    return { success: failedCount === 0, successCount, failedCount, results };
};
