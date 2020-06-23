import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import {addDocumentWithId, addDocumentWithoutId, createIndex, getDocumentInIndexById} from "./elasticService";

puppeteer.use(stealth());

const productsIndexId = "products";


export async function scrapeSingleProduct(productId) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"']
    });

    try {
        const page = await browser.newPage();
        const productUrl = "https://www.amazon.com/dp/" + productId;
        await page.goto(productUrl);
        await page.waitForSelector('body');

        const productInfo = await page.evaluate(() => {

            let title = document.body.querySelector('#productTitle')?.innerText;

            let reviewCount = document.body.querySelector('#acrCustomerReviewText')?.innerText;
            let formattedReviewCount = reviewCount?.replace(/[^0-9]/g, '').trim();

            let ratingElement = document.body.querySelector('.a-icon.a-icon-star').getAttribute('class');
            let integer = ratingElement?.replace(/[^0-9]/g, '').trim();
            let parsedRating = parseInt(integer) / 10;

            let availability = document.body.querySelector('#availability')?.innerText;

            let price = document.body.querySelector('#priceblock_ourprice')?.innerText;

            let description = document.body.querySelector('#renewedProgramDescriptionAtf')?.innerText;

            let features = document.body.querySelectorAll('#feature-bullets ul li');
            let formattedFeatures = [];

            features.forEach((feature) => {
                formattedFeatures.push(feature.innerText);
            });

            return {
                "title": title,
                "rating": parsedRating,
                "reviewCount": formattedReviewCount,
                "price": price,
                "availability": availability,
                "description": description,
                "features": formattedFeatures,
                "@timestamp": new Date().toISOString()
            };
        });
        let inventoryLeft = -1;
        let couldEstimateInventory = false;
        if (productInfo.availability?.includes("left in stock")) {
            couldEstimateInventory = true;
            inventoryLeft = productInfo.availability.replace(/[^0-9]/g, '').trim();
        } else if (productInfo.availability?.includes("In Stock")) {
            await page.waitFor(500);
            await page.click("#add-to-cart-button");
            const popupButtonSelector = "span#attach-sidesheet-view-cart-button-announce";
            try {
                await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 4000});
                await page.waitFor(500);
                await page.click("#hlb-view-cart-announce");
            }
            catch {
                await page.click(popupButtonSelector)
            }
            await page.waitFor(2000);
            await page.click("select.a-native-dropdown");
            await page.waitFor(500);
            await page.click("a#dropdown1_10");
            await page.waitFor(500);
            await page.type('input.sc-quantity-textfield', '999', {delay: 20});
            await page.waitFor(500);
            await page.click("a#a-autoid-1-announce");
            await page.waitFor(1000);
            const popupDom = "div.a-box-inner.a-alert-container";
            await page.waitForSelector(popupDom);
            const popupContent = await page.$(popupDom);
            if (popupContent !== null) {
                const popupText = await page.evaluate(popupContent => popupContent.innerText, popupContent);
                if (popupText.includes("This seller has only")) {
                    couldEstimateInventory = true;
                    inventoryLeft = popupText.replace(/[^0-9]/g, '').trim();
                }
            }
        }
        productInfo["inventoryLeft"] = inventoryLeft;
        productInfo["couldEstimateInventory"] = couldEstimateInventory;
        productInfo["productUrl"] = productUrl;
        await browser.close();
        return productInfo;
    } catch (e) {
        console.log(e);
        return {
            "title": "Couldnt scrape",
            "productUrl": "https://www.amazon.com/dp/" + productId,
            "@timestamp": new Date().toISOString()
        }
    }
}

async function addProductsToArr(category, page, pageNumber, productsArr) {
    const searchUrl = "https://www.amazon.com/s?k=" + category.split(' ').join('+') + "&page=" + pageNumber;
    await page.goto(searchUrl);
    await page.waitForSelector('body');

    const resultSizeDom = await page.$('div.sg-col-inner');
    const resultSize = await page.evaluate(element => element.innerText, resultSizeDom);

    const [currentPageResults, totalResults] = resultSize.split("of", 2);
    const maxEndCurrentResults = currentPageResults.split("-", 2)[1];
    const totalResultsNumber = totalResults.replace(/[^0-9]+/g, '').trim();

    const products = await page.$$('h2 a.a-link-normal.a-text-normal');
    for (const product of products) {
        const url = await page.evaluate(el => el.href, product);
        if (url.startsWith("https://www.amazon.com/gp/slredirect"))
            productsArr.push(url.split("%2Fdp%2F", 2)[1].split("%2Fref%3D", 1)[0]);
        else
            productsArr.push(url.split("/dp/", 2)[1].split("/ref=", 1)[0]);
    }
    await page.waitFor(500);
    if(parseInt(maxEndCurrentResults) < parseInt(totalResultsNumber) && pageNumber < 5)
        await addProductsToArr(category, page, pageNumber + 1, productsArr)
}

export async function scrapeProductsWithQuantitiesInCategory(category) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"']
    });

    const page = await browser.newPage();
    const productsArr = [];
    await addProductsToArr(category, page, 1, productsArr);
    await browser.close();
    const uniqueProducts = productsArr.filter( onlyUnique );

    await createIndex(productsIndexId);
    await addDocumentWithId(productsIndexId, category, {uniqueProducts});
}

export async function scrapeInfoForEachProduct(category) {
    let allProductsForCategory = await getDocumentInIndexById(productsIndexId, category);
    let uniqueProducts = allProductsForCategory._source.uniqueProducts;
    const categoryIndex = category.replace(/\s/g, '');
    await createIndex(categoryIndex);
    for(const product of uniqueProducts) {
        const productInfo = await scrapeSingleProduct(product);
        await addDocumentWithoutId(categoryIndex, productInfo);
    }
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}