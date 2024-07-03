const nodemailer = require('nodemailer');
const { mail } = require('./conf');
const { baseLogger } = require('./logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: mail.USERNAME + '@' + mail.DOMAIN,
    pass: mail.PASSWORD,
  },
  logger: baseLogger.child({ name: 'nodemailer' }),
});

function getRecipientAddress(username, domain, companyName, workerName) {
  return `${username}+${workerName ? `${workerName}+` : ''}paychecks-${companyName}@${domain}`
}

/**
 * Get the paycheck file name (without extension)
 * @param {string} company Company name
 * @param {Date} date date of paycheck (only year and month are relevant)
 * @returns {string} paycheck file name
 */
function getPaycheckFileName(company, date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `paycheck.${company}.${year}-${month}`
}

/**
 *
 * @param {string} company
 * @param {Date} date
 * @param {string} workerName
 * @returns {{subject: string, text: string}}
 */
function getPaycheckSubjectAndBody(company, date, workerName) {
  return {
    subject: `Paycheck ${workerName ? `for ${workerName} ` : ''}from ${company} at ${date.getMonth() + 1}/${date.getFullYear()}`,
    text: `New paycheck ${workerName ? `for ${workerName} ` : ''}from ${company} attached for`,
  }
}

/**
 *
 * @param {string} companyName
 * @param {string} workerName
 * @param {Date} date
 * @param {string} paycheckPath
 * @returns {Promise<void>}
 */
async function sendMail(companyName, workerName, date, paycheckPath, logger) {
  // TODO - CHECK IF PAYCHECK PATH EXIST

  const mailOptions = {
    from: `${mail.USERNAME}@${mail.DOMAIN}`,
    to: getRecipientAddress(mail.USERNAME, mail.DOMAIN, companyName, workerName),

    ...getPaycheckSubjectAndBody(companyName, date, workerName),

    attachments: [
      {
        filename: getPaycheckFileName(companyName, date) + '.pdf',
        path: paycheckPath,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    const mailInfo = await transporter.sendMail(mailOptions);

    logger.debug({ mailInfo, mailOptions }, `Mail sent from ${mailOptions.from} to ${mailOptions.to}`);
  } catch (error) {
    logger.error(error, 'Failed to send mail');

    throw new Error('failed to send mail');
  } finally {
    logger.info('Closing nodemailer transport connection');
    transporter.close();
  }
}


module.exports = {
  sendMail,
};
