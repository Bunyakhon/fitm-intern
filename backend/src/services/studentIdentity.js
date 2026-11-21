// Format derivation only: this does not verify email ownership or Student eligibility.
// Callers normalize/verify the email before applying the shared registration rule.
// Current university domain plus the existing student domain for compatibility.
// This is format derivation, never enrollment/ownership evidence.
const STUDENT_EMAIL_DOMAINS = Object.freeze(['kmutnb.ac.th', 'email.kmutnb.ac.th']);
const studentIdFromEmail = email => /^s([0-9]{13})@(?:email\.)?kmutnb\.ac\.th$/.exec(email)?.[1];

module.exports = { studentIdFromEmail, STUDENT_EMAIL_DOMAINS };
