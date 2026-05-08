import { Router } from 'express';
import * as reviewsController from './reviews.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/products/:productId', reviewsController.listProductReviews);

router.use(requireAuth);

router.post('/products/:productId', reviewsController.createReview);
router.delete('/:id', reviewsController.deleteReview);

export default router;
