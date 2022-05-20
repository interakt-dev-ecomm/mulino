const { DateTime } = require("luxon");
require('dotenv').config();

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';


const docSearch = require('../functions/docTypes/search');

// get qty of docs
const getDocRefs = async (doctype, date) => {

}


// const grab details from report
const getReportDetails = async (date) => {
    
}


const mainDailyRunReport = async (date) => {

}

module.exports = { mainDailyRunReport };
