const palettes = [
  ['#24364b', '#d2a56b', '#f4ecd8'],
  ['#593d5d', '#d8b27a', '#f3e8d4'],
  ['#31574e', '#e0bd79', '#f3eddd'],
  ['#733e43', '#ddb678', '#f6eddb'],
  ['#36516b', '#d6a86f', '#f4ebd8'],
  ['#61513a', '#e0c58d', '#f6efdf'],
];

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

function wrapText(value, maxLength) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 5) {
    lines.length = 5;
    lines[4] = `${lines[4].slice(0, maxLength - 1)}…`;
  }
  return lines;
}

export function createDemoBookCover(title, author) {
  const hash = [...`${title}:${author}`].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
  const [background, accent, paper] = palettes[hash % palettes.length];
  const titleLines = wrapText(title, 22);
  const titleSvg = titleLines
    .map((line, index) => `<text x="64" y="${382 + index * 54}" fill="${paper}" font-family="Georgia,serif" font-size="42">${escapeXml(line)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" fill="${background}"/><rect x="28" y="28" width="544" height="844" rx="14" fill="none" stroke="${accent}" stroke-width="2"/><circle cx="488" cy="210" r="152" fill="${accent}" opacity=".16"/><path d="M28 660 Q300 535 572 660 V872 H28Z" fill="${accent}" opacity=".13"/><text x="64" y="100" fill="${accent}" font-family="Arial,sans-serif" font-size="18" letter-spacing="4">THE READING ROOM</text><line x1="64" y1="130" x2="190" y2="130" stroke="${accent}" stroke-width="2"/>${titleSvg}<line x1="64" y1="700" x2="536" y2="700" stroke="${accent}" stroke-width="2"/><text x="64" y="752" fill="${paper}" font-family="Arial,sans-serif" font-size="22">${escapeXml(author)}</text><text x="64" y="820" fill="${accent}" font-family="Arial,sans-serif" font-size="14" letter-spacing="3">DEMO EDITION</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
