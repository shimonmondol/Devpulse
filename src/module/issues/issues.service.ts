import { pool } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { StatusCodes } from "http-status-codes";
import type { IssueRow } from "./issues.types";

export class IssuesService {
  public static async createIssue(
    body: any,
    reporterId: number,
  ): Promise<IssueRow> {
    const { title, description, type } = body;

    if (!title || title.length > 150) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Title must be provided and under 150 characters.",
      );
    }
    if (!description || description.length < 20) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Description must be at least 20 characters long.",
      );
    }
    if (!["bug", "feature_request"].includes(type)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Type field category must match issue rules.",
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
      reporterId,
    ]);
    return result.rows[0];
  }

  public static async getAllIssues(filters: any): Promise<any[]> {
    const { sort, type, status } = filters;
    let baseQuery = `SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues`;
    const queryParams: any[] = [];
    const executionClauses: string[] = [];

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
    const issues: IssueRow[] = issuesResult.rows;

    if (issues.length === 0) return [];

    // Fulfilling requirements without SQL JOIN operations
    const uniqueReporterIds = Array.from(
      new Set(issues.map((i) => i.reporter_id)),
    );

    const userPlaceholders = uniqueReporterIds
      .map((_, index) => `$${index + 1}`)
      .join(",");
    const usersQuery = `SELECT id, name, role FROM users WHERE id IN (${userPlaceholders});`;

    const usersResult = await pool.query(usersQuery, uniqueReporterIds);
    const userMap = new Map<number, any>();
    usersResult.rows.forEach((u) => userMap.set(u.id, u));

    return issues.map((issue) => {
      const { reporter_id, ...rest } = issue;
      return {
        ...rest,
        reporter: userMap.get(reporter_id) || {
          id: reporter_id,
          name: "Unknown User",
          role: "contributor",
        },
      };
    });
  }

  public static async getSingleIssue(id: number): Promise<any> {
    const issueQuery = `SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1;`;
    const issueResult = await pool.query(issueQuery, [id]);

    if (issueResult.rowCount === 0) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "The requested issue resource does not exist.",
      );
    }

    const issue: IssueRow = issueResult.rows[0];
    const userQuery = `SELECT id, name, role FROM users WHERE id = $1;`;
    const userResult = await pool.query(userQuery, [issue.reporter_id]);

    const { reporter_id, ...rest } = issue;
    return {
      ...rest,
      reporter:
        userResult.rows.length > 0
          ? userResult.rows[0]
          : { id: reporter_id, name: "Unknown User", role: "contributor" },
    };
  }

  public static async updateIssue(
    id: number,
    body: any,
    user: any,
  ): Promise<IssueRow> {
    const checkQuery = `SELECT id, status, reporter_id FROM issues WHERE id = $1;`;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "The requested issue resource does not exist.",
      );
    }

    const physicalIssue = checkResult.rows[0];

    // Business Logic Permissions Gate
    if (user.role !== "maintainer") {
      if (physicalIssue.reporter_id !== user.id) {
        throw new AppError(
          StatusCodes.FORBIDDEN,
          "Insufficient systemic permissions.",
        );
      }
      if (physicalIssue.status !== "open") {
        throw new AppError(
          StatusCodes.CONFLICT,
          "Contributors can only edit open issues.",
        );
      }
    }

    const { title, description, type, status } = body;
    const dynamicUpdates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      if (title.length > 150)
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Title exceeds max length.",
        );
      values.push(title);
      dynamicUpdates.push(`title = $${values.length}`);
    }
    if (description !== undefined) {
      if (description.length < 20)
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Description is too short.",
        );
      values.push(description);
      dynamicUpdates.push(`description = $${values.length}`);
    }
    if (type !== undefined) {
      if (!["bug", "feature_request"].includes(type))
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid type selection.");
      values.push(type);
      dynamicUpdates.push(`type = $${values.length}`);
    }
    if (status !== undefined) {
      if (user.role !== "maintainer") {
        throw new AppError(
          StatusCodes.FORBIDDEN,
          "Only system maintainers can alter workflow states.",
        );
      }
      if (!["open", "in_progress", "resolved"].includes(status)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Invalid status cycle target.",
        );
      }
      values.push(status);
      dynamicUpdates.push(`status = $${values.length}`);
    }

    if (dynamicUpdates.length === 0) {
      return this.getSingleIssue(id);
    }

    values.push(new Date());
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

  public static async deleteIssue(id: number): Promise<void> {
    const checkQuery = `SELECT id FROM issues WHERE id = $1;`;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "The requested issue resource does not exist.",
      );
    }

    const deleteQuery = `DELETE FROM issues WHERE id = $1;`;
    await pool.query(deleteQuery, [id]);
  }
}
