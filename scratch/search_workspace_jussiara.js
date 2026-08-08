const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\diego\\OneDrive\\Área de Trabalho\\Rodrigues  $ Soares - Advocacia';

function scanDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('.') || f === 'node_modules' || f === '.next') continue;
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile() && (f.endsWith('.env') || f.endsWith('.json') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.prisma') || f.endsWith('.sqlite') || f.endsWith('.db'))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes('jussiara')) {
            console.log('🎯 ENCONTRADO JUSSIARA EM:', fullPath);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
}

console.log('🔍 Escaneando pasta do projeto por Jussiara...');
scanDir(rootDir);
console.log('Fim do escaneamento.');
