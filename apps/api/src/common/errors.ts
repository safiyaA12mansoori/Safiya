import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export function notFound(message = "Record not found"): never {
  throw new NotFoundException({ code: "NOT_FOUND", message });
}

export function rethrowConflict(error: unknown, message: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictException({ code: "CONFLICT", message });
  }
  throw error;
}
