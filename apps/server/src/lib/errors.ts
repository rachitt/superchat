import { TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server";
import type { Socket } from "socket.io";
import logger from "./logger.js";

export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  AI_ERROR: "AI_ERROR",
  GAME_ERROR: "GAME_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

const errorCodeToTRPC: Record<ErrorCodeType, TRPC_ERROR_CODE_KEY> = {
  VALIDATION_ERROR: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "TOO_MANY_REQUESTS",
  AI_ERROR: "INTERNAL_SERVER_ERROR",
  GAME_ERROR: "BAD_REQUEST",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
};

const errorCodeToStatus: Record<ErrorCodeType, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  AI_ERROR: 500,
  GAME_ERROR: 400,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCodeType, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = errorCodeToStatus[code];
    this.details = details;
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: errorCodeToTRPC[this.code],
      message: this.message,
      cause: this,
    });
  }
}

export function handleSocketError(socket: Socket, err: unknown) {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, details: err.details }, err.message);
    socket.emit("error", { message: err.message, code: err.code });
  } else {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    logger.error({ err }, "Unhandled socket error");
    socket.emit("error", { message, code: ErrorCode.INTERNAL_ERROR });
  }
}
