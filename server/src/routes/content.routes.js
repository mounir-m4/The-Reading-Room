import { Router } from 'express';
import * as cms from '../controllers/cmsController.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { upload, processImages } from '../middleware/upload.js';
import { validate, cmsPageSchema } from '../validators/index.js';

const router = Router();
const cmsGuard = [protect, adminOnly, authorize('cms.manage')];

// Public
router.get('/cms/homepage', cms.getHomepage);
router.get('/cms/pages', cms.listPages);
router.get('/cms/pages/:key', cms.getPage);
router.get('/cms/banners', cms.bannerHandlers.list);
router.get('/cms/testimonials', cms.testimonialHandlers.list);
router.post('/newsletter', cms.subscribe);

// Admin — standalone image upload (returns the URL for JSON-based admin forms)
router.post('/admin/upload', protect, adminOnly, upload.single('file'), processImages('general'), (req, res) => {
  if (!req.uploadedFiles?.length) {
    return res.status(400).json({ success: false, error: { message: 'No file received' } });
  }
  return res.json({ success: true, data: req.uploadedFiles[0] });
});

// Admin — homepage CMS
router.get('/admin/cms/sections', ...cmsGuard, cms.getSections);
router.put('/admin/cms/homepage', ...cmsGuard, cms.updateSections);
router.get('/admin/cms/pages', ...cmsGuard, cms.listPages);
router.post('/admin/cms/pages', ...cmsGuard, validate(cmsPageSchema), cms.upsertPage);
router.put('/admin/cms/pages/:id', ...cmsGuard, validate(cmsPageSchema), cms.upsertPage);
router.delete('/admin/cms/pages/:id', ...cmsGuard, cms.deletePage);
router.get('/admin/cms/banners', ...cmsGuard, cms.bannerHandlers.list);
router.post('/admin/cms/banners', ...cmsGuard, upload.single('image'), processImages('banners'), cms.bannerHandlers.create);
router.put('/admin/cms/banners/:id', ...cmsGuard, upload.single('image'), processImages('banners'), cms.bannerHandlers.update);
router.delete('/admin/cms/banners/:id', ...cmsGuard, cms.bannerHandlers.remove);
router.get('/admin/cms/testimonials', ...cmsGuard, cms.testimonialHandlers.list);
router.post('/admin/cms/testimonials', ...cmsGuard, upload.single('avatar'), processImages('testimonials'), cms.testimonialHandlers.create);
router.put('/admin/cms/testimonials/:id', ...cmsGuard, upload.single('avatar'), processImages('testimonials'), cms.testimonialHandlers.update);
router.delete('/admin/cms/testimonials/:id', ...cmsGuard, cms.testimonialHandlers.remove);
router.get('/admin/newsletter', ...cmsGuard, cms.listSubscribers);

// Settings
router.get('/settings', cms.getSettings);
router.put('/admin/settings', protect, adminOnly, authorize('settings.manage'), cms.updateSettings);

export default router;
