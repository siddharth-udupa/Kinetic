export * from "./zodSchema"

// Re-exported so consumers can branch on validation failures without depending
// on zod directly, and so `instanceof` narrowing works across the boundary.
export { ZodError } from "zod"
