import { Router } from 'express';
import * as wishlistController from './wishlist.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

router.get('/', wishlistController.getWishlist);
router.post('/:productId', wishlistController.addProduct);
router.delete('/:productId', wishlistController.removeProduct);

export default router;
