const fs = require('fs/promises');
const path = require('path');
const { baseLogger } = require('./logger');
const {
  setupDownloadLocation,
  getFirstPage,
  getOptionsAndSelected,
  selectValue,
  isVisible,
} = require('./puppeteer-utils');
const { harGal, pdf } = require('./conf');
const { sleep } = require('./general-utils');
const { isValidPdfFile } = require('./pdf-service');
const { MissingPaycheckError } = require('./errors/missing-paycheck.error');

const logger = baseLogger.child({ name: 'har-gal' });

async function moveToIdAndPasswordLoginPage(page) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('[role=tab]'))
        .find(element => element.innerText?.trim() === 'סיסמא')
        .click();
  });

  await page.waitForFunction(
    () => document.querySelector('#lfPassword').placeholder?.trim() === 'סיסמה',
  );
}

async function login(page, username, password) {
  await moveToIdAndPasswordLoginPage(page);

  await page.type('#lfLogin', username, { delay: 100 });
  await page.type('#lfPassword', password, { delay: 100 });

  await page.click('div.loginLine.loginSubmit > input[type="submit"]');

  // Wait for paycheck text to appear which means that we logged in
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('div.name'))
      .some(element => element.innerText?.trim() === 'תלושי שכר'),
  );
}

async function openPaycheckPage(page) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('div.name')).find(element => element.innerText?.trim() === 'תלושי שכר').click();
  });
}

async function unlockPaycheck(page, pdfPassword) {
  await page.waitForSelector('#password.toolbarField');

  await sleep(100);

  await page.$eval('#password.toolbarField', (el, password) => el.value = password, pdfPassword);

  await sleep(1000);

  await page.click('#passwordSubmit');

  await sleep(1000);

  if (await isVisible(page, '#passwordOverlay')) {
    throw new Error('PDF password submit button is still visible after submitting PDF password, probably wrong password');
  }
}

async function downloadPaycheck(page) {
  await page.waitForSelector('#download');

  await page.click('#download');
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {Date} date
 * @return {Promise<void>}
 */
async function navigateToPaycheckByDate(page, date) {
  const selectedYearSelector = 'select[name=selectedYear]'
  const selectedMonthSelector = 'select[name=selectedMonth]'

  await page.waitForSelector(selectedYearSelector);
  await page.waitForSelector(selectedMonthSelector);

  // Wait for element to be selected
  await sleep(1000);

  const selectedYearSelection = await getOptionsAndSelected(page, selectedYearSelector);

  // If not selected
  if (selectedYearSelection.selected.every(text => text !== date.getFullYear().toString())) {
    const yearOption = selectedYearSelection.options.find(({ text }) => text === date.getFullYear().toString())
    if (!yearOption) {
      logger.error({ selectedYearSelection, date }, 'there is no option with the requested year in the paycheck page');
      throw new Error(`Year is missing in the paycheck page`);
    }

    await selectValue(page, selectedYearSelector, yearOption.value);
  }

  const selectedMonthSelection = await getOptionsAndSelected(page, selectedMonthSelector);

  // If not selected
  if (selectedMonthSelection.selected.every(({ index }) => index !== date.getMonth())) {
    const monthOption = selectedMonthSelection.options[date.getMonth()];

    if (!monthOption) {
      logger.error({
        selectedMonthSelection,
        date,
      }, 'there is no option with the requested month in the paycheck page');
      throw new Error(`Month is missing in the paycheck page`);
    }

    await selectValue(page, selectedMonthSelector, monthOption.value);
  }

  // Need to focus somewhere else so the selection will take effect
  await page.focus('body');

  // This should resolve after finish to try to fetch the PDF
  await page.waitForNetworkIdle();
}


/**
 *
 * @param {puppeteer.Page} page
 * @param {Date} date
 * @return {Promise<boolean>}
 */
async function isPaycheckAvailable(page, date) {
  return !!(await page.$('#outerContainer'));
}

async function _downloadPaycheckFor({ browser, date, folderToDownloadPaycheckTo }) {
  const page = await getFirstPage(browser)

  await page.goto('https://eforms.hargal.co.il/login');

  await setupDownloadLocation(page, folderToDownloadPaycheckTo);
  await login(page, harGal.USERNAME, harGal.PASSWORD);

  await openPaycheckPage(page);
  await navigateToPaycheckByDate(page, date);

  // TODO - debugging
  if (!await isPaycheckAvailable(page, date)) {
    throw new MissingPaycheckError(date);
  }

  logger.info({ month: date.getMonth() + 1, year: date.getFullYear() }, 'Paycheck is available ✅');

  await unlockPaycheck(page, pdf.PASSWORD);
  await downloadPaycheck(page);

  // TODO - wait for download to finish
  await sleep(10_000);

  const paycheckFolder = await fs.readdir(folderToDownloadPaycheckTo);

  for (const fileName of paycheckFolder) {
    let filePath = path.join(folderToDownloadPaycheckTo, fileName);
    if (await isValidPdfFile(filePath)) {
      return filePath;
    }
  }

  logger.error({ paycheckFolder, folderToDownloadPaycheckTo }, 'No valid paycheck PDF file in folder');
  throw new Error('No valid paycheck PDF file in folder');

  // TODO:
  //  - [x] Go to the check in the current month and year
  //  - [ ] If check is missing (email/telegram message) that no check found
  //  - [ ] report job as failed
  //  - [ ] requeue job in few days
  //  - [ ] exit


  // TODO:
  //  - [x] Exit page
  //  - [x] Remove check password
  //  - [x] rename check file to match the company and the date
  //  - [x] send email with the check
  //  - [x] remove paycheck
  //  - [ ] set job as successful
}

/**
 *
 * @param {Date} date
 * @param {string} folderToDownloadPaycheckTo
 * @param browser
 * @returns {Promise<string>}
 */
async function downloadPaycheckFor(date, folderToDownloadPaycheckTo, browser) {
  return await _downloadPaycheckFor({
    browser,
    date,
    folderToDownloadPaycheckTo,
  });
}


module.exports = {
  downloadPaycheckFor,
}
