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
const dates = require('../lib/functions/utility/date');
const dr = require('../lib/dailyRun/dailyRun');
const eod = require('../lib/eod/eod')

// process daily run
/* 
  1. Search for all customers that have placed orders
  2. For each customer, create a delivery note
  3. create purchase order
  4. place order into invoice queue

  make sure to use following settings:
    - page_limit = 5000 on searches
    - group_same_items = 1 in print settings
*/

// daily run routes
router.post('/daily-run', async (req, res, next) => {
    const { date, doc } = req.body;
    const dateObject = dates.processingDate(date);

    if (!doc || !date) {
        res.json({status: 'Missing Data'})
        return
    }

    res.json({status: `daily run carried out for ${doc}`});

    const todayRun = await dr.processDailyRunMain(dateObject, doc);
});

router.post('/eod', async (req, res, next) => {
    const date = DateTime.now().toISODate();
    //const date = '2022-03-28'
    const dateObject = dates.processingDate(date);
    
    res.json({status: `end of day completed for ${dateObject.processingDate}`});

    const runEod = eod.endOfDay(dateObject);
    
    // if friday process monday deliveries
    if (dateObject.processSunday === 1) {
        const sundayDate = DateTime.fromISO(dateObject.processingDate).plus({days: 2}).toISODate();
        const sundayDateObject = dates.processingDate(sundayDate);
        const sundayEod = await eod.endOfDay(sundayDateObject)
    }
})

module.exports = router;
