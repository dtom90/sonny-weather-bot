require('dotenv').config();

const request = require('superagent');

const BASE_URL = 'api.openweathermap.org/data/2.5/weather';
const API_KEY = process.env.OPEN_WEATHER_API_KEY;

const getWeather = async (cityName) => {
  try {
    const {body} = await request.get(BASE_URL)
      .query({
        q: cityName,
        units: 'metric',
        appid: API_KEY
      });
    return body;
  } catch (e) {
    throw e;
  }
};

const composeResponse = (weather, context) => {
  if (context.condition === 'Weather') {
    return `The weather in ${context.city} is currently ${weather.weather[0].description} with a temperature of ${Math.round(weather.main.temp)} degrees Celsius`;
  } else if (context.condition === 'Rain' || context.condition === 'Snow') {
    const conditionKey = context.condition.toLowerCase();
    if (weather.rain) {
      return `The ${conditionKey} in ${context.city} has been ${weather[conditionKey]['1h']} mm in the past hour`;
    } else {
      return `It does not appear to be ${conditionKey}ing in ${context.city} at the moment.`;
    }
  }
  return 'I\'m sorry, I did not recognize the condition ' + context.condition;
};

module.exports = {
  getWeather,
  composeResponse
};
