import middy from "@middy/core";
import chromium from "chrome-aws-lambda";
import {APIGatewayEvent} from "aws-lambda";
import {Browser} from 'chrome-aws-lambda/source/puppeteer';
import doNotWaitForEmptyEventLoop from "@middy/do-not-wait-for-empty-event-loop";

let browser;

const handler = async (event: APIGatewayEvent) => {
    const body = JSON.parse(event.body);
    const type = body.type;
    const data = body.data;
    const executablePath = process.env.IS_OFFLINE
        ? null
        : await chromium.executablePath;
    browser = await chromium.puppeteer.launch({
        headless: true,
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath
    });

    let stream = {};

    switch (type) {
        case "html":
            stream = await parseHtml(data);
            break;
        case "url":
            stream = await parseUrl(data);
            break;
    }

    return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
            "Content-type": "application/pdf"
        },
        body: stream.toString("base64")
    };
};

const parseHtml = async (html: string) => {
    const page = await browser.newPage();
    await page.setContent(html);
    return generatePdfFromPage(page);
};

const parseUrl = async (url: string) => {
    const page = await browser.newPage();
    await page.goto(url, {
        waitUntil: 'networkidle0',
    });
    return generatePdfFromPage(page);
};

const generatePdfFromPage = async (page) => {
    const configPdf = {
        format: 'A4',
        printBackground: true,
    };
    return page.pdf(configPdf);
};

export const generate = middy(handler).use(doNotWaitForEmptyEventLoop());
