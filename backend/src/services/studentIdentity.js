// Format derivation only: this does not verify email ownership or Student eligibility.
// Callers normalize/verify the email before applying the shared registration rule.
const studentIdFromEmail = email => /^s([0-9]{13})@email\.kmutnb\.ac\.th$/.exec(email)?.[1];

module.exports = { studentIdFromEmail };
