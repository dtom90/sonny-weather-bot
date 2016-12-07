/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Created by David Thomason
 */

var exports = module.exports = {};

var weatherUtil = require('./../lib/weatherUtil'); // Require the Weather Underground Util
var WU_API_KEY = process.env.WEATHER_UNDERGROUND_API_KEY || null; // Get Weather Underground API key from the .env file
var DEBUG = false;
var DEBUG_UTIL = false;

exports.handle_message = function(data, next) {

  if (data.output.action == 'get_weather')             // if Watson Conversation set output.action to 'get_weather',

  // then make a weather request using the JSON data, and get the response text, speech, and images to display
    makeWeatherRequest(data, function(responseText, responseSpeech, image_url) {
      // if(DEBUG) console.log(responseText);

      /**
       * We can display multiple separate text lines in the app,
       * so set data.output.text to be an array of strings
       * if the responseText is already an array, then just set that to be the output
       * else if the responseText is a string:
       *  - take the last element from data.output.text (Which states the intent and entities that Watson Conversation inferred)
       *  - and tack on responseText so that those two lines are displayed in the chat response
       */
      if (responseText instanceof Array) data.output.text = responseText;
      else data.output.text = [responseText];

      data.output.speech = responseSpeech || responseText;
      if (data.output.speech instanceof Array) data.output.speech = data.output.speech.join('. ');

      if(image_url) data.output.image = image_url;

      next(null, data); // respond with the JSON data
    });
  else {                                                              // if we are not yet ready to get the weather, (i.e. still in the dialog)
    data.output.text = data.output.text[data.output.text.length - 1];   // then set the output to be the last element in the array of output text strings
    next(null, data);                                                     // and respond with the JSON data
  }
};

/**
 * Function to make the weather request
 * @param {HashMap} data: contains the parameters to be used in the weather request, contained in the context field
 * @param {Function} callback: to be called when we have the response from the weather util
 */
function makeWeatherRequest(data, callback) {

  if(data.context.city instanceof Array)
    data.context.city = data.context.city[data.context.city.length-1].value;  // set the city to be the value of the last element in the array

  if (data.context.state && data.context.state instanceof Array){
    var state = null;
    var state_city_mismatches = data.context.state.filter(function (x){ return x.value != data.context.city });  // get the number of states that do not match the city
    if(state_city_mismatches.length > 0)
      state = state_city_mismatches[state_city_mismatches.length-1].value;
    else {
      var state_city_matches = data.context.state.filter(function (x){ return x.value == data.context.city });  // get the number of states that match the city
      if(state_city_matches.length >= 2)
        state = state_city_matches[state_city_matches.length-1]; // set the state to be the value of the last element in the array
    }
    data.context.state = state;
  }

  // set the last line of the output text ("<Condition> in ") to include the updated city and state
  if(data.context.city) data.output.text[data.output.text.length - 1] += data.context.city;
  if(data.context.state) data.output.text[data.output.text.length - 1] += ' the state of '+data.context.state;

  // make the weather request
  if (DEBUG) console.log("\nMaking weather request for " + data.context.condition + "," + data.context.city + "," + data.context.state + "," + data.context.date);
  weatherUtil.makeWeatherRequest(WU_API_KEY, data.context.condition, data.context.city, data.context.state, data.context.date, DEBUG_UTIL,
    function(weather_reply, state) {                      // callback function called from the weatherUtil
      if(weather_reply.error){
        console.error(weather_reply.error);
        callback("I'm sorry, I had some trouble looking up the weather. Please try again.");
      }
      else {

        if (weather_reply.ask) {                       // if we need to ask the user a question
          data.context.asked_state = true;              // set the asked_state context varaible to true
          data.output.autoMic = true;                   // automatically turn mic on
          // data.context.options = weather_reply.options; // set the options of what to ask (TODO: use in Watson Conversation Dialog)
          callback(weather_reply.ask, [weather_reply.ask[0],weather_reply.ask[2]]); // call the callback function with the output text (weather_reply.ask)

        } else {                                      // if don't need to ask a question,
          if (data.context.state) data.context.state = null; // forget the state
          callback(weather_reply.tell, null, weather_reply.image);                 // call the callback function with the output text (weather_reply.tell)
        }

      }
    });
}
