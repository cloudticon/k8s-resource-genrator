import { describe, it, expect } from "vitest";
import {
  openAPIToZ,
  generateObjectShape,
  resolveAllOf,
} from "../src/type-generator.js";
import type { JSONSchema } from "../src/types.js";

describe("openAPIToZ", () => {
  it("should convert string type", () => {
    expect(openAPIToZ({ type: "string" })).toBe("z.string()");
  });

  it("should convert integer type", () => {
    expect(openAPIToZ({ type: "integer" })).toBe("z.number()");
  });

  it("should convert number type", () => {
    expect(openAPIToZ({ type: "number" })).toBe("z.number()");
  });

  it("should convert boolean type", () => {
    expect(openAPIToZ({ type: "boolean" })).toBe("z.boolean()");
  });

  it("should convert enum type", () => {
    const result = openAPIToZ({ type: "string", enum: ["a", "b", "c"] });
    expect(result).toBe('z.enum(["a","b","c"])');
  });

  it("should add .optional() for non-required fields", () => {
    expect(openAPIToZ({ type: "string" }, false)).toBe(
      "z.string().optional()",
    );
  });

  it("should add .default() for fields with default value", () => {
    expect(openAPIToZ({ type: "number", default: 3 }, false)).toBe(
      "z.number().default(3)",
    );
  });

  it("should prefer .default() over .optional()", () => {
    expect(openAPIToZ({ type: "string", default: "hello" }, false)).toBe(
      'z.string().default("hello")',
    );
  });

  it("should convert array of strings", () => {
    const schema: JSONSchema = { type: "array", items: { type: "string" } };
    expect(openAPIToZ(schema)).toBe("z.array(z.string())");
  });

  it("should convert array of enums", () => {
    const schema: JSONSchema = {
      type: "array",
      items: { type: "string", enum: ["a", "b"] },
    };
    expect(openAPIToZ(schema)).toBe('z.array(z.enum(["a","b"]))');
  });

  it("should convert array without items to array of strings", () => {
    const schema: JSONSchema = { type: "array" };
    expect(openAPIToZ(schema)).toBe("z.array(z.string())");
  });

  it("should convert object with properties", () => {
    const schema: JSONSchema = {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        value: { type: "number" },
      },
    };
    const result = openAPIToZ(schema);
    expect(result).toContain("z.object({");
    expect(result).toContain("name: z.string(),");
    expect(result).toContain("value: z.number().optional(),");
    expect(result).toMatch(/\}\)$/);
  });

  it("should convert record type (additionalProperties)", () => {
    const schema: JSONSchema = {
      type: "object",
      additionalProperties: { type: "string" },
    };
    expect(openAPIToZ(schema)).toBe("z.record(z.string())");
  });

  it("should ignore boolean additionalProperties", () => {
    const schema: JSONSchema = {
      type: "object",
      additionalProperties: true,
    };
    expect(openAPIToZ(schema)).toBe("z.record(z.string())");
  });

  it("should convert object without properties to record", () => {
    const schema: JSONSchema = { type: "object" };
    expect(openAPIToZ(schema)).toBe("z.record(z.string())");
  });

  it("should handle nested objects", () => {
    const schema: JSONSchema = {
      type: "object",
      required: ["ref"],
      properties: {
        ref: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            kind: { type: "string", enum: ["Issuer", "ClusterIssuer"] },
          },
        },
      },
    };
    const result = openAPIToZ(schema);
    expect(result).toContain("ref: z.object({");
    expect(result).toContain("name: z.string(),");
    expect(result).toContain(
      'kind: z.enum(["Issuer","ClusterIssuer"]).optional(),',
    );
  });

  it("should handle array of objects", () => {
    const schema: JSONSchema = {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          value: { type: "string" },
        },
      },
    };
    const result = openAPIToZ(schema);
    expect(result).toContain("z.array(z.object({");
    expect(result).toContain("name: z.string(),");
    expect(result).toContain("value: z.string().optional(),");
  });

  it("should default to z.string() for unknown types", () => {
    expect(openAPIToZ({} as JSONSchema)).toBe("z.string()");
  });

  it("should resolve allOf wrappers", () => {
    const schema: JSONSchema = {
      allOf: [
        {
          description: "DeploymentSpec",
          properties: {
            replicas: { type: "integer" },
            selector: { type: "object" },
          },
          required: ["selector"],
        },
      ],
      default: {},
    };
    const result = openAPIToZ(schema);
    expect(result).toContain("z.object({");
    expect(result).toContain("replicas: z.number().optional(),");
    expect(result).toContain("selector: z.record(z.string()),");
  });

  it("should resolve nested allOf in properties", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        timestamp: {
          allOf: [{ type: "string", format: "date-time" }],
          description: "Creation time",
        },
      },
    };
    const result = openAPIToZ(schema);
    expect(result).toContain("timestamp: z.string().optional(),");
  });

  it("should handle format int-or-string as z.string()", () => {
    const schema: JSONSchema = {
      allOf: [{ format: "int-or-string" }],
      description: "Can be int or string",
    };
    expect(openAPIToZ(schema)).toBe("z.string()");
  });

  it("should infer object type from properties when type is missing", () => {
    const schema: JSONSchema = {
      properties: {
        name: { type: "string" },
      },
    };
    const result = openAPIToZ(schema);
    expect(result).toContain("z.object({");
    expect(result).toContain("name: z.string().optional(),");
  });
});

describe("resolveAllOf", () => {
  it("should pass through schema without allOf", () => {
    const schema: JSONSchema = { type: "string" };
    expect(resolveAllOf(schema)).toEqual(schema);
  });

  it("should merge allOf items into single schema", () => {
    const schema: JSONSchema = {
      allOf: [
        {
          type: "object",
          properties: { a: { type: "string" } },
          required: ["a"],
        },
      ],
      description: "Outer description",
    };
    const resolved = resolveAllOf(schema);
    expect(resolved.type).toBe("object");
    expect(resolved.properties).toHaveProperty("a");
    expect(resolved.required).toContain("a");
    expect(resolved.description).toBe("Outer description");
  });

  it("should merge multiple allOf items", () => {
    const schema: JSONSchema = {
      allOf: [
        { properties: { a: { type: "string" } }, required: ["a"] },
        { properties: { b: { type: "number" } } },
      ],
    };
    const resolved = resolveAllOf(schema);
    expect(resolved.properties).toHaveProperty("a");
    expect(resolved.properties).toHaveProperty("b");
    expect(resolved.required).toContain("a");
  });

  it("should handle nested allOf recursively", () => {
    const schema: JSONSchema = {
      allOf: [
        {
          allOf: [{ type: "string", format: "date-time" }],
          description: "Timestamp",
        },
      ],
    };
    const resolved = resolveAllOf(schema);
    expect(resolved.type).toBe("string");
    expect(resolved.format).toBe("date-time");
    expect(resolved.description).toBe("Timestamp");
  });

  it("should preserve outer default over allOf", () => {
    const schema: JSONSchema = {
      allOf: [{ type: "object", properties: { a: { type: "string" } } }],
      default: {},
    };
    const resolved = resolveAllOf(schema);
    expect(resolved.default).toEqual({});
    expect(resolved.properties).toHaveProperty("a");
  });
});

describe("generateObjectShape", () => {
  it("should generate object shape for simple properties", () => {
    const schema: JSONSchema = {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        count: { type: "integer" },
      },
    };
    const result = generateObjectShape(schema);
    expect(result).toContain("name: z.string(),");
    expect(result).toContain("count: z.number().optional(),");
    expect(result).toMatch(/^\{/);
    expect(result).toMatch(/\}$/);
  });

  it("should return {} for schema without properties", () => {
    expect(generateObjectShape({ type: "object" })).toBe("{}");
  });

  it("should handle nested objects within shape", () => {
    const schema: JSONSchema = {
      type: "object",
      required: ["config"],
      properties: {
        config: {
          type: "object",
          properties: {
            key: { type: "string" },
          },
        },
      },
    };
    const result = generateObjectShape(schema);
    expect(result).toContain("config: z.object({");
    expect(result).toContain("key: z.string().optional(),");
  });

  it("should resolve allOf in top-level schema", () => {
    const schema: JSONSchema = {
      allOf: [
        {
          description: "DeploymentSpec",
          properties: {
            replicas: { type: "integer" },
            selector: { type: "string" },
          },
          required: ["selector"],
        },
      ],
      default: {},
    };
    const result = generateObjectShape(schema);
    expect(result).toContain("replicas: z.number().optional(),");
    expect(result).toContain("selector: z.string(),");
  });
});
