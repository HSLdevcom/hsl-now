define(function(require) {
var $ = require('jquery'),
    jqueryxdomainrequest = require('jquery.xdomainrequest'),
    moment = require("moment"),
    L = require("leaflet"),
    geometryutil = require("geometryutil"),
    favorites = require('./favorites'),
    config = require('./config');
// These functions are used by hslnow.js and typeahead.js

// from leaflet geo/crs/CRS.Earth.js
function distance(lat1, lng1, lat2, lng2) {
    var rad = Math.PI / 180;
    lat1 = lat1 * rad;
    lat2 = lat2 * rad;

    return 6378137 * Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos((lng2 -
        lng1) * rad));
}

function renderTime(entry) {
    var now = moment() / 1000;
    if (entry.serviceDay + entry.realtimeDeparture - now > 20 * 60 || entry.serviceDay + entry.realtimeDeparture - now <= -60) // if time's far away or was minutes ago
        return (entry.realtime ? "" : "~") + moment((entry.serviceDay + entry.realtimeDeparture) * 1000).format(" HH:mm"); // display absolute time
    else
        return (entry.realtime ? "" : "~") + ((entry.serviceDay + entry.realtimeDeparture - now) / 60 | 0) + "min"; // display relative time rounded towards zero
    //    return (entry.rtime?entry.rtime.split(":", 2).join(":"):"~"+moment(entry.time*1000).format("HH:mm"));
}

function removeDuplicateStops(stops) {
    var stop_seen = {};
    var res = [];
    for (var i = 0; i < stops.length; i++) { // >
        if (!stop_seen[stops[i].id]) {
            stop_seen[stops[i].id] = true;
            res.push(stops[i]);
        }
    }
    return res;
}

// Used by hslnow.js and typeahead.js and index.html
function render_stops(lat, lon, stops, $elem, focus_route_name, time) {
    $elem.text("");

    console.log("Starting render at", [lat, lon, time]);

    stops = removeDuplicateStops(stops);

    // calculate distances to stops and sort by distance
    for (var i = 0; i < stops.length; i++) { // >
        var stop = stops[i];
        if ("dist" in stop) {
            stop.distance = stop.dist;
        } else {
            stop.distance = distance(lat, lon, stops[i].lat, stops[i].lon);
            // XXX Webcat often returns NaN above, so inlining the calculation here
            stop.distance = 6378137 * Math.acos(Math.sin(lat * Math.PI / 180) * Math.sin(stop.lat * Math.PI / 180) + Math.cos(
                lat * Math.PI / 180) * Math.cos(stop.lat * Math.PI / 180) * Math.cos((stop.lon - lon) * Math.PI / 180));
        }
    }
    stops.sort(function(a, b) {
        return a.distance - b.distance;
    });

    var results_for_stop = [];
    var render_stop = [];

    var total_rows_rendered = 0;

    var route_id_seen = {};
    for (var i = 0; i < stops.length && i < 10; i++) { // >>
        var stop = stops[i];
        $elem.append("<h4 class='stop-" + stop.id.replace(":", "_") + "'>" + favorites.render_stop_favorite(stop) + stop.code + " " + stop.name +
        " <small>" + render_stop_angle([lat, lon], [stop.lat, stop.lon]) + " " + Math.ceil(stop.distance) + "m" +
        "</small>" +
        "</h4>");
        $elem.append("<small class='lahdotgroup lahdot-" + stop.id.replace(":", "_") + "'></small>");
        $.getJSON(config.OTP_PATH + "/index/stops/" + stop.id + "/stoptimes", function(i, stop) {
            return function(data) {
                data.sort(function(a, b){
                    return (a.times[0].serviceDay + a.times[0].realtimeDeparture - b.times[0].serviceDay - b.times[0].realtimeDeparture)});
                console.log("rendering", stop.id, data);
                $(".lahdot-" + stop.id.replace(":", "_")).text("");
                var num_rendered = 0;
                for (var j = 0; j < data.length; j++) { // >
                    var entry = data[j];
                    var next_departure = "---"; // XXX maybe after fold?
                    if (entry.times.length == 2)
                        next_departure = renderTime(entry.times[1]) 
                    if (total_rows_rendered === 0)
                        $(".lahdot-" + stop.id.replace(":", "_")).append(
                            "<div class='row header'><div class='col-xs-2 text-right'>Linja</div><div class='col-xs-4 text-right'>Seuraavat lähdöt</div><div class='col-xs-6'>Määränpää</div></div>"
                        );
                    $(".lahdot-" + stop.id.replace(":", "_")).append("<div class='row" + (num_rendered % 2 ? "" : " odd") +
                    "'><div class='col-xs-2 text-right" + (entry.line === focus_route_name ? " emphasis" : "") + 
                    " routenumber-" + entry.times[0].tripId.replace(":", "_").replace(" ", "_") + 
                    "'></div><div class='col-xs-2 text-right'>" + renderTime(entry.times[0]) +
                    "</div><div class='col-xs-2 text-right'>" + next_departure + "</div><div class='col-xs-6 headsign-" +
                    entry.times[0].tripId.replace(":", "_").replace(" ", "_") + "'></div></div>");
                    $.getJSON(config.OTP_PATH + "/index/trips/" + entry.times[0].tripId, function (trip) {
                        return function(data) {
                            console.log(data);
                            if ("tripHeadsign" in data) {
                                $(".headsign-" + trip).text(data.tripHeadsign);
                            } else {
                                $(".headsign-" + trip).text(data.route.longName);
                            }
                            $(".routenumber-" + trip).text(data.route.shortName);
                        }
                    }(entry.times[0].tripId.replace(":", "_").replace(" ", "_")));
                    num_rendered++;
                    total_rows_rendered++;
                }

                if (!num_rendered)
                    $(".stop-" + stop.id.replace(":", "_")).hide();

            }
        }(i, stop));
    }
}

function render_stop_angle(p1, p2) {
    var a = L.GeometryUtil.computeAngle(window.map.latLngToLayerPoint(L.latLng(p1)), window.map.latLngToLayerPoint(L.latLng(
        p2)));
    if (-22.5 - 180 < a && a <= -22.5 - 135) return "\u2190"; // <
    else if (-22.5 - 135 < a && a <= -22.5 - 90) return "\u2196";
    else if (-22.5 - 90 < a && a <= -22.5 - 45) return "\u2191"; // ^
    else if (-22.5 - 45 < a && a <= -22.5) return "\u2197"; //
    else if (-22.5 < a && a <= 22.5) return "\u2192"; // >
    else if (22.5 < a && a <= 22.5 + 45) return "\u2198";
    else if (22.5 + 45 < a && a <= 22.5 + 90) return "\u2193"; // v
    else if (22.5 + 90 < a && a <= 22.5 + 135) return "\u2199";
    else if (22.5 + 135 < a && a <= 22.5 + 180) return "\u2190"; // <
}

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
            render_stops(lat, lon, data, $(".lahdot"), "XXX", time);
        });

        $('.groupname').text('Lähimmät suosikkisi');
        render_stops(lat, lon, favorites.favorites, $(".favorites"), "XXX", time);

        window.map.setView([lat, lon], 15);
    }
}
return {'render_stops': render_stops,
        'positionCallback': positionCallback};
})
