require('dotenv').config();

const request = require('superagent');

const BASE_URL = 'api.openweathermap.org/data/2.5/weather';

class OpenWeatherClient {
  
  constructor() {
    this.apiKey = process.env.OPEN_WEATHER_API_KEY;
  }
  
  async getWeather(cityName) {
    console.log(cityName);
    console.log({
      q: cityName,
      appid: this.apiKey
    });
    try {
      const {body} = await request.get(BASE_URL)
        .query({
          q: cityName,
          appid: this.apiKey
        });
      return body;
    } catch (e) {
      throw e;
    }
  }
}

const client = new OpenWeatherClient();
(async () => {
  const weather = await client.getWeather('New York');
  console.log(weather);
})();
