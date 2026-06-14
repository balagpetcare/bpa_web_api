import rateLimit from 'express-rate-limit';

/** Public form submission rate limit - Configurable from env */
const PUBLIC_FORM_WINDOW = parseInt(process.env.PUBLIC_REGISTRATION_RATE_LIMIT_WINDOW_MS || '900000', 10); // Default 15 mins
const PUBLIC_FORM_MAX = parseInt(process.env.PUBLIC_REGISTRATION_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? '50' : '5'), 10);

/** submissions per window per IP — for public form endpoints */
export const publicFormLimiter = rateLimit({
  windowMs: PUBLIC_FORM_WINDOW,
  max: PUBLIC_FORM_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes before trying again.' },
});

/** 60 requests per minute — for public read endpoints */
export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** 10 login attempts per 15 minutes per IP — brute-force protection */
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

/** 20 refresh attempts per 15 minutes per IP */
export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** Payment callback endpoints — strict limit to slow down replay/probe attempts */
export const callbackLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests.' },
});
