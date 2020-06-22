import {
    scrapeInfoForEachProduct,
    scrapeProductsWithQuantitiesInCategory,
    scrapeSingleProduct
} from "../services/scrapeService";
import url from "url";
import querystring from "querystring";

export async function scrapeProduct(req, res) {
    const param = req.body.productId === undefined ? querystring.parse(url.parse(req.url).query).productId : req.body.productId;
    const singleProductInfo = await scrapeSingleProduct(param);
    return res.json(singleProductInfo)
}

export async function scrapeCategory(req, res) {
    const categoryParam = req.body.category === undefined ? querystring.parse(url.parse(req.url).query).category : req.body.category;
    const productsInCategory = await scrapeProductsWithQuantitiesInCategory(categoryParam);
    return res.json(productsInCategory)
}

export async function initCategoryScraping(req, res) {
    const categoryParam = req.body.category === undefined ? querystring.parse(url.parse(req.url).query).category : req.body.category;
    await scrapeProductsWithQuantitiesInCategory(categoryParam);
    await scrapeInfoForEachProduct(categoryParam);
    setInterval(async() => {
        await scrapeProductsWithQuantitiesInCategory(categoryParam);
    }, 1000 * 60 * 60 * 5);
    setInterval(async() => {
        await scrapeInfoForEachProduct(categoryParam);
    }, 1000 * 60 * 60 * 2);
    return res.json({status: "first scrape done and  initialized"})
}