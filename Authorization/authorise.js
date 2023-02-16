const fs = require('fs');
const {
    google
} = require('googleapis');
const readline = require('readline-promise').default;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const authorize = async (credentials, TOKEN_PATH, REFRESH_TOKEN_PATH) => {
    const {
        client_secret,
        client_id,
        redirect_uris
    } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]
    );

    try {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (err) {
        const authorizedClient = await getNewToken(oAuth2Client, TOKEN_PATH, REFRESH_TOKEN_PATH);
        return authorizedClient;
    }
};

const getNewToken = async (oAuth2Client, TOKEN_PATH, REFRESH_TOKEN_PATH) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const code = await rl.questionAsync('Enter the code from that page here: ');
    rl.close();
    const {
        tokens
    } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        forceRefreshOnFailure: true
    });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    fs.writeFileSync(REFRESH_TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to', TOKEN_PATH);
};

module.exports = authorize;