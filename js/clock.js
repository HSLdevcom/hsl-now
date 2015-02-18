// Not used by anything else
define(function(require) {
var $ = require('jquery'),
    moment = require('moment');
function clock() {
    $('.timenow').attr('data-time', "\u231A " + moment().format("HH:mm:ss"));
    setTimeout(clock, 1000);
}
clock();
})
