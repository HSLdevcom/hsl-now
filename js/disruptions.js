define(function(require) {
    var $ = require('jquery'),
        jqueryxdomainrequest = require('jquery.xdomainrequest'),
        route_compare = require("./route_compare");

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
                shortName: a.line
            }, {
                shortName: b.line
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
})
