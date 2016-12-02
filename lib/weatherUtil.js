/**
 Copyright 2016 IBM. All Rights Reserved.
 Developer: David Thomason
 */

var http = require('http');
var locationUtil = require('./locationUtil'), dateUtil = require('./dateUtil');

/**
 * Provides weather utility to send a request to the Weather Underground
 * and receive get a textual response
 */
var weatherUtil = (function() {

  return {

    /**
     * Uses Weather Underground API, documented: https://www.wunderground.com/weather/api
     *
     * Given, e.g.:
     * WU_API_KEY = <your weather underground API key>
     * condition = "Weather"
     * city = "San Francisco"
     * state = "California" (or "" or null)
     * date = "2016-05-28" (or "current")
     * debug = true or false, prints some stdio.log statements
     * callback = your callback function, which handles the responses like:
     *   { tell: 'the weather in San Francisco California on Wednesday..' }
     *   { ask: 'Which state?' }
     *
     */
    makeWeatherRequest: function(WU_API_KEY, condition, city, state, date, debug, callback) {
      // Clean up city, state and date input parameters
      condition = condition || 'Weather';

      if (state){
        state = state.toProperCase();
        if (!city) city = locationUtil.getProbableCity(state.toProperCase());
      }
      if (!city)
        callback({ask: 'Which city'+ state ? ' in ' + state  : '' + ' are you interested in?'});

      else {

        city = city.toProperCase();
        var city_param = locationUtil.formatCity(city);
        if (debug) console.log(city_param);

        date = date || 'current';
        var dateObject = date;
        if (!date.dataFeature) dateObject = dateUtil.getDateObject(date);
        if (dateObject.error) weatherResponseCallback(callback, new Error(dateObject.error));
        else {

          if (debug) console.log(dateObject);

          var original_state = state;
          state = locationUtil.getProbableState(city, state);
          if (debug) console.log("Probable State = " + state);

          // Construct the URL from the input parameters

          var endpoint = 'http://api.wunderground.com/api/' + WU_API_KEY + '/';
          var query = '/q/';
          if (state){
            if (debug) console.log("state is "+state);
            query += locationUtil.getStateAbbrev(state) + '/';
          }
          query += city_param + '.json';

          var url = endpoint + dateObject.dataFeature + query;
          if (debug) console.log('URL = ' + url);

          // Perform the HTTP Get request

          http.get(url, function(response) {

            var weatherResponseString = '';

            if (response.statusCode != 200) {
              // stdio.log("Weather Underground Status Code Error: " + response.statusCode);
              // stdio.log('Response: ' + response);
              weatherResponseCallback(callback, new Error("I'm sorry, but the Weather Underground request returned a non-200 Response"));
            }

            response.on('data', function(data) {
              weatherResponseString += data;
            });

            response.on('end', function() {
              var weatherResponseObject = JSON.parse(weatherResponseString);
              var interpretation = interpretResponse(weatherResponseObject, city, original_state);
              if (interpretation.error) weatherResponseCallback(callback, new Error(interpretation.error));
              else weatherResponseCallback(callback, null, interpretation, condition, city, state, dateObject, WU_API_KEY, debug);
            });
          }).on('error', function(e) {
            // stdio.log("Communications error: " + e.message);
            weatherResponseCallback(callback, new Error("I'm sorry, but there was a communication error with the Weather Underground."));
          });
        }
      }
    }
  };
})();

/**
 * Returns an object with status and appropriate data
 * Used to perform the next step in the weatherResponseCallback function
 */
function interpretResponse(weatherResponseObject, city, state) {

  if (weatherResponseObject.response.error) {
    // stdio.log("Weather Underground API error: " + weatherResponseObject.response.error);
    var msg = weatherResponseObject.response.error.description;
    if (weatherResponseObject.response.error.type == "querynotfound") msg += " for " + city;
    if (weatherResponseObject.response.error.type == "keynotfound") msg = "Please provide a Weather Underground API key.";
    return {error: msg};
  } else {

    if (weatherResponseObject.current_observation) {
      return {
        status: 'successful',
        state: weatherResponseObject.current_observation.display_location.state,
        current: weatherResponseObject.current_observation
      };
    } else if (weatherResponseObject.forecast) {
      return {
        status: 'successful',
        forecast: weatherResponseObject.forecast
      };
    }
    else {
      var us_cities = weatherResponseObject.response.results.filter(function(result) {
        return result.country == 'US'
      });
      if (us_cities.length == 1) {
        if (us_cities[0].city == city) {
          return {
            status: 'redo',
            state: us_cities[0].state
          }
        } else {
          var err_msg = 'No citites match your search for ' + city;
          if (state) err_msg += ', ' + state;
          return {error: err_msg};
        }

      } else {
        return {
          status: 'multiple_us_cities',
          us_cities: us_cities
        };
      }
    }
  }
}

function weatherResponseCallback(callback, error, weatherResponse, condition, city, state, date, WU_API_KEY, debug) {
  var weatherReply;
  if (error) {
    callback({error: error.message});
  } else {

    if (weatherResponse.status == 'successful') {

      if (!state && weatherResponse.current) {
        state = weatherResponse.state;
      } else if (!state) {
        state = '';
      }

      var displayCondition = (condition == 'UV') ? condition : condition.toLowerCase();
      if (condition == 'UV') displayCondition += " index";
      else if (condition == 'FeelsLike') displayCondition = 'temperature';
      // feels like cannot be forecast, but the temperature

      if ((condition == 'Rain' || condition == 'Snow') && weatherResponse.current) weatherReply = 'In '+city;
      else weatherReply = "The " + displayCondition + " in " + city;
      if (state) weatherReply += ", " + locationUtil.getStateName(state);

      if (!((condition == 'UV' && weatherResponse.forecast) || (condition=='Rain' && weatherResponse.current))) {
        if (condition == 'FeelsLike' && weatherResponse.current) weatherReply += ' currently ';
        else weatherReply += date.displayDate;
      }

      var forecast;
      if (weatherResponse.forecast && condition != 'Weather') {
        forecast = weatherResponse.forecast.simpleforecast.forecastday.filter(function(day) {
          return day.date.year == date.year && day.date.month == date.month && day.date.day == date.day;
        })[0];
        // stdio.log(forecast);
      }
      switch (condition) {
        case 'Weather':
          if (weatherResponse.current) {
            weatherReply += weatherResponse.current.weather;
            weatherReply += " and the temperature is " + weatherResponse.current.temp_f + " degrees Fahrenheit";
          } else {
            forecast = weatherResponse.forecast.txt_forecast.forecastday.filter(function(day) {
              return day.period == date.period;
            })[0];
            // stdio.log(forecast);
            var weather = forecast.fcttext;
            weather = weather.replace(/([0-9]*)F/g, '$1 degrees Fahrenheit');
            weather = weather.replace(/Winds ([A-Z]*)/g, replaceCardinalPoint);
            weatherReply += weather;
          }
          break;
        case 'Temperature':
          if (weatherResponse.current) {
            weatherReply += weatherResponse.current.temp_f + " degrees Fahrenheit";
          } else {
            weatherReply += "a high of " + forecast.high.fahrenheit + " degrees fahrenheit";
            weatherReply += " and a low of " + forecast.low.fahrenheit + " degrees fahrenheit";
          }
          break;
        case 'Rain':
          if (weatherResponse.current) {
            weatherReply += //weatherResponse.current.weather +
              " there has been " + parseFloat(weatherResponse.current.precip_1hr_in) + " inches of rain in the past hour"
          } else
            weatherReply += parseFloat(forecast.qpf_allday.in) + " inches.";

          break;
        case 'Snow':
          if (weatherResponse.current) {
            weatherReply += weatherResponse.current.weather;
            if (weatherResponse.current.weather.toLowerCase().indexOf('snow') < 0) weatherReply += ' so there is no snow.';
          } else {
            weatherReply += parseFloat(forecast.snow_allday.in) + " inches.";
          }
          break;
        case 'UV':
          if (weatherResponse.current) {
            var uv_index = Number(weatherResponse.current.UV);
            weatherReply += uv_index + ' which is ' + getRisk(uv_index) + ' risk';
          } else weatherReply += " cannot be forecast, but the weather will be " + forecast.conditions + ".";
          break;
        case 'Wind':
          if (weatherResponse.current) weatherReply += weatherResponse.current.wind_string;
          else weatherReply += "from the " + SPOKEN_CARDINAL_POINT[forecast.avewind.dir] + " at " + forecast.avewind.mph + " gusting to " + forecast.maxwind.mph + " mph.";
          break;
        case 'Humidity':
          if (weatherResponse.current) weatherReply += weatherResponse.current.relative_humidity;
          else weatherReply += forecast.avehumidity + "%.";
          break;
        case 'FeelsLike':
          if (weatherResponse.current) weatherReply += 'feels like ' + weatherResponse.current.feelslike_f + ' degrees Fahrenheit.';
          else {
            weatherReply += "a high of " + forecast.high.fahrenheit + " degrees fahrenheit";
            weatherReply += " and a low of " + forecast.low.fahrenheit + " degrees fahrenheit";
            weatherReply += " but I cannot yet tell you exactly what it will feel like."
          }
          break;
      }
      callback({
        tell: weatherReply,
        image: weatherResponse.current ? weatherResponse.current.icon_url : forecast.icon_url
      }, locationUtil.getStateName(state));

    } else if (weatherResponse.status == 'redo') {
      state = weatherResponse.state;
      if (debug) console.log('redoing for ' + city + ', ' + state);
      weatherUtil.makeWeatherRequest(WU_API_KEY, condition, city, state, date, debug, callback);

    } else if (weatherResponse.status == 'multiple_us_cities') {
      if (debug) {
        console.log("Got " + weatherResponse.us_cities.length + " cities " + " named " + city + " in the US.");
        console.log(weatherResponse.us_cities);
      }
      var state_names = [], state_abbrevs = [];
      weatherResponse.us_cities.forEach(function(city) {
        state_names.push(locationUtil.getStateName(city.state));
        state_abbrevs.push(city.state);
      });
      var state_string = "";
      for (var i = 0; i < state_names.length; i++) {
        state_string += state_names[i] + " (" + state_abbrevs[i] + ")";
        if (i < state_names.length - 1) state_string += ", "
      }
      callback({
        ask: ["I found " + state_names.length + " states with a city named " + city + ":", state_string, "Which state are you interested in?"],
        options: state_names
      });
    } else {
      console.log(weatherResponse);
    }
  }
}

/**
 * Returns risk factor from UV index
 */
function getRisk(uv_index) {
  if (uv_index < 3) return 'low';
  else if (uv_index < 6) return 'moderate';
  else if (uv_index < 8) return 'high';
  else if (uv_index < 11) return 'very high';
  else return 'extreme';
}

function replaceCardinalPoint(match, p1, offset, string) {
  if (p1 in SPOKEN_CARDINAL_POINT) return 'Winds ' + SPOKEN_CARDINAL_POINT[p1];
  else return match;
}

var SPOKEN_CARDINAL_POINT = {
  'N': 'North',
  'NNE': 'North-northeast',
  'NE': 'Northeast',
  'ENE': 'East-northeast',
  'E': 'East',
  'ESE': 'East-southeast',
  'SE': 'Southeast',
  'SSE': 'South-southeast',
  'S': 'South',
  'SSW': 'South-southwest',
  'SW': 'Southwest',
  'WSW': 'West-southwest',
  'W': 'West',
  'WNW': 'West-northwest',
  'NW': 'Northwest',
  'NNW': 'North-northwest'
};

String.prototype.toProperCase = function() {
  return this.replace(/\w\S*/g, function(txt) {
    if(txt.toLowerCase() == 'of') return txt;
    else return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

module.exports = weatherUtil;