require('dotenv').config({
    path: "../.env"
})
const spreadsheetId = process.env.SPREADSHEET_ID;

const organise = async (sheets) => {
    const request = {
        spreadsheetId,
        resource: {
            requests: [{
                "appendDimension": {
                    "sheetId": "0",
                    "dimension": "ROWS",
                    "length": 20000
                }
            }],
        }
    };
    try {
        (await sheets.spreadsheets.batchUpdate(request)).data;
        console.log("20000 rows added");
    } catch (err) {
        console.error(err);
    }
}

module.exports = organise;