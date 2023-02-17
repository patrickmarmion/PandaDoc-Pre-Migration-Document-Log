const readline = require('readline-promise').default;

const organise = async (sheets) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const customerName = await rl.questionAsync('Enter Customer Name here please: ');
    rl.close();
    let spreadsheetId = await createNewSpreadSheet(customerName, sheets);
    await createSheetRows(spreadsheetId, sheets);
    await reNameSheet(spreadsheetId, sheets);
    return spreadsheetId
}

const createNewSpreadSheet = async (customerName, sheets) => {
    const resource = {
        properties: {
            title: customerName,
        },
    };
    try {
        const spreadsheet = await sheets.spreadsheets.create({
            resource,
            fields: 'spreadsheetId',
        });
        return spreadsheet.data.spreadsheetId;
    } catch (err) {
        throw err;
    }
};
const createSheetRows = async (spreadsheetId, sheets) => {
    const request = {
        spreadsheetId,
        resource: {
            requests: [{
                "appendDimension": {
                    "sheetId": "0",
                    "dimension": "ROWS",
                    "length": 25000
                }
            }],
        }
    };
    try {
        (await sheets.spreadsheets.batchUpdate(request)).data;
        console.log("25000 rows added");
    } catch (err) {
        console.error(err);
    }
}
const reNameSheet = async (spreadsheetId, sheets) => {
    const requests = [
        {
         updateSheetProperties: {
          properties: {
           sheetId: "0",
           title: 'Documents',
          },
          fields: 'title'
          }
         }
       ];
       await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
         requests,
        },
       });
}

module.exports = organise;