import {baseLogger} from "./logger";

import {assertAvailable, removePdfFileEncryption} from "./pdf-service";

import {browser as browserConf, harGal, hilan, paycheck, pdf} from "./conf";

import {makeSureEmptyDirectory} from "./fs-utils";


import {sendMail} from "./mail-sender";

import fs from "fs/promises";

import {getDuration} from "./general-utils";

import {MissingPaycheckError} from './errors/missing-paycheck.error';
import {downloadPaycheckFromHarGal} from "./har-gal";
import {Page, chromium} from "playwright";
import {downloadPaycheckFromHilan} from "./hilan";

async function wrapDownloadWithSetupAndCleanup(fn: () => Promise<void>) {
    await makeSureEmptyDirectory(paycheck.folder);

    await fn()

    baseLogger.info('Cleaning temporary directory');
    await fs.rm(paycheck.folder, {recursive: true});
}

/**
 * Download from hilan
 */
async function downloadFromHilan({page, paycheckDate}: { page: Page, paycheckDate: Date }) {
    const logger = baseLogger.child({name: `Hilan [${hilan.workerName}] [${hilan.companyName}]`});

    logger.info('Downloading paycheck');

    let pdfFilePath;
    try {
        pdfFilePath = await downloadPaycheckFromHilan({
            page,
            date: paycheckDate,
            downloadFolder: paycheck.folder,
        });
    } catch (e) {
        if (e instanceof MissingPaycheckError) {
            logger.warn(e);
            return;
        }

        throw e;
    }
    logger.info('Paycheck downloaded');

    logger.info('Sending mail with paycheck');
    await sendMail(hilan.companyName, hilan.workerName, paycheckDate, pdfFilePath, logger);
    logger.info('Mail sent successfully');
}


/**
 * Download from Hargal
 */
async function downloadFromHargal({page, paycheckDate}: { page: Page, paycheckDate: Date }) {
    const logger = baseLogger.child({name: `Har Gal [${harGal.workerName}] [${harGal.companyName}]`});

    logger.info('Downloading paycheck');

    let pdfFilePath;
    try {
        pdfFilePath = await downloadPaycheckFromHarGal({
            page,
            date: paycheckDate,
            downloadFolder: paycheck.folder
        });
    } catch (e) {
        if (e instanceof MissingPaycheckError) {
            logger.warn(e);
            return;
        }

        throw e;
    }
    logger.info('Paycheck downloaded');

    logger.info('Removing file encryption if exist');
    await removePdfFileEncryption(pdfFilePath, pdf.PASSWORD);
    logger.info('Paycheck file encryption removed');

    logger.info('Sending mail with paycheck');
    await sendMail(harGal.companyName, harGal.workerName, paycheckDate, pdfFilePath, logger);
    logger.info('Mail sent successfully');
}

async function run() {
    try {
        await assertAvailable();
    } catch (e) {
        baseLogger.error(e, "existing...");
        return;
    }

    // The paycheck from prev month
    const paycheckDate = new Date();

    // The date will now be the last day of the _previous_ month
    paycheckDate.setDate(0);

    // TODO - on browser/page close abort with error
    const browser = await chromium.launch({
        headless: browserConf.headless,
    });

    try {
        const page = await browser.newPage();

        await wrapDownloadWithSetupAndCleanup(async () => {
            try {
                await downloadFromHargal({
                    page,
                    paycheckDate
                });
            } catch (e) {
                baseLogger.error(e, "Failed to download from Har gal");
            }
        });

        await wrapDownloadWithSetupAndCleanup(async () => {
            try {
                await downloadFromHilan({
                    page,
                    paycheckDate
                });
            } catch (e) {
                baseLogger.error(e, "Failed to download from Hilan");
            }
        });
    } finally {
        await browser?.close();
    }
}

const startTime = Date.now();

baseLogger.info('Starting');

run()
    .then(() => baseLogger.info(`Completed! took ${getDuration(startTime)}`))
    .catch(error => baseLogger.error(error, `Failed to run, took ${getDuration(startTime)}`))
