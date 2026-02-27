import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { CuratedDataSchema } from "./data/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonSchema = z.toJSONSchema(CuratedDataSchema);

const outputPath = path.join(__dirname, "data", "schema.gen.json");

fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2), "utf-8");

console.log(`JSON Schema generated at: ${outputPath}`);
