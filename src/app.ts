import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { corsOrigins, config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import rolesRouter from './modules/roles/roles.router';
import newsRouter from './modules/news/news.router';
import eventsRouter from './modules/events/events.router';
import committeeRouter from './modules/committee/committee.router';
import mediaRouter from './modules/media/media.router';
import seoRouter from './modules/seo/seo.router';
import contactsRouter from './modules/contacts/contacts.router';
import volunteersRouter from './modules/volunteers/volunteers.router';
import analyticsRouter from './modules/analytics/analytics.router';
import membershipRouter from './modules/membership/membership.router';
import paymentsRouter from './modules/payments/payments.router';
import paymentCallbacksRouter from './modules/payments/payment-callbacks.router';
import smsLogsRouter from './modules/sms-logs/sms-logs.router';
import emailLogsRouter from './modules/email-logs/email-logs.router';
import locationsRouter from './modules/locations/locations.router';
import vaccineCatalogRouter from './modules/vaccine-catalog/vaccine-catalog.router';
import petsRouter from './modules/pets/pets.router';
import doctorsRouter from './modules/doctors/doctors.router';
import campaignsRouter from './modules/campaigns/campaigns.router';
import { campaignRegistrationsPublicRouter, campaignRegistrationsAdminRouter } from './modules/campaign-registrations/campaign-registrations.router';
import { campaignCheckinVolunteerRouter, campaignCheckinAdminRouter } from './modules/campaign-checkin/campaign-checkin.router';
import { campaignCertificatesAdminRouter, campaignCertificatesPublicRouter } from './modules/campaign-certificates/campaign-certificates.router';
import campaignAnalyticsRouter from './modules/analytics/campaign-analytics.router';
import campaignsPublicRouter from './modules/campaigns/campaigns-public.router';
import petsPublicRouter from './modules/pets/pets-public.router';
import { homepageAdminRouter, homepagePublicRouter } from './modules/homepage/homepage.router';

const app = express();

// Trust the first hop (Nginx reverse proxy) so rate-limiters and IP logging
// see the real client address from X-Forwarded-For, not the proxy IP.
app.set('trust proxy', 1);

// ─── Security ───────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ────────────────────────────────────────────────────
if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ─── Health ─────────────────────────────────────────────────────
// Mounted at /api/v1/health so it is consistent with every consumer:
// docker-compose health check, Nginx bypass location, deploy script,
// UptimeRobot, and the go-live checklist all reference this path.
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────────
const v1 = '/api/v1';

app.use(`${v1}/auth`, authRouter);
app.use(`${v1}/admin/users`, usersRouter);
app.use(`${v1}/admin/roles`, rolesRouter);

// ─── Static uploads ─────────────────────────────────────────────
// CORP/CORS headers allow Next.js Image and browser fetch to load local uploads
// cross-origin. Only applies when STORAGE_DRIVER=local; S3 buckets handle CORS
// via their own bucket policy.
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static('uploads'));

// ─── Routes (Phase 2 CMS) ───────────────────────────────────────
app.use(`${v1}/news`, newsRouter);
app.use(`${v1}/events`, eventsRouter);
app.use(`${v1}/admin/committee`, committeeRouter);
app.use(`${v1}/admin/media`, mediaRouter);
app.use(`${v1}/admin/seo`, seoRouter);
app.use(`${v1}/admin/analytics`, analyticsRouter);
app.use(`${v1}/contacts`, contactsRouter);
app.use(`${v1}/volunteers`, volunteersRouter);
app.use(`${v1}/membership`, membershipRouter);
app.use(`${v1}/payment`, paymentCallbacksRouter);
app.use(`${v1}/admin/payments`, paymentsRouter);
app.use(`${v1}/admin/sms-logs`, smsLogsRouter);
app.use(`${v1}/admin/email-logs`, emailLogsRouter);

// ─── Campaign Management (Phase 0 + 1) ──────────────────────────
app.use(`${v1}/admin/locations`, locationsRouter);
app.use(`${v1}/locations`, locationsRouter);
app.use(`${v1}/admin/vaccine-catalog`, vaccineCatalogRouter);
app.use(`${v1}/admin/pets`, petsRouter);
app.use(`${v1}/admin/doctors`, doctorsRouter);
app.use(`${v1}/admin/campaigns`, campaignsRouter);
app.use(`${v1}/public/campaign-registrations`, campaignRegistrationsPublicRouter);
app.use(`${v1}/admin/campaign-registrations`, campaignRegistrationsAdminRouter);
app.use(`${v1}/volunteer`, campaignCheckinVolunteerRouter);
app.use(`${v1}/admin`, campaignCheckinAdminRouter);
app.use(`${v1}/admin`, campaignCertificatesAdminRouter);
app.use(`${v1}/public/campaigns`, campaignsPublicRouter);
app.use(`${v1}/public/campaigns`, campaignCertificatesPublicRouter);
app.use(`${v1}/public/pets`, petsPublicRouter);
app.use(`${v1}/admin/analytics/campaigns`, campaignAnalyticsRouter);
app.use(`${v1}/admin/homepage`, homepageAdminRouter);
app.use(`${v1}/homepage`, homepagePublicRouter);

// ─── Error Handling ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
