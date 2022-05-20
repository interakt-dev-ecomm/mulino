const { DateTime } = require("luxon");
require('dotenv').config();

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';


/******************** functions */

// get value for company setting
const getSetting = async (field) => {
    const payload = {
        'doctype': 'Company Settings',
        'field': field
    };

    const queryResult = await axios({
        method: 'get',
        url: 'method/frappe.client.get_single_value',
        data: payload
    })
    .then(res => res.data.message)
    .catch(err => console.log(err))

    return queryResult;
}

module.exports = { getSetting };