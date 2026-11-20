import { Router } from 'express';
import * as catalog from '../controllers/catalogController.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { validate, bookSchema, categorySchema, authorSchema, publisherSchema } from '../validators/index.js';
import { upload, processImages } from '../middleware/upload.js';

const router = Router();
const adminWrite = [protect, adminOnly];

// Public
router.get('/books', catalog.listBooks);
router.get('/books/search', catalog.searchBooks);
router.get('/books/:slug', catalog.getBook);
router.get('/categories', catalog.listCategories);
router.get('/categories/:slug', catalog.getCategory);
router.get('/authors', catalog.listAuthors);
router.get('/authors/:slug', catalog.getAuthor);
router.get('/publishers', catalog.listPublishers);

// Admin — books
router.get('/admin/books', ...adminWrite, authorize('books.view'), catalog.adminListBooks);
router.get('/admin/books/:id', ...adminWrite, authorize('books.view'), catalog.getBookById);
router.post('/admin/books', ...adminWrite, authorize('books.create'), upload.array('images', 10), processImages('books'), validate(bookSchema), catalog.createBook);
router.put('/admin/books/:id', ...adminWrite, authorize('books.edit'), upload.array('images', 10), processImages('books'), validate(bookSchema), catalog.updateBook);
router.delete('/admin/books/:id', ...adminWrite, authorize('books.delete'), catalog.deleteBook);
router.post('/admin/books/bulk', ...adminWrite, authorize('books.edit'), catalog.bulkBookAction);

// Admin — categories
router.post('/admin/categories', ...adminWrite, authorize('categories.manage'), upload.single('image'), processImages('categories'), validate(categorySchema), catalog.createCategory);
router.put('/admin/categories/:id', ...adminWrite, authorize('categories.manage'), upload.single('image'), processImages('categories'), validate(categorySchema), catalog.updateCategory);
router.delete('/admin/categories/:id', ...adminWrite, authorize('categories.manage'), catalog.deleteCategory);

// Admin — authors
router.post('/admin/authors', ...adminWrite, authorize('authors.manage'), upload.single('photo'), processImages('authors'), validate(authorSchema), catalog.createAuthor);
router.put('/admin/authors/:id', ...adminWrite, authorize('authors.manage'), upload.single('photo'), processImages('authors'), validate(authorSchema), catalog.updateAuthor);
router.delete('/admin/authors/:id', ...adminWrite, authorize('authors.manage'), catalog.deleteAuthor);

// Admin — publishers
router.post('/admin/publishers', ...adminWrite, authorize('books.edit'), validate(publisherSchema), catalog.createPublisher);
router.put('/admin/publishers/:id', ...adminWrite, authorize('books.edit'), validate(publisherSchema), catalog.updatePublisher);
router.delete('/admin/publishers/:id', ...adminWrite, authorize('books.edit'), catalog.deletePublisher);

export default router;
