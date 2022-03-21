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
const dates = require('../lib/functions/utility/date');
const inv = require('../lib/invoicing/invoicing')
const notify = require('../lib/invoicing/overdue');


// create invoicing documents
router.post('/prepare', async(req,res,next) => {
    res.json({status: 'Preparing Invoicing Docs'});

    const date = DateTime.now().toISODate();
    //const date = '2022-03-29'
    
    const runPrepare = await inv.prepareInitial(date);
})





// post invoices
router.post('/create-invoices', async (req, res, next) => {
    res.json({status: `creating invoices`})
    
    const date = DateTime.now().toISODate();
    //const date = '2022-03-25'
    
    // create docs if not available
    const runPrepare = await inv.prepareInitial(date);

    const processInvoices = inv.processInvoices(date);
});


router.post('/overdue', async (req, res, next) => {
    res.json({status: `sending overdue invoice notifications`});

    const runOverdueNotifications = notify.runOverdue();
})






module.exports = router;