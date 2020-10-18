const {AssistantApp} = require('hello-watson/svelte');

const app = new AssistantApp({
  target: document.body,
  props: {
    title: 'Sonny Weather Bot',
    titleColor: 'blue'
  }
});

module.exports = app;
