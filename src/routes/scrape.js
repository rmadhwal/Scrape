import {Router} from 'express';
import {scrapeCategory, scrapeProduct} from "../controllers/scrapeController";

const router = Router();

router.get('/product/', async (req, res) => {
  await scrapeProduct(req, res)
});

router.get('/category/', async (req, res) => {
  await scrapeCategory(req, res)
});

export default router;