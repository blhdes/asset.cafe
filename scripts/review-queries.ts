// scripts/review-queries.ts
import { execSync } from 'child_process';
import path from 'path';

function runQueryAudit() {
  console.log("Starting Claude Supabase Query Audit via CLI...");

  const targetDir = path.join(process.cwd(), 'src');
  const prompt = "Review all TypeScript files in this directory. Look for Supabase database queries (e.g., supabase.from). Identify any duplicate query patterns or inefficient data fetching. Output a concise report listing the files and suggesting a shared custom hook if duplicates exist.";

  try {
    // We use npx to run the locally installed claude-code CLI
    // The -p flag passes the prompt programmatically without opening interactive mode
    const command = `npx claude -p "${prompt}"`;
    
    console.log(`Executing in ${targetDir}...\n`);
    
    // stdio: 'inherit' streams Claude's output directly to your terminal
    execSync(command, { 
      cwd: targetDir, 
      stdio: 'inherit' 
    });

    console.log("\n=== AUDIT COMPLETE ===");
  } catch (error) {
    console.error("Audit failed. Ensure you have authorized Claude Code locally.", error);
  }
}

runQueryAudit();