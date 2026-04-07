function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
}

function assertEmail(value) {
  assertNonEmptyString(value, "Email");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value.trim())) {
    throw new Error("A valid email address is required.");
  }
}

module.exports = {
  assertNonEmptyString,
  assertEmail
};
