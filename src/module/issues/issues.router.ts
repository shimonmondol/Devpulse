import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { 
  createIssue, 
  getAllIssues, 
  getSingleIssue, 
  updateIssue, 
  deleteIssue 
} from './issues.controller.js';

const router = Router();

router.post('/', authenticate, authorize('contributor', 'maintainer'), createIssue);
router.get('/', getAllIssues);
router.get('/:id', getSingleIssue);
router.patch('/:id', authenticate, authorize('contributor', 'maintainer'), updateIssue);
router.delete('/:id', authenticate, authorize('maintainer'), deleteIssue);

export const issuesRouter = router;