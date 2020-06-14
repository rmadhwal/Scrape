import puppeteer from "puppeteer";

export async function scrapeSingleProduct(productId) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"']
    });

    const page = await browser.newPage();
    const productUrl = "https://www.amazon.com/dp/" + productId;
    await page.goto(productUrl);
    await page.waitForSelector('body');

    const productInfo = await page.evaluate(() => {

        let title = document.body.querySelector('#productTitle').innerText;

        let reviewCount = document.body.querySelector('#acrCustomerReviewText').innerText;
        let formattedReviewCount = reviewCount.replace(/[^0-9]/g, '').trim();

        let ratingElement = document.body.querySelector('.a-icon.a-icon-star').getAttribute('class');
        let integer = ratingElement.replace(/[^0-9]/g, '').trim();
        let parsedRating = parseInt(integer) / 10;

        let availability = document.body.querySelector('#availability').innerText;

        let price = document.body.querySelector('#priceblock_ourprice').innerText;

        let description = document.body.querySelector('#renewedProgramDescriptionAtf').innerText;

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
            "features": formattedFeatures
        };
    });
    browser.close();
    console.log(productInfo);
    return productInfo;
}