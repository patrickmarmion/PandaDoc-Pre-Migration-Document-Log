const fs = require('fs');
const axiosInstance = require("../Config/axiosInstance");
const credentialsPath = '../Credentials/credentials.json';
const refreshPath = '../Credentials/refresh.json';
const tokenPath = '../Credentials/token.json';

const refreshAccessToken = async () => {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const { client_id, client_secret } = credentials.web;
  const { refresh_token } = JSON.parse(fs.readFileSync(refreshPath));
  const body = {
    client_id,
    client_secret,
    refresh_token,
    grant_type: 'refresh_token',
  };
  try {
    const response = await axiosInstance.post('https://www.googleapis.com/oauth2/v4/token', body);
    const accessToken = response.data.access_token;
    const tokenFile = JSON.parse(fs.readFileSync(tokenPath));
    tokenFile.access_token = accessToken;
    fs.writeFileSync(tokenPath, JSON.stringify(tokenFile));
    console.log(JSON.stringify(tokenFile));
  } catch (error) {
    console.error(error);
  }
};

module.exports = refreshAccessToken;