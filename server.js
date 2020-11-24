const {assistantServer, handler} = require('hello-watson');
const {getWeather, composeResponse} = require('./lib/openWeatherClient');

const PORT = 3000;

const postProcess = async (result) => {
  const context = result.context.skills['main skill'].user_defined;
  if (context && context.condition && context.city) {
    const weather = await getWeather(context.city);
    
    const weatherResponse = composeResponse(weather, context);
    
    result.output.generic.push({
      response_type: 'text',
      text: weatherResponse
    });
  }
};

assistantServer(postProcess).listen(PORT, handler(PORT));
