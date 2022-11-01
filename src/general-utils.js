const prettyMilliseconds = require('pretty-ms');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {number} startTimeInMs
 * @return {string}
 */
function getDuration(startTimeInMs) {
  return prettyMilliseconds(Date.now() - startTimeInMs);
}

module.exports = {
  sleep,
  getDuration
}
