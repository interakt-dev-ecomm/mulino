// functions for working with dates

const { DateTime } = require('luxon');

// assign a text based value for day of the week
const getWeekday = (day) => {
    let weekday;
    
    switch(day) {
        case 1: weekday = 'monday'; break;
        case 2: weekday = 'tuesday'; break;
        case 3: weekday = 'wednesday'; break;
        case 4: weekday = 'thursday'; break;
        case 5: weekday = 'friday'; break;
        case 6: weekday = 'saturday'; break;
        case 7: weekday = 'sunday'; break;
    }

    return weekday;
}


// create the dates object that is used to get records from db
const processingDate = (date) => {
    const inputDate = DateTime.fromISO(date);

    const processingDate = inputDate.toISODate();
    const processingDay = getWeekday(inputDate.weekday);
    const deliveryDate = inputDate.plus({days: 1}).toISODate();
    const deliveryDay = getWeekday(inputDate.plus({days: 1}).weekday);

    // Monday deliveries need to be processed on a sunday
    const processSunday = processingDay === 'friday' ? 1 : 0;
    
    return {processingDate, processingDay, deliveryDate, deliveryDay, processSunday}
}


module.exports = { processingDate, getWeekday }