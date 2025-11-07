import { useMemo, useState } from "react";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogCloseButton } from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";

const ordinals = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "numeric"
});

function formatTimestamp(dateLike) {
  if (!dateLike) return "";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return ordinals.format(date);

  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffInDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function lastMessagePreview(message) {
  if (!message || !message.text) return "No messages yet";
  
  // Safely handle the text property
  const text = message.text || "";
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

export default function Sidebar({
  currentUserId,
  currentDisplayName,
  currentAvatar,
  conversations,
  directory,
  isBootstrapping,
  isLoadingConversations,
  onSelectConversation,
  onStartConversation,
  onRefresh,
  error,
  activeConversationId
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Add debugging for conversations
  console.log("📁 Sidebar conversations:", conversations);
  console.log("👥 Sidebar directory:", directory);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations || [];
    const term = search.trim().toLowerCase();
    return (conversations || []).filter((conversation) => {
      const inName = conversation.name?.toLowerCase().includes(term);
      const inMember = conversation.members?.some((member) =>
        member.displayName?.toLowerCase().includes(term)
      );
      const inLastMessage = conversation.lastMessage?.text?.toLowerCase().includes(term);
      return inName || inMember || inLastMessage;
    });
  }, [conversations, search]);

  const filteredDirectory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (directory || []).filter((person) =>
      !term || 
      person.displayName?.toLowerCase().includes(term) || 
      person.email?.toLowerCase().includes(term) ||
      person.firstName?.toLowerCase().includes(term) ||
      person.lastName?.toLowerCase().includes(term)
    );
  }, [directory, search]);

  const handleConversationClick = (conversationId) => {
    onSelectConversation?.(conversationId);
  };

  const handleStartConversation = async (userId) => {
    await onStartConversation?.(userId);
    setIsDialogOpen(false);
  };

  // Safe conversation rendering with error boundaries
  const renderConversations = () => {
    if (isBootstrapping) {
      return (
        <div className="space-y-2 px-3 py-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-xl border border-[#5bc0be]/10 bg-[#1c2541]/50 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#5bc0be]/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded-full bg-[#5bc0be]/20" />
                  <div className="h-3 w-1/2 rounded-full bg-[#5bc0be]/10" />
                </div>
                <div className="h-3 w-10 rounded-full bg-[#5bc0be]/20" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!filteredConversations || filteredConversations.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-sm text-[#5bc0be]">
          No conversations yet. Use <span className="text-[#6fffe9] font-semibold">New Chat</span> to start talking.
        </div>
      );
    }

    return filteredConversations.map((conversation) => {
      try {
        const isActive = conversation.id === activeConversationId;
        
        // Safely get other member
        const otherMember = conversation.members?.find((member) => 
          member.clerkUserId !== currentUserId
        ) || conversation.members?.[0];

        // Safely get conversation name
        const conversationName = conversation.name || 
          otherMember?.displayName || 
          otherMember?.firstName || 
          "Unknown User";

        // Safely get avatar
        const conversationAvatar = conversation.isGroup ? 
          conversation.avatar : 
          otherMember?.avatarUrl || 
          otherMember?.imageUrl;

        return (
          <button
            key={conversation.id}
            onClick={() => handleConversationClick(conversation.id)}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5bc0be]/60",
              isActive
                ? "bg-[#5bc0be]/10 ring-1 ring-[#5bc0be]/40 shadow-lg shadow-[#5bc0be]/10"
                : "hover:bg-[#1c2541] hover:shadow-md hover:shadow-[#0b132b]/30"
            )}
          >
            <Avatar
              src={conversationAvatar}
              alt={conversationName}
              fallback={conversationName}
              className="border border-[#5bc0be]/20"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#6fffe9] truncate">{conversationName}</p>
              <p className="text-[11px] text-[#5bc0be] truncate">
                {lastMessagePreview(conversation.lastMessage)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="text-[11px] text-[#5bc0be]/70 whitespace-nowrap">
                {formatTimestamp(conversation.lastMessageAt || conversation.createdAt)}
              </span>
              {conversation.unreadCount > 0 && (
                <Badge 
                  variant="outline" 
                  className="bg-[#5bc0be] text-[#0b132b] border-[#5bc0be] font-bold min-w-5 h-5 flex items-center justify-center"
                >
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
          </button>
        );
      } catch (error) {
        console.error("Error rendering conversation:", error, conversation);
        return (
          <div key={conversation.id} className="px-4 py-2 text-xs text-red-400">
            Error loading conversation
          </div>
        );
      }
    });
  };

  // Safe directory rendering
  const renderDirectory = () => {
    if (!filteredDirectory || filteredDirectory.length === 0) {
      return <p className="text-sm text-[#5bc0be]">No teammates match your search.</p>;
    }

    return filteredDirectory.map((person) => {
      const displayName = person.displayName || 
        `${person.firstName || ''} ${person.lastName || ''}`.trim() || 
        person.email || 
        'Unknown User';
      
      const avatarUrl = person.avatarUrl || person.imageUrl;

      return (
        <button
          key={person.clerkUserId || person.id}
          onClick={() => handleStartConversation(person.clerkUserId || person.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-[#5bc0be]/10 bg-[#1c2541] px-3 py-2 text-left transition-all duration-200 hover:border-[#5bc0be]/40 hover:bg-[#5bc0be]/10 hover:shadow-md hover:shadow-[#5bc0be]/10"
        >
          <Avatar
            src={avatarUrl}
            alt={displayName}
            fallback={displayName}
            size="sm"
            className="border border-[#5bc0be]/20"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#6fffe9] truncate">{displayName}</p>
            {person.email && (
              <p className="text-[11px] text-[#5bc0be] truncate">{person.email}</p>
            )}
          </div>
          <span className="text-xs text-[#5bc0be] font-semibold whitespace-nowrap">Chat →</span>
        </button>
      );
    });
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col rounded-3xl border border-[#5bc0be]/20 bg-gradient-to-b from-[#0b132b] to-[#1c2541] p-4 shadow-2xl mt-6 ml-6">
      {/* User Profile Header */}
      <div className="flex items-center justify-between rounded-2xl border border-[#5bc0be]/20 bg-[#1c2541] px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar 
            src={currentAvatar} 
            alt={currentDisplayName} 
            fallback={currentDisplayName}
            className="border-2 border-[#5bc0be]"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#6fffe9] truncate">{currentDisplayName}</p>
            <p className="text-xs text-[#5bc0be]">Secure workspace</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRefresh} 
          disabled={isLoadingConversations}
          className="text-[#5bc0be] hover:text-[#6fffe9] hover:bg-[#5bc0be]/10"
        >
          {isLoadingConversations ? "…" : "↻"}
        </Button>
      </div>

      {/* Search Input */}
      <div className="mt-4">
        <Input
          placeholder="Search chats or people..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="bg-[#1c2541] border-[#5bc0be]/20 text-[#6fffe9] placeholder-[#5bc0be] focus:border-[#5bc0be] focus:ring-[#5bc0be]"
        />
      </div>

      {/* Conversations Header */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5bc0be]">Conversations</p>
          <p className="text-[11px] text-[#5bc0be]/70">
            {(conversations || []).length} active {(conversations || []).length === 1 ? "chat" : "chats"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="secondary"
              className="bg-[#5bc0be] hover:bg-[#6fffe9] text-[#0b132b] font-semibold border-none"
            >
              New Chat
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0b132b] border-[#5bc0be]/20 text-[#6fffe9]">
            <DialogHeader>
              <DialogTitle className="text-[#6fffe9]">Start a conversation</DialogTitle>
              <DialogDescription className="text-[#5bc0be]">
                Pick a teammate from the roster. New chats appear instantly in your sidebar.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="mt-4 h-64">
              <div className="space-y-2 pr-2">
                {renderDirectory()}
              </div>
            </ScrollArea>

            <DialogFooter>
              <DialogCloseButton className="bg-[#5bc0be] text-[#0b132b] hover:bg-[#6fffe9]" />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversations List */}
      <ScrollArea className="mt-4 flex-1 rounded-2xl border border-[#5bc0be]/10 bg-[#1c2541]/50">
        <div className="space-y-1 py-2">
          {error && (
            <div className="mx-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          {renderConversations()}
        </div>
      </ScrollArea>
    </aside>
  );
}