/** @jsx React.DOM */

define(function(require) {
  var React = require('react'),
      moment = require('moment'),
      favorites = require('favorites'),
      position_callback = require('position_callback');

      L = require('leaflet');

  var SetIntervalMixin = {
    componentWillMount: function() {
      this.intervals = [];
    },
    setInterval: function() {
      this.intervals.push(setInterval.apply(null, arguments));
    },
    componentWillUnmount: function() {
      this.intervals.map(clearInterval);
    }
  };

  var getKeyforRow = function(row) {
    return "" + row.pattern.shortName + (row.pattern.direction ? row.pattern.direction : row.pattern.longName.replace(/^.*--/, ""))
  };

  // from leaflet geo/crs/CRS.Earth.js
  var distance = function(lat1, lng1, lat2, lng2) {
      return 6378137 * Math.acos(Math.sin(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lng1 - lng2) * Math.PI / 180));
  }

  var StopDepartureTime = React.createClass({
    mixins: [SetIntervalMixin],

    getInitialState: function() {
      return {
        now: moment()
      };
    },

    componentDidMount: function() {
      this.setInterval(this.tick, 10000);
    },

    tick: function() {
      this.setState({"now": moment()});
    },

    render: function() {
      if (this.props.entry == undefined)
        return (
          <span>
            ---
          </span>
          );
      var now = this.state.now / 1000;
      var departureTime = this.props.entry.serviceDay + this.props.entry.realtimeDeparture;
      if (departureTime - now <= 0) // In the past
        return (
          <span className='departuretime past'>
            {(this.props.entry.realtime ? "" : "~") + moment(departureTime * 1000).format(" HH:mm")}
          </span>
        );
      if (departureTime - now > 20 * 60) // far away
        return (
          <span>
            {(this.props.entry.realtime ? "" : "~") + moment(departureTime * 1000).format(" HH:mm")}
          </span>
          ); // display absolute time
      else
        return (
          <span>
            {(this.props.entry.realtime ? "" : "~") + ((departureTime - now) / 60 | 0) + (((departureTime - now) < 10*60 && (departureTime - now) % 60) > 30 ? "½" : "" )  + "min"}
          </span>
          ); // display relative time rounded towards zero
      //    return (entry.rtime?entry.rtime.split(":", 2).join(":"):"~"+moment(entry.time*1000).format("HH:mm"));
    }
  });

  var StopDepartureHeader = React.createClass({
    render: function() {
      return (
        <div className='row header'>
          <div className='col-xs-2 text-right'>
            Linja
          </div>
          <div className='col-xs-4 text-right'>
            Seuraavat lähdöt
          </div>
          <div className='col-xs-4'>
            Määränpää
          </div>
          <div className='col-xs-2'>
            Pysäkki
          </div>
        </div>);
    }
  });

  var StopDepartureRow = React.createClass({
    render: function() {
      var focus_route_name = "";
      var times = this.props.entry.times;
      times.sort(function(a, b){
        return (a.serviceDay + a.realtimeDeparture - b.serviceDay - b.realtimeDeparture)
      });
      return (
        <div className={"row " + this.props.odd}>
          <div className={"col-xs-2 text-right" + (this.props.entry.route === focus_route_name ? ' emphasis' : '')}>
            {this.props.entry.pattern.shortName ? this.props.entry.pattern.shortName : ""}
          </div>
          <div className="col-xs-2 text-right">
            <StopDepartureTime entry={times[0]} />
          </div>
          <div className='col-xs-2 text-right'>
            <StopDepartureTime entry={times[1]} />
          </div>
          <div className='col-xs-4'>
            {this.props.entry.pattern.direction ? this.props.entry.pattern.direction : this.props.entry.pattern.longName.replace(/^.*--/, "")}
          </div>
          <div className='col-xs-2'>
            {this.props.stopCodes[this.props.entry.times[0].stopId] || ""}
          </div>
        </div>
      );
    }
  });

  var StopDepartureList = React.createClass({
    render: function() {
      var rows = [];
      var num_rendered = 0;
      var entries = [];
      var entryObjs= {};

      this.props.entry.forEach(function(entry) {
        var key = getKeyforRow(entry);
        if (key in this.props.routeKeysSeen && this.props.routeKeysSeen[key] < this.props.stopIndex){
          return;
        }

        if (key in entryObjs) {
          entries[entryObjs[key]].times.concat(entry.times);
          // Keep entries in order after merging patterns
          entries[entryObjs[key]].times.sort(function(a, b) {
            return (a.serviceDay + a.realtimeDeparture - b.serviceDay - b.realtimeDeparture);
          });
        } else {
          entryObjs[key] = entries.length;
          entries[entryObjs[key]] = entry;
        }
      }, this);

      // Do not return anything if we don't have anything to show!
      if (entries.length == 0){
        return false;
      }

      entries.sort(function(a, b){
        return (a.times[0].serviceDay + a.times[0].realtimeDeparture - b.times[0].serviceDay - b.times[0].realtimeDeparture);
      });

      if (this.props.stopIndex == 0) {
        rows.push(<StopDepartureHeader key="header"/>);
        num_rendered++;
      }

      entries.forEach(function(row) {
        var key = getKeyforRow(row);
        //if (!(key in this.props.routeKeysSeen)) {
          rows.push(<StopDepartureRow key={key} entry={row} odd={num_rendered % 2 ? '' : ' odd'} stopCodes={this.props.stopCodes} />);
        //} else {
        //  console.log(this.props.routeKeysSeen[key]);
        //}
        num_rendered++;
      }, this);
      return (<div>
              {this.props.children}
              <small className="lahdotgroup">{rows}</small>
              </div>);
    }
  });

  var DirectionIndicator = React.createClass({
    render: function() {
      var text = "";
      // This isn't really proper :(
      var a = L.GeometryUtil.computeAngle(window.map.latLngToLayerPoint(L.latLng(this.props.from)), window.map.latLngToLayerPoint(L.latLng(this.props.to)));
      if (-22.5 - 180 < a && a <= -22.5 - 135) text = "\u2190"; // <
      else if (-22.5 - 135 < a && a <= -22.5 - 90) text = "\u2196";
      else if (-22.5 - 90 < a && a <= -22.5 - 45) text = "\u2191"; // ^
      else if (-22.5 - 45 < a && a <= -22.5) text = "\u2197"; //
      else if (-22.5 < a && a <= 22.5) text = "\u2192"; // >
      else if (22.5 < a && a <= 22.5 + 45) text = "\u2198";
      else if (22.5 + 45 < a && a <= 22.5 + 90) text = "\u2193"; // v
      else if (22.5 + 90 < a && a <= 22.5 + 135) text = "\u2199";
      else if (22.5 + 135 < a && a <= 22.5 + 180) text = "\u2190"; // <
      return (<span>{text}</span>);
    }
  });

  var StopFavoriteStar = React.createClass({
    render: function() {
      if (favorites.is_favorite_stop(this.props.stop.code))
        return(<a className='favorite glyphicon glyphicon-star' href={"javascript:favorites.unfavorite_stop(" + JSON.stringify(this.props.stop) + ")"}></a>);
      else
        return(<a className='notfavorite glyphicon glyphicon-star-empty' href={"javascript:favorites.favorite_stop(" + JSON.stringify(this.props.stop) + ")"}></a>);
    }
  });

  var StopHeader = React.createClass({
    render: function() {
      var setAsDeparturePlace = function() {
        position_callback.positionCallbackFromSourceLocation({"coords": {"latitude": this.props.stop.lat , "longitude": this.props.stop.lon }});
      };
      var setAsArrivalPlace = function() {
        position_callback.positionCallbackFromDestinationLocation({"coords": {"latitude": this.props.stop.lat , "longitude": this.props.stop.lon }});
      };
      return (
        <div>
          <h4 className={"stop-" + this.props.stop.id.replace(":", "_")}>
            <div className="btn-group">
              <button className="btn btn-default" onClick={setAsDeparturePlace}>
                <span className="glyphicon glyphicon glyphicon-log-out" aria-hidden="true" />
              </button>
              <button className="btn btn-default" onClick={setAsDeparturePlace}>
                <span className="glyphicon glyphicon glyphicon-log-in" aria-hidden="true" />
              </button>
            </div>
            &nbsp;<StopFavoriteStar stop={this.props.stop} /> {this.props.stop.name} 
            <small>
              <DirectionIndicator from={this.props.location} to={[this.props.stop.lat, this.props.stop.lon]} /> {Math.ceil(this.props.stop.distance)}m
            </small>
          </h4>
        </div>
        );
    }
  });

  var StopDisplay = React.createClass({
    getInitialState: function() {
      return {
        rows: []
      };
    },

    componentDidMount: function() {
      this.props.stops.forEach(function(stop) {
        $.getJSON(config.OTP_PATH + "/index/stops/" + stop.id + "/stoptimes?detail=true", function(data) {
          if (this.isMounted()) {
            data.forEach(function(row) {
              this.props.addRouteKey(getKeyforRow(row), this.props.stopIndex);
            }, this);
            this.setState({"rows": this.state.rows.concat(data)});
          }
        }.bind(this));    
      }, this);
    },

    componentWillReceiveProps: function(newProps) {
      this.state.rows.forEach(function(row) {
        this.props.addRouteKey(getKeyforRow(row), newProps.stopIndex);
      }, this)
    },

    render: function() {
      if (false) // !this.prosp.display
        return(<div></div>);
      
      var stopCodes = [];
      this.props.stops.forEach(function(stop) {
        stopCodes[stop.id] = stop.code;
      });

      return(
        <div>
          <StopDepartureList 
          entry={this.state.rows} 
          stopCodes={stopCodes} 
          routeKeysSeen={this.props.routeKeysSeen}
          stopIndex={this.props.stopIndex}
          filterDuplicates={this.props.filterDuplicates} >
            <StopHeader stop={this.props.stops[0]} location={this.props.location} />
          </StopDepartureList>
        </div>
        );
    }
  });

  var StopDisplayList = React.createClass({
    getInitialState: function() {
      return {
        routeKeysSeen: {}
      };
    },

    addRouteKey: function(key, index) {
      var routeKeysSeen = this.state.routeKeysSeen;
      if (key in routeKeysSeen && routeKeysSeen[key] <= index)
        return;
      routeKeysSeen[key] = index;
      this.setState({routeKeysSeen: routeKeysSeen});
    },

    componentWillReceiveProps: function(newProps) {
      this.setState({routeKeysSeen: {}});
    },

    render: function() {
      var stops = [];
      var stopObjs = {};

      this.props.stops.forEach(function(stop) {
        if ("dist" in stop) {
          stop.distance = stop.dist;
        } else {
          stop.distance = distance(this.props.location[0], this.props.location[1], stop.lat, stop.lon);
        }
        if (stop.name in stopObjs) {
          stops[stopObjs[stop.name]].push(stop);
          // Keep stops in order so that nearest is first
          stops[stopObjs[stop.name]].sort(function(a, b) {
            return a.distance - b.distance;
          });
        } else {
          stopObjs[stop.name] = stops.length;
          stops[stopObjs[stop.name]] = [stop];
        }
      }, this);
      
      // Sort stops based on nearest stop
      stops.sort(function(a, b) {
        return a[0].distance - b[0].distance;
      });

      var stopComponents = [];

      stops.forEach(function(stop, i) {
        if (i > 4)
          return;
        stopComponents.push(<StopDisplay 
          key={stop[0].name} 
          stops={stop} 
          location={this.props.location} 
          routeKeysSeen={this.state.routeKeysSeen}
          addRouteKey={this.addRouteKey}
          stopIndex={i}
          filterDuplicates={true} />);
      }, this);
      return (
        <div>{stopComponents}</div>
      );
    }
  });

  return {"StopDisplayList": StopDisplayList};

});