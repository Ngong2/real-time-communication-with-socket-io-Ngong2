import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import { createApiClient } from "../lib/api";

export default function ChatLayout({
  currentUserId,
  currentAvatar,
  currentName,
  currentEmail
}) {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [conversations, setConversations] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [error, setError] = useState(null);

  const refreshConversations = useCallback(async () => {
    setError(null);
    setIsLoadingConversations(true);
    try {
      console.log("🔄 Loading conversations...");
      const list = await api.conversations.list();
      setConversations(Array.isArray(list) ? list : []);
      console.log(`✅ Loaded ${list.length} conversations`);
    } catch (err) {
      console.error("❌ Failed to load conversations", err);
      setError("Unable to load conversations. Please try again.");
    } finally {
      setIsLoadingConversations(false);
    }
  }, [api]);

  const refreshDirectory = useCallback(async () => {
    try {
      console.log("🔄 Loading directory...");
      const list = await api.users.list();
      setDirectory(list.filter((user) => user.clerkUserId !== currentUserId));
      console.log(`✅ Loaded ${list.length} users in directory`);
    } catch (err) {
      console.error("❌ Failed to load people", err);
    }
  }, [api, currentUserId]);

  useEffect(() => {
    if (!authLoaded || !currentUserId) {
      console.warn("⏳ Waiting for authentication...");
      return;
    }

    let active = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initialize = async () => {
      if (!active) return;
      
      setIsBootstrapping(true);
      setError(null);
      
      try {
        console.log("🚀 Starting app initialization...");

        // Try to get token first
        let token;
        try {
          token = await getToken();
          console.log("🔐 Token obtained:", !!token);
        } catch (tokenError) {
          console.error("❌ Failed to get token:", tokenError);
          throw new Error("Authentication service unavailable");
        }

        // Sync user profile (optional - don't fail if this doesn't work)
        try {
          console.log("👤 Syncing user profile...");
          await api.users.syncProfile({
            displayName: currentName,
            avatarUrl: currentAvatar,
            email: currentEmail
          });
          console.log("✅ Profile synced successfully");
        } catch (syncError) {
          console.warn("⚠️ Profile sync failed, continuing:", syncError.message);
          // Don't throw - continue with app initialization
        }

        if (!active) return;

        // Load conversations and directory
        console.log("📦 Loading initial data...");
        await Promise.all([refreshConversations(), refreshDirectory()]);
        
        console.log("🎉 App initialization completed successfully");
        
      } catch (err) {
        console.error("💥 Bootstrap error:", err);
        if (!active) return;

        if (retryCount < maxRetries) {
          retryCount++;
          const delay = 2000 * retryCount;
          console.log(`🔄 Retrying initialization (attempt ${retryCount}/${maxRetries}) in ${delay}ms...`);
          setTimeout(initialize, delay);
          return;
        }

        // Set user-friendly error message
        if (err.message.includes("authentication") || err.message.includes("sign in")) {
          setError("Your session has expired. Please sign in again.");
        } else if (err.message.includes("service unavailable")) {
          setError("Authentication service is temporarily unavailable. Please try again.");
        } else {
          setError("We couldn't prepare your chat workspace. Please refresh the page.");
        }
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, [
    api,
    authLoaded,
    currentAvatar,
    currentEmail,
    currentName,
    currentUserId,
    getToken,
    refreshConversations,
    refreshDirectory
  ]);

  // ... rest of your component code remains the same
  useEffect(() => {
    if (!activeConversationId) {
      setActiveConversation(null);
      return;
    }
    const match = conversations.find((conversation) => conversation.id === activeConversationId);
    if (match) {
      setActiveConversation(match);
    }
  }, [activeConversationId, conversations]);

  const handleSelectConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      setActiveConversationId(null);
      setActiveConversation(null);
      return;
    }
    setActiveConversationId(conversationId);
    const existing = conversations.find((conversation) => conversation.id === conversationId);
    if (!existing) {
      try {
        const detail = await api.conversations.getDetail(conversationId);
        setActiveConversation(detail);
        setConversations((prev) => {
          const already = prev.some((c) => c.id === detail.id);
          if (already) {
            return prev.map((item) => (item.id === detail.id ? detail : item));
          }
          return [detail, ...prev];
        });
      } catch (err) {
        console.error("Failed to load conversation detail", err);
      }
    }
  }, [api, conversations]);

  const handleStartConversation = useCallback(async (targetUserId) => {
    try {
      const conversation = await api.conversations.ensureConversation(targetUserId);
      setConversations((prev) => {
        const existing = prev.find((item) => item.id === conversation.id);
        if (existing) {
          return prev
            .map((item) => (item.id === conversation.id ? conversation : item))
            .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
        }
        return [conversation, ...prev];
      });
      setActiveConversationId(conversation.id);
      setActiveConversation(conversation);
    } catch (err) {
      console.error("Unable to start conversation", err);
      setError("Unable to start conversation. Please try again.");
    }
  }, [api]);

  const handleConversationSeen = useCallback((conversationId) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )
    );
  }, []);

  const handleMessageSent = useCallback((conversationId, message) => {
    setConversations((prev) => {
      const next = prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          lastMessage: {
            text: message.text,
            senderId: message.senderId,
            senderName: message.senderName,
            senderAvatar: message.senderAvatar,
            createdAt: message.createdAt
          },
          lastMessageAt: message.createdAt,
          unreadCount: 0
        };
      });

      next.sort(
        (a, b) =>
          new Date(b.lastMessageAt || b.createdAt).getTime() -
          new Date(a.lastMessageAt || a.createdAt).getTime()
      );
      return next;
    });
  }, []);

  if (!authLoaded) {
    return <div className="flex items-center justify-center h-full">Loading authentication...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      <Sidebar
        currentUserId={currentUserId}
        currentDisplayName={currentName}
        currentAvatar={currentAvatar}
        conversations={conversations}
        directory={directory}
        isBootstrapping={isBootstrapping}
        isLoadingConversations={isLoadingConversations}
        onSelectConversation={handleSelectConversation}
        onStartConversation={handleStartConversation}
        onRefresh={refreshConversations}
        error={error}
        activeConversationId={activeConversationId}
      />

      <ChatWindow
        messagesApi={api.messages}
        conversation={activeConversation}
        conversationId={activeConversationId}
        currentUser={{
          id: currentUserId,
          name: currentName,
          avatar: currentAvatar
        }}
        onConversationSeen={handleConversationSeen}
        onMessageSent={handleMessageSent}
        isBootstrapping={isBootstrapping}
        getToken={getToken}
      />
    </div>
  );
}