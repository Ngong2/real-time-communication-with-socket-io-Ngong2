const { verifyToken } = require("./auth");

function extractSocketToken(handshake) {
  if (handshake.auth && typeof handshake.auth.token === "string") {
    return handshake.auth.token;
  }

  const header = handshake.headers?.authorization || handshake.headers?.Authorization;
  if (!header) return null;

  const [scheme, value] = header.split(" ");
  if (scheme === "Bearer" && value) {
    return value.trim();
  }

  return null;
}

function socketAuthMiddleware(socket, next) {
  (async () => {
    try {
      const token = extractSocketToken(socket.handshake);

      // Development fallback when no token provided
      if (!token && process.env.NODE_ENV === "development") {
        console.warn("No token provided in development; using dev fallback");
        const devUserId = process.env.DEV_USER_ID || "dev-user-socket";
        socket.data = {
          ...socket.data,
          userId: devUserId,
          sessionId: "dev-session",
          claims: { 
            sub: devUserId, 
            sid: "dev-session", 
            email: process.env.DEV_USER_EMAIL || "dev@example.com" 
          }
        };
        return next();
      }

      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // Verify the token
      const claims = await verifyToken(token);
      
      if (!claims?.sub) {
        throw new Error("Invalid token: missing subject claim");
      }

      socket.data = {
        ...socket.data,
        userId: claims.sub,
        sessionId: claims.sid,
        claims
      };

      console.log(`Socket authenticated for user: ${claims.sub}`);
      next();
    } catch (error) {
      console.error("Socket auth error:", error.message);
      const authError = new Error(error.message);
      authError.data = { 
        code: "UNAUTHORIZED",
        message: error.message
      };
      next(authError);
    }
  })();
}

module.exports = {
  socketAuthMiddleware
};