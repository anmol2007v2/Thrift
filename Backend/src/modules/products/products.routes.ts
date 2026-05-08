import { Router } from 'express';
import * as productsController from './products.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createProductSchema, updateProductSchema, productQuerySchema } from './product.schema';
import { upload } from '../../services/upload.service';

const router = Router();

router.get('/', validate(productQuerySchema.shape), productsController.listProducts);
router.get('/:id', productsController.getProduct);

// Admin and Host routes
router.use(requireAuth, requireRole('admin', 'host'));

router.post('/', upload.array('images', 5), validate(createProductSchema.shape), productsController.createProduct);
router.patch('/:id', validate(updateProductSchema.shape), productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);

router.post('/:id/images', upload.array('images', 5), productsController.uploadImages);
router.delete('/:id/images/:publicId', productsController.removeImage);

export default router;
