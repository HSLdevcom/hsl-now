// Used in main javascript, typeahead.js and position_callback.js
define({
    OTP_PATH: "http://matka-aika.com/otp/routers/default",
    // Current location shown on map, and which the nearests stops are calculated from
    displayed_location: null,
    // Source location to be used when startign a route search
    source_location: null,
    // Actual device locaton, only updated from geolocation events
    device_location: null,
    search_time: null
})
