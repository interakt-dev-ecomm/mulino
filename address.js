const { DateTime } = require("luxon");
require('dotenv').config();

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import functions
const docSearch = require('./lib/functions/docTypes/search');
const docCrud = require('./lib/functions/docTypes/crud');



/******************** functions */
const updateAddress = async () => {
    const payload = {
        "fields": `["*"]`
    }
    const allCust = await docSearch.docSearch(`Customer`, payload);
    for (let i = 0; i < allCust.length; i++) {
        const customer_primary_address = `primary_address`;
        const updateFields = {
            customer_primary_address: [{
                "name": "test1-Billing",
                "address_title": "test1",
                "address_type": "Billing",
                "address_line1": "test",
                "address_line2": "test",
                "city": "london",
                "country": "United Kingdom",
                "pincode": "tw7 6lq",
                "is_primary_address": 0,
                "is_shipping_address": 0,
                "disabled": 0,
                "is_your_company_address": 0,
                "doctype": "Address",
        
            }]
        };
        const updated = await docCrud.updateDoc(`Customer`, allCust[i].name, updateFields)
        console.log(`updated ${updated}`)
    }
}

updateAddress();