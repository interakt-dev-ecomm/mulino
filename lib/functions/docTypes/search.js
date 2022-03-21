/*
    Functions for searching docs
*/


// get keys
require('dotenv').config();
const { DateTime } = require("luxon");

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';


/******************** functions */

// search for all docs of a given type
const docSearch = async (doctype, data) => {
    const url = `resource/${doctype}`
    data.limit_page_length = 5000;

    const docs = await axios({
        method: 'get',
        url,
        data,
    })
    .then(res => res.data.data)
    .catch(err => console.log(err))

    return docs
}

// retrieve a document and all its data
const docDetails = async (docType, doc) => {
    const details = await axios({
        method: 'get',
        url: `resource/${docType}/${doc}`
    })
    .then(res => res.data.data)
    .catch(err => console.log(err))

    return details
}

module.exports = { docSearch, docDetails }