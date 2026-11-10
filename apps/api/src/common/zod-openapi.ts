import { ApiBody, type SchemaObject } from "@nestjs/swagger";
import { z, type ZodTypeAny } from "zod";

function isOptional(schema: ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) return true;
  if (schema instanceof z.ZodEffects) return isOptional(schema.innerType());
  return false;
}

function unwrap(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) return unwrap(schema.unwrap());
  if (schema instanceof z.ZodDefault) return unwrap(schema.removeDefault());
  if (schema instanceof z.ZodEffects) return unwrap(schema.innerType());
  return schema;
}

export function zodToOpenApi(schema: ZodTypeAny): Record<string, unknown> {
  const current = unwrap(schema);
  if (current instanceof z.ZodObject) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(current.shape)) {
      properties[key] = zodToOpenApi(value as ZodTypeAny);
      if (!isOptional(value as ZodTypeAny)) required.push(key);
    }
    return { type: "object", properties, ...(required.length > 0 ? { required } : {}) };
  }
  if (current instanceof z.ZodArray) return { type: "array", items: zodToOpenApi(current.element) };
  if (current instanceof z.ZodString) return { type: "string" };
  if (current instanceof z.ZodNumber) return { type: "number" };
  if (current instanceof z.ZodBoolean) return { type: "boolean" };
  if (current instanceof z.ZodEnum) return { type: "string", enum: current.options };
  if (current instanceof z.ZodLiteral) return { enum: [current.value] };
  if (current instanceof z.ZodUnion) {
    return { anyOf: current.options.map((option: ZodTypeAny) => zodToOpenApi(option)) };
  }
  return { type: "object", additionalProperties: true };
}

export const ApiZodBody = (schema: ZodTypeAny) => ApiBody({ schema: zodToOpenApi(schema) as SchemaObject });
