require('dotenv').config();

const request = require('superagent');

const BASE_URL = 'api.openweathermap.org/data/2.5/weather';
const API_KEY = process.env.OPEN_WEATHER_API_KEY;

const getWeather = async (cityName) => {
  try {
    const {body} = await request.get(BASE_URL)
      .query({
        q: cityName,
        appid: API_KEY
      });
    return body;
  } catch (e) {
    throw e;
  }
};

const composeResponse = (weather, context) => {
  if (context.condition === 'Weather') {
    return `The weather in ${context.city} is currently ${weather.weather[0].description} with a temperature of ${Math.round(weather.main.temp - 273.15)} degrees Celsius`;
  } else if (context.condition === 'Rain') {
    if (weather.rain) {
      return `The rain in ${context.city} has been ${weather.rain['1h']} in the past hour`;
    } else {
      return `It does not appear to be raining in ${context.city} at the moment.`;
    }
  }
  return 'I\'m sorry, I did not recognize the condition ' + context.condition;
};

module.exports = {
  getWeather,
  composeResponse
};
