import fs from 'fs';
import path from 'path';

const dist = path.resolve('dist');
const index = path.join(dist, 'index.html');

if (!fs.existsSync(index)) {
  console.error('postbuild: dist/index.html no existe. Corré npm run build primero.');
  process.exit(1);
}

const html = fs.readFileSync(index, 'utf8');
if (html.includes('src/main.jsx')) {
  console.error('postbuild: el build sigue apuntando a src/main.jsx (build inválido).');
  process.exit(1);
}

// GitHub Pages con dominio propio usa 404.html para rutas SPA
fs.copyFileSync(index, path.join(dist, '404.html'));

const cnameSrc = path.resolve('public/CNAME');
if (fs.existsSync(cnameSrc)) {
  fs.copyFileSync(cnameSrc, path.join(dist, 'CNAME'));
  console.log('postbuild: CNAME →', fs.readFileSync(cnameSrc, 'utf8').trim());
}

console.log('postbuild: OK (404.html + verificación)');
