const { createClerkClient, verifyToken: clerkVerifyToken } = require("@clerk/backend");

const secretKey = process.env.CLERK_SECRET_KEY;
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;

console.log("🔐 Auth Configuration:", {
  hasSecretKey: !!secretKey,
  nodeEnv: process.env.NODE_ENV || "undefined",
  port: process.env.PORT
});

function extractBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  return scheme === "Bearer" ? value.trim() : null;
}

async function verifyToken(token) {
  if (!token) {
    throw new Error("Token missing");
  }

  // Development fallback when no Clerk keys
  if (!secretKey) {
    console.warn("🚨 CLERK_SECRET_KEY not configured - using development fallback");
    
    // Simple development token validation
    if (token === "dev-token" || token.startsWith("dev-")) {
      return {
        sub: "dev-user-" + Date.now(),
        sid: "dev-session",
        email: "dev@example.com",
        firstName: "Development",
        lastName: "User"
      };
    }
    
    // Try to extract from any token format
    try {
      // For JWT-like tokens in development
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          sub: payload.sub || payload.userId || "dev-user",
          sid: payload.sid || "dev-session",
          email: payload.email || "dev@example.com",
          firstName: payload.firstName || "Dev",
          lastName: payload.lastName || "User"
        };
      }
    } catch (e) {
      // Not a JWT, create generic dev user
    }
    
    return {
      sub: "dev-user-" + Math.random().toString(36).substring(7),
      sid: "dev-session",
      email: "dev@example.com",
      firstName: "Development",
      lastName: "User"
    };
  }

  // Production: Verify with Clerk
  try {
    console.log("🔍 Verifying token with Clerk...");
    const result = await clerkVerifyToken(token, { secretKey });
    console.log("✅ Token verified successfully for user:", result.sub);
    return result;
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    
    // Development fallback on verification failure
    if (process.env.NODE_ENV === "development") {
      console.warn("🛠️ Using development fallback due to verification failure");
      return {
        sub: "dev-user-fallback",
        sid: "dev-session", 
        email: "dev@example.com",
        firstName: "Fallback",
        lastName: "User"
      };
    }
    
    throw new Error("Invalid authentication token");
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = extractBearer(req);
    
    if (!token) {
      console.log("❌ No authorization token provided");
      return res.status(401).json({ message: "Missing authorization token" });
    }

    console.log("🔐 Processing authentication...");
    const claims = await verifyToken(token);
    
    if (!claims?.sub) {
      console.log("❌ Token missing user ID");
      return res.status(401).json({ message: "Invalid token: missing user identifier" });
    }

    req.auth = {
      userId: claims.sub,
      sessionId: claims.sid,
      claims
    };

    console.log(`✅ Authenticated user: ${claims.sub}`);
    return next();
  } catch (error) {
    console.error("🔒 Auth middleware error:", error.message);
    return res.status(401).json({ 
      message: "Authentication failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}

module.exports = {
  requireAuth,
  verifyToken
};