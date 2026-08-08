const fs = require('fs');
const path = require('path');

const sistemaAdvPath = 'c:\\Users\\diego\\OneDrive\\Área de Trabalho\\Rodrigues  $ Soares - Advocacia\\sistema-advocacia';

function checkEnv(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (f === '.env' || f === '.env.local' || f === '.env.production') {
        console.log(`--- ${full} ---`);
        console.log(fs.readFileSync(full, 'utf8'));
      }
      if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.next' && f !== '.git') {
        checkEnv(full);
      }
    }
  } catch (e) {}
}

console.log('🔍 Checando arquivos .env no sistema-advocacia:');
checkEnv(sistemaAdvPath);
