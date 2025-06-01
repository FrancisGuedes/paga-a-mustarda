// app/add-friend-flow.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  FlatList,
  TextInput,
  Image,
  Linking,
  ActivityIndicator,
  ScrollView, // Adicionado para o loading inicial de permissão
} from "react-native";
import { Stack, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Contacts from "expo-contacts";
import { supabase } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";
import { transcode } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VERIFIED_CONTACTS_AFTER_REMOVAL_KEY } from "../verify-contacts";

interface ContactItem extends Contacts.Contact {
  isSelected?: boolean;
}

interface FriendContact {
  id: string;
  name: string; // Combinação de firstName e lastName
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumbers?: Array<{ number?: string; label: string; id: string }>;
  imageAvailable?: boolean;
  image?: { uri: string };
  isSelected?: boolean;
  contactType: Contacts.ContactTypes.Person | Contacts.ContactTypes.Company;
}

const MOCK_CONTACTS: FriendContact[] = [
  {
    id: "mock1",
    name: "Ana Silva (Mock)",
    firstName: "Ana",
    lastName: "Silva",
    email: "ana.silva@example.com",
    phoneNumbers: [{ id: "p1", label: "mobile", number: "+351912345678" }],
    imageAvailable: false,
    isSelected: false,
    contactType: Contacts.ContactTypes.Person,
  },
  {
    id: "mock2",
    name: "Bruno Costa (Mock)",
    firstName: "Bruno",
    lastName: "Costa",
    email: "bruno@example.com",
    imageAvailable: false,
    isSelected: false,
    contactType: Contacts.ContactTypes.Person,
  },
  {
    id: "mock3",
    name: "Carlos Dias (Mock)",
    firstName: "Carlos",
    lastName: "Dias",
    email: "carlos.dias@example.com",
    phoneNumbers: [{ id: "p2", label: "home", number: "+351212345678" }],
    imageAvailable: false,
    isSelected: false,
    contactType: Contacts.ContactTypes.Person,
  },
  {
    id: "mock4",
    name: "Daniela Pereira (Mock)",
    firstName: "Daniela",
    lastName: "Pereira",
    email: "daniela.pereira@example.com",
    imageAvailable: false,
    isSelected: false,
    contactType: Contacts.ContactTypes.Person,
  },
  {
    id: "mock5",
    name: "Zé Ninguém (Mock)",
    firstName: "Zé Ninguém",
    lastName: "Pereira",
    email: "ze.ninguem@example.com",
    imageAvailable: false,
    phoneNumbers: [{ id: "p3", label: "mobile", number: "+351999999999" }],
    isSelected: false,
    contactType: Contacts.ContactTypes.Person,
  },
];

// Variável para controlar o uso de dados mock (pode ser uma variável de ambiente ou estado)
const USE_MOCK_CONTACTS = true;

export default function AddFriendFlowScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [permissionStatus, setPermissionStatus] =
    useState<Contacts.PermissionStatus | null>(null);
  const [loadingInitialPermission, setLoadingInitialPermission] =
    useState(true); // Para o estado inicial de verificação
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactObjects, setSelectedContactObjects] = useState<ContactItem[]>([]);

  // Função para pedir permissão e carregar contactos se concedida
  const triggerPermissionRequestAndLoad = async () => {
    console.log(
      "A solicitar permissão de contactos (iniciado pelo utilizador)..."
    );
    setLoadingContacts(true); // Indica que estamos a processar o pedido/carregamento
    const { status } = await Contacts.requestPermissionsAsync(); // Mostra o diálogo do SO
    console.log("Resultado do pedido de permissão:", status);
    setPermissionStatus(status);
    if (status === Contacts.PermissionStatus.GRANTED) {
      console.log("Permissão concedida, a carregar contactos...");
      await loadContactsInternal(); // Carrega os contactos
    } else {
      console.log("Permissão negada ou não concedida.");
      // Opcional: Mostrar um alerta se foi negado explicitamente após o pedido
      if (status === "denied") {
        Alert.alert(
          "Permissão Negada",
          "Não podemos aceder aos seus contactos sem a sua permissão. Pode alterar isto nas definições da aplicação.",
          [
            { text: "Ok" },
            { text: "Abrir Definições", onPress: () => Linking.openSettings() },
          ]
        );
      }
      setLoadingContacts(false);
    }
  };

  // Função interna para carregar contactos (assume que a permissão foi concedida)
  const loadContactsInternal_z = async (resetSelectionState = false) => {
    if (USE_MOCK_CONTACTS) {
      const initialSelectedIds = selectedContactObjects.map((c) => c.id);
      const updatedMockContacts = MOCK_CONTACTS.map((c) => ({
        ...c,
        isSelected: initialSelectedIds.includes(c.id),
      }));
      setContacts(updatedMockContacts);
      setLoadingContacts(false);
      setLoadingInitialPermission(false);
      setPermissionStatus(Contacts.PermissionStatus.GRANTED);
      return;
    }
    setLoadingContacts(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.ImageAvailable,
          Contacts.Fields.Image,
          Contacts.Fields.ContactType,
        ],
      });
      if (data.length > 0) {
        const formattedContacts: ContactItem[] = data
          .filter(
            (c) =>
              c.firstName ||
              c.lastName ||
              (c.emails && c.emails.length > 0) ||
              (c.phoneNumbers && c.phoneNumbers.length > 0)
          )
          .map((c) => ({
            ...c,
            name:
              `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
              (c.emails && c.emails[0]?.email) ||
              (c.phoneNumbers && c.phoneNumbers[0]?.number) ||
              "Contacto Sem Nome",
            isSelected: false,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setContacts(formattedContacts);
      }
    } catch (error) {
      console.error("Erro ao carregar contactos:", error);
      Alert.alert("Erro", "Não foi possível carregar os contactos.");
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadContactsInternal = async (resetSelectionState = false) => {
    if (USE_MOCK_CONTACTS) {
      console.log(
        "A usar dados MOCK de contactos. Reset selection:",
        resetSelectionState
      );
      const initialMockContacts = MOCK_CONTACTS.map((c) => ({
        ...c,
        isSelected: resetSelectionState
          ? false
          : selectedContactObjects.find((sel) => sel.id === c.id)?.isSelected ||
            false,
      }));
      setContacts(initialMockContacts);
      setLoadingContacts(false);
      setLoadingInitialPermission(false);
      setPermissionStatus(Contacts.PermissionStatus.GRANTED);
      return;
    }
    console.log(
      "A carregar contactos reais. Reset selection:",
      resetSelectionState
    );
    setLoadingContacts(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.ImageAvailable,
          Contacts.Fields.Image,
          Contacts.Fields.ContactType,
        ],
      });
      if (data.length > 0) {
        const formattedContacts: ContactItem[] = data
          .filter(
            (c) =>
              c.firstName ||
              c.lastName ||
              (c.emails && c.emails.length > 0) ||
              (c.phoneNumbers && c.phoneNumbers.length > 0)
          )
          .map((c) => ({
            ...c,
            name:
              `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
              (c.emails && c.emails[0]?.email) ||
              (c.phoneNumbers && c.phoneNumbers[0]?.number) ||
              "Contacto Sem Nome",
            isSelected: resetSelectionState
              ? false
              : selectedContactObjects.find((sel) => sel.id === c.id)
                  ?.isSelected || false,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setContacts(formattedContacts);
      }
    } catch (error) {
      console.error("Erro ao carregar contactos:", error);
      Alert.alert("Erro", "Não foi possível carregar os contactos.");
    } finally {
      setLoadingContacts(false);
    }
  };

  // Verifica a permissão apenas ao montar
  useEffect(() => {
    const initialLoad = async () => {
      if (USE_MOCK_CONTACTS) {
        await loadContactsInternal(true);
        setSelectedContactObjects([]);
        return;
      }
      setLoadingInitialPermission(true);
      const { status: currentStatus } = await Contacts.getPermissionsAsync();
      setPermissionStatus(currentStatus);
      if (currentStatus === Contacts.PermissionStatus.GRANTED) {
        setLoadingContacts(true);
        await loadContactsInternal(true);
        setSelectedContactObjects([]);
      }
      setLoadingInitialPermission(false);
    };
    initialLoad();
  }, []);

  const handleNext = () => {
    if (selectedContactObjects.length === 0) {
      Alert.alert(
        "Nenhum contacto selecionado",
        "Selecione pelo menos um contacto."
      );
      return;
    }
    // Passa os dados dos contactos selecionados para o próximo ecrã
    // É melhor passar como string JSON se for complexo ou muitos dados
    const selectedContactsString = JSON.stringify(selectedContactObjects);
    router.push({
      pathname: "/verify-contacts", // Nova rota a ser criada
      params: { selectedContacts: selectedContactsString },
    });
  };

  useEffect(() => {
    navigation.setOptions({
      presentation: "modal",
      headerShown: true,
      title: "Adicionar amigos",
      headerTitleAlign: "center",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            setSelectedContactObjects([]);
            router.replace("/(tabs)");
          }}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>Cancelar</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleNext}
          style={styles.headerButton}
          disabled={selectedContactObjects.length === 0}
        >
          <Text
            style={[
              styles.headerButtonText,
              styles.headerButtonNext,
              selectedContactObjects.length === 0 &&
                styles.headerButtonDisabled,
            ]}
          >
            Próximo
          </Text>
        </TouchableOpacity>
      ),
      headerStyle: styles.headerStyle,
    });
  }, [navigation, router, selectedContactObjects.length]);

  const toggleContactSelection = (contactToToggle: ContactItem) => {
    setContacts((prevContacts) =>
      prevContacts.map((contact) =>
        contact.id === contactToToggle.id
          ? { ...contact, isSelected: !contact.isSelected }
          : contact
      )
    );
    setSelectedContactObjects((prevSelected) =>
      prevSelected.find((c) => c.id === contactToToggle.id)
        ? prevSelected.filter((c) => c.id !== contactToToggle.id)
        : [...prevSelected, contactToToggle]
    );
  };

  const filteredContacts_2 = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.firstName || ""} ${
      contact.lastName || ""
    }`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const renderSelectedContactChip = (contact: ContactItem) => (
    <View key={contact.id} style={styles.selectedContactChip}>
      {contact.imageAvailable && contact.image ? (
        <Image source={{ uri: contact.image.uri }} style={styles.chipAvatar} />
      ) : (
        <View style={styles.chipAvatarPlaceholder}>
          <Text style={styles.chipAvatarText}>
            {(contact.firstName ||
              contact.name.split(" ")[0] ||
              " ")[0].toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.chipName} numberOfLines={1}>
        {contact.firstName || contact.name.split(" ")[0]}
      </Text>
      <TouchableOpacity
        onPress={() => toggleContactSelection(contact)}
        style={styles.chipRemoveIcon}
      >
        <Ionicons name="close-circle" size={18} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );

  const renderContactItem = ({ item }: { item: ContactItem }) => (
    <TouchableOpacity
      onPress={() => toggleContactSelection(item)}
      style={styles.contactItem}
    >
      <View style={styles.contactInfo}>
        {item.imageAvailable && item.image ? (
          <Image
            source={{ uri: item.image.uri }}
            style={styles.contactAvatar}
          />
        ) : (
          <View style={styles.contactAvatarPlaceholder}>
            <Text style={styles.contactAvatarText}>
              {(item.firstName ||
                item.name.split(" ")[0] ||
                " ")[0].toUpperCase()}
              {(item.lastName ||
                item.name.split(" ")[1] ||
                " ")[0].toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.contactName}>{item.name}</Text>
      </View>
      <View
        style={[styles.checkbox, item.isSelected && styles.checkboxSelected]}
      >
        {item.isSelected && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );

  /* const renderContent = () => {
    if (loadingInitialPermission) {
      return (
        <View style={styles.centeredMessageContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (permissionStatus === "denied" || permissionStatus === "undetermined") {
      return (
        <View style={styles.centeredMessageContainer}>
          <Image
            source={require("../../assets/images/cat-icon.png")}
            style={styles.placeholderImage}
          />
          <Text style={styles.permissionMessage}>
            O Paga a Mustarda pode ajudá-lo a convidar novos amigos. Para o permitir,
            toque em "Permitir Acesso" ou vá a Definições e ative os Contactos.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={triggerPermissionRequestAndLoad}
          >
            <Text style={styles.settingsButtonText}>Permitir Acesso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.settingsButton,
              { marginTop: 10, backgroundColor: "#6c757d" },
            ]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsButtonText}>Abrir Definições</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (permissionStatus === "granted") {
      if (loadingContacts) {
        return (
          <View style={styles.centeredMessageContainer}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 10 }}>A carregar contactos...</Text>
          </View>
        );
      }
      return (
        <>
          <Text style={styles.contactsHeader}>Dos seus contactos</Text>
          <FlatList
            data={filteredContacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id!}
            ListEmptyComponent={
              <Text style={styles.noContactsText}>
                Nenhum contacto encontrado ou correspondente à pesquisa.
              </Text>
            }
          />
        </>
      );
    }

    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.permissionMessage}>
          Não foi possível obter o estado da permissão de contactos.
        </Text>
      </View>
    );
  }; */

  // Efeito para resetar seleções quando o ecrã ganha foco
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      console.log(
        "AddFriendFlowScreen GANHOU FOCO. A verificar VERIFIED_CONTACTS_AFTER_REMOVAL_KEY..."
      );
      setSearchQuery(""); // Sempre limpa a pesquisa ao focar

      try {
        const updatedVerifiedContactsJson = await AsyncStorage.getItem(
          VERIFIED_CONTACTS_AFTER_REMOVAL_KEY
        );
        if (updatedVerifiedContactsJson) {
          console.log(
            "Lista de verificados atualizada encontrada no AsyncStorage."
          );
          const updatedVerifiedContacts = JSON.parse(
            updatedVerifiedContactsJson
          ) as ContactItem[];
          setSelectedContactObjects(updatedVerifiedContacts); // Define os chips selecionados
          // Atualiza o estado 'isSelected' na lista principal 'contacts'
          setContacts((prevContacts) =>
            prevContacts.map((contact) => ({
              ...contact,
              isSelected: updatedVerifiedContacts.some(
                (sel) => sel.id === contact.id
              ),
            }))
          );
          await AsyncStorage.removeItem(VERIFIED_CONTACTS_AFTER_REMOVAL_KEY); // Limpa a chave
        } else {
          // Se não há sinal (ex: voltou com "Cancelar" ou é a primeira vez),
          // NÃO limpa selectedContactObjects. O reset inicial é feito no useEffect de montagem.
          console.log(
            "Nenhuma lista de verificados atualizada encontrada. Mantendo seleções atuais (se houver)."
          );
          setContacts((prevContacts) =>
            prevContacts.map((contact) => ({
              ...contact,
              isSelected: selectedContactObjects.some(
                (sel) => sel.id === contact.id
              ),
            }))
          );
        }
      } catch (e) {
        console.error("Erro ao ler VERIFIED_CONTACTS_AFTER_REMOVAL_KEY:", e);
      }
    });
    return unsubscribe;
  }, [navigation, selectedContactObjects]); 

  const renderContent = () => {
    if (
      !USE_MOCK_CONTACTS &&
      (loadingInitialPermission || permissionStatus === null)
    ) {
      return (
        <View style={styles.centeredMessageContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (
      !USE_MOCK_CONTACTS &&
      (permissionStatus === "denied" || permissionStatus === "undetermined")
    ) {
      return (
        <View style={styles.centeredMessageContainer}>
          <Image
            source={require("../../assets/images/cat-icon.png")}
            style={styles.placeholderImage}
          />
          <Text style={styles.permissionMessage}>
            O Paga a Mustarda pode ajudá-lo a convidar novos amigos. Para o
            permitir, toque em "Permitir Acesso" ou vá a Definições e ative os
            Contactos.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={triggerPermissionRequestAndLoad}
          >
            <Text style={styles.settingsButtonText}>Permitir Acesso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.settingsButton,
              { marginTop: 10, backgroundColor: "#6c757d" },
            ]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsButtonText}>Abrir Definições</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // Se USE_MOCK_CONTACTS é true, ou se a permissão foi concedida
    if (loadingContacts && !USE_MOCK_CONTACTS) {
      // Só mostra loading de contactos se não for mock e estiver a carregar
      return (
        <View style={styles.centeredMessageContainer}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>A carregar contactos...</Text>
        </View>
      );
    }
    return (
      <>
        <Text style={styles.contactsHeader}>
          Dos seus contactos {USE_MOCK_CONTACTS ? "(Mock)" : ""}
        </Text>
        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id!}
          ListEmptyComponent={
            <Text style={styles.noContactsText}>
              Nenhum contacto encontrado.
            </Text>
          }
        />
      </>
    );
  };

  return (
    <View style={[styles.screenContainer]}>
      <View style={styles.topSectionContainer}>
        {/* Barra de pesquisa AGORA ACIMA dos chips */}
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#8E8E93"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar nos contactos"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
            editable={
              (USE_MOCK_CONTACTS ||
                permissionStatus === Contacts.PermissionStatus.GRANTED) &&
              !loadingContacts
            }
          />
        </View>
        {/* ScrollView horizontal para os chips dos contactos selecionados, ABAIXO da pesquisa */}
        {selectedContactObjects.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedContactsScroll}
            contentContainerStyle={styles.selectedContactsContentContainer}
          >
            {selectedContactObjects.map(renderSelectedContactChip)}
          </ScrollView>
        )}
      </View>

      <View style={styles.addManuallyContainer}>
        <TouchableOpacity
          style={styles.addNewContactButton}
          onPress={() =>
            Alert.alert("Adicionar Novo", "Funcionalidade a implementar")
          }
        >
          <Ionicons
            name="person-add-outline"
            size={24}
            color="#007AFF"
            style={styles.addNewContactIcon}
          />
          <Text style={styles.addNewContactText}>
            Adicionar um novo contato
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contactsListArea}>{renderContent()}</View>
    </View>
  );
}

// ... (styles como antes)
const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: "#fff" },
  topSectionContainer: {
    // Container para os chips e a barra de pesquisa
    paddingHorizontal: 16,
    // paddingBottom: 5, // Pequeno espaço abaixo da barra de pesquisa
  },
  selectedContactsScroll: {
    maxHeight: 40, // Altura máxima para a linha de chips
    marginBottom: 20, // Espaço entre os chips e a barra de pesquisa
  },
  selectedContactsContentContainer: {
    alignItems: "center", // Alinha os chips verticalmente
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    paddingLeft: 10,
    height: 40,
    marginBottom: 30, // Espaço abaixo da barra de pesquisa
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: "#000",
    height: 40,
    paddingRight: 10,
  },
  selectedContactChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    height: 32,
  },
  chipAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 5 },
  chipAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 5,
    backgroundColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
  },
  chipAvatarText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  chipName: { fontSize: 14, color: "#333", marginRight: 4 },
  chipRemoveIcon: {
    /* marginLeft: 2, */
  },
  addManuallyContainer: {
    // Container para o botão "Adicionar um novo contacto"
    paddingHorizontal: 16,
    
  },
  addNewContactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  addNewContactIcon: { marginRight: 12 },
  addNewContactText: { fontSize: 17, color: "#007AFF", fontWeight: "500" },
  contactsListArea: {
    // Container para o renderContent (lista de contactos ou mensagem de permissão)
    flex: 1, // Para ocupar o espaço restante
  },
  // ... (restantes estilos como antes)
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerButton: { paddingHorizontal: 16, paddingVertical: 5 },
  headerButtonText: { color: "#007AFF", fontSize: 17 },
  headerButtonNext: { fontWeight: "600" },
  headerButtonDisabled: { color: "#BDBDBD" },
  headerStyle: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: 'transparent',
    shadowColor: 'transparent',
  },
  searchIcon: { marginRight: 8 },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: 20,
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  settingsButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  settingsButtonText: { color: "#fff", fontSize: 17, fontWeight: "500" },
  contactsHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#F7F7F7",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
  },
  contactInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  contactAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  contactName: { fontSize: 17, color: "#000" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#C7C7CC",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  noContactsText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    color: "gray",
  },
});