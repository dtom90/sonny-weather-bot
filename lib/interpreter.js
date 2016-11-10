var weatherUtil = require('./weatherUtil');
var WU_API_KEY = 'b6f5c55d08f5b9ae';

var DEBUG = false;
var DEBUG_UTIL = false;

var condition, city, state, date;
var asked_city, asked_state = false;

/**
 * Interprets JSON response from Watson Conversation service
 * and then makes the appropriate request to the Weather Underground API
 */
var interpreter = (function () {
	return {
		
		/**
	     * Interpret the output (intents & entities) from the Watson Conversation Service,
	     * Perform any necessary operations (e.g. Weather Underground API calls),
	     * Update the output text of the response object with the appropriate reply
	     */
        interpretResponse: function(response, callback) {
        	if(DEBUG) console.log(JSON.stringify(response, null, 2));
			
        	var intent, weatherIntent;
        	
        	if(asked_state){
        		state = response.input.text;
        		asked_state = false;
        		makeWeatherRequest(callback);
        	} else if(asked_city){
				city = response.input.text;
        		asked_city = false;
        		makeWeatherRequest(callback);
			} else {
        		
        		if (response.intents && response.intents[0]) {
            		
            		// Get the utterance-based intent & entities
        			intent = response.intents[0].intent;
                    if(DEBUG) console.log('Intent = '+intent);
                    
                    weatherIntent = (intent != 'SmallTalkGreeting' && intent != 'SmallTalkFarewell');
                    if(weatherIntent) condition = intent;
            	}
            	
            	if((response.entities && response.entities[0]) || (intent && weatherIntent)) {
            		var extracted_city, extracted_state, extracted_date = '';
                    
                    if(response.entities){
                        var extracted_cities = response.entities.filter(function(x) { return x.entity == 'city'; });
                        extracted_city = '';
                        for (var i = 0; i < extracted_cities.length; i++)
                        	if(extracted_cities[i].value.length > extracted_city.length) extracted_city = extracted_cities[i].value;
                        
                        extracted_state = response.entities.filter(function(x) { return x.entity == 'state'; })[0];
                        extracted_date = response.entities.filter(function(x) { return x.entity == 'date'; })[0];
                    }
                    
                    var prev_city = city;
                    city = extracted_city || city;
					
					if(extracted_state) state = extracted_state.value;
					else if(city != prev_city) state = null;
					
					if(extracted_date) extracted_date = extracted_date.value;
					date = extracted_date || 'current';

                    if(!city) {
						asked_city = true;
						callback('Which city are you interested in?');
					} else
                    	makeWeatherRequest(callback);
                    
            	} else
            		callback(response.output.text);
        	}
        }
	}
})();

function makeWeatherRequest(callback){
	weatherUtil.makeWeatherRequest(WU_API_KEY, condition, city, state, date, DEBUG_UTIL, function(weather_reply){
        if(weather_reply.ask){
        	asked_state = true;
        	callback(weather_reply.ask);
        }
        else callback(weather_reply.tell);
    });
}

module.exports = interpreter;