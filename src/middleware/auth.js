const { verifyJwt } = require("../utils/auth");
const { getAuthUser } = require("../services/storeService");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Authorization token is required." });
    }

    const payload = verifyJwt(token);
    const user = await getAuthUser(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Authenticated user not found." });
    }

    req.auth = {
      tokenPayload: payload,
      user
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message || "Invalid authorization token." });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header) {
      return next();
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return next();
    }

    const payload = verifyJwt(token);
    const user = await getAuthUser(payload.sub);
    if (user) {
      req.auth = {
        tokenPayload: payload,
        user
      };
    }
    return next();
  } catch (error) {
    return next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth?.user) {
      return res.status(401).json({ error: "Authentication is required." });
    }

    if (!roles.includes(req.auth.user.role)) {
      return res.status(403).json({ error: "You do not have permission to access this resource." });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole
};
