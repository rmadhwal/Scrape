import { Router } from 'express';
import {scrapeProduct} from "../controllers/scrapeController";

const router = Router();

router.get('/', async (req, res) => {
  await scrapeProduct(req, res)
});

export default router;