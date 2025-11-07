const UserProfile = require("../models/UserProfile");
const asyncHandler = require("../utils/asyncHandler");

const normalizeDisplayName = (displayName, claims) => {
  if (displayName) return displayName;
  if (claims?.first_name || claims?.last_name) {
    return [claims.first_name, claims.last_name].filter(Boolean).join(" ");
  }
  if (claims?.username) return claims.username;
  return "Chat User";
};

exports.listUsers = asyncHandler(async (req, res) => {
  const profiles = await UserProfile.find()
    .select("clerkUserId displayName avatarUrl email lastSeenAt")
    .sort({ displayName: 1 });

  res.json(profiles);
});

exports.syncProfile = asyncHandler(async (req, res) => {
  const clerkUserId = req.auth.userId;
  const { displayName, avatarUrl, email } = req.body;

  const profile = await UserProfile.findOneAndUpdate(
    { clerkUserId },
    {
      clerkUserId,
      displayName: normalizeDisplayName(displayName, req.auth.claims),
      avatarUrl: avatarUrl || req.auth.claims?.image_url || "",
      email: email || req.auth.claims?.email,
      lastSeenAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  res.json(profile);
});
