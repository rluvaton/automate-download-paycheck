const fs = require('fs/promises');
const isPDF = require('is-pdf-valid');
const commandExists = require('command-exists');
const { spawn } = require('child_process');
const { baseLogger } = require('./logger');

/**
 *
 * @param {string} path
 * @param {string} password
 */
export async function removePdfFileEncryption(path, password) {
  const qpdfConvertFileChildProcess = spawn(
    'qpdf',
    [
      // Pass password from STDIN
      // https://github.com/qpdf/qpdf/issues/499#issuecomment-773626254
      '--password-file=-',

      // Use the same file as input and output
      '--replace-input',

      // Remove the password
      '--decrypt',

      // Input & output file
      path,
    ]);

  // So we'll see the logs
  qpdfConvertFileChildProcess.stdout.pipe(process.stdout);
  qpdfConvertFileChildProcess.stderr.pipe(process.stderr);

  return new Promise<void>((resolve, reject) => {
    qpdfConvertFileChildProcess.on('exit', (code) => {
      if (code === 0) {
        return resolve();
      }

      reject(new Error(`qpdf exited with code ${code}`));
    });

    qpdfConvertFileChildProcess.on('error', reject);
    qpdfConvertFileChildProcess.stdin.on('error', reject);
    qpdfConvertFileChildProcess.stdout.on('error', reject);
    qpdfConvertFileChildProcess.stderr.on('error', reject);

    // This will write and end the STDIN so qpdf will know that we finish passing the password
    qpdfConvertFileChildProcess.stdin.end(password);
  })
    .catch((error) => {
      baseLogger.error(error, 'Error from qpdf process');

      // Kill process if still running
      if (qpdfConvertFileChildProcess.exitCode === null) {
        baseLogger.error('qpdf process still running after error, killing it...');
        qpdfConvertFileChildProcess.kill();
      }

      throw error;
    });
}

export async function assertAvailable() {
  try {
    await commandExists('qpdf');
  } catch (error) {

    baseLogger.error(error, `\`qpdf\` does not exist.
Possible reasons:
  1. Not installed (try running \`apt install qpdf\` or \`brew install qpdf\`)
  2. Not in PATH`);

    throw new Error('qpdf is missing');
  }
}

