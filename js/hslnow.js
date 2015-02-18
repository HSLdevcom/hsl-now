if (!window.console)
    window.console = {}
if (!console.log)
    console.log = function() {};

window.map = null;

window.stopLayer = null;

// XXX Also needed in position_callback and typeahead
displayed_location = null;
source_location = null;
device_location = null;

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
});

displayed_location = [60.19909, 24.94042];
render_stops("60.19909", "24.94042", favorites, $(".favorites"));

if (navigator && navigator.geolocation && navigator.geolocation.watchPosition) {
    navigator.geolocation.watchPosition(
            positionCallback,
            function(error) {
                console.log("position error", error);
                if (!source_location) {
                    $('.lahdot').text('Paikannus epäonnistui: "' + error.message + '"');
                }},
            {enableHighAccuracy: true,
             timeout: 0xFFFFFFFF});
} else {
    // hsl:
    positionCallback({
        coords: {
            latitude: 60.19909,
            longitude: 24.94042
        }
    });
}
