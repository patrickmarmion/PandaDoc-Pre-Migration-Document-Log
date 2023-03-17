const fs = require('fs');

const setCredentials = async () => {
    try {
        JSON.parse(fs.readFileSync('./Credentials/token.json'));
        fs.writeFileSync('./Credentials/token.json', '')
        fs.writeFileSync('./Credentials/refresh.json', '')
        return
    } catch (err) {
        console.log("No previous tokens stored in token.json")
        return
    }
}

module.exports = setCredentials;