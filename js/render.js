define(['jquery', 'jquery.xdomainrequest', 'moment', 'leaflet', 'geometryutil',
        './favorites', './config', 'exports', 'react', 'jsx!render_stop'],
        function($, jqueryxdomainrequest, moment, L, geometryutil, favorites,
            config, exports, React, render_stop_react) {


    // Used by hslnow.js and typeahead.js and index.html
    exports.render_stops = function(lat, lon, stops, $elem, focus_route_name, time) {
        console.log("Starting render at", [lat, lon, time]);

        var props = {
            "stops": stops,
            "location": [lat, lon],
        }
        var r = React.render(React.createElement(render_stop_react.StopDisplayList, props), $elem[0]);
    }
})
