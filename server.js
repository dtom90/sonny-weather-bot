const {assistantServer, handler} = require('hello-watson');

const PORT = 3000;

const postProcess = (result) => {
  if (result.context.skills['main skill'].user_defined) {
    result.output.generic.push({
      response_type: 'text',
      text: Object.entries(result.context.skills['main skill'].user_defined).map(([k, v]) => k + ': ' + v).join(', ')
    });
  }
};

assistantServer(postProcess).listen(PORT, handler(PORT));
