const fs = require('fs');
const axiosInstance = require("../Config/axiosInstance");

const refreshAccessToken = async () => {
    let cred = fs.readFileSync('../Credentials/credentials.json');
    let creds = JSON.parse(cred);
    let rawdata = fs.readFileSync('../Credentials/refresh.json');
    let files = JSON.parse(rawdata);
    const refresh_token = files.refresh_token;
    const client_id = creds.installed.client_id;
    const client_secret = creds.installed.client_secret;
    let body = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    let response = await axiosInstance.post('https://www.googleapis.com/oauth2/v4/token', body);
    let accessToken = response.data.access_token;
    const fileName = '../Credentials/token.json';
    const file = require(fileName);
    file.access_token = accessToken;
    fs.writeFile(fileName, JSON.stringify(file), function writeJSON(err) {
        if (err) return console.log(err);
        console.log(JSON.stringify(file));
    });
};

module.exports = refreshAccessToken;