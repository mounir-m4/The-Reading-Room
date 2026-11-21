import { describe, expect, it } from 'vitest';
import { createDemoBookCover } from '../utils/demoBookCover.js';

describe('demo book covers', () => {
  it('creates a title-specific, encoded SVG cover', () => {
    const cover = createDemoBookCover('The <Glass> & Kingdom', 'Elena "E." Rossi');
    const svg = decodeURIComponent(cover.split(',')[1]);

    expect(cover).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
    expect(svg).toContain('The &lt;Glass&gt; &amp;');
    expect(svg).toContain('Elena &quot;E.&quot; Rossi');
    expect(cover).not.toBe(createDemoBookCover('Another Book', 'Different Author'));
  });
});
