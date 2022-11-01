const pino = require('pino')
const pretty = require('pino-pretty')

const stream = pretty({
  sync: process.env.NODE_ENV === 'test',

  ignore: 'pid,hostname',
});

const logger = pino({
  // TODO - SET DEBUG LEVEL BASED ON ENV
  // level: process.env.DEBUG ? 'debug' : 'info'
}, stream);

// TODO - LOG ERROR IN CASE OF UNCAUGHT EXCEPTION OR UNHANDLED REJECTION
// https://github.com/pinojs/pino/blob/master/docs/help.md#exit-logging-deprecated-for-node-v14

module.exports = { baseLogger: logger };
