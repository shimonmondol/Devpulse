import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { IssuesService } from "./issues.service";
import { sendSuccess } from "../../utils/response.utils";

export const createIssue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reporterId = req.user!.id;
    const createdIssue = await IssuesService.createIssue(req.body, reporterId);
    sendSuccess(
      res,
      StatusCodes.CREATED,
      "Issue created successfully",
      createdIssue,
    );
  } catch (error) {
    next(error);
  }
};

export const getAllIssues = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await IssuesService.getAllIssues(req.query);
    res.status(StatusCodes.OK).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSingleIssue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: rawId } = req.params;

    // 1. Guard clause: Ensure the ID exists and is a single string
    if (!rawId || typeof rawId !== "string") {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "A valid numeric ID must be provided in the request parameters.",
      });
      return;
    }

    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "The provided ID is not a valid number.",
      });
      return;
    }
    const data = await IssuesService.getSingleIssue(id);
    res.status(StatusCodes.OK).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: rawId } = req.params;
    if (!rawId || typeof rawId !== "string") {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "A valid numeric ID must be provided in the request parameters.",
      });
      return;
    }
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "The provided ID is not a valid number.",
      });
      return;
    }
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }
    const updatedIssue = await IssuesService.updateIssue(
      id,
      req.body,
      req.user,
    );
    sendSuccess(
      res,
      StatusCodes.OK,
      "Issue updated successfully",
      updatedIssue,
    );
  } catch (error) {
    next(error);
  }
};

export const deleteIssue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: rawId } = req.params;
    if (!rawId || typeof rawId !== "string") {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "A valid numeric ID must be provided in the request parameters.",
      });
      return;
    }
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "The provided ID is not a valid number.",
      });
      return;
    }
    await IssuesService.deleteIssue(id);
    sendSuccess(res, StatusCodes.OK, "Issue deleted successfully");
  } catch (error) {
    next(error);
  }
};
