const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function projectAuth(req, res, next) {
  try {
    // 우선순위:
    // 1) Authorization: Bearer <token>
    // 2) x-project-token 헤더
    const authHeader = req.headers.authorization;
    const headerToken = req.headers["x-project-token"];

    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (typeof headerToken === "string") {
      token = headerToken;
    }

    if (!token) {
      return res.status(401).json({
        message: "프로젝트 토큰이 필요합니다.",
      });
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET이 설정되어 있지 않습니다.");
      return res.status(500).json({
        message: "서버 설정 오류(JWT_SECRET).",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // payload: { projectId }
    req.projectId = decoded.projectId;

    return next();
  } catch (err) {
    console.error("projectAuth error:", err);
    return res.status(401).json({
      message: "유효하지 않은 프로젝트 토큰입니다.",
    });
  }
};
