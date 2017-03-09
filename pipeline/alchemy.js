/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Created by David Thomason on 11/1/16.
 */

// Imports
var watson = require('watson-developer-cloud'),
  vcapServices = require('vcap_services'),
  extend = require('util')._extend,
  async = require('async');

// Alchemy Language API
var alchemy_language = watson.alchemy_language(extend({
  api_key: process.env.ALCHEMY_LANGUAGE_API_KEY
}, vcapServices.getCredentials('alchemy_api')));

// Exports
var exports = module.exports = {};

// Pipeline for the various stages of NLP
var pipeline = [
  extract_dates,
  extract_entities
];
var first_function = pipeline[0];

var DEBUG = process.env.DEBUG=='true' || false; // Debug for development

exports.extract_entities = function(payload, finish){

  // Initialize variables
  var text = payload.input.text;
  var extracted = {};

  // // Create the new pipeline
  // var current_pipeline = pipeline.slice();
  // current_pipeline.splice(0, 1, async.apply(first_function, text, extracted));
  //
  // // TODO: make this parallel
  // // Begin the waterfall
  // async.waterfall(current_pipeline, function(err, text, extracted) {
  //   if (err) console.err(err);
  //   finish(extracted);
  // });

  extract_entities(text, extracted, function(err, text, extracted) {
    if (err) console.err(err);
    finish(extracted);
  });
};

function extract_dates(text, extracted, next) {

  if (text) {

    // Set up parameters for API call
    var today = (new Date()).toISOString();
    today = today.substring(0, 10) + ' ' + today.substring(11, 19);
    var parameters = {
      text: text,
      anchorDate: today
    };

    // Call AlchemyLanguage API Date Extractor
    alchemy_language.dates(parameters, function(err, response) {
      if (err) {
        console.err('\nAlchemy Language Date Extractor Error:');
        next(err);
      }
      else {
        extracted.dates = response.dates;
        next(null, text, extracted);
      }
    });
  } else {
    next(null, text, extracted);
  }
}

function extract_entities(text, extracted, next) {

  if (text) {
    alchemy_language.entities({text: text}, function(err, response) {
      if (err) {
        console.err('\nAlchemy Language Entity Extractor Error:');
        next(err);
      }
      else {
        extracted.entities = response.entities;
        if(DEBUG) console.log(extracted);
        next(null, text, extracted);
      }
    });
  } else {
    next(null, text, extracted);
  }
}
