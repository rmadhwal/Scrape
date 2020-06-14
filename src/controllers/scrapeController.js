import {scrapeSingleProduct} from "../services/scrapeService";

export async function scrapeProduct(req, res) {
    const singleProductInfo = await scrapeSingleProduct(req.body.productId);
    return res.json(singleProductInfo)
}