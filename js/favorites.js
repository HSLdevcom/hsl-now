define(function(require) {
var $ = require('jquery');
    config = require('./config');

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

// Used by index.html
function render_favorites() {
    $('.groupname').text('Lähimmät suosikkisi');
    render_stops(config.displayed_location[0], config.displayed_location[1], favorites, $('.favorites'));
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

// Used by position_callback.js
function render_stop_favorite(stop) {
    if (is_favorite_stop(stop.stopCode))
        return "<a class='favorite glyphicon glyphicon-star' href='javascript:unfavorite_stop(" + JSON.stringify(stop) +
            ")'></a> ";
    else
        return "<a class='notfavorite glyphicon glyphicon-star-empty' href='javascript:favorite_stop(" + JSON.stringify(
                stop) + ")'></a> ";
}
return {'favorites': favorites,
        'render_stop_favorite': render_stop_favorite};
})
