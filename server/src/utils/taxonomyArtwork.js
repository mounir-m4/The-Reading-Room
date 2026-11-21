import { escapeXml, toSvgDataUri } from './svg.js';

const palettes = [
  ['#24364b', '#d2a56b', '#f4ecd8'],
  ['#593d5d', '#d8b27a', '#f3e8d4'],
  ['#31574e', '#e0bd79', '#f3eddd'],
  ['#733e43', '#ddb678', '#f6eddb'],
  ['#36516b', '#d6a86f', '#f4ebd8'],
  ['#61513a', '#e0c58d', '#f6efdf'],
];

function hashValue(value) {
  return [...String(value)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function paletteFor(value) {
  return palettes[hashValue(value) % palettes.length];
}

function initialsFor(value) {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return `${words[0][0]}${words.length > 1 ? words[words.length - 1][0] : ''}`.toUpperCase();
}

function wrapTitle(value, maxLength) {
  const lines = [];
  let line = '';

  for (const word of String(value).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 2) {
    lines.length = 2;
    lines[1] = `${lines[1].slice(0, maxLength - 1)}…`;
  }
  return lines;
}

export function createCategoryImage(name) {
  const [background, accent, paper] = paletteFor(`category:${name}`);
  const title = wrapTitle(name, 24)
    .map((line, index) => `<text x="64" y="${382 + index * 42}" fill="${paper}" font-family="Georgia,serif" font-size="42">${escapeXml(line)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="${background}"/><circle cx="650" cy="110" r="180" fill="${accent}" opacity=".18"/><path d="M0 390 Q200 300 410 390 T800 370 V500 H0Z" fill="${accent}" opacity=".12"/><rect x="42" y="34" width="716" height="432" rx="22" fill="none" stroke="${accent}" stroke-width="2"/><text x="64" y="86" fill="${accent}" font-family="Arial,sans-serif" font-size="16" letter-spacing="4">THE READING ROOM</text><path d="M500 180 Q570 145 640 180 V300 Q570 265 500 300Z" fill="${paper}" opacity=".92"/><path d="M640 180 Q710 145 740 180 V300 Q690 265 640 300Z" fill="${paper}" opacity=".78"/><path d="M640 180 V300" stroke="${accent}" stroke-width="4"/><path d="M520 200 Q570 180 620 200 M520 220 Q570 200 620 220 M660 200 Q690 185 720 200 M660 220 Q690 205 720 220" fill="none" stroke="${accent}" stroke-width="3" opacity=".8"/>${title}<line x1="64" y1="430" x2="300" y2="430" stroke="${accent}" stroke-width="2"/></svg>`;
  return toSvgDataUri(svg);
}

export function createPublisherLogo(name) {
  const [background, accent, paper] = paletteFor(`publisher:${name}`);
  const initials = escapeXml(initialsFor(name));
  const label = escapeXml(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" rx="28" fill="${paper}"/><circle cx="200" cy="145" r="104" fill="${background}"/><circle cx="200" cy="145" r="88" fill="none" stroke="${accent}" stroke-width="3"/><text x="200" y="180" fill="${paper}" font-family="Georgia,serif" font-size="88" text-anchor="middle">${initials}</text><line x1="70" y1="278" x2="330" y2="278" stroke="${accent}" stroke-width="3"/><text x="200" y="320" fill="${background}" font-family="Georgia,serif" font-size="24" text-anchor="middle">${label}</text></svg>`;
  return toSvgDataUri(svg);
}
