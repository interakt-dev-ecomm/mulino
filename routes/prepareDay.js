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
})



module.exports = router;