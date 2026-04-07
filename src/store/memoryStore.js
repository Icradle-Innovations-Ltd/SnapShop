const { POLL_CHOICES } = require("../data/catalog");

const memoryStore = {
  contactMessages: [],
  pollVotes: POLL_CHOICES.map((choice) => ({ choice, count: 0 })),
  orders: []
};

module.exports = {
  memoryStore
};
