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


/******************** functions */

// get active customers (not on holiday)
const getActiveCustomers = async (deliveryDate) => {
    // get all standing orders
    const allPayload = {
        "fields": `["name", "customer", "pause_active", "pause_orders_start", "pause_orders_end"]`,
    }
    const allSos = await docSearch.docSearch('Standing Order', allPayload);

    // filter out customers that have orders paused
    const activeCustomers = allSos.filter(customer => {
        return customer.pause_active == 0 || (customer.pause_active == 1 && (customer.pause_orders_start > deliveryDate || customer.pause_orders_end < deliveryDate))
    })

    return activeCustomers;
}


module.exports = { getActiveCustomers }