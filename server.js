const {assistantServer, handler} = require('hello-watson');

const PORT = 3000;

const postProcess = (result) => {
  if (result.output.intents.length > 0) {
    result.output.generic.unshift({
      response_type: 'text',
      text: result.output.intents[0].intent
    });
  }
};

assistantServer(postProcess).listen(PORT, handler(PORT));
