// src/app.ts
import express from "express";

// src/module/auth/auth.router.ts
import { Router } from "express";

// src/module/auth/auth.controller.ts
import { StatusCodes as StatusCodes2 } from "http-status-codes";

// src/config/database.ts
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
var { Pool } = pg;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});
var initDb = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'contributor' CHECK (role IN ('contributor', 'maintainer')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createIssuesTable = `
    CREATE TABLE IF NOT EXISTS issues (
      id SERIAL PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      type VARCHAR(20) CHECK (type IN ('bug', 'feature_request')),
      status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
      reporter_id INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createUsersTable);
    await pool.query(createIssuesTable);
    console.log("Database Created successfully.");
  } catch (error) {
    console.error("Error executing initialization queries:", error);
    process.exit(1);
  }
};

// src/module/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// src/utils/app-error.ts
var AppError = class extends Error {
  statusCode;
  errors;
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
};

// src/module/auth/auth.service.ts
import { StatusCodes } from "http-status-codes";
var AuthService = class {
  static async registerUser(body) {
    const { name, email, password, role } = body;
    if (!name || !email || !password) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Validation failed. Missing required body inputs.");
    }
    const assignedRole = role || "contributor";
    if (!["contributor", "maintainer"].includes(assignedRole)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid user identity role selected.");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const queryStr = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at, updated_at;
    `;
    const result = await pool.query(queryStr, [name, email, hashedPassword, assignedRole]);
    return result.rows[0];
  }
  static async authenticateLogin(body) {
    const { email, password } = body;
    if (!email || !password) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Email and password are required.");
    }
    const queryStr = `SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1;`;
    const result = await pool.query(queryStr, [email]);
    if (result.rowCount === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid authorization credentials provided.");
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid authorization credentials provided.");
    }
    delete user.password;
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "24h" }
    );
    return { token, user };
  }
};

// src/utils/response.utils.ts
var sendSuccess = (res, statusCode, message, data) => {
  res.status(statusCode).json({
    success: true,
    message,
    ...data !== void 0 && { data }
  });
};

// src/module/auth/auth.controller.ts
var signup = async (req, res, next) => {
  try {
    const registeredUser = await AuthService.registerUser(req.body);
    sendSuccess(res, StatusCodes2.CREATED, "User registered successfully", registeredUser);
  } catch (error) {
    next(error);
  }
};
var login = async (req, res, next) => {
  try {
    const loginPayload = await AuthService.authenticateLogin(req.body);
    sendSuccess(res, StatusCodes2.OK, "Login successful", loginPayload);
  } catch (error) {
    next(error);
  }
};

// src/module/auth/auth.router.ts
var router = Router();
router.post("/signup", signup);
router.post("/login", login);
var authRouter = router;

// src/module/issues/issues.router.ts
import { Router as Router2 } from "express";

// src/middleware/auth.middleware.ts
import { StatusCodes as StatusCodes3 } from "http-status-codes";
import jwt2 from "jsonwebtoken";
var authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new AppError(StatusCodes3.UNAUTHORIZED, "Authentication token missing."));
  }
  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decoded = jwt2.verify(token, process.env.JWT_SECRET || "fallback_secret");
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError(StatusCodes3.UNAUTHORIZED, "Invalid or expired authentication token."));
  }
};
var authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(StatusCodes3.UNAUTHORIZED, "Authentication required."));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(StatusCodes3.FORBIDDEN, "Insufficient systemic permissions."));
    }
    next();
  };
};

// src/module/issues/issues.controller.ts
import { StatusCodes as StatusCodes5 } from "http-status-codes";

// src/module/issues/issues.service.ts
import { StatusCodes as StatusCodes4 } from "http-status-codes";
var IssuesService = class {
  static async createIssue(body, reporterId) {
    const { title, description, type } = body;
    if (!title || title.length > 150) {
      throw new AppError(
        StatusCodes4.BAD_REQUEST,
        "Title must be provided and under 150 characters."
      );
    }
    if (!description || description.length < 20) {
      throw new AppError(
        StatusCodes4.BAD_REQUEST,
        "Description must be at least 20 characters long."
      );
    }
    if (!["bug", "feature_request"].includes(type)) {
      throw new AppError(
        StatusCodes4.BAD_REQUEST,
        "Type field category must match issue rules."
      );
    }
    const queryStr = `
      INSERT INTO issues (title, description, type, status, reporter_id)
      VALUES ($1, $2, $3, 'open', $4)
      RETURNING id, title, description, type, status, reporter_id, created_at, updated_at;
    `;
    const result = await pool.query(queryStr, [
      title,
      description,
      type,
      reporterId
    ]);
    return result.rows[0];
  }
  static async getAllIssues(filters) {
    const { sort, type, status } = filters;
    let baseQuery = `SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues`;
    const queryParams = [];
    const executionClauses = [];
    if (type) {
      queryParams.push(type);
      executionClauses.push(`type = $${queryParams.length}`);
    }
    if (status) {
      queryParams.push(status);
      executionClauses.push(`status = $${queryParams.length}`);
    }
    if (executionClauses.length > 0) {
      baseQuery += ` WHERE ` + executionClauses.join(" AND ");
    }
    const sortDirection = sort === "oldest" ? "ASC" : "DESC";
    baseQuery += ` ORDER BY created_at ${sortDirection};`;
    const issuesResult = await pool.query(baseQuery, queryParams);
    const issues = issuesResult.rows;
    if (issues.length === 0) return [];
    const uniqueReporterIds = Array.from(
      new Set(issues.map((i) => i.reporter_id))
    );
    const userPlaceholders = uniqueReporterIds.map((_, index) => `$${index + 1}`).join(",");
    const usersQuery = `SELECT id, name, role FROM users WHERE id IN (${userPlaceholders});`;
    const usersResult = await pool.query(usersQuery, uniqueReporterIds);
    const userMap = /* @__PURE__ */ new Map();
    usersResult.rows.forEach((u) => userMap.set(u.id, u));
    return issues.map((issue) => {
      const { reporter_id, ...rest } = issue;
      return {
        ...rest,
        reporter: userMap.get(reporter_id) || {
          id: reporter_id,
          name: "Unknown User",
          role: "contributor"
        }
      };
    });
  }
  static async getSingleIssue(id) {
    const issueQuery = `SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1;`;
    const issueResult = await pool.query(issueQuery, [id]);
    if (issueResult.rowCount === 0) {
      throw new AppError(
        StatusCodes4.NOT_FOUND,
        "The requested issue resource does not exist."
      );
    }
    const issue = issueResult.rows[0];
    const userQuery = `SELECT id, name, role FROM users WHERE id = $1;`;
    const userResult = await pool.query(userQuery, [issue.reporter_id]);
    const { reporter_id, ...rest } = issue;
    return {
      ...rest,
      reporter: userResult.rows.length > 0 ? userResult.rows[0] : { id: reporter_id, name: "Unknown User", role: "contributor" }
    };
  }
  static async updateIssue(id, body, user) {
    const checkQuery = `SELECT id, status, reporter_id FROM issues WHERE id = $1;`;
    const checkResult = await pool.query(checkQuery, [id]);
    if (checkResult.rowCount === 0) {
      throw new AppError(
        StatusCodes4.NOT_FOUND,
        "The requested issue resource does not exist."
      );
    }
    const physicalIssue = checkResult.rows[0];
    if (user.role !== "maintainer") {
      if (physicalIssue.reporter_id !== user.id) {
        throw new AppError(
          StatusCodes4.FORBIDDEN,
          "Insufficient systemic permissions."
        );
      }
      if (physicalIssue.status !== "open") {
        throw new AppError(
          StatusCodes4.CONFLICT,
          "Contributors can only edit open issues."
        );
      }
    }
    const { title, description, type, status } = body;
    const dynamicUpdates = [];
    const values = [];
    if (title !== void 0) {
      if (title.length > 150)
        throw new AppError(
          StatusCodes4.BAD_REQUEST,
          "Title exceeds max length."
        );
      values.push(title);
      dynamicUpdates.push(`title = $${values.length}`);
    }
    if (description !== void 0) {
      if (description.length < 20)
        throw new AppError(
          StatusCodes4.BAD_REQUEST,
          "Description is too short."
        );
      values.push(description);
      dynamicUpdates.push(`description = $${values.length}`);
    }
    if (type !== void 0) {
      if (!["bug", "feature_request"].includes(type))
        throw new AppError(StatusCodes4.BAD_REQUEST, "Invalid type selection.");
      values.push(type);
      dynamicUpdates.push(`type = $${values.length}`);
    }
    if (status !== void 0) {
      if (user.role !== "maintainer") {
        throw new AppError(
          StatusCodes4.FORBIDDEN,
          "Only system maintainers can alter workflow states."
        );
      }
      if (!["open", "in_progress", "resolved"].includes(status)) {
        throw new AppError(
          StatusCodes4.BAD_REQUEST,
          "Invalid status cycle target."
        );
      }
      values.push(status);
      dynamicUpdates.push(`status = $${values.length}`);
    }
    if (dynamicUpdates.length === 0) {
      return this.getSingleIssue(id);
    }
    values.push(/* @__PURE__ */ new Date());
    dynamicUpdates.push(`updated_at = $${values.length}`);
    values.push(id);
    const updateQuery = `
      UPDATE issues 
      SET ${dynamicUpdates.join(", ")} 
      WHERE id = $${values.length} 
      RETURNING id, title, description, type, status, reporter_id, created_at, updated_at;
    `;
    const result = await pool.query(updateQuery, values);
    return result.rows[0];
  }
  static async deleteIssue(id) {
    const checkQuery = `SELECT id FROM issues WHERE id = $1;`;
    const checkResult = await pool.query(checkQuery, [id]);
    if (checkResult.rowCount === 0) {
      throw new AppError(
        StatusCodes4.NOT_FOUND,
        "The requested issue resource does not exist."
      );
    }
    const deleteQuery = `DELETE FROM issues WHERE id = $1;`;
    await pool.query(deleteQuery, [id]);
  }
};

// src/module/issues/issues.controller.ts
var createIssue = async (req, res, next) => {
  try {
    const reporterId = req.user.id;
    const createdIssue = await IssuesService.createIssue(req.body, reporterId);
    sendSuccess(
      res,
      StatusCodes5.CREATED,
      "Issue created successfully",
      createdIssue
    );
  } catch (error) {
    next(error);
  }
};
var getAllIssues = async (req, res, next) => {
  try {
    const data = await IssuesService.getAllIssues(req.query);
    res.status(StatusCodes5.OK).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
var getSingleIssue = async (req, res, next) => {
  try {
    const { id: rawId } = req.params;
    if (!rawId || typeof rawId !== "string") {
      res.status(StatusCodes5.BAD_REQUEST).json({
        success: false,
        message: "A valid numeric ID must be provided in the request parameters."
      });
      return;
    }
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(StatusCodes5.BAD_REQUEST).json({
        success: false,
        message: "The provided ID is not a valid number."
      });
      return;
    }
    const data = await IssuesService.getSingleIssue(id);
    res.status(StatusCodes5.OK).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
var updateIssue = async (req, res, next) => {
  try {
    const { id: rawId } = req.params;
    if (!rawId || typeof rawId !== "string") {
      res.status(StatusCodes5.BAD_REQUEST).json({
        success: false,
        message: "A valid numeric ID must be provided in the request parameters."
      });
      return;
    }
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(StatusCodes5.BAD_REQUEST).json({
        success: false,
        message: "The provided ID is not a valid number."
      });
      return;
    }
    if (!req.user) {
      res.status(StatusCodes5.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required."
      });
      return;
    }
    const updatedIssue = await IssuesService.updateIssue(
      id,
      req.body,
      req.user
    );
    sendSuccess(
      res,
      StatusCodes5.OK,
      "Issue updated successfully",
      updatedIssue
    );
  } catch (error) {
    next(error);
  }
};
var deleteIssue = async (req, res, next) => {
  try {
    const { id: rawId } = req.params;
    if (!rawId || typeof rawId !== "string") {
      res.status(StatusCodes5.BAD_REQUEST).json({
        success: false,
        message: "A valid numeric ID must be provided in the request parameters."
      });
      return;
    }
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(StatusCodes5.BAD_REQUEST).json({
        success: false,
        message: "The provided ID is not a valid number."
      });
      return;
    }
    await IssuesService.deleteIssue(id);
    sendSuccess(res, StatusCodes5.OK, "Issue deleted successfully");
  } catch (error) {
    next(error);
  }
};

// src/module/issues/issues.router.ts
var router2 = Router2();
router2.post("/", authenticate, authorize("contributor", "maintainer"), createIssue);
router2.get("/", getAllIssues);
router2.get("/:id", getSingleIssue);
router2.patch("/:id", authenticate, authorize("contributor", "maintainer"), updateIssue);
router2.delete("/:id", authenticate, authorize("maintainer"), deleteIssue);
var issuesRouter = router2;

// src/middleware/error.middleware.ts
import { StatusCodes as StatusCodes6 } from "http-status-codes";
var errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...err.errors && { errors: err.errors }
    });
    return;
  }
  if ("code" in err && err.code === "23505") {
    res.status(StatusCodes6.CONFLICT).json({
      success: false,
      message: "Resource database conflict detected.",
      errors: "This unique element already exists."
    });
    return;
  }
  console.error("Unhandled Exception:", err);
  res.status(StatusCodes6.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "An unexpected internal error occurred.",
    errors: process.env.NODE_ENV === "development" ? err.message : null
  });
};

// src/app.ts
var app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/issues", issuesRouter);
app.use(errorHandler);
var app_default = app;

// src/server.ts
var PORT = process.env.PORT || 5e3;
var Server = async () => {
  await initDb();
  app_default.listen(PORT, () => {
    console.log(`DevPulse server run port: ${PORT}`);
  });
};
Server();
//# sourceMappingURL=server.js.map