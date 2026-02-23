import fs from 'fs';
import path from 'path';

const examplePath = path.join(process.cwd(), '.claude/settings.example.json');
const localPath = path.join(process.cwd(), '.claude/settings.local.json');

if (!fs.existsSync(examplePath)) {
  console.error("Error: settings.example.json not found at " + examplePath);
  process.exit(1);
}

const content = fs.readFileSync(examplePath, 'utf8');
const updatedContent = content.replace(/\$PWD/g, process.cwd());

fs.writeFileSync(localPath, updatedContent);
console.log("Success: settings.local.json generated with absolute paths.");