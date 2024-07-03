import * as path from "node:path";

import {config} from "dotenv";

config()

export const general = {
  isProd: process.env.NODE_ENV === 'production',
};

export const hilan = {
  companyName: process.env.HILAN_COMPANY_NAME!,
  workerName: process.env.HILAN_WORKER_NAME!,

  baseUrl: process.env.HILAN_BASE_URL!,

  USERNAME: process.env.HILAN_USERNAME!,
  PASSWORD: process.env.HILAN_PASSWORD!,
};

export const harGal = {
  companyName: process.env.HAR_GAL_COMPANY_NAME!,
  workerName: process.env.HAR_GAL_WORKER_NAME!,

  USERNAME: process.env.HAR_GAL_USERNAME!,
  PASSWORD: process.env.HAR_GAL_PASSWORD!,
};

export const pdf = {
  PASSWORD: process.env.PDF_PASSWORD!,
};

export const mail = {
  USERNAME: process.env.EMAIL_USERNAME,
  PASSWORD: process.env.EMAIL_PASSWORD,
  DOMAIN: process.env.EMAIL_DOMAIN || 'gmail.com',
  PERSON: process.env.EMAIL_DOMAIN || 'gmail.com',
};

export const browser = {
  headless: general.isProd,
};

export const paycheck = {
  folder: path.join(__dirname, '../assets'),
}

