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
const eod = require('../lib/eod/eod');
const holidays = require('../lib/holidays/holidays');



// bank holidays
router.post('/bank', async (req, res, next) => {

    res.json({status: `checking bank holidays`});
    const setHolidays = await holidays.setBankHolidays()
});









module.exports = router;
