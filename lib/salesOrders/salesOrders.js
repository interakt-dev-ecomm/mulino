/*
    Functions for handling sales orders (after submission)

    - New sales order
    - Updated sales order
    - Cancelled sales order
*/


// get keys
require('dotenv').config();
const { DateTime } = require("luxon");

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import functions



/******************** functions */

