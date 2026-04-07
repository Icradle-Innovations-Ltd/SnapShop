const { POLL_CHOICES } = require("../data/catalog");

const memoryStore = {
  users: [],
  vendorProfiles: [],
  customerProfiles: [],
  stores: [],
  addresses: [],
  products: [],
  orderStatusHistory: [],
  contactMessages: [],
  pollVotes: POLL_CHOICES.map((choice) => ({ choice, count: 0 })),
  orders: []
};

module.exports = {
  memoryStore
};
