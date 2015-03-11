define(function(require) {
    var $ = require('jquery'),
        render = require('./render'),
        config = require('./config');

    var mygroups = {
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
    var favorites = [{
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
        if (code == undefined) {
            return false;
        }
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].code === code)
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
        render.render_stops(config.displayed_location[0], config.displayed_location[1], favorites, $('.favorites'));
    }

    function favorite_stop(stop) {
        if (stop.code == undefined) {
            return;
        }
        if (!is_favorite_stop(stop.code)) {
            favorites.push(stop);
            save_favorites();
            render_favorites();
        }
    }

    function unfavorite_stop(stop) {
        for (i = 0; i < favorites.length; i++) { // >
            // remove continuous stops with same code:
            if (favorites[i].code === stop.code) {
                while (i < favorites.length && favorites[i].code === stop.code) { // >
                    favorites.splice(i, 1);
                }
                save_favorites();
                render_favorites();
                return;
            }
        }
    }

    return {'favorites': favorites,
            'mygroups': mygroups,
            'is_favorite_stop': is_favorite_stop,
            'render_favorites': render_favorites,
            'favorite_stop': favorite_stop,
            'unfavorite_stop': unfavorite_stop};
})
