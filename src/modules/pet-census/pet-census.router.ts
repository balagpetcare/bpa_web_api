import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { validateUuid } from '../../middlewares/validateUuid';
import { publicFormLimiter } from '../../middlewares/rateLimiter';
import { RESOURCES, ACTIONS } from '../../config/constants';
import { submitCensusSchema, updateCensusSchema, censusListQuerySchema } from './pet-census.types';
import {
  listSubmissionsHandler, getSubmissionHandler,
  updateSubmissionHandler, deleteSubmissionHandler,
  submitCensusHandler, exportSubmissionsHandler,
} from './pet-census.controller';

const adminRouter = Router();
adminRouter.use(authenticate);

adminRouter.get('/', authorize(RESOURCES.PET_CENSUS, ACTIONS.READ), validate(censusListQuerySchema, 'query'), listSubmissionsHandler);
adminRouter.get('/export', authorize(RESOURCES.PET_CENSUS, ACTIONS.READ), validate(censusListQuerySchema, 'query'), exportSubmissionsHandler);
adminRouter.get('/:id', validateUuid('id'), authorize(RESOURCES.PET_CENSUS, ACTIONS.READ), getSubmissionHandler);
adminRouter.patch('/:id', validateUuid('id'), authorize(RESOURCES.PET_CENSUS, ACTIONS.UPDATE), validate(updateCensusSchema), updateSubmissionHandler);
adminRouter.patch('/:id/status', validateUuid('id'), authorize(RESOURCES.PET_CENSUS, ACTIONS.UPDATE), validate(updateCensusSchema), updateSubmissionHandler);
adminRouter.delete('/:id', validateUuid('id'), authorize(RESOURCES.PET_CENSUS, ACTIONS.DELETE), deleteSubmissionHandler);

const publicRouter = Router();
publicRouter.post('/', publicFormLimiter, validate(submitCensusSchema), submitCensusHandler);
publicRouter.post('/submit', publicFormLimiter, validate(submitCensusSchema), submitCensusHandler);

export { adminRouter as petCensusAdminRouter, publicRouter as petCensusPublicRouter };
