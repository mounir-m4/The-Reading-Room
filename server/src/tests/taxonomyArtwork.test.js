import { describe, expect, it } from 'vitest';
import {
  createAuthorAvatar,
  createCategoryImage,
  createPublisherLogo,
} from '../utils/taxonomyArtwork.js';

describe('taxonomy artwork', () => {
  it('creates distinct category artwork with escaped names', () => {
    const image = createCategoryImage('Science < Fiction');
    const svg = decodeURIComponent(image.split(',')[1]);

    expect(image).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
    expect(svg).toContain('Science &lt; Fiction');
    expect(image).not.toBe(createCategoryImage('Cooking'));
  });

  it('creates unique author and publisher marks', () => {
    expect(createAuthorAvatar('Nancy Haddad')).not.toBe(createAuthorAvatar('Clara Moreau'));
    expect(createPublisherLogo('Atlas House')).not.toBe(createPublisherLogo('Sahara Books'));
  });
});
