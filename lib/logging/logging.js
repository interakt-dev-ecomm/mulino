/* inserts data into custom log */

// get keys
require('dotenv').config();
const { DateTime } = require("luxon");

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import utility functions
const dates = require('../functions/utility/date');
const docs = require('../functions/docTypes/crud');



/*************** functions */

// insert new log entry
const newLogEntry = async (message) => {
    const date = DateTime.now().toFormat('dd-MM-yyyy HH:MM:ss');

    const data = {
        "date": date,
        "event": message
    }
    
    const newLog = await docs.postDoc(`Automator Log`, data)
    return newLog;
}


module.exports = { newLogEntry }