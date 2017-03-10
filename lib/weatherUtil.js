/**
 Copyright 2016 IBM. All Rights Reserved.
 Developer: David Thomason
 */

let http = require('http');
let locationUtil = require('./locationUtil'), dateUtil = require('./dateUtil');

/**
 * Provides weather utility to send a request to the Weather Underground
 * and receive get a textual response
 */
let weatherUtil = (function() {

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
     * debug = true or false, prints some console.log statements
     * callback = your callback function, which handles the responses like:
     *   { tell: 'the weather in San Francisco California on Wednesday..' }
     *   { ask: 'Which state?' }
     *
     */
    makeWeatherRequest: function(WU_API_KEY, condition, city, state, date, debug, callback) {
      // Clean up city, state and date input parameters
      condition = condition || 'Weather';

      if (state){
        // state = state.toProperCase();
        if (!city) city = locationUtil.getProbableCity(state.toProperCase());
      }
      if (!city){
        let in_state = state ? ' in ' + state  : '';
        callback({ask: 'Which city' + in_state + ' are you interested in?'});
      } else {

        city = city.toProperCase();
        let city_param = locationUtil.formatCity(city);
        if (debug) console.log(city_param);

        date = date || 'current';
        let dateObject = date;
        if (!date.dataFeature) dateObject = dateUtil.getDateObject(date);
        if (dateObject.error) weatherResponseCallback(callback, new Error(dateObject.error));
        else {

          if (debug) console.log(dateObject);

          let original_state = state;
          state = locationUtil.getProbableState(city, state);

          // Construct the URL from the input parameters
          let endpoint = 'http://api.wunderground.com/api/' + WU_API_KEY + '/';
          let query = '/q/';
          if (state) query += state + '/';
          query += city_param + '.json';
          let url = endpoint + dateObject.dataFeature + query;
          if (debug) console.log('URL = ' + url);

          // Perform the HTTP Get request
          http.get(url, function(response) {

            let weatherResponseString = '';

            if (response.statusCode != 200)
              weatherResponseCallback(callback, new Error("I'm sorry, but the Weather Underground request returned a non-200 Response"));

            response.on('data', function(data) {
              weatherResponseString += data;
            });

            response.on('end', function() {
              let weatherResponseObject = JSON.parse(weatherResponseString);
              let interpretation = interpretResponse(weatherResponseObject, city, original_state);
              if (interpretation.error) weatherResponseCallback(callback, new Error(interpretation.error));
              else weatherResponseCallback(callback, null, interpretation, condition, city, state, dateObject, WU_API_KEY, debug);
            });
          }).on('error', function(e) {
            console.error(e);
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
    let msg = weatherResponseObject.response.error.description;
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
      let options = weatherResponseObject.response.results;
      let states = [];
      let countries = [];
      for (var i in options) {
        states.push(options[i]['state']);
        countries.push(options[i]['country']);
      }
      if (countries.length == 1) {
        let country_name = options[i]['country_name'];
        return {
          status: 'single_country_multiple_states',
          country_name: country_name,
          options: options
        };
        
      } else {
        return {
          status: 'multiple_countries',
          options: options
        };
      }
    }
  }
}

function weatherResponseCallback(callback, error, weatherResponse, condition, city, state, date, WU_API_KEY, debug) {
  let weatherReply;
  if (error) {
    callback({error: error.message});
  } else {

    if (weatherResponse.status == 'successful') {

      let full_state = state;
      if (weatherResponse.current && weatherResponse.current.display_location){
        city = weatherResponse.current.display_location.city;
        full_state = weatherResponse.current.display_location.state_name;
      }

      let displayCondition = (condition == 'UV') ? condition : condition.toLowerCase();
      if (condition == 'UV') displayCondition += " index";
      else if (condition == 'FeelsLike') displayCondition = 'temperature';
      // feels like cannot be forecast, but the temperature

      if ((condition == 'Weather' || condition == 'Rain' || condition == 'Snow') && weatherResponse.current) weatherReply = 'In '+city;
      else weatherReply = "The " + displayCondition + " in " + city;
      // let full_state = locationUtil.getStateName(state);  && !city.includes(full_state)
      if (full_state) weatherReply += ", " + full_state;

      if ((condition == 'Weather' || condition == 'Snow') && weatherResponse.current) weatherReply += ' it ';
      if (!((condition == 'UV' && weatherResponse.forecast) || (condition=='Rain' && weatherResponse.current))) {
        if (condition == 'FeelsLike' && weatherResponse.current) weatherReply += ' currently ';
        else weatherReply += date.displayDate;
      }

      let forecast;
      if (weatherResponse.forecast && condition != 'Weather') {
        forecast = weatherResponse.forecast.simpleforecast.forecastday.filter(function(day) {
          return day.date.year == date.year && day.date.month == date.month && day.date.day == date.day;
        })[0];
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
            let weather = forecast.fcttext;
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
            let rain_inches = weatherResponse.current.precip_1hr_in;
            rain_inches = rain_inches < 0 ? 0 : rain_inches;  // correct for -999 errors in rain data
            weatherReply += " there has been " + parseFloat(rain_inches) + " inches of rain in the past hour"
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
            let uv_index = Number(weatherResponse.current.UV);
            weatherReply += uv_index + ' which is ' + getRisk(uv_index) + ' risk';
          } else weatherReply += " cannot be forecast, but the weather will be " + forecast.conditions + ".";
          break;
        case 'Wind':
          if (weatherResponse.current){
            weatherReply += weatherResponse.current.wind_string;
            weatherReply = weatherReply.replace(/From the ([A-Z]*)/g, replaceCardinalPoint);
            weatherReply = weatherReply.replace(/\sMPH/g, ' mph');
          }
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
      }, city);

    } else if (weatherResponse.status == 'redo') {
      state = weatherResponse.state;
      if (debug) console.log('redoing for ' + city + ', ' + state);
      weatherUtil.makeWeatherRequest(WU_API_KEY, condition, city, state, date, debug, callback);

    } else if (weatherResponse.status == 'single_country_multiple_states') {
      if (debug) {
        console.log("Got " + weatherResponse.options.length + " cities named " + city + " in "+ weatherResponse.country_name);
      }
      let state_names = [], state_abbrevs = [];
      weatherResponse.options.forEach(function(city) {
        state_names.push(locationUtil.getStateName(city.state));
        state_abbrevs.push(city.state);
      });
      let state_string = "";
      for (let i = 0; i < state_names.length; i++) {
        state_string += state_names[i] + " (" + state_abbrevs[i] + ")";
        if (i < state_names.length - 1) state_string += ", "
      }
      let options = state_names.concat(state_abbrevs);
      for(let i=0;i<options.length;i++){
        if (options[i] !== undefined)
          options[i]=options[i].toLowerCase();
      }
      callback({
        ask: [
          "I found " + state_names.length + " states in "+weatherResponse.country_name+" with a city named " + city + ":",
          state_string,
          "Which state are you interested in?"],
        options: options
      });
    } else if (weatherResponse.status == 'multiple_countries') {
      if (debug) {
        console.log("Got " + weatherResponse.options.length + " cities named " + city + " in the world.");
      }
      let country_names = [], country_abbrevs = [];
      weatherResponse.options.forEach(function(city) {
        country_names.push(city['country_name']);
        country_abbrevs.push(city['country']);
      });
      let country_string = "";
      for (let i = 0; i < country_names.length; i++) {
        country_string += country_names[i] + " (" + country_abbrevs[i] + ")";
        if (i < country_names.length - 1) country_string += ", "
      }
      let options = country_names.concat(country_abbrevs);
      for(let i=0;i<options.length;i++){
        if (options[i] !== undefined)
          options[i]=options[i].toLowerCase();
      }
      callback({
        ask: ["I found " + country_names.length + " countries in the world with a city named " + city + ":",
          country_string,
          "Which country are you interested in?"],
        options: options
      });
    } else
      console.log(weatherResponse);

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

function replaceCardinalPoint(match, p1) {
  let prefix = match.includes('Winds') ? 'Winds ' : 'from the ';
  if (p1 in SPOKEN_CARDINAL_POINT) return prefix + SPOKEN_CARDINAL_POINT[p1];
  else return match;
}

let SPOKEN_CARDINAL_POINT = {
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