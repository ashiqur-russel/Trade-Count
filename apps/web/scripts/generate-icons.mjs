// Renders every favicon/app icon from brand/mark.svg. Run with: npm run icons
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import pngToIco from 'png-to-ico';

const source = readFileSync(new URL('../brand/mark.svg', import.meta.url), 'utf8');
const output = (file) => new URL(`../public/${file}`, import.meta.url);
const render = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

const [tile, ...lots] = source.match(/<rect[^>]*\/>/g);
const tileColour = tile.match(/fill="([^"]+)"/)[1];

// iOS rounds the corners itself; transparent corners would show up black.
const squareSource = source.replace('rx="8"', 'rx="0"');

// Maskable: launchers crop to any shape, so the lots must sit inside the central 80% safe zone.
const maskableSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${tileColour}"/>
  <g transform="translate(16 16) scale(0.72) translate(-16 -16)">${lots.join('')}</g>
</svg>`;

mkdirSync(output('icons'), { recursive: true });
writeFileSync(output('favicon.svg'), source);
writeFileSync(output('favicon.ico'), await pngToIco([16, 32, 48].map((size) => render(source, size))));
writeFileSync(output('apple-touch-icon.png'), render(squareSource, 180));
writeFileSync(output('icons/icon-192.png'), render(source, 192));
writeFileSync(output('icons/icon-512.png'), render(source, 512));
writeFileSync(output('icons/icon-maskable-512.png'), render(maskableSource, 512));

console.log('Icons written to public/: favicon.svg, favicon.ico, apple-touch-icon.png, icons/icon-{192,512,maskable-512}.png');
