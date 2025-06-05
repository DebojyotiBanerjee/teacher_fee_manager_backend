const bcrypt = require('bcrypt');


const hashPassword = async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
};

const comparePassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = { hashPassword, comparePassword };