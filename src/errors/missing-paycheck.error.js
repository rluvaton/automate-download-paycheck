const { AppError } = require('./app.error');

class MissingPaycheckError extends AppError {
  /**
   * @param {Date} date
   */
  constructor(date) {
    super(`Paycheck is missing for ${date.getMonth() + 1}/${date.getFullYear()}`);
  }
}


module.exports = {
  MissingPaycheckError
};
