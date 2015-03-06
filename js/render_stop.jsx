/** @jsx React.DOM */

define(function(require) {
  var React = require('react'),
      moment = require('moment'),
      favorites = require('favorites'),
      position_callback = require('position_callback');

      L = require('leaflet');

  var getKeyforRow = function(row) {
    return "" + row.pattern.shortName + (row.pattern.direction ? row.pattern.direction : row.pattern.longName.replace(/^.*--/, ""))
  };

  var StopDepartureTime = React.createClass({
    render: function() {
      if (this.props.entry == undefined)
        return (
          <span>
            ---
          </span>
          );
      var now = moment() / 1000;
      var departureTime = this.props.entry.serviceDay + this.props.entry.realtimeDeparture;
      if (departureTime - now > 20 * 60 || departureTime - now <= -60) // if time's far away or was minutes ago
        return (
          <span>
            {(this.props.entry.realtime ? "" : "~") + moment(departureTime * 1000).format(" HH:mm")}
          </span>
          ); // display absolute time
      else
        return (
          <span>
            {(this.props.entry.realtime ? "" : "~") + ((departureTime - now) / 60 | 0) + "min"}
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
      var filtered = [];
      var routeIdSeen = this.props.routeIdSeen || [];
      if (this.props.displayHeader) {
        rows.push(<StopDepartureHeader key="header"/>);
        num_rendered++;
      }

      // Filter out patterns with matching short name and destination
      for (var j = 0; j < this.props.entry.length; j++) {
        if (j2 in filtered)
          continue;
        var entry = this.props.entry[j];
        var key1 = getKeyforRow(entry);
        if (~routeIdSeen.indexOf(key1))
          continue;
        for (var j2 = j+1; j2 < this.props.entry.length; j2++) {
          var key2 = this.props.entry[j2];
          if (key1 == key2) {
            Array.prototype.push.apply(entry.times, this.props.entry[j2]);
            filtered.push(j2);
            continue
          }
        }
        entries.push(entry);
      }

      entries.forEach(function(row) {
        var key = getKeyforRow(row);
        rows.push(<StopDepartureRow key={key} entry={row} odd={num_rendered % 2 ? '' : ' odd'} stopCodes={this.props.stopCodes} />);
        num_rendered++;
      }, this);
      return (<div>{rows}</div>);
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
    render: function() {
      if (!this.props.display)
        return(<div></div>);
      var test = <div />;
      return(
        <div>
          <StopHeader stop={this.props.stop} location={this.props.location} />
          <small className="lahdotgroup">
            <StopDepartureList 
            entry={this.props.stop.rows} 
            displayHeader={this.props.displayHeader} 
            stopCodes={this.props.stopCodes} 
            routeIdSeen={this.props.routeIdSeen}
            filterDuplicates={this.props.filterDuplicates} />
          </small>
        </div>
        );
    }
  });

  var StopDisplayList = React.createClass({
    render: function() {
      var stops = [];
      var routeIdSeen = [];
      var showHeader = true;
      this.props.stops.forEach(function(stop) {
        stops.push(<StopDisplay 
          key={stop.id} 
          stop={stop} 
          display={stop.display} 
          location={this.props.location} 
          displayHeader={showHeader}
          stopCodes={this.props.stopCodes} 
          routeIdSeen={routeIdSeen}
          filterDuplicates={true} />);
        if (stop.display) {
          showHeader = false;
        }
        stop.rows.forEach(function(row) {
          //routeIdSeen.push(getKeyforRow(row));
        }, this );
      }, this);
      return (
        <div>{stops}</div>
      );
    }
  });

  return {"StopDepartureList": StopDepartureList,
          "StopDisplayList": StopDisplayList};

});