const { verifyToken } = require("../auth");

function extractSocketToken(handshake) {
  // Check auth object first (Socket.IO v3+)
  if (handshake.auth && handshake.auth.token) {
    return handshake.auth.token;
  }

  // Check query parameters
  if (handshake.query && handshake.query.token) {
    return handshake.query.token;
  }

  // Check Authorization header
  const authHeader = handshake.headers.authorization || handshake.headers.Authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) {
      return token;
    }
  }

  return null;
}

function socketAuthMiddleware(socket, next) {
  (async () => {
    try {
      const token = extractSocketToken(socket.handshake);

      // Development fallback - only in development mode
      if (!token) {
        if (process.env.NODE_ENV === "development") {
          console.warn("⚠️  No token provided in development; using dev fallback");
          const devUserId = process.env.DEV_USER_ID || "dev-user-socket";
          socket.data = {
            userId: devUserId,
            sessionId: "dev-session",
            claims: { 
              sub: devUserId, 
              sid: "dev-session", 
              email: process.env.DEV_USER_EMAIL || "dev@example.com" 
            }
          };
          return next();
        } else {
          throw new Error("Authentication token is required");
        }
      }

      if (!token || token === "null" || token === "undefined") {
        throw new Error("Invalid authentication token");
      }

      // Verify the token with Clerk
      const claims = await verifyToken(token);
      
      if (!claims?.sub) {
        throw new Error("Invalid token: missing user ID");
      }

      socket.data = {
        userId: claims.sub,
        sessionId: claims.sid,
        claims
      };

      console.log(`✅ Socket authenticated for user: ${claims.sub}`);
      next();
    } catch (error) {
      console.error("❌ Socket auth error:", error.message);
      
      // Provide more specific error information
      const authError = new Error(`Authentication failed: ${error.message}`);
      authError.data = { 
        code: "UNAUTHORIZED",
        message: error.message,
        timestamp: new Date().toISOString()
      };
      next(authError);
    }
  })();
}

module.exports = {
  socketAuthMiddleware,
  extractSocketToken
};