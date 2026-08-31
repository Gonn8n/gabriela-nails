const sharp = require('sharp');
const path = require('path');

async function generateOG() {
  const width = 1200;
  const height = 630;
  const bgColor = '#FDF2F3';
  const accentColor = '#C65860';

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FDF2F3;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#F9E0E3;stop-opacity:1" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" style="stop-color:#C65860;stop-opacity:0.08" />
          <stop offset="100%" style="stop-color:#C65860;stop-opacity:0" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <rect width="${width}" height="${height}" fill="url(#glow)" />
      <text x="600" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="${accentColor}" letter-spacing="6" opacity="0.7">RESERVÁ TU TURNO ONLINE</text>
    </svg>`;

  const bgBuffer = Buffer.from(svg);

  const logo = await sharp(path.join(__dirname, '..', 'public', 'logo-gabriela.png'))
    .resize(500, null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp(bgBuffer)
    .composite([{
      input: logo,
      top: 60,
      left: 350,
    }])
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'og-image.png'));

  console.log('OG image generated: public/og-image.png');
}

generateOG().catch(console.error);
