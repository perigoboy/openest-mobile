// T043 — UI do chat · T045 — mensagens em tempo real (Socket.IO)
// T046 — indicador de "digitando…" (eventos typing_start/typing_stop do backend)
// T049 — também é aberto por Deep Link a partir de uma notificação
// (openest://chat/<conversationId>), recebendo só o id da conversa.
//
// Visual estilo WhatsApp: cabeçalho compacto, fundo com textura sutil,
// balões agrupados com cantos assimétricos, separador de dias, barra de
// digitação arredondada e gavetas (bottom sheets) para anexos e ações.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Clipboard from "expo-clipboard";
import { Avatar, useToast } from "../../components";
import { ActionSheet } from "../../components/BottomSheet";
import ImagePreviewModal from "../../components/ImagePreviewModal";
import { ViewOnceCard, ViewOnceViewer } from "../../components/ViewOnce";
import ChatWallpaper from "../../components/ChatWallpaper";
import GifPickerModal from "../../components/GifPickerModal";
import ScheduleModal from "../../components/ScheduleModal";
import InviteCard from "../../components/InviteCard";
import { radius, spacing, typography } from "../../styles/theme";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { blockUser } from "../../services/block";
import { findConversationContact, findConversationWithUser } from "../../services/conversations";
import { pickImage } from "../../services/imageSource";
import {
  clearActiveConversation,
  setActiveConversation,
} from "../../services/activeConversation";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../hooks/useChat";
import { MESSAGE_STATUS, messagePreviewLabel } from "../../utils/chatMessages";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { tapLight } from "../../utils/haptics";

const DEFAULT_CONTACT_NAME = "Conversa";
const DELETED_TEXT = "🚫 Mensagem apagada";
// Mensagens do mesmo autor com até este intervalo formam um "grupo" visual.
const GROUP_WINDOW_MS = 5 * 60 * 1000;
// Fechar uma gaveta e abrir a câmera/galeria no mesmo instante falha no iOS
// (o sistema ainda está dispensando o modal). Espera a animação terminar.
const SHEET_CLOSE_DELAY_MS = Platform.OS === "ios" ? 350 : 0;

// ── Utilitários de agrupamento / datas ──────────────────────────────────
function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a, b) {
  return (
    !!a && !!b &&
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function dayLabel(date, now = new Date()) {
  if (!date) return "";
  if (sameDay(date, now)) return "Hoje";
  const ontem = new Date(now);
  ontem.setDate(now.getDate() - 1);
  if (sameDay(date, ontem)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// A lista é invertida (mais nova primeiro): a mensagem "de cima" na tela é a
// próxima do array.
function groupingFor(messages, index) {
  const current = messages[index];
  const above = messages[index + 1];
  const curDate = toDate(current?.createdAt);
  const aboveDate = toDate(above?.createdAt);
  const newDay = !above || !sameDay(curDate, aboveDate);
  const joined =
    !!above && !newDay && above.isMine === current.isMine &&
    !!curDate && !!aboveDate && Math.abs(curDate - aboveDate) <= GROUP_WINDOW_MS;
  return { showDay: newDay && !!curDate, joinedWithAbove: joined };
}

// ── Checks de status ────────────────────────────────────────────────────
// 1 check = enviada · 2 checks cinzas = entregue · 2 checks AZUIS = lida.
// Os azuis só aparecem quando NINGUÉM está em Modo Discreto (regra aplicada
// no servidor, que nunca manda status `read` nesse caso).
function MessageStatusIcon({ status }) {
  const { colors } = useTheme();
  if (status === MESSAGE_STATUS.PENDING) {
    return <Ionicons name="time-outline" size={13} color={colors.tick} accessibilityLabel="Enviando" testID="tick-pending" />;
  }
  if (status === MESSAGE_STATUS.FAILED) {
    return <Ionicons name="alert-circle" size={14} color={colors.dangerLight} accessibilityLabel="Falha no envio" testID="tick-failed" />;
  }
  if (status === MESSAGE_STATUS.READ) {
    return <Ionicons name="checkmark-done" size={15} color={colors.readTick} accessibilityLabel="Visualizada" testID="tick-read" />;
  }
  if (status === MESSAGE_STATUS.DELIVERED) {
    return <Ionicons name="checkmark-done" size={15} color={colors.tick} accessibilityLabel="Entregue" testID="tick-delivered" />;
  }
  return <Ionicons name="checkmark" size={15} color={colors.tick} accessibilityLabel="Enviada" testID="tick-sent" />;
}

function MessageMeta({ message, overlay = false }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.meta, overlay && styles.metaOverlay]}>
      <Text style={[styles.metaTime, message.isMine ? styles.metaTimeSent : styles.metaTimeReceived, overlay && styles.metaTimeOverlay]}>
        {message.time}
      </Text>
      {message.isMine ? <MessageStatusIcon status={message.status} /> : null}
    </View>
  );
}

function ReplyQuote({ replyTo, isMine }) {
  const styles = useThemedStyles(createStyles);
  if (!replyTo?.content) return null;
  return (
    <View style={[styles.quote, isMine ? styles.quoteSent : styles.quoteReceived]}>
      <Text style={[styles.quoteSender, isMine && styles.quoteSenderSent]} numberOfLines={1}>
        {replyTo.sender === "Você" ? "Você" : replyTo.sender || "Mensagem"}
      </Text>
      <Text style={[styles.quoteText, isMine && styles.quoteTextSent]} numberOfLines={2}>
        {replyTo.content}
      </Text>
    </View>
  );
}

function LocationCard({ location, isMine }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      testID="chat-location-card"
      style={styles.locationCard}
      onPress={() => location.mapsUrl && Linking.openURL(location.mapsUrl)}
      accessibilityRole="button"
      accessibilityLabel="Abrir localização no mapa"
    >
      <View style={[styles.locationIcon, isMine && styles.locationIconSent]}>
        <Ionicons name="location" size={20} color={isMine ? colors.bubbleSent : colors.onPrimary} />
      </View>
      <View style={styles.locationTexts}>
        <Text style={[styles.locationTitle, isMine && styles.textSent]}>Localização</Text>
        <Text style={[styles.locationLink, isMine && styles.metaTimeSent]}>Ver no mapa</Text>
      </View>
    </Pressable>
  );
}

function DayChip({ date }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.dayChipRow} accessibilityRole="header">
      <Text style={styles.dayChip}>{dayLabel(date)}</Text>
    </View>
  );
}

function MessageBubble({
  message,
  grouping,
  imageSize,
  onRetry,
  onLongPress,
  onInviteRespond,
  responding,
  onOpenViewOnce,
  openingViewOnceId,
}) {
  const styles = useThemedStyles(createStyles);
  const failed = message.status === MESSAGE_STATUS.FAILED;
  const deleted = message.text === DELETED_TEXT;
  const mine = message.isMine;
  const tail = !grouping.joinedWithAbove;

  let body;
  if (deleted) {
    body = (
      <View style={styles.inlineRow}>
        <View style={styles.deletedRow}>
          <Ionicons name="ban-outline" size={15} color={mine ? styles.metaTimeSent.color : styles.metaTimeReceived.color} />
          <Text style={[styles.messageText, styles.deletedText, mine ? styles.metaTimeSent : styles.metaTimeReceived]}>
            Mensagem apagada
          </Text>
        </View>
        <MessageMeta message={message} />
      </View>
    );
  } else if (message.isViewOnce) {
    body = (
      <View style={styles.inlineRow}>
        <ViewOnceCard
          message={message}
          tone={mine ? "sent" : "received"}
          opening={openingViewOnceId === message.id}
          onOpen={onOpenViewOnce}
        />
        <MessageMeta message={message} />
      </View>
    );
  } else if (message.invite) {
    body = (
      <>
        <InviteCard
          invite={message.invite}
          isMine={mine}
          responding={responding}
          onAccept={() => onInviteRespond(message, true)}
          onReject={() => onInviteRespond(message, false)}
        />
        <View style={styles.metaRowEnd}>
          <MessageMeta message={message} />
        </View>
      </>
    );
  } else if (message.isImage) {
    body = (
      <>
        <View>
          <Image
            source={{ uri: resolveMediaUrl(message.text) || message.text }}
            style={[styles.messageImage, { width: imageSize, height: imageSize }]}
            accessibilityLabel={message.caption ? `Foto: ${message.caption}` : "Imagem enviada na conversa"}
          />
          {!message.caption ? <MessageMeta message={message} overlay /> : null}
        </View>
        {message.caption ? (
          <View style={[styles.inlineRow, styles.captionRow]}>
            <Text style={[styles.messageText, mine ? styles.textSent : styles.textReceived]}>{message.caption}</Text>
            <MessageMeta message={message} />
          </View>
        ) : null}
      </>
    );
  } else if (message.location) {
    body = (
      <>
        <LocationCard location={message.location} isMine={mine} />
        <View style={styles.metaRowEnd}>
          <MessageMeta message={message} />
        </View>
      </>
    );
  } else {
    // Texto e hora/ticks lado a lado quando cabem numa linha; senão, a hora
    // desce alinhada à direita (efeito do balão do WhatsApp).
    body = (
      <View style={styles.inlineRow}>
        <Text style={[styles.messageText, mine ? styles.textSent : styles.textReceived]}>{message.text}</Text>
        <MessageMeta message={message} />
      </View>
    );
  }

  return (
    <View
      testID={`chat-message-${message.id}`}
      style={[styles.messageRow, mine ? styles.myRow : styles.theirRow, grouping.joinedWithAbove ? styles.rowJoined : styles.rowSeparated]}
    >
      {grouping.showDay ? <DayChip date={toDate(message.createdAt)} /> : null}
      <Pressable
        testID={`chat-message-touch-${message.id}`}
        onPress={failed ? () => onRetry(message) : undefined}
        onLongPress={() => {
          tapLight();
          onLongPress(message);
        }}
        delayLongPress={250}
        style={({ pressed }) => [
          styles.bubble,
          mine ? styles.bubbleSent : styles.bubbleReceived,
          tail && (mine ? styles.tailSent : styles.tailReceived),
          message.isImage && !deleted && styles.bubbleMedia,
          failed && styles.bubbleFailed,
          pressed && styles.bubblePressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          failed ? "Mensagem não enviada. Toque para tentar de novo" : "Segure para ações da mensagem"
        }
      >
        {!deleted ? <ReplyQuote replyTo={message.replyTo} isMine={mine} /> : null}
        {body}
        {failed ? <Text style={styles.failedHint}>Não enviada · toque para tentar de novo</Text> : null}
      </Pressable>
    </View>
  );
}

export default function Chat({ navigation, route }) {
  const params = route?.params || {};
  const paramConversationId = params.conversationId ?? null;
  const paramContact = params.contact || {};
  const paramContactId = paramContact.id ?? null;
  const paramContactName = paramContact.name || params.name || null;
  const { user } = useAuth();
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const imageSize = Math.round(Math.min(240, width * 0.6));

  const [attachOpen, setAttachOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [viewer, setViewer] = useState(null); // { url, caption }
  const [openingViewOnceId, setOpeningViewOnceId] = useState(null);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // T049 — aberto por notificação: veio só o id da conversa → busca o contato.
  const needsContactLookup = paramConversationId != null && (!paramContactName || paramContactId == null);
  // Modal de match da Descoberta: veio só o perfil → busca a conversa do match.
  const needsConversationLookup = paramConversationId == null && paramContactId != null;

  // Dados buscados na lista de conversas, marcados com a chave dos parâmetros
  // que os originaram: se a aba for reaberta com outros parâmetros, o
  // resultado antigo é ignorado na hora (sem "piscar" dados da conversa errada).
  const lookupKey = `${paramConversationId ?? ""}|${paramContactId ?? ""}`;
  const [lookup, setLookup] = useState({ key: null, conversationId: null, contact: null });
  const lookupIsCurrent = lookup.key === lookupKey;
  const resolvingConversation = needsConversationLookup && !lookupIsCurrent;
  const [draft, setDraft] = useState("");

  const conversationId = paramConversationId ?? (lookupIsCurrent ? lookup.conversationId : null);
  const resolvedContact = lookupIsCurrent ? lookup.contact : null;
  const {
    messages,
    loading,
    error,
    connected,
    otherTyping,
    notifyTyping,
    sendMessage,
    sendImage,
    sendInvite,
    respondToInvite,
    retryMessage,
    deleteForEveryone,
    hideForMe,
    reload,
    markAsRead,
    openViewOnce,
  } = useChat(conversationId, user?.id);

  // Voltar para a tela do Chat (sem remontar) também conta como leitura —
  // o join só acontece na montagem/reconexão.
  useEffect(() => {
    if (!markAsRead) return undefined;
    markAsRead();
    const unsubscribe = navigation?.addListener?.("focus", () => markAsRead());
    return unsubscribe;
  }, [navigation, markAsRead]);

  const contactName = paramContactName || resolvedContact?.name || DEFAULT_CONTACT_NAME;
  const contactPhoto = paramContact.avatar || paramContact.photo || params.avatar || resolvedContact?.avatar;
  const contactId = paramContactId ?? resolvedContact?.id ?? null;

  useEffect(() => {
    if (!needsContactLookup && !needsConversationLookup) return undefined;

    let cancelled = false;
    const request = needsContactLookup
      ? findConversationContact(paramConversationId).then((contact) => ({ conversationId: null, contact }))
      : findConversationWithUser(paramContactId);

    request
      .then((found) => {
        if (cancelled) return;
        setLookup({ key: lookupKey, conversationId: found?.conversationId ?? null, contact: found?.contact ?? null });
      })
      .catch((err) => {
        console.error("Erro ao identificar a conversa:", err?.message || err);
        if (!cancelled) setLookup({ key: lookupKey, conversationId: null, contact: null });
      });
    return () => {
      cancelled = true;
    };
  }, [lookupKey, paramConversationId, paramContactId, needsContactLookup, needsConversationLookup]);

  // Marca a conversa como "aberta" enquanto a tela está em foco — assim
  // mensagens dela não geram notificação (T048).
  useEffect(() => {
    if (!conversationId) return undefined;
    const focused = typeof navigation?.isFocused === "function" ? navigation.isFocused() : true;
    if (focused) setActiveConversation(conversationId);
    const unsubscribeFocus = navigation?.addListener?.("focus", () => setActiveConversation(conversationId));
    const unsubscribeBlur = navigation?.addListener?.("blur", () => clearActiveConversation(conversationId));
    return () => {
      if (typeof unsubscribeFocus === "function") unsubscribeFocus();
      if (typeof unsubscribeBlur === "function") unsubscribeBlur();
      clearActiveConversation(conversationId);
    };
  }, [conversationId, navigation]);

  function goBack() {
    navigation?.navigate?.("Matches");
  }

  function handleChangeDraft(text) {
    setDraft(text);
    notifyTyping?.(text);
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || !conversationId) return;
    tapLight();
    setDraft("");
    sendMessage(text, replyTo);
    setReplyTo(null);
  }

  // ── Fotos: câmera/galeria → pré-visualização → envio ─────────────────
  const choosePhoto = useCallback(
    (source) => {
      setTimeout(async () => {
        try {
          const asset = await pickImage(source, { quality: 0.75 });
          if (asset?.uri) setPreviewAsset(asset);
        } catch (err) {
          if (err?.code === "permission_denied") {
            Alert.alert("Permissão necessária", err.message);
            return;
          }
          console.error("Erro ao selecionar imagem:", err?.message || err);
          Alert.alert("Erro", "Não foi possível abrir a imagem.");
        }
      }, SHEET_CLOSE_DELAY_MS);
    },
    []
  );

  function handlePreviewSend({ caption, viewOnce }) {
    const asset = previewAsset;
    setPreviewAsset(null);
    if (asset) sendImage(asset, { caption, viewOnce });
  }

  async function handleShareLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission?.status !== "granted") {
        Alert.alert("Permissão necessária", "Ative a localização para partilhar.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      // Mesmo formato do web (handleLocation).
      const text = `📍 Localização partilhada:\nhttp://maps.google.com/maps?q=${latitude},${longitude}`;
      sendMessage(text, replyTo);
      setReplyTo(null);
    } catch (err) {
      console.error("Erro ao obter localização:", err?.message || err);
      Alert.alert("Erro", "Não foi possível obter a sua localização.");
    }
  }

  function handleSelectGif(url) {
    setGifOpen(false);
    sendMessage(url, replyTo);
    setReplyTo(null);
  }

  // Agendamento de encontro (convite [CONVITE_EVENTO]).
  function handleScheduleSubmit(payload) {
    setScheduleOpen(false);
    sendInvite(payload);
  }

  async function handleInviteRespond(message, accept) {
    if (respondingInvite) return;
    setRespondingInvite(true);
    try {
      const ok = await respondToInvite(message, accept, contactId);
      if (!ok) {
        Alert.alert("Erro", "Não foi possível responder ao convite. Tente novamente.");
      }
    } finally {
      setRespondingInvite(false);
    }
  }

  // ── Foto de visualização única ────────────────────────────────────────
  async function handleOpenViewOnce(message) {
    if (openingViewOnceId) return;
    setOpeningViewOnceId(message.id);
    try {
      const { url, caption } = await openViewOnce(message);
      setViewer({ url, caption });
    } catch (err) {
      if (err?.code === "already_opened") {
        toast.show("Esta foto já foi aberta.", { type: "info" });
      } else {
        toast.show(err?.message || "Não foi possível abrir a foto.", { type: "error" });
      }
    } finally {
      setOpeningViewOnceId(null);
    }
  }

  // ── Ações da mensagem (segurar) ───────────────────────────────────────
  function handleMessageLongPress(message) {
    if (!message || String(message.id).startsWith("temp-")) return;
    setActionMessage(message);
  }

  const messageActions = useMemo(() => {
    const message = actionMessage;
    if (!message) return [];
    const deleted = message.text === DELETED_TEXT;
    const textual = !deleted && !message.isImage && !message.isViewOnce;
    const options = [];
    if (!deleted && !message.isViewOnce) {
      options.push({
        key: "reply", testID: "message-action-reply", label: "Responder", icon: "arrow-undo-outline",
        onPress: () => setReplyTo(message),
      });
    }
    if (textual) {
      options.push({
        key: "copy", testID: "message-action-copy", label: "Copiar", icon: "copy-outline",
        onPress: () => handleCopy(message),
      });
    }
    options.push({
      key: "delete-me", testID: "message-action-delete-me", label: "Apagar para mim", icon: "trash-outline",
      destructive: true, onPress: () => hideForMe(message),
    });
    if (message.isMine && !deleted) {
      options.push({
        key: "delete-all", testID: "message-action-delete-all", label: "Apagar para todos", icon: "trash-bin-outline",
        destructive: true, onPress: () => deleteForEveryone(message),
      });
    }
    return options;
    // handleCopy é estável o bastante para este menu efêmero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionMessage, hideForMe, deleteForEveryone]);

  async function handleCopy(message) {
    try {
      await Clipboard.setStringAsync(message.text);
      toast.show("Mensagem copiada", { type: "success" });
    } catch (err) {
      console.error("Erro ao copiar:", err?.message || err);
      toast.show("Não foi possível copiar", { type: "error" });
    }
  }

  // T037 — Bloquear usuário a partir da tela de Chat.
  function confirmBlockUser() {
    if (!contactId) {
      Alert.alert("Não foi possível identificar o usuário.");
      return;
    }

    Alert.alert(
      "Bloquear usuário",
      `Tem certeza que deseja bloquear ${contactName}? Após o bloqueio, vocês não aparecerão mais um para o outro.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(contactId);
              Alert.alert("Usuário bloqueado", "A conversa foi encerrada.");
              navigation?.navigate?.("Matches");
            } catch (err) {
              console.error("Erro ao bloquear usuário:", err);
              Alert.alert(
                "Não foi possível bloquear",
                err?.response?.data?.error || "Tente novamente em alguns instantes."
              );
            }
          },
        },
      ]
    );
  }

  const attachmentOptions = [
    { key: "camera", testID: "attachment-camera", label: "Câmera", description: "Tirar uma foto agora", icon: "camera-outline", onPress: () => choosePhoto("camera") },
    { key: "gallery", testID: "attachment-gallery", label: "Galeria", description: "Escolher uma foto", icon: "images-outline", onPress: () => choosePhoto("gallery") },
    { key: "gif", testID: "attachment-gif", label: "GIF", icon: "film-outline", onPress: () => setGifOpen(true) },
    { key: "location", testID: "attachment-location", label: "Localização", description: "Partilhar onde você está", icon: "location-outline", onPress: handleShareLocation },
    { key: "schedule", testID: "attachment-schedule", label: "Agendar encontro", icon: "calendar-outline", onPress: () => setScheduleOpen(true) },
  ];

  const contactOptions = [
    { key: "schedule", testID: "contact-action-schedule", label: "Agendar encontro", icon: "calendar-outline", onPress: () => setScheduleOpen(true) },
    { key: "block", testID: "contact-action-block", label: `Bloquear ${contactName}`, icon: "ban-outline", destructive: true, onPress: confirmBlockUser },
  ];

  const canSend = !!conversationId && !!draft.trim();
  const hasDraft = draft.length > 0;

  function renderBody() {
    if (messages.length > 0) {
      return (
        <FlatList
          testID="chat-message-list"
          data={messages}
          inverted
          keyExtractor={(message) => message.id}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              grouping={groupingFor(messages, index)}
              imageSize={imageSize}
              onRetry={retryMessage}
              onLongPress={handleMessageLongPress}
              onInviteRespond={handleInviteRespond}
              responding={respondingInvite}
              onOpenViewOnce={handleOpenViewOnce}
              openingViewOnceId={openingViewOnceId}
            />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        />
      );
    }

    if (loading || resolvingConversation) {
      return (
        <View style={styles.centered} testID="chat-loading">
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando mensagens" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered} testID="chat-error">
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.centeredTitle}>{error}</Text>
          <Pressable
            testID="chat-reload-button"
            style={styles.reloadButton}
            onPress={reload}
            accessibilityRole="button"
            accessibilityLabel="Tentar carregar as mensagens de novo"
          >
            <Text style={styles.reloadText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.centered} testID="chat-empty">
        <View style={styles.emptyBadge}>
          <Ionicons name="chatbubbles-outline" size={26} color={colors.accent} />
        </View>
        <Text style={styles.centeredTitle}>
          {conversationId ? "Nenhuma mensagem ainda" : "Conversa não encontrada"}
        </Text>
        <Text style={styles.centeredSubtitle}>
          {conversationId
            ? `Mande a primeira mensagem para ${contactName}.`
            : "Volte para a lista e escolha uma conversa."}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        testID="chat-keyboard-avoiding-view"
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Cabeçalho compacto */}
        <View style={styles.header}>
          <Pressable
            testID="chat-back-button"
            style={styles.headerIcon}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar para conversas"
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>

          <Pressable
            testID="chat-contact-button"
            style={styles.contactArea}
            onPress={() => setContactSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Opções da conversa com ${contactName}`}
          >
            <Avatar uri={contactPhoto} name={contactName} size={38} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactName} numberOfLines={1} accessibilityRole="header">
                {contactName}
              </Text>
              {otherTyping ? (
                <View style={styles.statusRow} testID="chat-typing-indicator" accessibilityLiveRegion="polite">
                  <Text style={styles.typingText}>digitando…</Text>
                </View>
              ) : !connected && conversationId ? (
                <View style={styles.statusRow} testID="chat-connection-status">
                  <View style={styles.offlineDot} />
                  <Text style={styles.statusText}>Reconectando ao chat…</Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          <Pressable
            testID="chat-options-button"
            style={styles.headerIcon}
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
            onPress={() => setContactSheetOpen(true)}
            hitSlop={6}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ChatWallpaper>
          {renderBody()}
        </ChatWallpaper>

        {/* Barra de resposta (citação) acima do campo, com X para cancelar */}
        {replyTo ? (
          <View style={styles.replyBanner} testID="chat-reply-banner">
            <View style={styles.replyBar} />
            <View style={styles.replyContent}>
              <Text style={styles.replySender} numberOfLines={1}>
                Respondendo {replyTo.isMine ? "a você" : contactName}
              </Text>
              <Text style={styles.replyPreview} numberOfLines={1}>
                {messagePreviewLabel(replyTo)}
              </Text>
            </View>
            <Pressable
              testID="chat-reply-cancel"
              onPress={() => setReplyTo(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar resposta"
              hitSlop={10}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {/* Barra de digitação estilo WhatsApp */}
        <View style={styles.composer}>
          <Pressable
            testID="chat-attach-button"
            style={styles.composerIcon}
            onPress={() => setAttachOpen(true)}
            disabled={!conversationId}
            accessibilityRole="button"
            accessibilityLabel="Anexar foto, localização ou GIF"
            hitSlop={4}
          >
            <Ionicons name="add" size={28} color={colors.accent} />
          </Pressable>

          <View style={styles.inputPill}>
            <TextInput
              testID="chat-message-input"
              accessibilityLabel="Mensagem"
              style={styles.input}
              placeholder="Mensagem"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={draft}
              onChangeText={handleChangeDraft}
              onSubmitEditing={handleSend}
              editable={!!conversationId}
              maxLength={2000}
              multiline
            />
            {!hasDraft ? (
              <>
                <Pressable
                  testID="chat-camera-button"
                  style={styles.pillIcon}
                  onPress={() => choosePhoto("camera")}
                  disabled={!conversationId}
                  accessibilityRole="button"
                  accessibilityLabel="Tirar foto com a câmera"
                  hitSlop={4}
                >
                  <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  testID="chat-schedule-button"
                  style={styles.pillIcon}
                  onPress={() => setScheduleOpen(true)}
                  disabled={!conversationId}
                  accessibilityRole="button"
                  accessibilityLabel="Agendar encontro"
                  hitSlop={4}
                >
                  <Ionicons name="calendar-outline" size={21} color={colors.textSecondary} />
                </Pressable>
              </>
            ) : null}
          </View>

          <Pressable
            testID="chat-send-button"
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: pressed && canSend ? colors.primaryPressed : colors.primary },
              !canSend && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !canSend }}
          >
            <Ionicons name="send" size={19} color={colors.onPrimary} style={styles.sendIcon} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ActionSheet
        testID="attachment-sheet"
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        options={attachmentOptions}
      />
      <ActionSheet
        testID="message-actions"
        visible={!!actionMessage}
        onClose={() => setActionMessage(null)}
        title="Mensagem"
        options={messageActions}
      />
      <ActionSheet
        testID="contact-sheet"
        visible={contactSheetOpen}
        onClose={() => setContactSheetOpen(false)}
        title={contactName}
        options={contactOptions}
      />
      <ImagePreviewModal
        visible={!!previewAsset}
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onSend={handlePreviewSend}
      />
      <ViewOnceViewer
        visible={!!viewer}
        url={viewer?.url}
        caption={viewer?.caption}
        onClose={() => setViewer(null)}
      />
      <GifPickerModal visible={gifOpen} onClose={() => setGifOpen(false)} onSelect={handleSelectGif} />
      <ScheduleModal
        visible={scheduleOpen}
        contactName={contactName}
        conversationId={conversationId}
        otherUserId={contactId}
        onClose={() => setScheduleOpen(false)}
        onSubmit={handleScheduleSubmit}
      />
    </SafeAreaView>
  );
}

const BUBBLE_RADIUS = 16;
const TAIL_RADIUS = 4;

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    container: {
      flex: 1,
    },
    // ── Cabeçalho ──
    header: {
      height: 58,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.xs,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    contactArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      columnGap: 10,
      height: "100%",
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      ...typography.bodyStrong,
      fontSize: 16,
      color: colors.textPrimary,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 1,
    },
    offlineDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.warning,
      marginRight: 5,
    },
    statusText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    typingText: {
      ...typography.caption,
      color: colors.accent,
      fontWeight: "500",
    },
    // ── Lista ──
    messageList: {
      flexGrow: 1,
      paddingHorizontal: 10,
      paddingVertical: spacing.sm,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    emptyBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    centeredTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    centeredSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    reloadButton: {
      marginTop: spacing.lg,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    reloadText: {
      ...typography.bodyStrong,
      color: colors.onPrimary,
    },
    dayChipRow: {
      alignItems: "center",
      marginVertical: spacing.sm,
    },
    dayChip: {
      ...typography.caption,
      fontWeight: "500",
      color: colors.textSecondary,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.sm,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    // ── Balões ──
    messageRow: {
      width: "100%",
    },
    rowJoined: {
      marginTop: 2,
    },
    rowSeparated: {
      marginTop: 8,
    },
    myRow: {
      alignItems: "flex-end",
    },
    theirRow: {
      alignItems: "flex-start",
    },
    bubble: {
      maxWidth: "80%",
      paddingHorizontal: 10,
      paddingTop: 6,
      paddingBottom: 5,
      borderRadius: BUBBLE_RADIUS,
    },
    bubbleSent: {
      backgroundColor: colors.bubbleSent,
    },
    bubbleReceived: {
      backgroundColor: colors.bubbleReceived,
      borderWidth: colors.scheme === "light" ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.border,
    },
    // Canto "assimétrico": só a primeira mensagem do grupo ganha a ponta.
    tailSent: {
      borderTopRightRadius: TAIL_RADIUS,
    },
    tailReceived: {
      borderTopLeftRadius: TAIL_RADIUS,
    },
    bubbleMedia: {
      paddingHorizontal: 4,
      paddingTop: 4,
      paddingBottom: 4,
    },
    bubbleFailed: {
      borderWidth: 1,
      borderColor: colors.danger,
    },
    bubblePressed: {
      opacity: 0.85,
    },
    inlineRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      columnGap: 8,
    },
    captionRow: {
      paddingHorizontal: 6,
      paddingTop: 4,
    },
    metaRowEnd: {
      alignItems: "flex-end",
      marginTop: 2,
    },
    messageText: {
      ...typography.body,
      lineHeight: 21,
      flexShrink: 1,
    },
    textSent: {
      color: colors.bubbleSentText,
    },
    textReceived: {
      color: colors.bubbleReceivedText,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 3,
      marginBottom: 1,
      marginLeft: "auto",
    },
    metaOverlay: {
      position: "absolute",
      right: 6,
      bottom: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    metaTime: {
      fontSize: 11,
    },
    metaTimeSent: {
      color: colors.bubbleSentMeta,
    },
    metaTimeReceived: {
      color: colors.bubbleReceivedMeta,
    },
    metaTimeOverlay: {
      color: "#FFFFFF",
    },
    messageImage: {
      borderRadius: BUBBLE_RADIUS - 4,
      backgroundColor: colors.surfaceMuted,
    },
    failedHint: {
      ...typography.caption,
      color: colors.bubbleSentText,
      marginTop: 2,
    },
    deletedRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 5,
    },
    deletedText: {
      fontStyle: "italic",
    },
    // Citação (responder) dentro do balão
    quote: {
      borderLeftWidth: 3,
      paddingLeft: 8,
      paddingVertical: 4,
      paddingRight: 8,
      marginBottom: 4,
      borderRadius: 6,
    },
    quoteSent: {
      borderLeftColor: colors.bubbleSentText,
      backgroundColor: "rgba(0,0,0,0.14)",
    },
    quoteReceived: {
      borderLeftColor: colors.accent,
      backgroundColor: colors.surfaceMuted,
    },
    quoteSender: {
      ...typography.caption,
      fontWeight: "700",
      color: colors.accent,
    },
    quoteSenderSent: {
      color: colors.bubbleSentText,
    },
    quoteText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    quoteTextSent: {
      color: colors.bubbleSentMeta,
    },
    // Card de localização
    locationCard: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 10,
      paddingVertical: 4,
      paddingRight: 6,
      minWidth: 180,
    },
    locationIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    locationIconSent: {
      backgroundColor: colors.bubbleSentText,
    },
    locationTexts: {
      flex: 1,
    },
    locationTitle: {
      ...typography.bodyStrong,
      color: colors.bubbleReceivedText,
    },
    locationLink: {
      ...typography.caption,
      color: colors.accent,
      marginTop: 1,
    },
    // Barra de resposta acima do campo
    replyBanner: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    replyBar: {
      width: 3,
      alignSelf: "stretch",
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
    replyContent: {
      flex: 1,
    },
    replySender: {
      ...typography.caption,
      fontWeight: "700",
      color: colors.accent,
    },
    replyPreview: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    // ── Barra de digitação ──
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 6,
      paddingVertical: 6,
      columnGap: 6,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    composerIcon: {
      width: 40,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    inputPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      minHeight: 46,
      borderRadius: 23,
      paddingLeft: 16,
      paddingRight: 6,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      maxHeight: 120,
      paddingTop: Platform.OS === "ios" ? 13 : 11,
      paddingBottom: Platform.OS === "ios" ? 13 : 11,
    },
    pillIcon: {
      width: 36,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.45,
    },
    sendIcon: {
      marginLeft: 2,
    },
  });
