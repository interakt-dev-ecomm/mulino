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
const dr = require('../dailyRun/dailyRun')

/******************** functions */






const runOverdue = async () => {

    const invoiceFilter = {
        "filters": `[["status", "=", "Overdue"]]`,
        "fields": `["name", "customer", "outstanding_amount", "due_date", "contact_email"]`
    };

    const overdueInvoices = await docSearch.docSearch('Sales Invoice', invoiceFilter);

    if (overdueInvoices.length) {
        console.log(overdueInvoices[0])
        // create list of customers
        const customers = overdueInvoices.map(invoice => invoice.customer)
        .filter((value, index, self) => self.indexOf(value) === index)

        customers.forEach(async customer => {
            const customerInvoices = overdueInvoices.filter(custInvoice => {
                const overdueDate = DateTime.fromISO(custInvoice.due_date).plus({days: 1})
                const due = DateTime.fromISO(custInvoice.due_date)
                //console.log(overdueDate.diff(due, ['days']).toFormat('dd'))
                return overdueDate.diff(due, ['days']).toFormat('dd') >= 1  && custInvoice.customer === customer
            })

            const invoiceData = customerInvoices.map(invoice => ({"sales_invoice": invoice.name, "outstanding": `£${invoice.outstanding_amount}`, "due": invoice.due_date}));
            let outstandingTotal = 0;
            customerInvoices.forEach(invoice => outstandingTotal += invoice.outstanding_amount)

            const email = customerInvoices[0].contact_email;

            
            const overduePayload = {
                "date_sent": DateTime.now().toISODate(),
                "customer": customer,
                "invoices": invoiceData,
                "total_outstanding": `£${outstandingTotal}`,
                "customer_email": email
            }

            const postNotice = await docCrud.postDoc(`Overdue Invoices`, overduePayload);
            const submitNotice = await docCrud.submitDoc(`Overdue Invoices`, postNotice);
        })
        
        

    }
}


module.exports = { runOverdue }