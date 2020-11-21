const {assistantServer, handler} = require('hello-watson');
const {getWeather} = require('./lib/openWeatherClient');

const PORT = 3000;

const postProcess = async (result) => {
  const context = result.context.skills['main skill'].user_defined;
  if (context && context.condition && context.city) {
    const weather = await getWeather(context.city);
    
    let weatherResponse;
    if (context.condition === 'Weather') {
      weatherResponse = `The weather in ${context.city} is currently ${weather.weather[0].description} with a temperature of ${Math.round(weather.main.temp - 273.15)} degrees Celsius`;
    } else {
      weatherResponse = 'I\'m sorry, I did not recognize the condition ' + context.condition;
    }
    
    result.output.generic.push({
      response_type: 'text',
      text: weatherResponse
    });
  }
};

assistantServer(postProcess).listen(PORT, handler(PORT));
