const {
    google
} = require('googleapis');
const fs = require('fs');
const authorize = require('./authorise');

const sheetAuth = async () => {
    const content = fs.readFileSync('./Credentials/credentials.json');
    const auth = await authorize(JSON.parse(content), './Credentials/token.json', './Credentials/refresh.json');
    const sheets = google.sheets({
        version: 'v4',
        auth
    });
    return sheets
};

module.exports = sheetAuth;