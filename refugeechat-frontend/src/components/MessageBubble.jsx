import { Avatar } from "./ui/avatar";
import { cn } from "../lib/utils";
import { useIsMobile } from "../hooks/use-mobile";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "numeric"
});

const statusLabelMap = {
  sent: "Sent",
  delivered: "Delivered",
  seen: "Seen"
};

export default function MessageBubble({
  message,
  isMine,
  currentUser,
  otherMember,
  onAddReaction,
  availableReactions
}) {
  const isMobile = useIsMobile();
  const timestamp = message?.createdAt ? new Date(message.createdAt) : null;
  const statusLabel = statusLabelMap[message.status] || "Sent";

  return (
    <div
      className={cn(
        "flex items-end gap-3 group relative",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      {!isMine && (
        <Avatar
          size="sm"
          src={message.senderAvatar || otherMember?.avatarUrl}
          alt={message.senderName}
          fallback={message.senderName}
          className="border border-[#5bc0be]/20"
        />
      )}

      <div
        className={cn(
          "flex flex-col gap-1",
          isMine ? "items-end text-right" : "items-start text-left",
          // Make bubbles wider on mobile for readability
          isMobile ? "max-w-[85%]" : "max-w-xs md:max-w-xl"
        )}
      >
        <p className="text-[11px] uppercase tracking-wide text-[#5bc0be]">
          {isMine ? currentUser?.name : message.senderName}
        </p>
        
        <div
          className={cn(
            "rounded-2xl md:rounded-3xl px-3 md:px-4 py-2 md:py-3 text-sm leading-relaxed shadow-lg transition-all duration-200",
            isMine
              ? "bg-gradient-to-r from-[#3a506b] to-[#1c2541] text-[#6fffe9] shadow-[#5bc0be]/20 hover:shadow-[#5bc0be]/30"
              : "border border-[#5bc0be]/20 bg-[#1c2541] text-[#6fffe9] shadow-[#0b132b]/40 hover:shadow-[#0b132b]/60"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>

        {/* Message Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions).map(([userId, reactions]) =>
              reactions.map((reaction, index) => (
                <button
                  key={`${userId}-${index}`}
                  onClick={() => onAddReaction?.(message._id, reaction)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-full border transition-all hover:scale-105",
                    userId === currentUser?.id
                      ? "bg-[#5bc0be]/20 border-[#5bc0be] text-[#6fffe9]"
                      : "bg-[#1c2541] border-[#5bc0be]/30 text-[#5bc0be]"
                  )}
                >
                  {reaction}
                </button>
              ))
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-[#5bc0be]/80">
          {timestamp && <span>{timeFormatter.format(timestamp)}</span>}
          {isMine && (
            <span
              className={cn(
                "font-semibold",
                message.status === "seen" 
                  ? "text-[#6fffe9]" 
                  : message.status === "delivered"
                  ? "text-[#5bc0be]"
                  : "text-[#5bc0be]/60"
              )}
            >
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {isMine && (
        <Avatar
          size="sm"
          src={currentUser?.avatar}
          alt={currentUser?.name}
          fallback={currentUser?.name}
          className="border border-[#5bc0be]/20"
        />
      )}

      {/* Reaction Picker on Hover */}
      {onAddReaction && (
        <div
          className={cn(
            "absolute -bottom-2 transition-opacity duration-200 bg-[#0b132b] border border-[#5bc0be]/20 rounded-full px-2 py-1 shadow-lg",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <div className="flex gap-1">
            {availableReactions?.slice(0, 5).map(({ emoji, label }) => (
              <button
                key={label}
                onClick={() => onAddReaction(message._id, emoji)}
                className="text-xs hover:scale-125 transition-transform"
                title={label}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}