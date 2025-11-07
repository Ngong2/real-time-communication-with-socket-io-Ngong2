import { useEffect, useMemo, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { useSocket } from "../hooks/useSocket";

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// Emoji data for reactions
const EMOJI_REACTIONS = [
  { emoji: "👍", label: "like" },
  { emoji: "❤️", label: "love" },
  { emoji: "😂", label: "laugh" },
  { emoji: "😮", label: "wow" },
  { emoji: "😢", label: "sad" },
  { emoji: "😠", label: "angry" },
  { emoji: "🔥", label: "fire" },
  { emoji: "👏", label: "clap" },
  { emoji: "🎉", label: "celebration" },
  { emoji: "🤔", label: "thinking" },
  { emoji: "👀", label: "eyes" },
  { emoji: "💯", label: "100" }
];

// Quick emoji shortcuts for the input
const QUICK_EMOJIS = [
  "😊", "😂", "❤️", "😍", "🔥", "👍", "🎉", "👏", "🙏", "😎",
  "🤔", "👀", "💯", "😢", "😮", "😡", "🤣", "🥰", "😘", "🤩"
];

// Color palette from https://www.color-hex.com/color-palette/1066405
const COLORS = {
  primary: '#3a506b',    // Dark blue gray
  secondary: '#1c2541',  // Dark blue
  accent: '#5bc0be',     // Teal
  light: '#6fffe9',      // Light teal
  background: '#0b132b', // Dark navy
};

export default function ChatWindow({
  messagesApi,
  conversation,
  conversationId,
  currentUser,
  onConversationSeen,
  onMessageSent,
  isBootstrapping,
  getToken
}) {
  const service = useMemo(() => {
    if (messagesApi) return messagesApi;
    return {
      async list() {
        return [];
      },
      async send() {
        throw new Error("messagesApi not provided");
      }
    };
  }, [messagesApi]);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickEmojis, setShowQuickEmojis] = useState(false);
  const viewportRef = useRef(null);
  const conversationIdRef = useRef(conversationId);
  const emojiPickerRef = useRef(null);
  const quickEmojisRef = useRef(null);

  const { socket, isConnected, socketError } = useSocket(getToken);

  // Close emoji pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (quickEmojisRef.current && !quickEmojisRef.current.contains(event.target)) {
        setShowQuickEmojis(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debug socket connection
  useEffect(() => {
    console.log("🔌 Socket debug:", {
      socket: socket,
      isConnected: isConnected,
      socketError: socketError,
      hasEmit: socket && typeof socket.emit === 'function'
    });
  }, [socket, isConnected, socketError]);

  // determine the other participant
  const otherMember = useMemo(() => {
    if (!conversation || !currentUser?.id) return null;
    if (conversation.isGroup) return null;
    return (
      conversation.members?.find(
        (member) => member.clerkUserId !== currentUser.id
      ) || null
    );
  }, [conversation, currentUser]);

  // reset state when changing conversations
  useEffect(() => {
    setMessages([]);
    setDraft("");
    setError(null);
    setShowEmojiPicker(false);
    setShowQuickEmojis(false);
  }, [conversationId]);

  // load conversation history
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    setIsLoading(true);
    (async () => {
      try {
        const data = await service.list(conversationId);
        if (!active) return;
        setMessages(Array.isArray(data) ? data : []);
        onConversationSeen?.(conversationId);
      } catch (err) {
        console.error("Failed to load messages", err);
        if (active) {
          setError("We couldn't fetch the conversation history. Please retry.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [service, conversationId, onConversationSeen]);

  // auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Safe socket emit function
  const safeSocketEmit = (event, data) => {
    if (socket && typeof socket.emit === 'function') {
      console.log(`📤 Emitting socket event: ${event}`, data);
      socket.emit(event, data);
      return true;
    } else {
      console.warn(`⚠️ Socket not available for event: ${event}`, {
        socketAvailable: !!socket,
        hasEmitMethod: socket && typeof socket.emit === 'function',
        data: data
      });
      return false;
    }
  };

  // Safe socket on/off functions
  const safeSocketOn = (event, handler) => {
    if (socket && typeof socket.on === 'function') {
      socket.on(event, handler);
      return true;
    }
    return false;
  };

  const safeSocketOff = (event, handler) => {
    if (socket && typeof socket.off === 'function') {
      socket.off(event, handler);
      return true;
    }
    return false;
  };

  // join conversation room via socket.io
  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (!conversationId) return;

    console.log("🎯 Joining conversation room:", conversationId);
    const joinSuccess = safeSocketEmit("conversation:join", conversationId);
    
    if (!joinSuccess) {
      console.warn("⚠️ Could not join conversation room - socket not ready");
      return;
    }

    // handle incoming messages in real-time
    const handleNewMessage = ({ conversationId: id, message }) => {
      if (id === conversationIdRef.current) {
        console.log("📨 New message received:", message);
        setMessages((prev) => [...prev, message]);
      }
    };

    // handle message reactions
    const handleMessageReaction = ({ conversationId: id, messageId, reaction, userId }) => {
      if (id === conversationIdRef.current) {
        console.log("🎭 Reaction received:", { messageId, reaction, userId });
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            const reactions = msg.reactions || {};
            const userReactions = reactions[userId] || [];
            
            // Toggle reaction - remove if already exists, add if not
            const updatedReactions = userReactions.includes(reaction)
              ? userReactions.filter(r => r !== reaction)
              : [...userReactions, reaction];
            
            return {
              ...msg,
              reactions: {
                ...reactions,
                [userId]: updatedReactions.length > 0 ? updatedReactions : undefined
              }
            };
          }
          return msg;
        }));
      }
    };

    // handle conversation updates (e.g., unread counts)
    const handleConversationUpdate = ({ conversationId: id }) => {
      if (id === conversationIdRef.current) {
        console.log("🔄 Conversation updated:", id);
        onConversationSeen?.(id);
      }
    };

    safeSocketOn("message:new", handleNewMessage);
    safeSocketOn("message:reaction", handleMessageReaction);
    safeSocketOn("conversation:update", handleConversationUpdate);

    return () => {
      console.log("🚪 Leaving conversation room:", conversationIdRef.current);
      safeSocketOff("message:new", handleNewMessage);
      safeSocketOff("message:reaction", handleMessageReaction);
      safeSocketOff("conversation:update", handleConversationUpdate);
      safeSocketEmit("conversation:leave", conversationIdRef.current);
    };
  }, [socket, conversationId, onConversationSeen]);

  // Add reaction to a message
  const handleAddReaction = (messageId, reaction) => {
    if (!socket || !conversationId) return;

    // Update local state immediately for better UX
    setMessages(prev => prev.map(msg => {
      if (msg._id === messageId) {
        const reactions = msg.reactions || {};
        const userReactions = reactions[currentUser.id] || [];
        
        // Toggle reaction
        const updatedReactions = userReactions.includes(reaction)
          ? userReactions.filter(r => r !== reaction)
          : [...userReactions, reaction];
        
        return {
          ...msg,
          reactions: {
            ...reactions,
            [currentUser.id]: updatedReactions.length > 0 ? updatedReactions : undefined
          }
        };
      }
      return msg;
    }));

    // Emit reaction via socket
    safeSocketEmit("message:reaction", {
      conversationId,
      messageId,
      reaction,
      userId: currentUser.id
    });
  };

  // Add emoji to draft message
  const addEmojiToDraft = (emoji) => {
    setDraft(prev => prev + emoji);
    setShowQuickEmojis(false);
  };

  // sending message handler
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !conversationId) return;

    setIsSending(true);
    setError(null);

    try {
      const nextMessage = await service.send(conversationId, draft.trim());
      console.log("📤 Message sent via API:", nextMessage);
      
      setMessages((prev) => [...prev, nextMessage]);
      onMessageSent?.(conversationId, nextMessage);

      // emit real-time event so others see instantly
      const emitSuccess = safeSocketEmit("message:new", {
        conversationId,
        message: nextMessage,
      });

      if (!emitSuccess) {
        console.warn("⚠️ Message sent but socket broadcast failed");
      }

      setDraft("");
      setShowQuickEmojis(false);
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Your message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isBootstrapping) {
    return (
      <section className="flex flex-1 flex-col justify-center rounded-2xl md:rounded-3xl border border-[#5bc0be]/20 bg-[#0b132b] p-4 md:p-8 text-[#6fffe9] mt-6 mr-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5bc0be] mb-4"></div>
          <p>Preparing your conversations…</p>
        </div>
      </section>
    );
  }

  if (!conversationId || !conversation) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center rounded-2xl md:rounded-3xl border border-[#5bc0be]/20 bg-[#0b132b] p-6 md:p-10 text-center text-sm text-[#6fffe9] mt-6 mr-6">
        <div className="max-w-xs space-y-4">
          <div className="text-4xl">💬</div>
          <p>
            Choose a conversation from the sidebar or start a new one to begin
            chatting.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl md:rounded-3xl border border-[#5bc0be]/20 bg-[#0b132b] backdrop-blur-xl h-screen md:h-auto mt-6 mr-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#5bc0be]/20 bg-[#1c2541] px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar
            src={
              conversation.isGroup
                ? conversation.avatar
                : otherMember?.avatarUrl
            }
            alt={conversation.name}
            fallback={conversation.name}
            className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 border-2 border-[#5bc0be]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#6fffe9] truncate">
              {conversation.name}
            </p>
            <p className="text-xs text-[#5bc0be] truncate">
              {otherMember?.lastSeenAt
                ? `Last seen ${longDateFormatter.format(
                    new Date(otherMember.lastSeenAt)
                  )}`
                : conversation.isGroup
                ? `${conversation.members?.length || 0} participants`
                : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {!isConnected && (
            <Badge
              variant="outline"
              className="rounded-full border-yellow-400/40 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-100 hidden sm:flex"
            >
              Connecting...
            </Badge>
          )}
          <Badge
            variant="outline"
            className="rounded-full border-[#5bc0be] bg-[#5bc0be]/10 px-2 py-1 text-xs font-medium text-[#6fffe9]"
          >
            <span className="hidden sm:inline">Live Chat</span>
            <span className="sm:hidden">💬</span>
          </Badge>
        </div>
      </header>

      {/* Messages Area */}
      <div
        ref={viewportRef}
        className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-[#0b132b] to-[#1c2541] px-4 py-4 md:px-6 md:py-6"
      >
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="text-sm text-[#6fffe9] flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5bc0be]"></div>
              Loading messages…
            </div>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#5bc0be]/20 bg-[#1c2541] p-6 md:p-8 text-center text-sm text-[#5bc0be]">
            <div className="space-y-2">
              <div className="text-2xl">👋</div>
              <p>No messages yet — start the conversation.</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message._id || `${message.senderId}-${message.createdAt}`}
            message={message}
            isMine={message.senderId === currentUser.id}
            currentUser={currentUser}
            otherMember={otherMember}
            onAddReaction={handleAddReaction}
            availableReactions={EMOJI_REACTIONS}
          />
        ))}
      </div>

      {/* Footer with Input */}
      <footer className="border-t border-[#5bc0be]/20 bg-[#1c2541] px-4 py-3 md:px-6 md:py-4">
        {socketError && (
          <div className="mb-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            ⚠️ Connection issue: {socketError}
          </div>
        )}

        {/* Quick Emoji Picker */}
        {showQuickEmojis && (
          <div 
            ref={quickEmojisRef}
            className="mb-3 rounded-2xl border border-[#5bc0be]/20 bg-[#0b132b] p-3 backdrop-blur-xl"
          >
            <div className="flex flex-wrap gap-1 md:gap-2">
              {QUICK_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addEmojiToDraft(emoji)}
                  className="text-lg transition-transform hover:scale-125 focus:scale-125 focus:outline-none p-1 hover:bg-[#5bc0be]/10 rounded"
                  title={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickEmojis(!showQuickEmojis)}
            className="flex-shrink-0 rounded-lg p-2 text-[#5bc0be] transition-colors hover:bg-[#5bc0be]/10 hover:text-[#6fffe9] md:p-1"
            title="Add emoji"
          >
            <span className="text-lg">😊</span>
          </button>
          
          <div className="flex-1 min-w-0">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message..."
              disabled={isSending}
              className="w-full bg-[#0b132b] border-[#3a506b] text-[#6fffe9] placeholder-[#5bc0be] focus:border-[#5bc0be] focus:ring-[#5bc0be]"
            />
          </div>
          
          <Button
            type="submit"
            disabled={!draft.trim() || isSending}
            className={cn(
              "flex-shrink-0 min-w-16 md:min-w-20 bg-[#5bc0be] hover:bg-[#6fffe9] text-[#0b132b] border-none",
              isSending && "opacity-75",
              "transition-colors duration-200 font-semibold"
            )}
          >
            <span className="hidden md:inline">
              {isSending ? "Sending…" : "Send"}
            </span>
            <span className="md:hidden">
              {isSending ? "..." : "➤"}
            </span>
          </Button>
        </form>
        
        {error && (
          <p className="mt-2 text-xs text-red-300 text-center md:text-left">{error}</p>
        )}
      </footer>
    </section>
  );
}