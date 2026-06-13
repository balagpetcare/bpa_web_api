import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { RESOURCES, ACTIONS } from '../../config/constants';
import { summaryHandler, trafficHandler, formsHandler } from './analytics.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', authorize(RESOURCES.ANALYTICS, ACTIONS.READ), summaryHandler);
router.get('/traffic', authorize(RESOURCES.ANALYTICS, ACTIONS.READ), trafficHandler);
router.get('/forms', authorize(RESOURCES.ANALYTICS, ACTIONS.READ), formsHandler);

export default router;
