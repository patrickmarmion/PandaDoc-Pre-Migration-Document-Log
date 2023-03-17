const addHeaders = async (sheets, spreadsheetId, sheetId, title) => {
    const request = {
        spreadsheetId,
        resource: {
            requests: [{
                "insertDimension": {
                    "range": {
                        "sheetId": sheetId,
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
            range: `${title}!A1:K1`,
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

const resizeColumns = async (sheets, spreadsheetId, sheetId) => {
    const request = {
        spreadsheetId,
        resource: {
            requests: [{
                "autoResizeDimensions": {
                    "dimensions": {
                        "sheetId": sheetId,
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

const createSheet = async (sheets, title, spreadsheetId) => {
    let newSheet = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
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
    let sheetId = newSheet.data.replies[0].addSheet.properties.sheetId;
    return {title, sheetId}
}

const readSheet = async (sheets, sheetName, spreadsheetId) => {
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

const writeSheet = async (sheets, title, filteredRows, spreadsheetId) => {
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: title,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: filteredRows,
        },
    })
    return
}

const version2Sheet = async (sheets, spreadsheetId) => {
    await addHeaders(sheets, spreadsheetId, "0", "Documents");
    await resizeColumns(sheets, spreadsheetId, "0");
    let { title, sheetId } = await createSheet(sheets, "Version 2 Docs", spreadsheetId)
    let rows = await readSheet(sheets, "Documents", spreadsheetId)
    let filteredRows = await filterRows(rows, "Document Version: Editor 2");
    await writeSheet(sheets, title, filteredRows, spreadsheetId);
    await resizeColumns(sheets, spreadsheetId, sheetId);
}

const errorSheet = async (sheets, spreadsheetId) => {
    let { title } = await createSheet(sheets, "Error Docs", spreadsheetId)
    let rows = await readSheet(sheets, "Documents", spreadsheetId)
    let filteredRows = await filterRows(rows, "Error Message: Please check this docs logs");
    await writeSheet(sheets, title, filteredRows, spreadsheetId);
}

const linkedObjSheet = async (sheets, spreadsheetId) => {
    let { title, sheetId } = await createSheet(sheets, "Docs_With_Linked_Objects", spreadsheetId)
    let rows = await readSheet(sheets, "Version 2 Docs", spreadsheetId)
    let filteredRows = await filterRowsLinkedObj(rows);
    await writeSheet(sheets, title, filteredRows, spreadsheetId);
    await addHeaders(sheets, spreadsheetId, sheetId, "Docs_With_Linked_Objects");
    await resizeColumns(sheets, spreadsheetId, sheetId);
}

const sortCompletedSheet = async (sheets, spreadsheetId) => {
    await version2Sheet(sheets, spreadsheetId);
    await errorSheet(sheets, spreadsheetId);
    await linkedObjSheet(sheets, spreadsheetId);
}

module.exports = sortCompletedSheet;