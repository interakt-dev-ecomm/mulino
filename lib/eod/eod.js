const { DateTime } = require("luxon");
require('dotenv').config();

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import functions
const dates = require('../functions/utility/date');
const logging = require('../logging/logging');
const docSearch = require('../functions/docTypes/search');
const docCrud = require('../functions/docTypes/crud');
const inv = require('../invoicing/invoicing')

/******************** functions */

// main function
/* 
    creates and sends report to driver and admin for:
        - items to be picked up from bakery (consolidate purchase orders)
        - allocation report of items to customers
        - all deliveries to be made

*/

const invoiceAllocation = async (order) => {
    // get customer invoicing schedule
    const custDetails = await docSearch.docDetails(`Customer`, order.customer);
    const paymentSchedule = custDetails.invoicing_frequency;
    const deliveryD = order.lr_date;

    let scheduleDoc;

    const check = await inv.initialCheck(paymentSchedule, deliveryD);
    if (check.length === 0) {
        scheduleDoc = await inv.prepareInitial(deliveryD, [`${paymentSchedule}`]); 
    } else {
        scheduleDoc = check[0].name
    }

    console.log(scheduleDoc);
    // get copy of delivery notes already scheduled
    const invoiceRun = await docSearch.docDetails(`Invoicing ${paymentSchedule}`, scheduleDoc);
    const existingDeliveries = invoiceRun.orders

    // if not already in schedule then add
    const found = existingDeliveries.filter(delivery => delivery.order === order.name)

    if (!found.length) {
        existingDeliveries.push({"customer": order.customer , "order": order.name})

        const newOrderList = {
            "orders": existingDeliveries
        }

        const updateInvoicing = await docCrud.updateDoc(`Invoicing ${paymentSchedule}`, scheduleDoc, newOrderList);
        return true;

    }
    return false;
}


const endOfDay = async (dateObject) => {

    const allPoPayload = {
        "filters": `[["schedule_date", "=", "${dateObject.processingDate}"]]`
    };

    const allPurchaseOrders = await docSearch.docSearch(`Purchase Order`, allPoPayload);
    console.log(`Purchase Orders: `, allPurchaseOrders.length)

    const allDeliveryNotesPayload = {
        "filters": `[["lr_date", "=", "${dateObject.deliveryDate}"], ["status", "=", "To Bill"]]`,
        "fields": `["name", "customer", "address_display", "posting_date"]`
    }

    const allDeliveryNotes = await docSearch.docSearch(`Delivery Note`, allDeliveryNotesPayload);
    console.log(`Delivery Notes: `, allDeliveryNotes.length)

    // end if missing documents
    if (!allPurchaseOrders.length || !allDeliveryNotes.length) {
        // return
    }

    // consolidate all purchase orders
    const purchaseItems = [];

    for (let i = 0; i < allPurchaseOrders.length; i++) {
        const poDetails = await docSearch.docDetails(`Purchase Order`, allPurchaseOrders[i].name)
        const poItems = poDetails.items;

        poItems.forEach(item => {
            const found = purchaseItems.findIndex(listed => listed.item_code === item.item_code);
            if (found === -1) {
                purchaseItems.push(item);
            } else {
                purchaseItems[found].qty += item.qty
            }

        })
    }

    // create purchase order report
    const poReport = [];
    purchaseItems.forEach(item => poReport.push({
        "item_code": item.item_code, 
        "item_name": item.item_name, 
        "item_qty": item.qty
    }));

    // create delivery trip
    const deliveryTrip = [];
    allDeliveryNotes.forEach(delivery => {
        deliveryTrip.push({
            "customer": delivery.customer,
            "address": delivery.address_display
        })
    })

    // create allocation report
    const allDeliveryNoteItems = [];
    for (let i = 0; i < allDeliveryNotes.length; i++) {
        const dnDetails = await docSearch.docDetails(`Delivery Note`, allDeliveryNotes[i].name);
        allDeliveryNoteItems.push(dnDetails);
    }

    const allocation = [];
    for (let i = 0; i < purchaseItems.length; i++) {
        const itemAllocation = {
            "item_code": purchaseItems[i].item_code,
            "item": purchaseItems[i].item_name,
            "total": purchaseItems[i].qty, 
            "allocation": ""
        };

        allocation.push(itemAllocation);
    }

    for (let i = 0; i < allocation.length; i++) {
        allDeliveryNoteItems.forEach(dn => {
            const found = dn.items.filter(item => item.item_code === allocation[i].item_code)
            if (found.length) {
                const total = found.map(i => i.qty).reduce((a, b) => a + b);
                allocation[i].allocation += `${dn.customer} (qty: <strong>${total}</strong>)<br>`
            }
        })
    }

    // add deliveries
    let deliveries = ``;
    

    for (let i = 0; i < allDeliveryNoteItems.length; i++) {
        const deliveryItems = [];
        // consolidate quantities before adding them
        allDeliveryNoteItems[i].items.forEach(item => {
            const found = deliveryItems.findIndex(addedItem => addedItem.item_code === item.item_code)
            if (found === -1) {
                const itemDetails = {
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "qty": item.qty
                };
                deliveryItems.push(itemDetails);    
            } else {
                deliveryItems[found].qty += item.qty
            }
        })


        deliveries += `<h4>${allDeliveryNoteItems[i].customer}</h4>
                    <p>${allDeliveryNoteItems[i].address_display}</p>
                    <table style="width: 100%; margin-bottom: 200px;">
                    <tr><th>Item Code</th>
                    <th>Item</th>
                    <th>Qty</th></tr>`

        deliveryItems.forEach(item  => {
            deliveries += `<tr style="border-bottom: 1px solid black;">
                <td>${item.item_code}</td>
                <td>${item.item_name}</td>
                <td>${item.qty}</td></tr>`
        })

        deliveries += `</table><hr>`

        // add delivery note to relevant invoicing schedule
        const addToInvoicing = await invoiceAllocation(allDeliveryNoteItems[i]);

    }

    // put report in eod doc and submit
    const reportPayload = {
        "date": dateObject.processingDate,
        "purchase_order": poReport,
        "delivery_stops": deliveryTrip,
        "allocation": allocation,
        "deliveries": deliveries
    }
    
    const postEodReport = await docCrud.postDoc(`End of Day`, reportPayload);
    const submitEodReport = await docCrud.submitDoc(`End of Day`, postEodReport);

}

module.exports = { endOfDay }