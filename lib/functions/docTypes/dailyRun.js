const { DateTime } = require("luxon");
require('dotenv').config();

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import functions
const logging = require('../../logging/logging');
const docSearch = require('../docTypes/search');
const docCrud = require('../docTypes/crud');
const dates = require('../utility/date');


/******************** functions */

// create daily run document for processing date
const dailyRunDoc = async (date) => {
    const payload = {
        "filters": `[["date", "=", "${date}"], ["docstatus", "=", "0"]]`,
    }
    
    const foundDailyRun = await docSearch.docSearch(`Daily Run`, payload);
    if (!foundDailyRun.length) {
        const newPayload = {
            "date": date,
        };
        const newDailyRun = await docCrud.postDoc(`Daily Run`, newPayload);
        // log
        const newLog = await logging.newLogEntry(`Daily Setup: New Daily Run Document ${newDailyRun} created`)
    }
}

// count how many daily runs exist for a given day
const checkRuns = async (date) => {
    const payload = {
        "filters": `[["date", "=", "${date}"], ["docstatus", "=", "1"]]`
    }
    const foundDailyRun = await docSearch.docSearch(`Daily Run`, payload);

    return foundDailyRun
}

module.exports = { dailyRunDoc, checkRuns }
