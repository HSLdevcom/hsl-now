define(function(require) {
    var $ = require('jquery'),
        jqueryxdomainrequest = require('jquery.xdomainrequest'),
        render = require('./render'),
        favorites = require('./favorites'),
        config = require('./config');

    // Used by hslnow.js and typeahead.js
    function positionCallback(position) {
        //$(".coordinates").text("position " + position[0] + ", " + positon[1];
        var lat = position[0]
        var lon = position[1];

        $.getJSON(config.OTP_PATH + "/index/stops", {
            lat: lat,
            lon: lon,
            radius: 1000
        }, function(data) {
            window.dbg_data = data;

            $(".stops").text(data.length);
            render.render_stops(lat, lon, data, $(".lahdot"), "XXX", config.search_time);
        });

        $('.groupname').text('Lähimmät suosikkisi');
        render.render_stops(lat, lon, favorites.favorites, $(".favorites"), "XXX", config.search_time);

        window.map.setView([lat, lon], 15);
    }
    function positionCallbackFromGeolocation(position) {
        var lat = position.coords.latitude.toPrecision(7);
        var lon = position.coords.longitude.toPrecision(7);
        config.device_location = [lat, lon];
        if (!config.source_location) {
            config.source_location = config.device_location;
            $.getJSON("http://dev.hel.fi/geocoder/v1/address/?format=json&lon=" + lon + "&lat=" + lat + "&limit=1", function(data) {
                $("#search-options-from").text(data.objects[0].distance < 1000 ? data.objects[0].name : "");
            });
            config.displayed_location = config.device_location;
            positionCallback(config.displayed_location);
        }
    }
    function positionCallbackFromDisplayedLocation(position) {
        var lat = position.coords.latitude.toPrecision(7);
        var lon = position.coords.longitude.toPrecision(7);
        config.displayed_location = [lat, lon];
        positionCallback(config.displayed_location);
    }

    function positionCallbackFromSourceLocation(position) {
        var lat = position.coords.latitude.toPrecision(7);
        var lon = position.coords.longitude.toPrecision(7);
        config.source_location = [lat, lon];
        config.displayed_location = config.source_location;
        positionCallback(config.displayed_location)

        $.getJSON("http://dev.hel.fi/geocoder/v1/address/?format=json&lon=" + lon + "&lat=" + lat + "&limit=1", function(data) {
            $("#search-options-from").text(data.objects[0].distance < 1000 ? data.objects[0].name : "");
        });
    }

    function positionCallbackFromDestinationLocation(position) {
        var latFrom = config.source_location[0];
        var lonFrom = config.source_location[1];
        var latTo = position.coords.latitude.toPrecision(7);
        var lonTo = position.coords.longitude.toPrecision(7);
        window.location.href = "http://koti.kapsi.fi/~hannes/navigator-proto/?usetransit=yes&mode=WALK&start=" + latFrom + "," + lonFrom + "&destination=" + latTo + "," + lonTo + "&destname=foo#map-page";
    }

    return {'positionCallbackFromGeolocation': positionCallbackFromGeolocation,
            'positionCallbackFromDisplayedLocation': positionCallbackFromDisplayedLocation,
            'positionCallbackFromSourceLocation': positionCallbackFromSourceLocation,
            'positionCallbackFromDestinationLocation': positionCallbackFromDestinationLocation
            };
})
