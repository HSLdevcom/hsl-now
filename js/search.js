// XXX no api method to search by stop code
define(function(require) {
    var $ = require("jquery"),
        jqueryxdomainrequest = require('jquery.xdomainrequest'),
        moment = require("moment"),
        Bloodhound = require("bloodhound"),
        typeaheadjs = require("typeahead.js"),
        render = require('./render'),
        position_callback = require("./position_callback"),
        route_compare = require("./route_compare"),
        config = require("./config");


    // These functions are not used by anything else
    function ajaxTransport(options, onSuccess, onError) {
        return $.ajax(options).done(done).fail(fail);

        function done(data, textStatus, request) {
            onSuccess(data);
        }

        function fail(request, textStatus, errorThrown) {
            onError(errorThrown);
        }
    }

    function createRegexGuardedTransport(baseurl, regex) {
        return function(options, onSuccess, onError) {
            options.url = options.url.replace(/^[^:]*:/, "");
            var query = decodeURIComponent(url);
            if (query.match(regex)) {
                options.url = baseurl.replace("%QUERY", options.url);
                //            console.log("match", query);
                //            console.log(baseurl, baseurl.replace("%QUERY", url));
                ajaxTransport(options, onSuccess, onError);
            } else {
                //            console.log("non-match", query);
                // XXX onSuccess({}) here would fail a filter and jam requests past 6th:
                setTimeout(function() {
                    onError(true)
                }, 0); // no-op
            }
        }
    }

    function typeToNames(type) {
        var map = {
            "0": ["raitiovaunu", "ratikka", "spora", "spåra", "hkl", "raideliikenne"],
            "1": ["metro", "maanalainen", "hkl", "raideliikenne", "runkolinja"],
            "3": ["bussi", "dösä", "linja-auto", "linkki", "nysse"],
            "4": ["lautta"],
            "109": ["juna", "lähijuna", "vr-juna", "raideliikenne", "runkolinja", "josse"]
        };
        return map[type];
    }

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
            wildcard: "%QUERY",
            filter: function(parsedResponse) {
                //                console.log("stopsByName parsedResponse", parsedResponse);
                return parsedResponse
            },
            transport: createRegexGuardedTransport(
                'http://matka-aika.com/otp/routers/default/geocode?autocomplete=true&clusters=true&stops=false&corners=false&query=%QUERY', /[^\s]{3}/)
        }
    });
    stopsByName.initialize();

    // XXX Only line using this is commented
    function createSplitter(regex) {
        return function(input) {
            return input.split(regex);
        }
    }

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
            url: config.OTP_PATH + '/index/agencies/HSL/routes',
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
            return Bloodhound.tokenizers.whitespace(d.name).concat([d.code]);
        },
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        limit: 100,
        sorter: function(a, b) {
            return a.description.localeCompare(b.description);
        },
        remote: {
            url: 'addressesByName:%QUERY',
            wildcard: '%QUERY',
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
            wildcard: '%QUERY',
            transport: function(options, onSuccess, onError) {
                url = options.url.replace(/^[^:]*:/, "");
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

    $('.typeahead').typeahead({
        highlight: true,
        hint: true,
        minLength: 1,
        classNames: {
            suggestion: "tt-selection",
            dataset: "tt-dataset"
        }
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
                return '<div><div class="btn-group"><button class="btn btn-default"><span class="glyphicon glyphicon glyphicon-log-out" aria-hidden="true"></span></button>' +
                        '<button class="btn btn-default">' + datum.description + '</button>' +
                        '<button class="btn btn-default"><span class="glyphicon glyphicon glyphicon-log-in" aria-hidden="true"></button></div></div>'
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
            position_callback.positionCallbackFromDisplayedLocation({
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
                position_callback.positionCallbackFromDisplayedLocation({
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
                render.render_stops(config.displayed_location[0], config.displayed_location[1], data, $('.favorites'), suggestion.shortName ||
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
            config.search_time = moment(date + "T" + time);
        } else {
            return;
        }
        closeKeyboard();
    });

    $('.typeahead').typeahead('val', "");
})
