/**
 Copyright 2016 IBM. All Rights Reserved.
 Developer: David Thomason
 */

/**
 * Provides date and time utilities to format responses in
 * a manner appropriate for speech output.
 */
let dateUtil = (function() {

  return {

    getDateObject: function(date) {
      if (date == 'current') {
        return {
          today: true,
          displayDate: ' is currently ',
          dataFeature: 'conditions'
        };
      } else {

        let today = new Date();
        today.setUTCDate(today.getDate());
        today.setUTCHours(0);
        today.setUTCMinutes(0);
        today.setUTCSeconds(0);
        today.setUTCMilliseconds(0);

        let target = new Date(today);
        if (date.toLowerCase() == 'tomorrow') {
          target.setUTCDate(today.getUTCDate()+1);
        } else if (date.toLowerCase() == 'yesterday') {
          target.setUTCDate(today.getUTCDate()-1);
        } else if(date.toLowerCase() != 'today'){
          target = new Date(date);
        }

        let diff = (target.valueOf() - today.valueOf())/86400000;

        let dataFeature;
        if (diff > 9) return {error: 'I\'m sorry, I cannot see more than 10 days into the future.'};
        else if (diff > 3) dataFeature = 'forecast10day';
        else if (diff >= 0) dataFeature = 'forecast';
        else return {error: 'I\'m sorry, I cannot yet look at historical conditions.'};

        let displayDate;
        if (diff == 0) displayDate = ' today';
        else displayDate = ' on ' + dateUtil.getFormattedDate(target);

        return {
          today: diff == 0,
          day: target.getUTCDate(),
          month: target.getUTCMonth() + 1,
          year: target.getUTCFullYear(),
          weekday: dateUtil.getWeekdayWithNight(target),
          period: 2 * diff,
          dataFeature: dataFeature,
          displayDate: displayDate + ' is forecast to be '
        };
      }
    },

    getWeekdayWithNight: function(date) {
      return DAYS_OF_WEEK[date.getUTCDay()];
    },

    /**
     * Returns a speech formatted date, without the time. If the year
     * is the same as current year, it is omitted.
     * Example: 'Friday June 12th', '6/5/2016'
     */
    getFormattedDate: function(date) {
      let today = new Date();

      if (today.getUTCFullYear() === date.getUTCFullYear()) {
        return DAYS_OF_WEEK[date.getUTCDay()] + ' ' + MONTHS[date.getUTCMonth()] + ' ' + DAYS_OF_MONTH[date.getUTCDate() - 1];
      } else {
        return DAYS_OF_WEEK[date.getUTCDay()] + ' ' + (date.getUTCMonth() + 1) + '/' + date.getUTCDate() + '/' + date.getUTCFullYear();
      }
    },

    /**
     * Returns a speech formatted time, without a date, based on a period in the day. E.g.
     * '12:35 in the afternoon'
     */
    getFormattedTime: function(date) {
      let hours = date.getHours();
      let minutes = date.getMinutes();

      let periodOfDay;
      if (hours < 12) {
        periodOfDay = ' in the morning';
      } else if (hours < 17) {
        periodOfDay = ' in the afternoon';
      } else if (hours < 20) {
        periodOfDay = ' in the evening';
      } else {
        periodOfDay = ' at night';
      }

      hours = hours % 12;
      hours = hours ? hours : 12; // handle midnight
      minutes = minutes < 10 ? '0' + minutes : minutes;
      let formattedTime = hours + ':' + minutes + periodOfDay;
      return formattedTime;
    },

    /**
     * Returns a speech formatted, without a date, based on am/rpm E.g.
     * '12:35 pm'
     */
    getFormattedTimeAmPm: function(date) {
      let hours = date.getHours();
      let minutes = date.getMinutes();
      let ampm = hours >= 12 ? 'pm' : 'am';

      hours = hours % 12;
      hours = hours ? hours : 12; // handle midnight
      minutes = minutes < 10 ? '0' + minutes : minutes;
      let formattedTime = hours + ':' + minutes + ' ' + ampm;
      return formattedTime;
    }
  };
})();

let DAYS_OF_MONTH = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
  '13th',
  '14th',
  '15th',
  '16th',
  '17th',
  '18th',
  '19th',
  '20th',
  '21st',
  '22nd',
  '23rd',
  '24th',
  '25th',
  '26th',
  '27th',
  '28th',
  '29th',
  '30th',
  '31st'
];

let DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

let MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

// let ONE_DAY = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

module.exports = dateUtil;
