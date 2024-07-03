import {AppError} from './app.error';

export class MissingPaycheckError extends AppError {
  constructor(date: Date) {
    super(`Paycheck is missing for ${date.getMonth() + 1}/${date.getFullYear()}`, true);
  }
}


