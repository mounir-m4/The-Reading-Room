import { describe, expect, it } from 'vitest';
import { REAL_DEMO_BOOKS } from '../scripts/realDemoBooks.js';
import { authorPhotoUrl, bookCoverUrl, hasAuthorPhoto } from '../utils/realCatalogImages.js';

describe('real catalogue images', () => {
  it('uses internet-hosted covers and portraits for every replacement book', () => {
    expect(REAL_DEMO_BOOKS).toHaveLength(18);

    for (const book of REAL_DEMO_BOOKS) {
      expect(bookCoverUrl(book.coverId)).toMatch(/^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-L\.jpg/);
      expect(authorPhotoUrl(book.author)).toMatch(/^https:\/\//);
    }
  });

  it('rejects unknown author photos and invalid cover IDs', () => {
    expect(() => authorPhotoUrl('Unknown Author')).toThrow('No verified author photo');
    expect(() => bookCoverUrl(0)).toThrow('Invalid Open Library cover ID');
  });

  it('includes the verified official portrait for Morgan Housel', () => {
    expect(hasAuthorPhoto('Morgan Housel')).toBe(true);
    expect(authorPhotoUrl('Morgan Housel')).toMatch(/^https:\/\/lh7-us\.googleusercontent\.com\/sitesv-images-rt\//);
  });
});
