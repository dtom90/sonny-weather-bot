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

module.exports = {
  getWeather
};
