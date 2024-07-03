const path = require('path');
require('dotenv').config()

const general = {
  isProd: process.env.NODE_ENV === 'production',
};

const hilan = {
  companyName: process.env.HILAN_COMPANY_NAME,
  workerName: process.env.HILAN_WORKER_NAME,

  baseUrl: process.env.HILAN_BASE_URL,

  USERNAME: process.env.HILAN_USERNAME,
  PASSWORD: process.env.HILAN_PASSWORD,
};

const harGal = {
  companyName: process.env.HAR_GAL_COMPANY_NAME,
  workerName: process.env.HAR_GAL_WORKER_NAME,

  USERNAME: process.env.HAR_GAL_USERNAME,
  PASSWORD: process.env.HAR_GAL_PASSWORD,
};

const pdf = {
  PASSWORD: process.env.PDF_PASSWORD,
};

const mail = {
  USERNAME: process.env.EMAIL_USERNAME,
  PASSWORD: process.env.EMAIL_PASSWORD,
  DOMAIN: process.env.EMAIL_DOMAIN || 'gmail.com',
  PERSON: process.env.EMAIL_DOMAIN || 'gmail.com',
};

const browser = {
  headless: general.isProd,
  devtools: !general.isProd,
};

const paycheck = {
  folder: path.join(__dirname, '../assets'),
}

module.exports = {
  hilan,
  harGal,
  pdf,
  mail,
  browser,
  general,
  paycheck,
}
