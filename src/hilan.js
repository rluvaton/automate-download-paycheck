const fs = require('fs/promises');
const path = require('path');
const { baseLogger } = require('./logger');
const {
  setupDownloadLocation,
  getFirstPage,
  getOptionsAndSelected,
  selectValue,
} = require('./puppeteer-utils');
const { hilan } = require('./conf');
const { sleep } = require('./general-utils');
const { isValidPdfFile } = require('./pdf-service');
const { MissingPaycheckError } = require('./errors/missing-paycheck.error');

const logger = baseLogger.child({ name: 'hilan' });

const BASE_URL = hilan.baseUrl;

async function getLoginBtn(page) {
  const selector = 'button[type="submit"]';
  await page.waitForSelector(selector);

  const loginBtn = await page.$(selector);
  const loginBtnText = await loginBtn.evaluate(el => el.textContent);

  if (!loginBtnText.includes('כניסה')) {
    throw new Error('login button is missing');
  }

  return selector;
}

async function login(page, username, password) {
  const userIdInputSelector = '#user_nm'
  await page.waitForSelector(userIdInputSelector);

  await page.type(userIdInputSelector, username, { delay: 100 });
  await page.type('#password_nm', password, { delay: 100 });

  const loginBtn = await getLoginBtn(page)

  await page.click(loginBtn);

  // Wait for the login to complete
  await page.waitForNavigation({ waitUntil: 'networkidle2' })

  // Wait for paycheck text to appear which means that we logged in
  // await page.waitForFunction(
  //   () => Array.from(document.querySelectorAll('div.name'))
  //     .some(element => element.innerText?.trim() === 'תלושי שכר'),
  // );
}

async function openPaycheckPage(page) {
  await page.goto(`${BASE_URL}/Hilannetv2/ng/personal-file/payslip`);
  // await page.evaluate(() => {
  //   Array.from(document.querySelectorAll('div.name')).find(element => element.innerText?.trim() === 'תלושי שכר').click();
  // });
}

async function downloadPaycheck(page) {
  await page.waitForSelector('button[name="DownloadPaySlip"]');

  await page.click('button[name="DownloadPaySlip"]');

  // Select without password
  await page.waitForSelector('#noEncryption');
  await page.click('#noEncryption');

  await page.evaluate(() => {
    const downloadBtnText = 'הורדת קובץ';
    Array.from(document.querySelectorAll('button')).find(element => element.innerText?.trim().includes(downloadBtnText)).click();
  });
}

/**
 *
 * @param {Date} date1
 * @param {Date} date2
 */
function isDatesEqualByYearAndMonth(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}

function parseValue(value) {
  const date = value.split(':')[1].trim();
  const [month, year] = date.split('/').map(num => parseInt(num, 10));

  return new Date(year, month - 1);
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {Date} date
 * @return {Promise<void>}
 */
async function navigateToPaycheckByDate(page, date) {
  // Only one
  const dateSelector = 'select'

  const dateEl = await page.waitForSelector(dateSelector);

  // Wait for element to be selected
  await sleep(1000);

  const selectedDateSelection = await getOptionsAndSelected(page, dateEl, (value) => parseValue(value));

  // If date not selected
  if (selectedDateSelection.selected.every((selected) => !isDatesEqualByYearAndMonth(date, selected.parsed))) {
    const dateOption = selectedDateSelection.options.find((option) => isDatesEqualByYearAndMonth(date, option.parsed));

    if (!dateOption) {
      logger.error({
        selectedDateSelection,
        date,
      }, 'there is no option with the requested year and month in the paycheck page');
      throw new Error(`Year and month is missing in the paycheck page`);
    }

    await selectValue(page, dateSelector, dateOption.value, (currentlySelectedValue, value) => currentlySelectedValue.every(item => isDatesEqualByYearAndMonth(parseValue(item), parseValue(value))));
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
  return !!(await page.$('button[name="DownloadPaySlip"]'));
}

async function _downloadPaycheckFor({ browser, date, folderToDownloadPaycheckTo }) {
  const page = await getFirstPage(browser)

  await page.goto(`${BASE_URL}/login`);

  await setupDownloadLocation(page, folderToDownloadPaycheckTo);
  await login(page, hilan.USERNAME, hilan.PASSWORD);

  await openPaycheckPage(page);
  await navigateToPaycheckByDate(page, date);

  // TODO - debugging
  if (!await isPaycheckAvailable(page, date)) {
    throw new MissingPaycheckError(date);
  }

  logger.info({ month: date.getMonth() + 1, year: date.getFullYear() }, 'Paycheck is available ✅');

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
