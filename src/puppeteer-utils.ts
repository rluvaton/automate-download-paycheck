// @ts-nocheck
import {baseLogger} from "./logger";

import path from "path";
import {ElementHandle, Page} from "puppeteer";

/**
 * @typedef {import('puppeteer').Browser} Browser
 * @typedef {import('puppeteer').Page} Page
 */

const logger = baseLogger.child({ name: "puppeteer-utils" });

/**
 * Get first page (or create one if none)
 * @param {Browser} browser
 * @return {Promise<Page>}
 */
export async function getFirstPage(browser) {
  const pages = await browser.pages();

  if (pages.length > 0) {
    return pages[0];
  }

  return await browser.newPage();
}

/**
 * Setup puppeteer to download file to #absoluteLocation
 * @param {Page} page
 * @param {string} absoluteLocation Absolute path
 * @return {Promise<void>}
 */
export async function setupDownloadLocation(page, absoluteLocation) {
  if (!path.isAbsolute(absoluteLocation)) {
    logger.error(
      { path: absoluteLocation },
      "setupDownloadLocation path must be absolute",
    );
    throw new Error("path must be absolute");
  }

  // BEWARE - THIS CAN BREAK, `Browser.setDownloadBehavior` is experimental
  // https://chromedevtools.github.io/devtools-protocol/tot/Browser/#method-setDownloadBehavior
  // (not using Page.setDownloadBehavior as it's deprecated)
  await page._client.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: absoluteLocation,
  });
}

/**
 *
 * @template T
 * @param {Page} page
 * @param {ElementHandle<Element>} selectEl
 * @param {(value: any, text: string) => T} parseFn
 */
export async function getOptionsAndSelected<T>(
  page: Page,
  selectEl,
  parseFn: (value: any, text: string) => T | undefined = () => undefined,
) {
  if (typeof selectEl === 'string') {
    selectEl = await page.$(selectEl)!;
  }

  const optionsAndSelected: {
    selected: {
      index: number,
        value: string,
        text: string,
        parsed: T | undefined,
    }[],

    options: {
      value: string,
      text: string,
      parsed: T | undefined,
    }[]
  } = await page.evaluate((el) => {
    return {
      selected: Array.from(el.selectedOptions).map((selectedOption) => ({
        // @ts-expect-error
        index: selectedOption.index,
        // @ts-expect-error
        value: selectedOption.value,
        // @ts-expect-error
        text: selectedOption.innerText.trim(),
      })),
      options: Array.from(el.options).map((option) => ({
        value: option.value,
        text: option.innerText.trim(),
      })),
    };
  }, selectEl);

  optionsAndSelected.selected.forEach((item) => {
    item.parsed = parseFn(item.value, item.text);
  });

  optionsAndSelected.options.forEach((item) => {
    item.parsed = parseFn(item.value, item.text);
  });

  return optionsAndSelected;
}

export async function selectValue(
  page,
  selector,
  value,
  validateSelected = (currentlySelectedValue, value) =>
    currentlySelectedValue.includes(value),
) {
  // TODO - NOT SELECTING OPTION
  await page.select(selector, value);

  // TODO - asset value is selected
  const selectEl = await page.$(selector);

  /**
   *
   * @type {any[]}
   */
  const currentlySelectedValue = await page.evaluate(
    (el) => Array.from(el.selectedOptions).map((option) => option.value),
    selectEl,
  );

  if (!validateSelected(currentlySelectedValue, value)) {
    logger.error(
      { selector, value, currentlySelectedValue },
      "selected value did not changed",
    );
    throw new Error("not selected " + value);
  }
}

export async function isVisible(page, selector) {
  return await page.evaluate((selector) => {
    const e = document.querySelector(selector);
    if (!e) {
      return false;
    }

    const style = window.getComputedStyle(e);

    return (
      style &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  }, selector);
}
