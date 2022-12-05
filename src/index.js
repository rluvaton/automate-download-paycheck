const pdfService = require('./pdf-service');
const { baseLogger } = require('./logger');
const { paycheck, pdf, hilan, harGal, browser: browserConf } = require('./conf');
const { downloadPaycheckFor: downloadPaycheckForHarGal } = require('./har-gal');
const { downloadPaycheckFor: downloadPaycheckForHilan } = require('./hilan');
const { makeSureEmptyDirectory } = require('./fs-utils');
const { removePdfFileEncryption } = require('./pdf-service');
const { sendMail } = require('./mail-sender');
const fs = require('fs/promises');
const { getDuration } = require('./general-utils');
const { MissingPaycheckError } = require('./errors/missing-paycheck.error');
const puppeteer = require('puppeteer');

async function wrapDownloadWithSetupAndCleanup(fn) {
  await makeSureEmptyDirectory(paycheck.folder);

  await fn()

  baseLogger.info('Cleaning temporary directory');
  await fs.rmdir(paycheck.folder, { recursive: true });
}
/**
 * Download from hilan
 * @param browser
 * @param {Date} paycheckDate
 * @return {Promise<void>}
 */
async function downloadFromHilan(browser, paycheckDate) {
  const logger = baseLogger.child({ name: `Hilan [${hilan.workerName}] [${hilan.companyName}]` });

  logger.info('Downloading paycheck');

  let pdfFilePath;
  try {
    pdfFilePath = await downloadPaycheckForHilan(paycheckDate, paycheck.folder, browser);
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
 * Download from hilan
 * @param browser
 * @param {Date} paycheckDate
 * @return {Promise<void>}
 */
async function downloadFromHargal(browser, paycheckDate) {
  const logger = baseLogger.child({ name: `Har Gal [${harGal.workerName}] [${harGal.companyName}]` });

  logger.info('Downloading paycheck');

  let pdfFilePath;
  try {
    pdfFilePath = await downloadPaycheckForHarGal(paycheckDate, paycheck.folder, browser);
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
    await pdfService.assertAvailable();
  } catch (e) {
    baseLogger.error('existing...')
    return;
  }

  // The paycheck from prev month
  const paycheckDate = new Date();

  // The date will now be the last day of the _previous_ month
  paycheckDate.setDate(0);

  // TODO - on browser/page close abort with error
  const browser = await puppeteer.launch({
    headless: browserConf.headless,
    devtools: browserConf.devtools,
  });

  try {
    await wrapDownloadWithSetupAndCleanup(async () => {
      try {
        await downloadFromHilan(browser, paycheckDate);
      } catch (e) {
        baseLogger.error(e, 'Failed to download from Hilan');
      }
    });

    await wrapDownloadWithSetupAndCleanup(async () => {
      try {
        await downloadFromHargal(browser, paycheckDate);
      } catch (e) {
        baseLogger.error(e, 'Failed to download from Har gal');
      }
    });
  } finally {
    await browser.close();
  }
}

const startTime = Date.now();

baseLogger.info('Starting');

run()
  .then(() => baseLogger.info(`Completed! took ${getDuration(startTime)}`))
  .catch(error => baseLogger.error(error, `Failed to run, took ${getDuration(startTime)}`))
