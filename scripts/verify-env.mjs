import { validateEnvironment } from "../src/lib/config/environment.js";
const result = validateEnvironment(process.env, true);
result.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
if (!result.valid) {
  result.errors.forEach((error) => console.error(`Error: ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Environment valid for production (${result.mode} provider mode).`);
}
