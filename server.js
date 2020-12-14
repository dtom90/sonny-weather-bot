const {assistantServer, handler} = require('hello-watson');
const {getWeather, composeResponse} = require('./lib/openWeatherClient');

const PORT = process.env.PORT || 3000;

const postProcess = async (result) => {
  const context = result.context.skills['main skill'].user_defined;
  if (context && context.condition && context.city) {
    try {
      const weather = await getWeather(context.city);
      
      result.output.generic.push({
        response_type: 'text',
        text: composeResponse(weather, context)
      });
    } catch (e) {
      result.output.generic.push({
        response_type: 'text',
        text: `I'm sorry, I could not find weather conditions for ${context.city}.`
      });
    }
  }
};

assistantServer(postProcess).listen(PORT, handler(PORT));
