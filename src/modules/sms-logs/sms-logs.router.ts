import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { RESOURCES, ACTIONS } from '../../config/constants';
import { smsLogListQuerySchema } from './sms-logs.types';
import { listSmsLogsHandler, getSmsLogHandler } from './sms-logs.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize(RESOURCES.SMS_LOGS, ACTIONS.READ), validate(smsLogListQuerySchema, 'query'), listSmsLogsHandler);
router.get('/:id', authorize(RESOURCES.SMS_LOGS, ACTIONS.READ), getSmsLogHandler);

export default router;
