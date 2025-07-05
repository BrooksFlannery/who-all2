const development = require('./development');
const production = require('./production');
const test = require('./test');

const env = process.env.NODE_ENV || 'development';

const configs = {
    development,
    production,
    test
};

const config = configs[env];

if (!config) {
    throw new Error(`Unknown environment: ${env}`);
}

module.exports = config; 