import {Page} from 'playwright';
import {baseLogger} from "./logger";
import * as path from "node:path";
import {harGal, pdf} from "./conf";


const logger = baseLogger.child({name: 'har-gal'});

export async function downloadPaycheckFromHarGal({page, date, downloadFolder}: {
  page: Page,
  date: Date,
  downloadFolder: string
}) {
  const downloadFilePath = path.join(downloadFolder, `har-gal-${date.getFullYear()}-${date.getMonth() + 1}.pdf`);

  logger.info('Opening login page');
  await page.goto('https://eforms.hargal.co.il/login');
  logger.info('Login page opened');

  await login({
    page,
    username: harGal.USERNAME,
    password: harGal.PASSWORD,
  });

  await goToPaychecks({
    page
  });

  await goToPaycheckDate({page, year: date.getFullYear(), month: date.getMonth()});

  await unlockPaycheck({page, password: pdf.PASSWORD});

  await downloadPaycheck({page, downloadPath: downloadFilePath});

  return downloadFilePath;
}

async function login({page, username, password}: { page: Page, username: string, password: string }) {
  logger.info('Log in');

  // There is tab for one time code and tab for password
  await page.getByRole('tab', {name: 'סיסמא'}).click();

  // Fill in the username
  await page.getByPlaceholder('מספר זהות').fill(username);

  // Fill in the password
  await page.getByPlaceholder('סיסמה').fill(password);

  // Login
  await page.getByRole('button', {name: 'אישור'}).click();

  logger.info('Logged in');

}

async function goToPaychecks({page}: { page: Page }) {
  logger.info('Going to paychecks page');

  // Open the paycheck page
  await page.getByText('תלושי שכר').click();

  logger.info('Arrived at paychecks page');
}

async function goToPaycheckDate({page, year, month}: { page: Page, year: number, month: number }) {
  logger.info('Selecting the requested paycheck date');

  // TODO - if the date is missing in the dropdown throw MissingPaycheckError

  await page.locator('select[name="selectedYear"]').selectOption(year.toString());

  // The value month number zero based and then the regular month number
  // e.g. for January the value will be 0: 1
  // e.g. for February the value will be 1: 2
  await page.locator('select[name="selectedMonth"]').selectOption(`${month}: ${month + 1}`);

  const networkIdle = page.waitForLoadState('networkidle')

  // Need to focus somewhere else so the selection will take effect
  await page.focus('body');

  // This should resolve after finish to try to fetch the PDF
  await networkIdle;

  logger.info('Requested paycheck date selected');

}

async function unlockPaycheck({page, password}: { page: Page, password: string }) {
  logger.info('Unlocking paycheck');

  const passwordOverlay = page.locator('#passwordOverlay');

  await passwordOverlay.getByRole('textbox').fill(password);
  await passwordOverlay.getByRole('button', {name: 'אישור'}).click();

  logger.info('Waiting for paycheck password overlay to disappear');

  // Waiting for the password overlay to disappear
  let visible = await passwordOverlay.isVisible();
  let exists = await passwordOverlay.count();
  while (visible && exists > 0) {
    visible = await passwordOverlay.isVisible();
    exists = await passwordOverlay.count();
  }

  logger.info('Paycheck unlocked');
}

async function downloadPaycheck({page, downloadPath}: { page: Page, downloadPath: string }) {
  logger.info('Downloading paycheck');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'הורדה'}).click();
  const download = await downloadPromise;

  await download.saveAs(downloadPath);

  logger.info('Paycheck downloaded');
}
