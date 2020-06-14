import {scrapeSingleProduct} from "../services/scrapeService";
import url from "url";
import  querystring from "querystring";

export async function scrapeProduct(req, res) {
    const param = req.body.productId === undefined ? querystring.parse(url.parse(req.url).query).productId : req.body.productId;
    const singleProductInfo = await scrapeSingleProduct(param);
    return res.json(singleProductInfo)
}