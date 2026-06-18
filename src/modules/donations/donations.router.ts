import { Router } from 'express';
import * as ctrl from './donations.controller';
import { authenticateOptional } from '../../middlewares/authenticateOptional';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/authorize';

const publicRouter = Router();
const adminRouter = Router();

// ─── Public Routes ───────────────────────────────────────────────

publicRouter.get('/settings', ctrl.getDonationPageDataHandler);
publicRouter.get('/page-data', ctrl.getDonationPageDataHandler);
publicRouter.get('/purposes', ctrl.getActivePurposesHandler);
publicRouter.get('/campaigns', ctrl.getActiveCampaignsHandler);
publicRouter.get('/campaigns/:slug', ctrl.getCampaignDetailHandler);
publicRouter.post('/initiate', authenticateOptional, ctrl.initializeDonationHandler);
publicRouter.get('/status/:referenceNo', ctrl.getDonationStatusHandler);
publicRouter.get('/receipt/:referenceNo', ctrl.getDonationReceiptHandler);
publicRouter.get('/receipt/:referenceNo/pdf', ctrl.getDonationReceiptPdfHandler);
publicRouter.get('/qr/:slug/redirect', ctrl.qrRedirectHandler);

publicRouter.get('/impact-stories/:slug', ctrl.getImpactStoryDetailHandler);

// ─── Admin Routes ────────────────────────────────────────────────

adminRouter.use(authenticate, requireRole('ADMIN'));

adminRouter.get('/dashboard-stats', ctrl.getDashboardStatsHandler);
adminRouter.get('/export/csv', ctrl.exportDonationsCsvHandler);

// Donations
adminRouter.get('/', ctrl.listDonationsHandler);
adminRouter.get('/:id', ctrl.getDonationDetailHandler);
adminRouter.patch('/:id/status', ctrl.updateDonationStatusHandler);

// Purposes
adminRouter.get('/purposes', ctrl.listPurposesHandler);
adminRouter.post('/purposes', ctrl.createPurposeHandler);
adminRouter.patch('/purposes/:id', ctrl.updatePurposeHandler);
adminRouter.delete('/purposes/:id', ctrl.deletePurposeHandler);

// Campaigns
adminRouter.get('/campaigns', ctrl.listCampaignsHandler);
adminRouter.post('/campaigns', ctrl.createCampaignHandler);
adminRouter.patch('/campaigns/:id', ctrl.updateCampaignHandler);
adminRouter.delete('/campaigns/:id', ctrl.deleteCampaignHandler);

// QR Codes
adminRouter.get('/qr-codes', ctrl.listQrCodesHandler);
adminRouter.post('/qr-codes', ctrl.createQrCodeHandler);
adminRouter.patch('/qr-codes/:id', ctrl.updateQrCodeHandler);
adminRouter.delete('/qr-codes/:id', ctrl.deleteQrCodeHandler);
adminRouter.get('/qr-codes/:slug/image', ctrl.generateQrImageHandler);

// Impact Stories
adminRouter.get('/impact-stories', ctrl.listImpactStoriesHandler);
adminRouter.post('/impact-stories', ctrl.createImpactStoryHandler);
adminRouter.patch('/impact-stories/:id', ctrl.updateImpactStoryHandler);
adminRouter.delete('/impact-stories/:id', ctrl.deleteImpactStoryHandler);

// Transparency Reports
adminRouter.get('/transparency-reports', ctrl.listTransparencyReportsHandler);
adminRouter.post('/transparency-reports', ctrl.createTransparencyReportHandler);
adminRouter.patch('/transparency-reports/:id', ctrl.updateTransparencyReportHandler);
adminRouter.delete('/transparency-reports/:id', ctrl.deleteTransparencyReportHandler);

// Settings
adminRouter.get('/page-settings', ctrl.getSettingsHandler);
adminRouter.patch('/page-settings', ctrl.updateSettingsHandler);

export { publicRouter as donationsPublicRouter, adminRouter as donationsAdminRouter };
