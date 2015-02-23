// Not used by anything else
define(function(require) {
    var $ = require('jquery'),
        moment = require('moment');
        config = require('./config');
    function clock() {
        $('.timenow').attr('data-time', "\u231A " + moment().format("HH:mm:ss"));
        $('#search-options-time').text(config.search_time ? config.search_time.format("HH:mm") : moment().format("HH:mm"));
        setTimeout(clock, 1000);
    }
    clock();
})
