/** @jsx React.DOM */

define(function(require) {
	var React = require('react'),
			moment = require('moment');


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
	    return (
	      <div className={"row " + this.props.odd}>
          <div className={"col-xs-2 text-right" + (this.props.entry.route === focus_route_name ? ' emphasis' : '')}>
            {this.props.entry.pattern.shortName ? this.props.entry.pattern.shortName : ""}
          </div>
          <div className="col-xs-2 text-right">
            <StopDepartureTime entry={this.props.entry.times[0]} />
          </div>
          <div className='col-xs-2 text-right'>
            <StopDepartureTime entry={this.props.entry.times[1]} />
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

			if (this.props.firstRow) {
				rows.push(<StopDepartureHeader />);
				num_rendered++;
			}
			this.props.entry.forEach(function(row) {
				rows.push(<StopDepartureRow entry={row} odd={num_rendered % 2 ? '' : ' odd'} stopCodes={this.props.stopCodes} />);
				num_rendered++;
			}, this);
			return (<div>{rows}</div>);


		}
	});

	return {"StopDepartureList": StopDepartureList};

});