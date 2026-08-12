const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Land_ocean_ice_2048.jpg';
const destFolder = path.resolve(__dirname, 'assets');
const dest = path.resolve(destFolder, 'earth_mask.jpg');

if (!fs.existsSync(destFolder)) {
  fs.mkdirSync(destFolder, { recursive: true });
}

console.log('Baixando mapa base da Terra (NASA Blue Marble 2048x1024)...');
console.log('URL:', url);

const file = fs.createWriteStream(dest);
https.get(url, function(response) {
  if (response.statusCode !== 200) {
    console.error(`Erro ao baixar a imagem: HTTP ${response.statusCode}`);
    process.exit(1);
  }
  response.pipe(file);
  file.on('finish', function() {
    file.close(() => {
      console.log(`Download concluído e salvo em: ${dest}`);
      console.log('Execute agora: node scripts/generate-highres-map.js');
    });
  });
}).on('error', function(err) {
  fs.unlink(dest, () => {});
  console.error('Erro de rede:', err.message);
});
