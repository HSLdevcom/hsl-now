define(['jquery', 'jquery.xdomainrequest', 'moment', 'leaflet', 'geometryutil',
        './favorites', './config', 'exports', 'react', 'jsx!render_stop'],
        function($, jqueryxdomainrequest, moment, L, geometryutil, favorites,
            config, exports, React, render_stop_react) {

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

    // from leaflet geo/crs/CRS.Earth.js
    function distance(lat1, lng1, lat2, lng2) {
        var rad = Math.PI / 180;
        lat1 = lat1 * rad;
        lat2 = lat2 * rad;

        return 6378137 * Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos((lng2 -
            lng1) * rad));
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
    exports.render_stops = function(lat, lon, stops, $elem, focus_route_name, time) {
        $elem.text("");

        console.log("Starting render at", [lat, lon, time]);

        stops = removeDuplicateStops(stops);
        var stopCodes = {};

        // calculate distances to stops and sort by distance and put their codes into stopCodes (needed later on)
        for (var i = 0; i < stops.length; i++) { // >
            var stop = stops[i];
            if (stop.code) {
                stopCodes[stop.id] = stop.code;
            }
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
        var total_stops_rendered = 0;

        var route_id_seen = {};

        for (var i = 0; i < stops.length && i < 10; i++) { // >>
            total_stops_rendered = 0;
            var stop = stops[i];
            $elem.append("<h4 class='stop-" + stop.id.replace(":", "_") + "'>" + '<div class="btn-group"><button class="btn btn-default"' + 
            'onclick="position_callback.positionCallbackFromSourceLocation({coords: {latitude: ' + stop.lat +', longitude: ' + stop.lon + '}});">' +
            '<span class="glyphicon glyphicon glyphicon-log-out" aria-hidden="true"></span></button>' +
            '<button class="btn btn-default" onclick="position_callback.positionCallbackFromDestinationLocation({coords: {latitude: ' + stop.lat + 
            ', longitude: ' + stop.lon + '}});"><span class="glyphicon glyphicon glyphicon-log-in" aria-hidden="true"></button></div>&nbsp;'+ 
            favorites.render_stop_favorite(stop) + " " + stop.name +' <small>' +
            render_stop_angle([lat, lon], [stop.lat, stop.lon]) + " " + Math.ceil(stop.distance) + "m" +
            "</small>" +
            "</h4>");
            $elem.append("<small class='lahdotgroup lahdot-" + stop.id.replace(":", "_") + "'></small>");
            $.getJSON(config.OTP_PATH + "/index/stops/" + stop.id + "/stoptimes?detail=true", function(i, stop) {
                return function(data) {
                    results_for_stop[i] = data;
                    for (var i2=0; i2<i; i2++) {
                        if (!results_for_stop[i2])
                            return; // earlier stop needs to be handled first
                    }
                    for (var i2=i; i2<results_for_stop.length; i2++) { // >
                        if (!results_for_stop[i2])
                            return; // we're done for now
                        var skipThis = false;
                        for (var i3=i2+1; i3<stops.length && i3<10; i3++) { // >>
                            if (stops[i3].name.replace(/\W/g, '').toLowerCase() === stops[i2].name.replace(/\W/g, '').toLowerCase()) {
                                skipThis = true; // more departures for the same code arriving later
                            }
                        }
                        if (skipThis) continue;
                        var results_of_code = [];
                        for (var i3=0; i3<=i2; i3++) { // >
                            if (stops[i3].name.replace(/\W/g, '').toLowerCase() === stops[i2].name.replace(/\W/g, '').toLowerCase()) {
                                Array.prototype.push.apply(results_of_code, results_for_stop[i3]);
                                if (i3 !== i2)
                                    $(".stop-"+stops[i3].id.replace(":", "_")).hide(); // hide all but the last duplicate
                            }
                        }
                        results_of_code.sort(function(a, b){
                            return (a.times[0].serviceDay + a.times[0].realtimeDeparture - b.times[0].serviceDay - b.times[0].realtimeDeparture)
                        });
                        render_stop[i2](results_of_code);
                    }
                }
            }(i, stop));

            render_stop[i] = function(i, stop) {
                return function(data) {
                    //console.log("rendering", stop.id, data);
                    var rows = [];
                    for (var j = 0; j < data.length; j++) { // >
                        var entry = data[j];
                        for (var j2 = j+1; j2 < data.length; j2++) {
                            if (data[j2].pattern.shortName === entry.pattern.shortName && 
                                data[j2].pattern.direction ? data[j2].pattern.direction === entry.pattern.direction : 
                                data[j2].pattern.longName.replace(/^.*--/, "") === entry.pattern.longName.replace(/^.*--/, "")) {
                                Array.prototype.push.apply(entry.times, data[j2]);
                                route_id_seen[data[j2].pattern.id] = true;
                            }
                        }
                        entry.times.sort(function(a, b){
                            return (a.serviceDay + a.realtimeDeparture - b.serviceDay - b.realtimeDeparture)
                        });
                        var key = entry.pattern.id;
                        if (!route_id_seen[key]) {
                            rows.push(entry)
                            route_id_seen[key] = true;
                        }
                    }

                    React.render(React.createElement(render_stop_react.StopDepartureList, {"entry": rows, "firstRow": (total_stops_rendered === 0), "stopCodes": stopCodes}), $(".lahdot-" + stop.id.replace(":", "_"))[0]);

                    if (rows.length == 0) {
                        $(".stop-" + stop.id.replace(":", "_")).hide();
                    } else {
                        total_stops_rendered++;
                    }
                }
            }(i, stop);
        }
    }
})
