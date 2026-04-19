import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { useLocationState } from "@/api/locations";
import { useCharacters } from "@/api/characters";
import { API_BASE_URL } from "@/api/client";
import { useGameStore } from "@/game/store";
import { avatarUrl, npcAvatarUrl } from "@/game/avatars";
import { toastError } from "@/components/Toaster";
import StreamingText from "@/components/StreamingText";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";

function partsToText(msg: UIMessage): string {
  return msg.parts
    .filter(
      (p): p is { type: "text"; text: string; state?: "streaming" | "done" } =>
        p.type === "text",
    )
    .map((p) => p.text)
    .join("");
}

export default function ChatScreen() {
  const t = useT();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const placeId = searchParams.get("placeId") ?? undefined;
  const characterId = searchParams.get("characterId") ?? undefined;

  const player = useGameStore((s) => s.player);
  const currentLocationId = useGameStore((s) => s.currentLocationId);
  const forgetChatId = useGameStore((s) => s.forgetChatId);

  const { data: location } = useLocationState(currentLocationId ?? undefined);
  const { data: allCharacters } = useCharacters();

  const place = useMemo(() => {
    if (!placeId || !location) return undefined;
    return location.places.find((p) => p.id === placeId);
  }, [placeId, location]);

  const character = useMemo(() => {
    if (!characterId) return undefined;
    const fromPlace = location?.places
      .flatMap((p) => p.characters)
      .find((c) => c.id === characterId);
    return fromPlace ?? allCharacters?.find((c) => c.id === characterId);
  }, [characterId, location, allCharacters]);

  const userId = player?.id;

  const transport = useMemo(() => {
    if (!chatId || !userId) return undefined;
    return new DefaultChatTransport<UIMessage>({
      api: `${API_BASE_URL}/chats/${encodeURIComponent(chatId)}/message`,
      headers: { "x-user-id": userId },
      prepareSendMessagesRequest: ({ messages }) => {
        const last = messages[messages.length - 1];
        const message = last ? partsToText(last) : "";
        return { body: { message } };
      },
    });
  }, [chatId, userId]);

  // A chat id can go stale within a session if the backend drops or rotates
  // it (e.g. staging DB reset). In that case the send fails with 403/404;
  // forget the id so the next tap creates a fresh chat.
  function isStaleChatError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      /\b(403|404)\b/.test(msg) ||
      /not the owner/i.test(msg) ||
      /forbidden/i.test(msg) ||
      /not ?found/i.test(msg)
    );
  }

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
    onError: (err) => {
      if (isStaleChatError(err) && placeId && characterId) {
        forgetChatId(placeId, characterId);
        toastError(t.chat.staleConversation);
        navigate(`/location/${currentLocationId ?? ""}`, { replace: true });
        return;
      }
      toastError(err);
    },
  });

  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;

    const observer = new ResizeObserver(() => {
      scroller.scrollTop = scroller.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    setInput("");
    void sendMessage({ text });
  }

  function handleReset() {
    if (!placeId || !characterId) return;
    forgetChatId(placeId, characterId);
    navigate(`/location/${currentLocationId ?? ""}`);
  }

  if (!player) return null;

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="h-dvh flex flex-col">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-city-bg/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            className="btn-ghost shrink-0"
            onClick={() =>
              navigate(
                currentLocationId ? `/location/${currentLocationId}` : "/map",
              )
            }
          >
            {t.common.back}
          </button>
          {character && (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={npcAvatarUrl(character)}
                alt=""
                className="h-10 w-10 rounded-full border border-white/10 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-display font-semibold truncate">
                  {character.firstName} {character.lastName}
                </p>
                <p className="text-xs text-city-muted truncate">
                  {character.title}
                  {place ? ` · ${place.name}` : ""}
                </p>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {isStreaming && (
              <span className="text-xs text-city-accent animate-pulse">
                {t.chat.typing}
              </span>
            )}
            <LanguageSwitcher />
            <button
              className="btn-ghost text-xs"
              onClick={handleReset}
              title={t.common.reset}
            >
              {t.common.reset}
            </button>
          </div>
        </div>
      </header>

      <main ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div
          ref={contentRef}
          className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4"
        >
          {messages.length === 0 && !isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6 text-center"
            >
              <p className="text-sm text-city-muted">
                {t.chat.sayHello(character?.firstName ?? t.chat.theyFallback)}
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const text = partsToText(m);
              const isUser = m.role === "user";
              const isLast = i === messages.length - 1;
              const isStreamingThis = !isUser && isLast && isStreaming;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-start gap-2",
                    isUser ? "justify-end" : "justify-start",
                  )}
                >
                  {!isUser && character && (
                    <img
                      src={npcAvatarUrl(character)}
                      alt=""
                      className="h-8 w-8 rounded-full border border-white/10 shrink-0"
                    />
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
                      isUser
                        ? "bg-city-accent text-slate-900 rounded-tr-sm"
                        : "bg-white/[0.06] border border-white/10 text-city-ink rounded-tl-sm",
                    )}
                  >
                    {isUser ? (
                      text
                    ) : text ? (
                      <StreamingText text={text} streaming={isStreamingThis} />
                    ) : (
                      <span className="opacity-60 italic">…</span>
                    )}
                  </div>
                  {isUser && (
                    <img
                      src={avatarUrl(player.avatarStyle, player.avatarSeed, 64)}
                      alt=""
                      className="h-8 w-8 rounded-full border border-white/10 shrink-0"
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {error && (
            <div className="text-sm text-red-300/90 text-center">
              {error.message}
            </div>
          )}
        </div>
      </main>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-white/5 bg-city-bg/80 backdrop-blur-md"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={1}
            placeholder={t.chat.messagePlaceholder(character?.firstName)}
            className="input resize-none overflow-y-auto max-h-40 leading-relaxed py-3"
            disabled={!chatId}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!input.trim() || isStreaming}
          >
            {t.common.send}
          </button>
        </div>
      </form>
    </div>
  );
}
