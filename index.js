require('dotenv').config({
    path: "./.env"
})
const {
    google
} = require('googleapis');
const fs = require('fs');
const access_token = process.env.PANDADOC_ACCESS_TOKEN;
const axiosInstance = require("./Config/axiosInstance");
const headers = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
    }
};
let spreadsheetId;
const authorize = require('./Authorization/authorise');
const {
    version2Sheet,
    errorSheet,
    linkedObjSheet
} = require('./Controllers/sortCompletedSheet');
const organise = require('./Controllers/organiseNewSheet');

let counter = 1;
let page = 1;

const listDocuments = async () => {
    let response = await axiosInstance.get(`https://api.pandadoc.com/public/v1/documents?page=${page}&count=100&order_by=date_created&status=0&status=2&status=11&status=12`, headers);
    await eachDoc(response.data.results);
    page++
    console.log("Page: " + page)
};

const eachDoc = async (docs) => {
    const markAndCount = async (sheets, data, linked_object) => {
        await markSheet(sheets, data, linked_object);
        await count();
    };
    for (const doc of docs) {
        try {
            const response = await axiosInstance.get(`https://api.pandadoc.com/public/v1/documents/${doc.id}/details`, headers);
            const linkedObject = response.data.linked_objects[0] || {
                provider: "",
                entity_type: "",
                entity_id: "No Linked CRM Entity",
            };
            const sheets = await sheetAuth();
            await markAndCount(sheets, response.data, linkedObject);
        } catch (error) {
            console.error(error);
            if (error.response.status === 500) {
                const sheets = await sheetAuth();
                await markError(sheets, error.config.url);
                await count();
            }
        }
    }
};


const sheetAuth = async () => {
    const content = fs.readFileSync('./Credentials/credentials.json');
    const auth = await authorize(JSON.parse(content), './Credentials/token.json', './Credentials/refresh.json');
    const sheets = google.sheets({
        version: 'v4',
        auth
    });
    return sheets
};

const markSheet = async (sheets, docDetail, linked_object) => {
    const provider = linked_object.provider !== "pandadoc-eform" ? linked_object.provider : "";
    const entity_type = linked_object.entity_type || "";
    const entity_id = linked_object.entity_id || "No Linked CRM Entity";
    const values = [
        [docDetail.id, docDetail.name, `Document Version: Editor ${docDetail.version}`, docDetail.date_created, docDetail.status, provider, entity_type, entity_id],
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

const count = async () => {
    console.log("Row: " + counter);
    counter++
};

const pandaScript = async () => {
    spreadsheetId = await preScriptOrganise();

    while (shouldKeepRunning()) {
        await listDocuments();
        console.log(counter);
    }
    await postScriptOrganise();
};

const shouldKeepRunning = () => {
    return Number.isInteger((counter - 1) / 100) && page < 500;
};

const preScriptOrganise = async () => {
    const sheets = await sheetAuth();
    let id = await organise(sheets);
    return id;
}

const postScriptOrganise = async () => {
    const sheets = await sheetAuth();
    await version2Sheet(sheets, spreadsheetId);
    await errorSheet(sheets, spreadsheetId);
    await linkedObjSheet(sheets, spreadsheetId);
}

pandaScript();