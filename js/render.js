define(['jquery', 'jquery.xdomainrequest', 'moment', 'leaflet', 'geometryutil',
        './favorites', './config', 'exports'],
        function($, jqueryxdomainrequest, moment, L, geometryutil, favorites,
            config, exports) {
    function renderTime(entry) {
        var now = moment() / 1000;
        if (entry.serviceDay + entry.realtimeDeparture - now > 20 * 60 || entry.serviceDay + entry.realtimeDeparture - now <= -60) // if time's far away or was minutes ago
            return (entry.realtime ? "" : "~") + moment((entry.serviceDay + entry.realtimeDeparture) * 1000).format(" HH:mm"); // display absolute time
        else
            return (entry.realtime ? "" : "~") + ((entry.serviceDay + entry.realtimeDeparture - now) / 60 | 0) + "min"; // display relative time rounded towards zero
        //    return (entry.rtime?entry.rtime.split(":", 2).join(":"):"~"+moment(entry.time*1000).format("HH:mm"));
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
            $elem.append("<h4 class='stop-" + stop.id.replace(":", "_") + "'>" + favorites.render_stop_favorite(stop) + " " + stop.name +
            " <small>" + render_stop_angle([lat, lon], [stop.lat, stop.lon]) + " " + Math.ceil(stop.distance) + "m" +
            "</small>" +
            "</h4>");
            $elem.append("<small class='lahdotgroup lahdot-" + stop.id.replace(":", "_") + "'></small>");
            $.getJSON(config.OTP_PATH + "/index/stops/" + stop.id + "/stoptimes", function(i, stop) {
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
                            if (stops[i3].name === stops[i2].name) {
                                skipThis = true; // more departures for the same code arriving later
                            }
                        }
                        if (skipThis) continue;
                        var results_of_code = [];
                        for (var i3=0; i3<=i2; i3++) { // >
                            if (stops[i3].name === stops[i2].name) {
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
                    $(".lahdot-" + stop.id.replace(":", "_")).text("");
                    var num_rendered = 0;
                    for (var j = 0; j < data.length; j++) { // >
                        var entry = data[j];
                        var key = entry.pattern.id;
                        if (!route_id_seen[key]) {
                            var next_departure = "---"; // XXX maybe after fold?
                            if (entry.times.length == 2)
                                next_departure = renderTime(entry.times[1]) 
                            if (total_rows_rendered === 0)
                                $(".lahdot-" + stop.id.replace(":", "_")).append(
                                    "<div class='row header'><div class='col-xs-2 text-right'>Linja</div><div class='col-xs-4 text-right'>Seuraavat lähdöt</div><div class='col-xs-4'>Määränpää</div><div class='col-xs-2'>Pysäkki</div></div>"
                                );
                            $(".lahdot-" + stop.id.replace(":", "_")).append("<div class='row" + (num_rendered % 2 ? "" : " odd") +
                            "'><div class='col-xs-2 text-right" + (entry.line === focus_route_name ? " emphasis" : "") + 
                            " routenumber-" + entry.times[0].tripId.replace(":", "_").replace(" ", "_") + 
                            "'></div><div class='col-xs-2 text-right'>" + renderTime(entry.times[0]) +
                            "</div><div class='col-xs-2 text-right'>" + next_departure + "</div><div class='col-xs-4 headsign-" +
                            entry.times[0].tripId.replace(":", "_").replace(" ", "_") + "'></div><div class='col-xs-2 stop-" +
                            entry.times[0].stopId + "'>" + stopCodes[entry.times[0].stopId] + "</div></div>");
                            $.getJSON(config.OTP_PATH + "/index/trips/" + entry.times[0].tripId, function (trip) {
                                return function(data) {
                                    //console.log(data);
                                    if ("tripHeadsign" in data) {
                                        $(".headsign-" + trip).text(data.tripHeadsign);
                                    } else {
                                        $(".headsign-" + trip).text(data.route.longName);
                                    }
                                    $(".routenumber-" + trip).text(data.route.shortName);
                                }
                            }(entry.times[0].tripId.replace(":", "_").replace(" ", "_")));
                            route_id_seen[key] = true;
                            num_rendered++;
                            total_rows_rendered++;
                        }
                    }

                    if (!num_rendered) {
                        $(".stop-" + stop.id.replace(":", "_")).hide();
                    } else {
                        total_stops_rendered++;
                    }
                }
            }(i, stop);
        }
    }
})
