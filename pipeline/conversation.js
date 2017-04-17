/**
 * Created by David Thomason on 3/13/17.
 */

const DEBUG = process.env.DEBUG=='true' || false;

let express = require('express'),
  extend = require('util')._extend,
  router = express.Router(), // eslint-disable-line new-cap
  vcapServices = require('vcap_services'),
  watson = require('watson-developer-cloud');

// local module requires
const alchemy = require('./alchemy'),
  context_manager = require('./context_manager'),
  fulfillment = require('./fulfillment'),
  database = require('./database.js');

// Set Conversation Service config
let conversationConfig = extend({
  username: process.env.CONVERSATION_USERNAME || null,
  password: process.env.CONVERSATION_PASSWORD || null,
  version_date: '2016-09-20',
  version: 'v1'
}, vcapServices.getCredentials('conversation'));

// Set the conversation Workspace ID
let workspace_id = process.env.WORKSPACE_ID || null;

// Create the service wrapper
let conversation;
if (conversation_vars_set()) {
  try {
    conversation = new watson.ConversationV1({
      // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
      // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
      // username: '<username>',
      // password: '<password>',
      version_date: watson.ConversationV1.VERSION_DATE_2017_02_03,
      version: 'v1'
    });
  } catch (e) {
    console.error(e);
  }
} else {
  console.log('Using Workspace ID ' + workspace_id);
}

router.post('/', function (req, res) {
  if (!conversation_vars_set()) {
    return res.json({'output': {'text': 'Oops! It doesn\'t look like I have been configured correctly...'}});
  }

  let payload = {
    workspace_id: workspace_id,
    context: {}
  };
  if (req.body) {
    if (req.body.input) {
      payload.input = req.body.input;
      payload.input.text = payload.input.text.trim();
    }
    if (req.body.context) {
      // The client must maintain context/state
      payload.context = req.body.context;
    }
  }

  if (DEBUG) {
    console.log("\nInitial Payload:");
    console.log(payload);
  }

  //TODO: make this a waterfall
  alchemy.extract_entities(payload, function(extracted) {

    if (DEBUG) {
      console.log("\nEntities Extracted by AlchemyLanguage:");
      console.log(extracted);
    }

    context_manager.update_context(payload, extracted, function(payload) {

      if (DEBUG) {
        console.log("\nWatson Conversation Payload:");
        console.log(payload);
      }

      // Send the input to the conversation service
      conversation.message(payload, function(err, data) {

        if (err) {
          console.error('\nWatson Conversation Service Error:');
          console.error(err);

        } else {

          database.store(new_payload, data);

          if (DEBUG) {
            console.log('\nWatson Conversation Output:');
            console.log(data);
          }

          fulfillment.handle_message(data, function(err, result) {
            if (err) {
              console.error('\nFulfillment Error:');
              console.error(err);
            } else
              return res.json(result);
          });
        }
      });
    });
  });
});

function conversation_vars_set() {
  const err_msg = 'Missing Conversation Service Var! Please set CONVERSATION_VAR';
  const ext_msg = ' or connect your Bluemix app to a Conversation Service instance.';
  let correct = true;
  if (!conversationConfig.username) {
    console.error(err_msg.replace('Var', 'Username').replace('CONVERSATION_VAR', 'CONVERSATION_USERNAME') + ext_msg);
    correct = false;
  }
  if (!conversationConfig.password) {
    console.error(err_msg.replace('Var', 'Password').replace('CONVERSATION_VAR', 'CONVERSATION_PASSWORD') + ext_msg);
    correct = false;
  }
  if (!workspace_id) {
    console.error(err_msg.replace('Var', 'Workspace ID').replace('CONVERSATION_VAR', 'WORKSPACE_ID'));
    correct = false;
  }
  return correct;
}

module.exports = router;
