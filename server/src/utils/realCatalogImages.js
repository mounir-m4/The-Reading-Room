const OPEN_LIBRARY_AUTHOR_PHOTOS = {
  'Paulo Coelho': 6286753,
  'James Clear': 14377396,
  'Frank Herbert': 14852808,
  'Antoine de Saint-Exupéry': 6338378,
  'Yuval Noah Harari': 7914208,
  'Robert Kiyosaki': 12355041,
  'Matt Haig': 14852993,
  'William Gibson': 14538063,
  'Daniel Kahneman': 7292667,
  'Bill Bryson': 7402408,
  'J.R.R. Tolkien': 6155606,
  'Jon Krakauer': 7323054,
  'F. Scott Fitzgerald': 6292713,
  'Walter Isaacson': 7321644,
  'Samin Nosrat': 15138611,
  'Jane Austen': 15214274,
  'Arthur Conan Doyle': 5541405,
  'Douglas Adams': 6387387,
  'Rupi Kaur': 12404089,
  'Anne Frank': 6458523,
  'Simon Sinek': 15164899,
  'Ray Bradbury': 14853852,
  'Julia Child': 14544019,
  'Agatha Christie': 5539485,
  'Eckhart Tolle': 14855784,
  'E. B. White': 6390049,
  'Peter Frankopan': 10552190,
  'George R. R. Martin': 6387401,
};

const DIRECT_AUTHOR_PHOTOS = {
  'Morgan Housel': 'https://lh7-us.googleusercontent.com/sitesv-images-rt/APXyLQc_orRa0elLob3AvBc1Niph_V_0Pg2961dz46oqgDvajib4fqj_l2Yj-ixZ-W8aZQ72UiXPWPUZfgj-xPmU0SspKPHSL0mll5kc6GdElxjaOaaB4rXIfVHLU1_zrrUWCmqGV7w-mHzvif-3Hx2O0rm4Nz1kiez7F3tJzD70Z2h6XQIuWx5x_mySEZHVUhZ2DkCQ2TYNLu_RIfBBVIzwxCIWI7ODnJLiMpQmWUB69Mo=w1280',
};

export function hasAuthorPhoto(name) {
  return Boolean(OPEN_LIBRARY_AUTHOR_PHOTOS[name] || DIRECT_AUTHOR_PHOTOS[name]);
}

export function authorPhotoUrl(name) {
  const photoId = OPEN_LIBRARY_AUTHOR_PHOTOS[name];
  if (photoId) return `https://covers.openlibrary.org/a/id/${photoId}-L.jpg?default=false`;
  if (DIRECT_AUTHOR_PHOTOS[name]) return DIRECT_AUTHOR_PHOTOS[name];
  throw new Error(`No verified author photo configured for "${name}"`);
}

export function bookCoverUrl(coverId) {
  if (!Number.isInteger(coverId) || coverId <= 0) {
    throw new Error(`Invalid Open Library cover ID: ${coverId}`);
  }
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;
}
