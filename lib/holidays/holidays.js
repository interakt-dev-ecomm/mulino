const { DateTime } = require("luxon");
require('dotenv').config();

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import functions
const logging = require('../logging/logging');
const docSearch = require('../functions/docTypes/search');
const docCrud = require('../functions/docTypes/crud');
const dates = require('../functions/utility/date');
const dailyFuncs = require('../functions/docTypes/dailyRun');
const fetchHolidays = require('../functions/fetchHolidays');


/******************** functions */

// main function
const setBankHolidays = async () => {
    const thisYear = DateTime.now().year;

    //holidays listed on government website
    const bankHolidays = await fetchHolidays.fetchHolidays();

    // filter out holidays that are not for current year
    const currentHolidays = bankHolidays.filter(holiday => DateTime.fromISO(holiday.date).year == thisYear);

    // store holidays in db
    const holidayData = {
        bank_holidays: currentHolidays
    };

    const updateDB = await docCrud.updateDoc('Bank Holidays', thisYear, holidayData);
}

module.exports = { setBankHolidays };