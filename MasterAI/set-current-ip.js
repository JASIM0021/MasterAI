const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get current local IP address (first non-loopback inet from en0)
const ifconfig = execSync('ifconfig').toString();
const match = ifconfig.match(/en0:.*?(\n\s+.*)+/);
let ip = '127.0.0.1';
if (match) {
  const inetMatch = match[0].match(/inet (\d+\.\d+\.\d+\.\d+)/);
  if (inetMatch) ip = inetMatch[1];
}

// Path to globalApiSlice.ts
const filePath = path.join(__dirname, 'app/features/api/globalApiSlice.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the IP_ADDRESS assignment
content = content.replace(
  /let IP_ADDRESS\s*=\s*['"`][^'"`]+['"`]/,
  `let IP_ADDRESS = '${ip}'`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Updated IP_ADDRESS to ${ip} in globalApiSlice.ts`);