const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const UserProfile = require("../models/UserProfile");
const asyncHandler = require("../utils/asyncHandler");

const ensureConversationAccess = async (conversationId, currentUserId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    const error = new Error("Invalid conversation id");
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }

  if (!conversation.members.includes(currentUserId)) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  return conversation;
};

exports.getMessagesForConversation = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;
  const { conversationId } = req.params;

  const conversation = await ensureConversationAccess(conversationId, currentUserId);

  let messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean();

  if (messages.length > 0) {
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: currentUserId },
        readBy: { $ne: currentUserId }
      },
      {
        $addToSet: { readBy: currentUserId },
        $set: { status: "seen" }
      }
    );
  }

  messages = messages.map((message) => {
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    const hasRead = readBy.includes(currentUserId);
    const nextReadBy = hasRead ? readBy : [...readBy, currentUserId];
    const status = message.senderId === currentUserId ? message.status : "seen";
    return {
      ...message,
      readBy: nextReadBy,
      status
    };
  });

  if (!conversation.unreadCounts) {
    conversation.unreadCounts = new Map();
  }
  if (conversation.unreadCounts instanceof Map) {
    conversation.unreadCounts.set(currentUserId, 0);
  } else {
    conversation.unreadCounts[currentUserId] = 0;
  }
  await conversation.save();

  res.json(messages);
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const currentUserId = req.auth.userId;
  const { conversationId, text } = req.body;

  if (!conversationId || !text?.trim()) {
    return res.status(400).json({ message: "conversationId and text are required" });
  }

  const conversation = await ensureConversationAccess(conversationId, currentUserId);

  const profile =
    (await UserProfile.findOne({ clerkUserId: currentUserId })) ||
    {
      displayName: "You",
      avatarUrl: ""
    };

  const message = await Message.create({
    conversationId,
    senderId: currentUserId,
    senderName: profile.displayName,
    senderAvatar: profile.avatarUrl,
    text: text.trim(),
    readBy: [currentUserId],
    status: "sent"
  });

  if (!conversation.unreadCounts) {
    conversation.unreadCounts = new Map();
  }

  const updateUnread = (memberId) => {
    if (conversation.unreadCounts instanceof Map) {
      const prev = conversation.unreadCounts.get(memberId) || 0;
      conversation.unreadCounts.set(memberId, memberId === currentUserId ? 0 : prev + 1);
    } else {
      const prev = conversation.unreadCounts[memberId] || 0;
      conversation.unreadCounts[memberId] = memberId === currentUserId ? 0 : prev + 1;
    }
  };

  conversation.members.forEach(updateUnread);

  conversation.lastMessage = {
    text: message.text,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    createdAt: message.createdAt
  };
  conversation.lastMessageAt = message.createdAt;

  await conversation.save();

  // Use req.io instead of io
  if (req.io) {
    // Emit to everyone in the conversation room
    req.io.to(conversationId).emit("message:new", {
      conversationId, 
      message: {
        _id: message._id,
        text: message.text,
        senderId: message.senderId,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        createdAt: message.createdAt,
        conversationId: message.conversationId,
        status: message.status
      }
    });

    // Notify conversation updates to all members except sender
    conversation.members
      .filter((memberId) => memberId !== currentUserId)
      .forEach((memberId) => {
        req.io.to(memberId).emit("conversation:update", { conversationId });
      });
  } else {
    console.warn("Socket.IO not available for real-time updates");
  }

  res.status(201).json({
    _id: message._id,
    text: message.text,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    createdAt: message.createdAt,
    conversationId: message.conversationId,
    status: message.status
  });
});