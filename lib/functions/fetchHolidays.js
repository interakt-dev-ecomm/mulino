const axios = require('axios');

const fetchHolidays = async () => {
    const url = `https://www.gov.uk/bank-holidays.json`;

    const createdPayload = await axios({
        method: 'get',
        url,
    })
    .then(res => res.data[`england-and-wales`].events)
    .catch(err => console.log(err))

    return createdPayload
}

module.exports = { fetchHolidays } ;