var express = require('express');
var router = express.Router();
const { DateTime } = require("luxon");
require('dotenv').config();


// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import functions
const logging = require('../lib/logging/logging');
const docSearch = require('../lib/functions/docTypes/search');
const docCrud = require('../lib/functions/docTypes/crud');
const daily = require('../lib/dailySetup/dailySetup');
const runFuncs = require('../lib/functions/docTypes/dailyRun');
const dates = require('../lib/functions/utility/date');
const inv = require('../lib/invoicing/invoicing');
const companySettings = require('../lib/functions/companySettings');
const dailySetup = require('../lib/dailySetup/prepareDay');


// create new day docs
router.post('/today', async (req, res, next) => {
    const date = DateTime.now().toISODate();
    //const date = '2022-03-23'
    const dateObject = dates.processingDate(date);

    res.json({status: `daily setup run for ${date}`})

    /* 
        1. create a daily run doc for today
            - if friday then also create one for monday deliveries
        2. create orders from quotations for customers
            - consolidate all orders for one customer into 1 order
                - total up quantities instead of duplicating items
            - if friday then also create orders for monday deliveries
    */

    // check for existing daily run document and create if it doesn't exist
    const runDoc = await runFuncs.dailyRunDoc(date);

    // run order creation function
    const dailyOrders = await daily.createDailyOrders(dateObject);

    if (dateObject.processSunday === 1) {
        const sundayDate = DateTime.fromISO(dateObject.processingDate).plus({days: 2}).toISODate();
        const sundayDateObject = dates.processingDate(sundayDate);
        const sundayRunDoc = await runFuncs.dailyRunDoc(sundayDateObject.processingDate)
        const sundayOrders = await daily.createDailyOrders(sundayDateObject);
    }

    // create invoicing docs if they do not exist
    const runPrepare = await inv.prepareInitial(date);
});

router.post('/prepare', async (req, res, next) => {
    const workDate = DateTime.now();
    //const date = workDate.toISODate();
    //const date = '2022-08-29'
    let message = '';

    // get bank holidays from db
    const bankHolidays = await docSearch.docDetails('Bank Holidays', workDate.year).then(res => res.bank_holidays)

    // check if on holiday or bank holiday
    const holidayStatus = await companySettings.getSetting('on_holiday');
    const bankHolidayToday = bankHolidays.some(today => today.date == workDate.toISODate())

    holidayStatus == 1 || bankHolidayToday == 1 ? message = 'On Holiday' : message = `System set up for ${workDate.toISODate()}`;


    res.json({status: `${message}`})

    // stop process if on holiday or bank holiday
    if (holidayStatus == 1 || bankHolidayToday == 1) {
        return;
    };

    //monday to thursday: regular
    if (workDate.weekday >= 1 && workDate.weekday <= 4) {

        // get list of all customers that are set up for standing orders
        const activeCustomers = await dailySetup.getActiveCustomers(workDate.plus({days: 1}).toISODate());

        // set the dates parameters
        const dateObject = {
            processingDate: workDate.toISODate(),
            processingDay: dates.getWeekday(workDate.weekday),
            deliveryDate: workDate.plus({days: 1}).toISODate(),
            deliveryDay: dates.getWeekday(workDate.plus({days: 1}).weekday)
        }
    }

});


module.exports = router;