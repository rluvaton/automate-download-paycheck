import {Page, Locator} from 'playwright';
import {baseLogger} from "./logger";
import * as path from "node:path";
import {hilan} from "./conf";
import {MissingPaycheckError} from "./errors/missing-paycheck.error";


const logger = baseLogger.child({name: 'har-gal'});

export async function downloadPaycheckFromHilan({page, date, downloadFolder}: {
    page: Page,
    date: Date,
    downloadFolder: string
}) {
    const downloadFilePath = path.join(downloadFolder, `hilan-${date.getFullYear()}-${date.getMonth() + 1}.pdf`);

    logger.info('Opening login page');
    await page.goto(`${hilan.baseUrl}/login`);
    logger.info('login page opened');

    await login({
        page,
        username: hilan.USERNAME,
        password: hilan.PASSWORD,
    });

    await goToPaychecks({
        page
    });

    await goToPaycheckDate({page, year: date.getFullYear(), month: date.getMonth()});

    await downloadPaycheck({page, downloadPath: downloadFilePath});

    return downloadFilePath;
}

async function login({page, username, password}: { page: Page, username: string, password: string }) {
    logger.info('Log in');

    await page.getByPlaceholder('מספר העובד').fill(username);

    await page.getByPlaceholder('סיסמה').fill(password);

    await page.getByRole('button', {name: 'כניסה'}).click();

    // Waiting for the page to finish login
    await page.waitForLoadState('networkidle');

    logger.info('Logged in');
}

async function goToPaychecks({page}: { page: Page }) {
    logger.info('Navigating to paychecks page');

    await page.goto(`${hilan.baseUrl}/Hilannetv2/ng/personal-file/payslip`);

    logger.info('Paychecks page opened');
}

async function goToPaycheckDate({page, year, month}: { page: Page, year: number, month: number }) {
    logger.info('Selecting the requested paycheck date');

    // Waiting for the date list select to be visible
    await page.locator('select').waitFor({state: 'visible'});

    const selectedValue = await page.evaluate(() => {
        const datesList = document.querySelector('select');

        if (!datesList) {
            return;
        }

        const selected = datesList.selectedIndex;

        if (selected == null) {
            return;
        }

        return datesList.options[selected].value;
    });

    let shouldSelectOption = true;

    if (selectedValue && doesValueMatchDate({value: selectedValue, year, month})) {
        logger.info('Requested paycheck date already selected');
        shouldSelectOption = false;
    }

    if (shouldSelectOption) {
        await selectDate({page, year, month});
    }

    const networkIdle = page.waitForLoadState('networkidle');

    await page.getByText('להצגת תלוש השכר').click();

    // This should resolve after finish to try to fetch the PDF
    await networkIdle;

    logger.info('Requested paycheck date selected');
}

async function selectDate({page, year, month}: { page: Page, year: number, month: number }) {

    // Open the date dropdown
    await page.getByRole('combobox').click();

    const options = await page.getByRole('option').all();

    let optionText: string | undefined;

    for (const option of options) {
        const optionValue = await option.getAttribute('value');

        if (optionValue && doesValueMatchDate({value: optionValue, year, month})) {
            optionText = optionValue;
            break;
        }
    }

    if (!optionText) {
        const date = new Date(year, month);
        throw new MissingPaycheckError(date)
    }

    await selectOptionFromCombobox(page.getByRole('combobox'), optionText);
}

function doesValueMatchDate({value, year, month}: {value: string, year: number, month: number}) {

    const monthString = (month + 1).toString().padStart(2, '0');

    // The option value is the option index and then the month number + year
    // e.g. 4: 02/2024 for February 2024 paycheck when it's the 5th option (zero based)
    return value?.endsWith(` ${monthString}/${year}`);
}

async function downloadPaycheck({page, downloadPath}: { page: Page, downloadPath: string }) {
    logger.info('Downloading paycheck');

    await page.getByRole('button', {name: 'הורדת תלוש'}).click();
    await page.getByLabel('ללא הצפנה').check();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: 'הורדת קובץ'}).click();

    const download = await downloadPromise;

    await download.saveAs(downloadPath);

    logger.info('Paycheck downloaded');
}

async function selectOptionFromCombobox(combobox: Locator, optionValue: string) {
    // We are having issues selecting option this way
    // await page.selectOption('combobox', optionText);

    await combobox.evaluate((element, optionValue) => {
        (element as HTMLSelectElement).value = optionValue;
    }, optionValue);
}
