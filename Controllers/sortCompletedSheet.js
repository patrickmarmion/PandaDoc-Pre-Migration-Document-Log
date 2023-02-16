require('dotenv').config({
    path: "../.env"
})
const spreadsheetId = process.env.SPREADSHEET_ID;

//Add function to add headers to the sheet and auto adjust size of columns
const addHeaders = async (sheets, sheetName) => {
    const request = {
        spreadsheetId,
        resource: {
            requests: [{
                "insertDimension": {
                    "range": {
                        "sheetId": "0",
                        "dimension": "ROWS",
                        "startIndex": 0,
                        "endIndex": 1
                    },
                    "inheritFromBefore": false
                }
            }]
        }
    };
    try {
        (await sheets.spreadsheets.batchUpdate(request)).data;
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A1:K1`,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [
                    ["Document ID", "Document Name", "Document Version", "Document Create Date", "Document Status", "CRM Provider", "CRM Entity", "Entity ID"]
                ],
            },
        })
        return
    } catch (err) {
        console.error(err);
    }
}

const resizeColumns = async (sheets) => {
    const request = {
        spreadsheetId,
        resource: {
            requests: [{
                "autoResizeDimensions": {
                    "dimensions": {
                        "sheetId": "0",
                        "dimension": "COLUMNS",
                        "startIndex": 0,
                        "endIndex": 7
                    }
                }
            }]
        }
    };
    try {
        (await sheets.spreadsheets.batchUpdate(request)).data;
    } catch (err) {
        console.error(err);
    }
}

const createSheet = async (sheets, title) => {
    sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
            requests: [{
                addSheet: {
                    properties: {
                        title: title
                    }
                }
            }]
        }
    })
    return title
}

const readSheet = async (sheets, sheetName) => {
    const ranges = [`${sheetName}!A:H`];
    const {
        data
    } = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
    });
    let rows = data.valueRanges[0].values;
    return rows
}

const filterRows = async (rows, filter) => {
    let filtRows = rows.filter(k => k.includes(filter));
    return filtRows
}

const filterRowsLinkedObj = async (rows) => {
    let noEntity = rows.filter(k => !k.includes("No Linked CRM Entity"));
    let noError = noEntity.filter(e => !e.includes("https://api.pandadoc.com/public/v1/documents/"));
    let ops = noError.filter(o => (o.includes("opportunity")) || (o.includes("deal")));
    return ops
}

const writeSheet = async (sheets, title, filteredRows) => {
    await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: title,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: filteredRows,
        },
    })
    return
}

const version2Sheet = async (sheets) => {
    let sheetName = process.env.SPREADSHEET_NAME;
    await addHeaders(sheets, sheetName);
    await resizeColumns(sheets);
    let title = await createSheet(sheets, "Version 2 Docs")
    let rows = await readSheet(sheets, sheetName)
    let filteredRows = await filterRows(rows, "Document Version: Editor 2");
    await writeSheet(sheets, title, filteredRows);
}

const errorSheet = async (sheets) => {
    let sheetName = process.env.SPREADSHEET_NAME;
    let title = await createSheet(sheets, "Error Docs")
    let rows = await readSheet(sheets, sheetName)
    let filteredRows = await filterRows(rows, "Error Message: Please check this docs logs");
    await writeSheet(sheets, title, filteredRows);
}

const linkedObjSheet = async (sheets) => {
    let sheetName = "Version 2 Docs";
    let title = await createSheet(sheets, "Docs With Linked Objects")
    let rows = await readSheet(sheets, sheetName)
    let filteredRows = await filterRowsLinkedObj(rows);
    await writeSheet(sheets, title, filteredRows);
}



module.exports = {
    version2Sheet,
    errorSheet,
    linkedObjSheet
}