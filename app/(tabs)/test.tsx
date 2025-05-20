const styles = {
  screenContainer: {
    flex: 1,
    backgroundColor: "#F7F7F7", // Um cinza muito claro para o fundo geral
  },

  scrollContentContainer: {
    paddingBottom: 20, // Espaço no final do scroll
  },

  header: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingHorizontal: 16,

    paddingTop: 55, // Mais padding no topo para Android, ajustado

    paddingBottom: 15,

    backgroundColor: "#FFFFFF",
  },

  headerIcon: {
    padding: 8,
  },

  addFriendsButtonText: {
    fontSize: 17,

    color: "#007AFF", // Cor de link padrão iOS

    fontWeight: "500",
  },

  summaryContainer: {
    paddingHorizontal: 16,

    paddingVertical: 20,

    backgroundColor: "#FFFFFF",

    borderBottomWidth: 1,

    borderTopWidth: 1, // Adicionado para separar do header

    borderColor: "#EFEFF4", // Linha separadora suave

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",
  },

  summaryText: {
    fontSize: 18,

    fontWeight: "600",

    color: "#1C1C1E",
  },

  filterIcon: {
    padding: 8,
  },

  friendItemContainer: {
    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 12,

    paddingHorizontal: 16,

    backgroundColor: "#FFFFFF",

    borderBottomWidth: 1,

    borderBottomColor: "#EFEFF4",
  },

  avatar: {
    width: 48,

    height: 48,

    borderRadius: 24,

    marginRight: 16,

    backgroundColor: "#E0E0E0", // Cor de fundo para o placeholder do avatar
  },

  friendInfo: {
    flex: 1,
  },

  friendName: {
    fontSize: 17,

    fontWeight: "500",

    color: "#1C1C1E",
  },

  friendBalance: {
    alignItems: "flex-end",
  },

  balanceText: {
    fontSize: 15,

    fontWeight: "500",
  },

  friendOwesMeColor: {
    // Amigo deve-me (saldo positivo para o amigo no meu ponto de vista)

    color: "#34C759", // Verde iOS
  },

  iOweFriendColor: {
    // Eu devo ao amigo (saldo negativo para o amigo no meu ponto de vista)

    color: "#FF3B30", // Vermelho iOS
  },

  settledColor: {
    color: "#8E8E93", // Cinza secundário iOS
  },

  emptyListText: {
    textAlign: "center",

    marginTop: 40,

    marginBottom: 20,

    fontSize: 16,

    color: "#8E8E93",

    paddingHorizontal: 20,
  },

  settledOptionsContainer: {
    paddingHorizontal: 16,

    paddingVertical: 20,

    backgroundColor: "transparent",

    marginTop: 10,
  },

  settledInfoText: {
    fontSize: 13,

    color: "#6D6D72",

    textAlign: "center",

    marginBottom: 15,

    lineHeight: 18,
  },

  showSettledButton: {
    borderWidth: 1,

    borderColor: "#007AFF",

    borderRadius: 8,

    paddingVertical: 12,

    paddingHorizontal: 15,

    alignItems: "center",

    backgroundColor: "#FFFFFF",
  },

  showSettledButtonText: {
    color: "#007AFF",

    fontSize: 16,

    fontWeight: "500",
  },
};
