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


/* 
    Do nothing on draft orders

    /////// A DAILY RUN DOCUMENT NEEDS TO EXIST FOR THE PROCESSING DATE ////////
    check for this before doing anything with orders

    1. New order submitted
        - add to daily run
        - if no delivery note for that day exists (for this customer), create one
        - if a delivery note for this order exists, delete it and recreate one
    2. Order updated after submission
        - update last modified field
        - delete existing delivery note (if exists) and recreate one
    3. Order cancelled
*/

// import functions
const dailyRun = require('../lib/functions/docTypes/dailyRun');


// new order
router.post('/new-order', async (req, res, next) => {
    const {doc, date} = req.body;

    if (!doc || !date) {
        res.json({status: 'missing data'});
        return
    }
    // check if daily run document exists and create one if needed
    const runDoc = await dailyRun.dailyRunDoc(date);

    res.json({status: `adding order`})
})

module.exports = router;
