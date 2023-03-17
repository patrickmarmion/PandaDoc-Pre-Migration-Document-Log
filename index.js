require('dotenv').config({
    path: "./.env"
})
const {
    google
} = require('googleapis');
const fs = require('fs');
const authorize = require('./Authorization/authorise');
const sortCompletedSheet = require('./Controllers/sortCompletedSheet');
const organise = require('./Controllers/organiseNewSheet');
const setCredentials = require('./Authorization/setCredentials')
const accessToken = process.env.PANDADOC_ACCESS_TOKEN;
const axiosInstance = require("./Config/axiosInstance");
const headers = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    }
};
let spreadsheetId;
let counter = 1;
let page = 1;

/**
 * Start of the script, through the preScriptOrganise function it gets the spreadsheetId of the newly created spreadsheet
 * While the shouldKeepRunning fucntion returns results, it passes that array into the eachDoc function
 * After the List Document endpoint has returned every page of results it calls the postScriptOrganise function to format and filter the Google Sheet
 */
const pandaScript = async () => {
    await setCredentials();
    spreadsheetId = await preScriptOrganise();

    while (true) {
        const { length, docs, sheets } = await shouldKeepRunning();
        if (length == 0) break;
        await eachDoc(docs, sheets);
        console.log(counter);
    }
    await postScriptOrganise();
};

const preScriptOrganise = async () => {
    const sheets = await sheetAuth();
    let id = await organise(sheets);
    return id;
}

const sheetAuth = async () => {
    const content = fs.readFileSync('./Credentials/credentials.json');
    const auth = await authorize(JSON.parse(content), './Credentials/token.json', './Credentials/refresh.json');
    const sheets = google.sheets({
        version: 'v4',
        auth
    });
    return sheets
};

/**
 * Retrieves each document's details 
 * Adds a row to the Google Sheet with the details of the document or details of the error message.
 * @param {Array} docs The results array from the List Document Endpoint 
 * @param {Object} sheets Google Authentication
 */
const eachDoc = async (docs, sheets) => {
    const markAndCount = async (sheets, data, linkedObject) => {
        await markSheet(sheets, data, linkedObject);
        await incrementCounter();
    };
    for (const doc of docs) {
        try {
            const response = await axiosInstance.get(`https://api.pandadoc.com/public/v1/documents/${doc.id}/details`, headers);
            const linkedObject = response.data.linked_objects[0] || {
                provider: "",
                entity_type: "",
                entity_id: "No Linked CRM Entity",
            };
            await markAndCount(sheets, response.data, linkedObject);
        } catch (error) {
            console.error(error);
            if (error.response.status === 500) {
                await markError(sheets, error.config.url);
                await incrementCounter();
            }
        }
    }
};

const markSheet = async (sheets, docDetail, linkedObject) => {
    const provider = linkedObject.provider !== "pandadoc-eform" ? linkedObject.provider : "";
    const entityType = linkedObject.entity_type || "";
    const entityId = linkedObject.entity_id || "No Linked CRM Entity";
    const values = [
        [docDetail.id, docDetail.name, `Document Version: Editor ${docDetail.version}`, docDetail.date_created, docDetail.status, provider, entityType, entityId],
    ];
    const resource = {
        values,
    };
    const range = `Documents!A${counter}`;
    const valueInputOption = 'USER_ENTERED';
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        resource,
        valueInputOption,
    });
};

const markError = async (sheets, url) => {
    const values = [
        [`Error Message: Please check this docs logs`, `${url}`, `Page: ${page}`]
    ];
    const resource = {
        values,
    };
    const range = `Documents!A${counter}`;
    const valueInputOption = 'USER_ENTERED';
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        resource,
        valueInputOption
    })
};

const incrementCounter = async () => {
    console.log("Row: " + counter);
    counter++
};

const shouldKeepRunning = async () => {
    const sheets = await sheetAuth();
    let response = await axiosInstance.get(`https://api.pandadoc.com/public/v1/documents?page=${page}&count=100&order_by=date_created&folder_uuid=AWbWCjc9gdia2RvCKmsy7K`, headers);
    console.log("Page Number: " + page)
    page++
    return {
        length: response.data.results.length,
        docs: response.data.results,
        sheets,
    }
};

const postScriptOrganise = async () => {
    const sheets = await sheetAuth();
    await sortCompletedSheet(sheets, spreadsheetId)
}

pandaScript();