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
 * Created by David on 11/8/16.
 */

var DEBUG = false;

var entity_types = {
  'City': 'city',
  'Person': 'city',
  'StateOrCounty': 'state'
};

var city_abbrevs = {
  'LA': 'Los Angeles',
  'NYC': 'New York City',
  'VEGAS': 'Las Vegas',
  'DC': 'Washington'
};

module.exports = {

  update_context: function(payload, extracted, callback) {

    if (extracted.dates && extracted.dates.length > 0) {  // if we found at least one date,
      if (DEBUG) console.log(extracted.dates);
      var date = extracted.dates[0].date.substring(0, 8);  // extract only the date
      payload.context.date = date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6, 8); // add in the dashes
    }

    var new_entities = {};
    for (var i in extracted.entities) {
      var entity = extracted.entities[i];
      if (entity.type in entity_types && !(entity_types[entity.type] in new_entities))
        new_entities[entity_types[entity.type]] = entity.text;
    }

    // if we switched cities, clear the state.
    if (payload.context.state && new_entities.city != payload.context.city)
      payload.context.state = null;

    // if we switched states, clear the city.
    if (payload.context.city && !payload.context.asked_state && new_entities.state != payload.context.state)
      payload.context.city = null;

    if (new_entities.state) {
      payload.context.state = new_entities.state;
      if (new_entities.city) {
        payload.context.city = new_entities.city;
      }
    } else if (new_entities.city) {
      payload.context.city = new_entities.city;
    }
    if (payload.context.asked_state)
      payload.context.asked_state = false;

    // TODO: payload.alchemy_entities = extracted;

    if(payload.context.city && payload.context.city.toUpperCase() in city_abbrevs){
      payload.context.city = city_abbrevs[payload.context.city.toUpperCase()];
    }

    if (DEBUG) {
      console.log("\nNew Context:");
      console.log(payload.context);
    }
    callback(payload);
  }
  
};
