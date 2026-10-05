// Renders every favicon/app icon from brand/mark.svg. Run with: npm run icons
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import pngToIco from 'png-to-ico';

const source = readFileSync(new URL('../brand/mark.svg', import.meta.url), 'utf8');
const output = (file) => new URL(`../public/${file}`, import.meta.url);
const render = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

// iOS rounds the corners itself; transparent corners would show up black.
const squareSource = source.replace('rx="8"', 'rx="0"');

writeFileSync(output('favicon.svg'), source);
writeFileSync(output('favicon.ico'), await pngToIco([16, 32, 48].map((size) => render(source, size))));
writeFileSync(output('apple-touch-icon.png'), render(squareSource, 180));

console.log('Icons written to public/: favicon.svg, favicon.ico, apple-touch-icon.png');
