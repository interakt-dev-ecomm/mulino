# Overdue Invoices

doctype = Overdue Invoices
subject = You have an outstanding balance
send alert on = submit
recipients = customer_email
message = `<p>Hello</p>

<p>You have an outstanding balance of <strong>{{doc.total_outstanding}}</strong> which is now overdue. Please make arrangements to settle the balance</p>

<p>If you have recently made a payment, then please ignore this email</p>


<p>Thanks<br>Il Mulino Bakery</p>`
attach print = yes


# Today's Deliveries

doctype = EOD
subject = Today's Itinerary
send alert on = submit
recipients = mauro, driver
message = `Attached is today's itinerary'
attach print = yes
print format = end of day