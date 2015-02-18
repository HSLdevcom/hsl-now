define(function(require) {
    var $ = require('jquery'),
        jqueryxdomainrequest = require('jquery.xdomainrequest'),
        render = require('./render'),
        favorites = require('./favorites'),
        config = require('./config');

    // Used by hslnow.js and typeahead.js
    function positionCallback(position, time) {
        $(".coordinates").text("position " + position.coords.latitude.toPrecision(7) + ", " + position.coords.longitude.toPrecision(
            7));
        /*
         $.getJSON("http://pubtrans.it/hsl/stops", {
         lat: position.coords.latitude.toPrecision(7),
         lon: position.coords.longitude.toPrecision(7),
         rad: 1000,
         max: 10
         }, function (data) {
         window.dbg_data = data;
         console.log(data);
         $(".stops").text(data.features.length);
         //        $(".stops").text(JSON.stringify(data));
         $(".lahdot").text("");
         for (var i = 0; i<data.features.length; i++ ) { // >
         var stop = data.features[i];
         $(".lahdot").append("<h2>"+stop.properties.id+" "+stop.properties.name+"</h2>");
         }
         });
         */

        var lat = position.coords.latitude.toPrecision(7);
        var lon = position.coords.longitude.toPrecision(7);
        config.device_location = [position.coords.latitude, position.coords.longitude];
        if (!config.source_location) {
            config.source_location = config.device_location;
            config.displayed_location = config.source_location;
            $.getJSON(config.OTP_PATH + "/index/stops", {
                lat: lat,
                lon: lon,
                radius: 1000
            }, function(data) {
                window.dbg_data = data;
                //            console.log(data);

                $(".stops").text(data.length);
                render.render_stops(lat, lon, data, $(".lahdot"), "XXX", time);
            });

            $('.groupname').text('Lähimmät suosikkisi');
            render.render_stops(lat, lon, favorites.favorites, $(".favorites"), "XXX", time);

            window.map.setView([lat, lon], 15);
        }
    }
    return {'positionCallback': positionCallback};
})
