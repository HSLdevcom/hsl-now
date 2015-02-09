if (!window.console)
    window.console = {}
if (!console.log)
    console.log = function() {};

window.map = null;

window.stopLayer = null;

mygroups = {
    "Junat keskustasta": [{
        id: "HSL:1020501",
        code: "0070",
        name: "Helsinki",
        lat: 60.17129,
        lon: 24.94167
    }, {
        id: "HSL:1020502",
        code: "0070",
        name: "Helsinki",
        lat: 60.17272,
        lon: 24.93991
    }]
};
favorites = [{
    id: "HSL:1240109",
    code: "2429",
    name: "Pyöräilystadion",
    lat: 60.201443,
    lon: 24.944969
}, {
    id: "HSL:1174501",
    code: "0071",
    name: "Pasila",
    lat: 60.1986627,
    lon: 24.9334823
}, {
    id: "HSL:1121601",
    code: "0017",
    name: "Sörnäinen",
    lat: 60.187414,
    lon: 24.959904
}, {
    id: "HSL:1121602",
    code: "0017",
    name: "Sörnäinen",
    lat: 60.187414,
    lon: 24.959904
}];

OTP_PATH = "http://matka-aika.com/otp/routers/default";

displayed_location = null;
source_location = null;
device_location = null;

if (window.localStorage) {
    if (window.localStorage.favoriteStops)
        favorites = JSON.parse(window.localStorage.favoriteStops);
}

function is_favorite_stop(code) {
    for (var i = 0; i < favorites.length; i++) {
        if (favorites[i].stopCode === code)
            return true;
    }
    return false;
}

function save_favorites() {
    if (window.localStorage)
        window.localStorage.favoriteStops = JSON.stringify(favorites);
}

function render_favorites() {
    $('.groupname').text('Lähimmät suosikkisi');
    render_stops(displayed_location[0], displayed_location[1], favorites, $('.favorites'));
}

function favorite_stop(stop) {
    if (!is_favorite_stop(stop.stopCode)) {
        favorites.push(stop);
        save_favorites();
        render_favorites();
    }
}

function unfavorite_stop(stop) {
    for (i = 0; i < favorites.length; i++) { // >
        // remove continuous stops with same code:
        if (favorites[i].stopCode === stop.stopCode) {
            while (i < favorites.length && favorites[i].stopCode === stop.stopCode) { // >
                favorites.splice(i, 1);
            }
            save_favorites();
            render_favorites();
            return;
        }
    }
}

function render_stop_favorite(stop) {
    if (is_favorite_stop(stop.stopCode))
        return "<a class='favorite glyphicon glyphicon-star' href='javascript:unfavorite_stop(" + JSON.stringify(stop) +
            ")'></a> ";
    else
        return "<a class='notfavorite glyphicon glyphicon-star-empty' href='javascript:favorite_stop(" + JSON.stringify(
                stop) + ")'></a> ";
}

// from http://stackoverflow.com/a/24035537/3141691
function closeKeyboard() {
    //creating temp field
    var field = document.createElement('input');
    field.setAttribute('type', 'text');
    //hiding temp field from peoples eyes
    //-webkit-user-modify is nessesary for Android 4.x
    field.setAttribute('style',
        'position:absolute; top: 0px; opacity: 0; -webkit-user-modify: read-write-plaintext-only; left:0px;');
    document.body.appendChild(field);

    //adding onfocus event handler for out temp field
    field.onfocus = function() {
        //this timeout of 200ms is nessasary for Android 2.3.x
        setTimeout(function() {

            field.setAttribute('style', 'display:none;');
            setTimeout(function() {
                document.body.removeChild(field);
                document.body.focus();
            }, 14);

        }, 200);
    };
    //focusing it
    field.focus();
}

function createSplitter(regex) {
    return function(input) {
        return input.split(regex);
    }
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
    device_location = [position.coords.latitude, position.coords.longitude];
    if (!source_location) {
        source_location = device_location;
        displayed_location = source_location;
        $.getJSON(OTP_PATH + "/index/stops", {
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
        render_stops(lat, lon, favorites, $(".favorites"), "XXX", time);

        window.map.setView([lat, lon], 15);
    }
}

function positionError(error) {
    console.log("positionError", error);
    if (!source_location) {
        $('.lahdot').text('Paikannus epäonnistui: "' + error.message + '"');
    }
    /* on firefox, this re-fires every 10 seconds or so:
     if (!source_location) {
     positionCallback({coords: {latitude: 60.19909, longitude: 24.94042}});
     source_location = null; // don't store the fake position
     }
     */
}

function render_time(entry) {
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

function merge_stops(stops) {
    var ret = [];
    for (var i = 0; i < stops.length; i++) { // >
        for (var j = 0; j < ret.length; j++) { // >
            if (ret[j].stopCode === stops[i].stopCode) {
                ret[j] = merge_stop(ret[j], stops[i]);
            }
        }
        ret.push(stops[i]);
    }

}

function merge_stop(stop1, stop2) {
    var stop = {
        id: stop1.id,
        stopCode: stop1.stopCode,
        stopName: stop1.stopName,
        stopLat: (stop1.stopLat + stop2.stopLat) / 2,
        stopLon: (stop1.stopLon + stop2.stopLon) / 2
    };
    return stop;
}

// from leaflet geo/crs/CRS.Earth.js
function distance(lat1, lng1, lat2, lng2) {
    var rad = Math.PI / 180;
    lat1 = lat1 * rad;
    lat2 = lat2 * rad;

    return 6378137 * Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos((lng2 -
        lng1) * rad));
}

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
        $elem.append("<h4 class='stop-" + stop.id.replace(":", "_") + "'>" + render_stop_favorite(stop) + stop.code + " " + stop.name +
        " <small>" + render_stop_angle([lat, lon], [stop.lat, stop.lon]) + " " + Math.ceil(stop.distance) + "m" +
        "</small>" +
        "</h4>");
        $elem.append("<small class='lahdotgroup lahdot-" + stop.id.replace(":", "_") + "'></small>");
        $.getJSON(OTP_PATH + "/index/stops/" + stop.id + "/stoptimes", function(i, stop) {
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
                        next_departure = render_time(entry.times[1]) 
                    if (total_rows_rendered === 0)
                        $(".lahdot-" + stop.id.replace(":", "_")).append(
                            "<div class='row header'><div class='col-xs-2 text-right'>Linja</div><div class='col-xs-4 text-right'>Seuraavat lähdöt</div><div class='col-xs-6'>Määränpää</div></div>"
                        );
                    $(".lahdot-" + stop.id.replace(":", "_")).append("<div class='row" + (num_rendered % 2 ? "" : " odd") +
                    "'><div class='col-xs-2 text-right" + (entry.line === focus_route_name ? " emphasis" : "") + 
                    " routenumber-" + entry.times[0].tripId.replace(":", "_").replace(" ", "_") + 
                    "'></div><div class='col-xs-2 text-right'>" + render_time(entry.times[0]) +
                    "</div><div class='col-xs-2 text-right'>" + next_departure + "</div><div class='col-xs-6 headsign-" +
                    entry.times[0].tripId.replace(":", "_").replace(" ", "_") + "'></div></div>");
                    $.getJSON(OTP_PATH + "/index/trips/" + entry.times[0].tripId, function (trip) {
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

function route_compare(a, b) {
    var partsA = a.shortName.match(/^[A-Za-z]?(0*)([0-9]*)/);
    var partsB = b.shortName.match(/^[A-Za-z]?(0*)([0-9]*)/);
    if (partsA[1].length != partsB[1].length) {
        if (partsA[1].length + partsA[2].length == 0) {
            return -1; // A is the one with no numbers at all, wins leading zero
        } else if (partsB[1].length + partsB[2].length == 0) {
            return 1; // B is the one with no numbers at all, wins leading zero
        } else {
            return partsB[1].length - partsA[1].length; // more leading zeros wins
        }
    }
    var numberA = parseInt(partsA[2] || "0", 10);
    var numberB = parseInt(partsB[2] || "0", 10);
    return numberA - numberB || (a.shortName || "").localeCompare(b.shortName || "") || (a.longName ||
        "").localeCompare(b.longName || "");
}

function ajaxTransport(url, options, onSuccess, onError) {
    return $.ajax(url, options).done(done).fail(fail);

    function done(data, textStatus, request) {
        onSuccess(data);
    }

    function fail(request, textStatus, errorThrown) {
        onError(errorThrown);
    }
}

function typeToNames(type) {
    var map = {
        "0": ["raitiovaunu", "ratikka", "spora", "spåra", "hkl", "raideliikenne"],
        "1": ["metro", "maanalainen", "hkl", "raideliikenne", "runkolinja"],
        "3": ["bussi", "dösä", "linja-auto"],
        "4": ["lautta"],
        "109": ["juna", "lähijuna", "vr-juna", "raideliikenne", "runkolinja"]
    };
    return map[type];
}

function createRegexGuardedTransport(baseurl, regex) {
    return function(url, options, onSuccess, onError) {
        url = url.replace(/^[^:]*:/, "");
        var query = decodeURIComponent(url);
        if (query.match(regex)) {
            //            console.log("match", query);
            //            console.log(baseurl, baseurl.replace("%QUERY", url));
            ajaxTransport(baseurl.replace("%QUERY", url), options, onSuccess, onError);
        } else {
            //            console.log("non-match", query);
            // XXX onSuccess({}) here would fail a filter and jam requests past 6th:
            setTimeout(function() {
                onError(true)
            }, 0); // no-op
        }
    }
}

// XXX no api method to search by stop code
var stopsByName = new Bloodhound({
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.nonword(d.description);
    },
    queryTokenizer: Bloodhound.tokenizers.nonword,
    limit: 100,
    sorter: function(a, b) {
        return a.description.localeCompare(b.description) || (a.id || "xxx").localeCompare(b.id || "xxx");
    },
    remote: {
        url: "stopsByName:%QUERY",
        filter: function(parsedResponse) {
            //                console.log("stopsByName parsedResponse", parsedResponse);
            return parsedResponse
        },
        transport: createRegexGuardedTransport(
            'http://matka-aika.com/otp/routers/default/geocode?autocomplete=true&clusters=true&stops=false&corners=false&query=%QUERY', /[^\s]{3}/)
    }
});
stopsByName.initialize();

var routesByName = new Bloodhound({
    datumTokenizer: function(d) {
        var tokens = d.longName.split(/[\s,.()-]+/);
        tokens = tokens.concat([d.shortName]);
        if (d.mode === "RAIL") {
            tokens = tokens.concat([d.shortName + "-juna"]);
        }
        tokens = tokens.concat(typeToNames(d.routeType));
        if ("shortName" in d) {
            if (d.shortName[0] === "P") {
                tokens = tokens.concat(["palvelulinja"]);
            }
            if (d.shortName === "550") {
                tokens = tokens.concat(["runkolinja"]);
            }
        }
        return tokens;
    },
    //        queryTokenizer: createSplitter(/[\s,.()-]+/),
    queryTokenizer: function(d) {
        // XXX some lines start with a letter such as trains and p10
        if (d.match(/^[Pp]$/)) {
            return ["palvelulinja"]; // XXX p-juna
        }
        if (d.match(/^[Pp][0-9]$/)) {
            return [d]; // XXX p-juna
        }
        if (d.match(/^([a-zA-Z]|[vV][rR])-?$/)) {
            return [d[0] + "-juna"];
        }
        if (d.match(/^[0-9]|[^\s]{3}/)) {
            return d.split(/[\s,.()-]+/);
        } else {
            return [];
        }
    },
    limit: 100,
    sorter: function(a, b) {
        return route_compare(a, b);
    },
    prefetch: {
        url: OTP_PATH + '/index/agencies/HSL/routes',
        filter: function(parsedResponse) {
            for (var i = 0; i < parsedResponse.length; i++) { // >
                if (parseInt(parsedResponse[i].id, 10) === 1300) {
                    parsedResponse.routes[i].shortName = "Metro";
                } else if (parseInt(parsedResponse[i].id, 10) === 1019) {
                    parsedResponse.routes[i].shortName = "Lautta";
                }
            }
            return parsedResponse;
        }
    }
});
routesByName.initialize();

var addressesByName = new Bloodhound({
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.stopName).concat([d.stopCode]);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 100,
    sorter: function(a, b) {
        return a.description.localeCompare(b.description);
    },
    remote: {
        url: 'addressesByName:%QUERY',
        filter: function(parsedResponse) {
            //                console.log("addressesByName parsedResponse", parsedResponse);
            var res = [];
            for (var i = 0; i < parsedResponse.predictions.length; i++) { // >
                var entry = parsedResponse.predictions[i];
                entry.description = entry.description.replace(/, Finland$/g, "");
                entry.description = entry.description.replace(/( [^,]+),\1/g, "$1");
                res.push(entry);
            }
            return res;
        },
        transport: createRegexGuardedTransport(
            'http://data.okf.fi/gis/1/autocomplete.json?query=%QUERY&components=administrative_area:helsinki,vantaa,espoo,kauniainen,kirkkonummi,kerava,sipoo,helsingfors,vanda,esbo,grankulla,kyrkslätt,kervo,sibbo',
            /[^\s\d]{3}/)
    }
});
addressesByName.initialize();

var timeByTime = new Bloodhound({
    datumTokenizer: function(d) {
        return [d]
    },
    queryTokenizer: function(d) {
        return [d]
    },
    remote: {
        url: 'timeByTime:%QUERY',
        transport: function(url, options, onSuccess, onError) {
            url = url.replace(/^[^:]*:/, "");
            var query = decodeURIComponent(url);
            if (query.match(/[0-9][0-9][:.][0-9][0-9]/)) {
                setTimeout(function() {
                    onSuccess([{
                        time: query
                    }])
                }, 0);
            } else {
                setTimeout(function() {
                    onError(true)
                }, 0); // no-op
            }
        }
    }
});
timeByTime.initialize();

$('.typeahead').typeahead({
    highlight: true,
    hint: true,
    minLength: 1
}, {
    name: 'time',
    displayKey: 'time',
    source: timeByTime.ttAdapter(),
    templates: {
        header: "<h3 class='panel-title'>Lähtöaika</h3>",
        suggestion: function(datum) {
            return "<p>" + datum.time + "</p>"
        }
    }
}, {
    name: 'stops',
    displayKey: 'description',
    source: stopsByName.ttAdapter(),
    templates: {
        header: "<h3 class='panel-title'>Pysäkit</h3>",
        suggestion: function(datum) {
            return "<p>" + datum.description + "</p>"
        }
    }
}, {
    name: 'routes',
    displayKey: 'shortName',
    source: routesByName.ttAdapter(),
    templates: {
        header: "<h3 class='panel-title'>Linjat</h3>",
        suggestion: function(datum) {
            return "<p>" + (datum.shortName || "") + " " + datum.longName + "</p>"
        }
    }
}, {
    name: 'addresses',
    displayKey: 'description',
    source: addressesByName.ttAdapter(),
    templates: {
        header: "<h3 class='panel-title'>Osoitteet</h3>",
        suggestion: function(datum) {
            return "<p>" + datum.description + "</p>"
        }
    }
});

$(".tt-hint").addClass("form-control");

$('.typeahead').on('typeahead:selected', function(event, suggestion, dataset) {
    if (suggestion.lat) {
        source_location = null;
        positionCallback({
            coords: {
                latitude: suggestion.lat,
                longitude: suggestion.lng
            }
        });
    } else if (suggestion.reference) {
        $.getJSON("http://data.okf.fi/gis/1/geocode.json", {
            reference: suggestion.reference
        }, function(data) {
            //                console.log(data);
            source_location = null;
            positionCallback({
                coords: {
                    latitude: data.result.geometry.location.lat,
                    longitude: data.result.geometry.location.lng
                }
            });
        });
    } else if (suggestion.longName) {
        $.getJSON("http://matka-aika.com/otp/routers/default/index/routes/" + suggestion.id + "/stops", function(data) {
            $('.groupname').text("Linjan " + (suggestion.shortName || suggestion.longName) +
            " lähimmät pysäkit");
            render_stops(displayed_location[0], displayed_location[1], data, $('.favorites'), suggestion.shortName ||
            suggestion.longName);
        });
    } else if (suggestion.time) {
        var time = suggestion.time.replace(".", ":");
        var date;
        if (time > moment().format("HH:mm")) { // XXX allow some buffer
            date = moment().format("YYYY-MM-DD");
        } else {
            date = moment().add(60 * 60 * 24 * 1000).format("YYYY-MM-DD");
        }
        source_location = null;
        positionCallback({
            coords: {
                latitude: displayed_location[0],
                longitude: displayed_location[1]
            }
        }, date + "T" + time);
    } else {
        return;
    }
    closeKeyboard();
});

$('.typeahead').typeahead('val', "");

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
    $.getJSON(OTP_PATH + "/index/stops", {
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
            marker.bindPopup(
                '<iframe style="border: 0" frameBorder="0" src="http://hsl.seasam.com/omatpysakit/mobile?command=stop&id=' +
                stop.id + '&lang=1"></iframe>');
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
    //        map.invalidateSize();
});

function clock() {
    $('.timenow').attr('data-time', "\u231A " + moment().format("HH:mm:ss"));
    setTimeout(clock, 1000);
}
clock();

$.getJSON('http://pubtrans.it/hsl/reittiopas/disruption-api', {}, function(data) {
    //    $.getJSON('http://pubtrans.it/hsl/reittiopas/disruption-api?dt=2014-10-14T17:44:22', {}, function(data) {
    var linetype2name = {
        7: 'Lautat',
        6: 'Metro',
        2: 'Ratikat',
        12: 'Junat',
        other: 'Bussit'
    };
    var linetype2color = {
        7: '#00b9e4',
        6: '#ff6319',
        2: '#00985f',
        12: '#64be14',
        14: '#ffffff',
        other: '#007ac9'
    };

    data.sort(function(a, b) {
        return route_compare({
            routeShortName: a.line
        }, {
            routeShortName: b.line
        })
    });

    var seen = {};
    var msgs = {};
    for (var i = 0; i < data.length; i++) {
        var info = data[i];

        msgs[info.info] = true;

        if (seen[info.linetype + "," + info.line])
            continue;
        else
            seen[info.linetype + "," + info.line] = true;
        if (!linetype2color[info.linetype])
            info.linetype = 'other';
        //            $('.disruptions .linetype-'+info.linetype).append('<button type="button" class="btn btn-default" style="border: 2px solid #fed100; font-weight: bold; color: '+linetype2color[info.linetype]+'; background: white">'+(info.line||'Kaikki linjat')+'&nbsp;&nbsp;<span class="glyphicon glyphicon-exclamation-sign" style="color: #fed100"></span></button>');

        $typebutton = $('.disruptions .linetype-' + info.linetype + ' button');
        $typebutton.find('.typename').hide();
        $typebutton.find('.lines').append(' <span>' + (info.line || 'Kaikki linjat') + '</span>');
        $typebutton.find('.statusicon').html(
            '&nbsp;&nbsp;<span class="glyphicon glyphicon-exclamation-sign" style="color: #fed100"></span>');
        $typebutton.css('border-color', '#fed100');
        $typebutton.removeClass("hide");
    }

    //        for (var linetype of [2,'other',12,6,7]) {
    for (var linetype in linetype2name) {
        $typebutton = $('.disruptions .linetype-' + linetype + ' button');

        if ($.trim($typebutton.find('.lines').html()).length === 0) {
            //                $('.disruptions .linetype-'+linetype+' button').append('<button type="button" class="btn btn-default" style="border: 2px solid green; font-weight: bold; color: '+linetype2color[linetype]+'; background: white">'+linetype2name[linetype]+'  <span class="glyphicon glyphicon-ok" style="color: green"></span></button>');
            $typebutton.find('.statusicon').html(
                '&nbsp;&nbsp;<span class="glyphicon glyphicon-ok" style="color: green"></span>');
        }
    }

    for (var msg in msgs) {
        console.log(msg);
        $('.disruptions .msgs').append("<p>" + msg.replace(/\?/g, "ä") + "</p>"); // XXX ä, å, get source data in proper charset
    }
    if ($.trim($('.disruptions .msgs').html()).length === 0) {
        $('.disruptions .msgs').append("<p>Tällä hetkellä ei poikkeusliikennetiedotteita.</p>");
    }
    $(".disruptions .msgs").hide();
    $(".disruptions").click(function() {
        $(".disruptions .msgs").toggle();
    });
});

displayed_location = [60.19909, 24.94042];
render_stops("60.19909", "24.94042", favorites, $(".favorites"));

if (navigator && navigator.geolocation && navigator.geolocation.watchPosition) {
    navigator.geolocation.watchPosition(positionCallback, positionError, {
        enableHighAccuracy: true,
        timeout: 0xFFFFFFFF
    });
    //        navigator.geolocation.getCurrentPosition(positionCallback, positionError, {enableHighAccuracy: true});
} else {
    // kaarlenkatu:
    //        positionCallback({coords: {latitude: 60.18606, longitude: 24.95025}});
    // hsl:
    positionCallback({
        coords: {
            latitude: 60.19909,
            longitude: 24.94042
        }
    });
}
