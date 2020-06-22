import {scrapeProductsWithQuantitiesInCategory, scrapeSingleProduct} from "../services/scrapeService";
import url from "url";
import querystring from "querystring";

export async function scrapeProduct(req, res) {
    const param = req.body.productId === undefined ? querystring.parse(url.parse(req.url).query).productId : req.body.productId;
    const singleProductInfo = await scrapeSingleProduct(param);
    return res.json(singleProductInfo)
}

export async function scrapeCategory(req, res) {
    const param = req.body.category === undefined ? querystring.parse(url.parse(req.url).query).category : req.body.category;
    const productsInCategory = await scrapeProductsWithQuantitiesInCategory(param);
    return res.json(productsInCategory)
}