require('dotenv').config({
    path: "./.env"
});
const sheetAuth = require('./Authorization/sheetAuth');
const sortCompletedSheet = require('./Controllers/sortCompletedSheet');
const { setupNewSheet, createSheetRows } = require('./Controllers/organiseNewSheet');
const setCredentials = require('./Authorization/setCredentials');
const status429 = require('./Errors/handler');
const accessToken = process.env.PANDADOC_ACCESS_TOKEN ? process.env.PANDADOC_ACCESS_TOKEN : "Please add access token to the .env File";
const originalCrm = process.env.OLD_CRM ? process.env.OLD_CRM : "Please add the Name of the CRM/Service which the customer is migrating from to the .env File";
const crmsUsingMetadata = ["copper", "prosperworks", "freshsales", "insightly", "nutshell"];
const axiosInstance = require("./Config/axiosInstance");
const headers = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    }
};
let page = 1;

/**
 * Start of the script, through the preScriptOrganise function it gets the spreadsheetId of the newly created spreadsheet
 * While the listDocuments function returns results, it passes that array into the eachDoc function
 * After the List Document endpoint has returned every page of results it calls the postScriptOrganise function to format and filter the Google Sheet
 */
const pandaScript = async () => {
    await setCredentials();
    const sheets = await sheetAuth();
    const spreadsheetId = await setupNewSheet(sheets);

    while (true) {
        const { length, docs } = await listDocuments();
        if (length == 0) break;
        await eachDoc(docs, sheets, spreadsheetId);
    }
    await sortCompletedSheet(sheets, spreadsheetId)
};

const listDocuments = async () => {
    let response = await axiosInstance.get(`https://api.pandadoc.com/public/v1/documents?page=${page}&count=100&order_by=date_created`, headers);
    console.log("Page Number: " + page)
    page++
    return {
        length: response.data.results.length,
        docs: response.data.results
    }
};

/**
 * Retrieves each document's details 
 * Adds a row to the Google Sheet with the details of the document or details of the error message.
 * @param {Array} docs The results array from the List Document Endpoint 
 * @param {Object} sheets Google Authentication
 */
const eachDoc = async (docs, sheets, spreadsheetId, retries = 0) => {
    try {
        const filteredDocs = docs.filter(doc => !doc.name.startsWith("[DEV]") && doc.version === "2");
        const APIURLs = filteredDocs.map(doc => `https://api.pandadoc.com/public/v1/documents/${doc.id}/details`);
        const publicAPIRequests = APIURLs.map(async (url) => {
            try {
                await new Promise(resolve => setTimeout(resolve, 8000));
                return axiosInstance.get(url, headers);
            } catch (error) {
                console.error(`Error in API request to ${url}:`, error);
                throw error;
            }
        });
        const responses = await Promise.all(publicAPIRequests);
        const sheetValues = crmsUsingMetadata.includes(originalCrm.toLowerCase()) ? await mapResponsesFromDocMetadata(responses) : await mapResponsesWithLinkedObject(responses);
        await markSheet(sheets, sheetValues, spreadsheetId);
    } catch (error) {
        if (retries >= 3) {
            throw new Error("Max retries exceeded, giving up.");
        }
        if (error.response && error.response.status === 429 && retries < 3) {
            await status429(error.response.data.detail, retries)
            return await eachDoc(docs, sheets, spreadsheetId, retries + 1);
        }
    }
};

const mapResponsesWithLinkedObject = async (responses) => {
    const sheetValues = responses.map(obj => {
        return [
            obj.data.id,
            obj.data.name,
            obj.data.date_created,
            obj.data.status,
            obj.data.linked_objects.length ? obj.data.linked_objects[0].provider : "",
            obj.data.linked_objects.length ? obj.data.linked_objects[0].entity_type : "",
            obj.data.linked_objects.length ? obj.data.linked_objects[0].entity_id : ""
        ];
    });
    return sheetValues 
};

const mapResponsesFromDocMetadata = async (responses) => {
    const sheetValues = responses.map(obj => {
        const result = checkMetadataForDeal(obj.data);
        return [
            obj.data.id,
            obj.data.name,
            obj.data.date_created,
            obj.data.status,
            result.value ? originalCrm : "",
            result.key ? result.key : "",
            result.value ? result.value : "" 
        ];
    });
    return sheetValues 
};

const checkMetadataForDeal = (obj) => {
    const metadata = obj.metadata;
    let desiredValue = null;
    let desiredKey = null;
    for (const key in metadata) {
        if (key.includes("deal") || key.includes("opportunity")) {
            desiredKey = key;
            desiredValue = metadata[key];
            break;
        }
    }
    return {
        value: desiredValue,
        key: desiredKey
    }
};

const markSheet = async (sheets, values, spreadsheetId) => {
    await createSheetRows(spreadsheetId, sheets, 100);
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `Documents!A:A`,
        majorDimension: 'ROWS',
    });
    const rowValues = response.data.values;
    const lastRow = rowValues ? rowValues.length + 1 : 1;
    const resource = {
        values,
    };
    const range = `Documents!A${lastRow}`;
    const valueInputOption = 'USER_ENTERED';
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        resource,
        valueInputOption,
    });
};

pandaScript();