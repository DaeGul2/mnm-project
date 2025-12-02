const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models");

const { Project } = db;
const JWT_SECRET = process.env.JWT_SECRET;

// 유틸: 프로젝트를 클라이언트에 보낼 때 password_hash 제거
function serializeProject(projectInstance) {
  if (!projectInstance) return null;
  const plain = projectInstance.toJSON();
  delete plain.password_hash;
  return plain;
}

// POST /api/projects
// body: { name, description?, password }
exports.createProject = async (req, res) => {
  try {
    const { name, description, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({
        message: "name과 password는 필수입니다.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const project = await Project.create({
      name,
      description: description || null,
      password_hash: hash,
      created_by: null, // 나중에 유저 시스템 붙이면 채우면 됨
    });

    return res.status(201).json({
      project: serializeProject(project),
    });
  } catch (err) {
    console.error("createProject error:", err);
    return res.status(500).json({
      message: "프로젝트 생성 중 오류가 발생했습니다.",
    });
  }
};

// GET /api/projects
// 단순 리스트 (비밀번호 정보 없음)
exports.listProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      order: [["created_at", "DESC"]],
    });

    return res.json({
      projects: projects.map(serializeProject),
    });
  } catch (err) {
    console.error("listProjects error:", err);
    return res.status(500).json({
      message: "프로젝트 목록 조회 중 오류가 발생했습니다.",
    });
  }
};

// GET /api/projects/:id
// 기본 정보만 (잠금 상태에서도 이름 정도는 볼 수 있게)
exports.getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        message: "프로젝트를 찾을 수 없습니다.",
      });
    }

    return res.json({
      project: serializeProject(project),
    });
  } catch (err) {
    console.error("getProject error:", err);
    return res.status(500).json({
      message: "프로젝트 조회 중 오류가 발생했습니다.",
    });
  }
};

// POST /api/projects/:id/unlock
// body: { password }
// → 비밀번호 맞으면 프로젝트 전용 토큰 발급
exports.unlockProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "password는 필수입니다.",
      });
    }

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        message: "프로젝트를 찾을 수 없습니다.",
      });
    }

    const isMatch = await bcrypt.compare(password, project.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        message: "비밀번호가 올바르지 않습니다.",
      });
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET이 설정되어 있지 않습니다.");
      return res.status(500).json({
        message: "서버 설정 오류(JWT_SECRET).",
      });
    }

    const token = jwt.sign(
      {
        projectId: project.id,
      },
      JWT_SECRET,
      {
        expiresIn: "12h",
      }
    );

    return res.json({
      token,
      project: serializeProject(project),
    });
  } catch (err) {
    console.error("unlockProject error:", err);
    return res.status(500).json({
      message: "프로젝트 잠금 해제 중 오류가 발생했습니다.",
    });
  }
};

// PUT /api/projects/:id
// body: { name?, description?, newPassword? }
// ※ 프로젝트 토큰 필요 (본인 프로젝트만 수정 가능)
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, newPassword } = req.body;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        message: "프로젝트를 찾을 수 없습니다.",
      });
    }

    // projectAuth 미들웨어에서 넣어줄 값 사용
    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(id)) {
      return res.status(403).json({
        message: "이 프로젝트를 수정할 권한이 없습니다.",
      });
    }

    if (name) project.name = name;
    if (typeof description !== "undefined") {
      project.description = description;
    }

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword, salt);
      project.password_hash = hash;
    }

    await project.save();

    return res.json({
      project: serializeProject(project),
    });
  } catch (err) {
    console.error("updateProject error:", err);
    return res.status(500).json({
      message: "프로젝트 수정 중 오류가 발생했습니다.",
    });
  }
};

// DELETE /api/projects/:id
// 실제 삭제 or is_archived 처리 (여기선 실제 삭제로)
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        message: "프로젝트를 찾을 수 없습니다.",
      });
    }

    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(id)) {
      return res.status(403).json({
        message: "이 프로젝트를 삭제할 권한이 없습니다.",
      });
    }

    await project.destroy();

    return res.json({
      message: "프로젝트가 삭제되었습니다.",
    });
  } catch (err) {
    console.error("deleteProject error:", err);
    return res.status(500).json({
      message: "프로젝트 삭제 중 오류가 발생했습니다.",
    });
  }
};
