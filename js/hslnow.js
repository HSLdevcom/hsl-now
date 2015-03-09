define(function(require) {
    var $ = require('jquery'),
        jqueryxdomainrequest = require('jquery.xdomainrequest'),
        L = require("leaflet"),
        config = require("./config"),
        render = require('./render'),
        favorites = require('./favorites'),
        position_callback = require("./position_callback");

    if (!window.console)
        window.console = {}
    if (!console.log)
        console.log = function() {};

    window.map = null;

    window.stopLayer = null;


    window.map = map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    });
    layer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    });
    map.addLayer(layer);
    map.setView([60.17130, 24.94140], 15); // default to central railway station

    update_stopLayer = function() {
        var bbox = map.getBounds();
        $.getJSON(config.OTP_PATH + "/index/stops", {
            maxLat: bbox.getNorth(),
            maxLon: bbox.getEast(),
            minLat: bbox.getSouth(),
            minLon: bbox.getWest()
        }, function(resp) {
            map.removeLayer(stopLayer);
            stopLayer.eachLayer(function(l) {
                stopLayer.removeLayer(l);
            });
            for (var i = 0; i < resp.length; i++) {
                var stop = resp[i];
                var marker = L.circleMarker([stop.lat, stop.lon]);
                marker.addTo(stopLayer);
                marker.on('click', function(e) {
                    position_callback.positionCallbackFromDisplayedLocation({coords: {latitude: e.latlng.lat, longitude: e.latlng.lng}});
                });
            }
            map.addLayer(stopLayer);
        });
        return true;
    };

    window.stopLayer = stopLayer = L.layerGroup();
    map.addLayer(stopLayer);
    map.on('moveend', update_stopLayer);
    update_stopLayer();

    map.on('click', function(e) {
        $('#map').animate({
            height: $('#map').css('height').split(/px|%/)[0] > 100 ? '3em' : '30em'
        }, 1000, function() {
            console.log('resized');
            map.invalidateSize();
        });
    });

    config.displayed_location = [60.19909, 24.94042];
    render.render_stops("60.19909", "24.94042", favorites.favorites, $(".favorites"));

    if (navigator && navigator.geolocation && navigator.geolocation.watchPosition) {
        navigator.geolocation.watchPosition(
                position_callback.positionCallbackFromGeolocation,
                function(error) {
                    console.log("position error", error);
                    if (!config.device_location) {
                        $('.lahdot').text('Paikannus epäonnistui: "' + error.message + '"');
                    }},
                {enableHighAccuracy: true,
                 timeout: 0xFFFFFFFF});
    } else {
        // hsl:
        position_callback.positionCallbackFromDisplayedLocation({
            coords: {
                latitude: 60.19909,
                longitude: 24.94042
            }
        });
    }
})
