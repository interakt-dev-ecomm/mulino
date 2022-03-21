/*
    Functions for creating updating and deleteing docs
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

// create payload
const createDoc = async (method, payload) => {
    const url = `method/${method}`;

    const createdPayload = await axios({
        method: 'post',
        url,
        data: payload
    })
    .then(res => res.data.message)
    .catch(err => console.log(err))

    return createdPayload
}

// post doc
const postDoc = async (docType, payload) => {

    const url = `resource/${docType}`

    const postedDoc = await axios({
        method: 'post',
        url,
        data: payload
    })
    .then(res => res.data.data.name)
    .catch(err => console.log(err))

    return postedDoc;
}

// submit doc
const submitDoc = async (docType, document) => {

    const url = `resource/${docType}/${document}?run_method=submit`

    const submittedDoc = await axios({
        method: 'post',
        url
    })
    .then(res => res.data.data.name)
    .catch(err => console.log(err))

    return submittedDoc;
}

// update a document
const updateDoc = async (docType, doc, data) => {
    const updateDoc = await axios({
        method: 'put',
        url: `resource/${docType}/${doc}`,
        data: data
    })
    .then(res => res)
    .catch(err => console.log(err))
    
    return updateDoc
}

// delete a document
const deleteDoc = async (docType, doc) => {
    const deleteDoc = await axios({
        method: 'delete',
        url: `resource/${docType}/${doc}`
    })
    .then(res => res.data.message)
    .catch(err => console.log(err))

    return deleteDoc;
}

// cancel a document
const cancelDoc = async (docType, doc) => {
    const cancelDoc = await axios({
        method: "post",
        url: `resource/${docType}/${doc}`,
        data: {
            "run_method": "cancel"
        }
    })
    .then(res => res.status)
    .catch(err => console.log(err))
}


module.exports = { createDoc, postDoc, submitDoc, updateDoc, deleteDoc, cancelDoc }