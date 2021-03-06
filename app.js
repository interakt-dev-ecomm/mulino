var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// import routes
var indexRouter = require('./routes/index');
const salesOrders = require('./routes/salesOrders');
const dailySetup = require('./routes/prepareDay');
const dailyRun = require('./routes/dailyRun');
const invoicing = require('./routes/invoicing');
const holidays = require('./routes/holidays');
const reports = require('./routes/reports');

//var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// set up routes
app.use('/orders', salesOrders);
app.use('/daily-setup', dailySetup);
app.use('/daily-run', dailyRun);
app.use('/invoicing', invoicing);
app.use('/holidays', holidays);
app.use('/reports', reports);


//app.use('/', indexRouter);
//app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


require('dotenv').config()
module.exports = app;
