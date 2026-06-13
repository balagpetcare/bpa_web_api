import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { RESOURCES, ACTIONS } from '../../config/constants';
import { publicFormLimiter } from '../../middlewares/rateLimiter';
import { createContactSchema, updateContactStatusSchema, contactListQuerySchema } from './contacts.types';
import {
  submitContactHandler, listContactsHandler, getContactHandler, updateContactStatusHandler,
} from './contacts.controller';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────

router.post('/public', publicFormLimiter, validate(createContactSchema), submitContactHandler);

// ─── Admin ────────────────────────────────────────────────────────

router.use(authenticate);

router.get('/', authorize(RESOURCES.CONTACTS, ACTIONS.READ), validate(contactListQuerySchema, 'query'), listContactsHandler);
router.get('/:id', authorize(RESOURCES.CONTACTS, ACTIONS.READ), getContactHandler);
router.patch('/:id/status', authorize(RESOURCES.CONTACTS, ACTIONS.UPDATE), validate(updateContactStatusSchema), updateContactStatusHandler);

export default router;
