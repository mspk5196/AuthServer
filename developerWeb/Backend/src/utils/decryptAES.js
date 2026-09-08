const crypto = require('crypto');

const SECRET_KEY_PASSWORD = Buffer.from(process.env.AES_SECRET_KEY_PASSWORD, 'hex');
const IV_PASSWORD = Buffer.from(process.env.AES_IV_PASSWORD, 'hex');
const SECRET_KEY_PASSWORD = Buffer.from(process.env.AES_SECRET_KEY_PASSWORD || '96FD20C91162FF0D541F9340152820455F7407EA513EE4CC98EC7C5B47B68091', 'hex');
const IV_PASSWORD = Buffer.from(process.env.AES_IV_PASSWORD || 'EA9015CDDE6C4755792536FF6E6B34AE', 'hex');

// const SECRET_KEY_GROUP = Buffer.from(process.env.AES_SECRET_KEY_GROUP, 'hex');
// const IV_GROUP = Buffer.from(process.env.AES_IV_GROUP, 'hex');

function passwordEncryptAES(plain) {
  const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY_PASSWORD, IV_PASSWORD);
  let enc = cipher.update(plain, 'utf8', 'base64');
  enc += cipher.final('base64');
  return enc;
}

function passwordDecryptAES(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY_PASSWORD, IV_PASSWORD);
  let dec = decipher.update(encrypted, 'base64', 'utf8');
  dec += decipher.final('utf8');
  // console.log  console.log(encrypted);
  return dec;
}

// function groupEncryptAES(plain) {
//   const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY_GROUP, IV_GROUP);
//   let enc = cipher.update(String(plain), 'utf8', 'base64');
//   enc += cipher.final('base64');
//   return enc;
// }

// function groupDecryptAES(encrypted) {
//   const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY_GROUP, IV_GROUP);
//   let dec = decipher.update(encrypted, 'base64', 'utf8');
//   dec += decipher.final('utf8');
//   return dec;
// }

module.exports = { passwordEncryptAES, passwordDecryptAES };
// module.exports = { passwordEncryptAES, passwordDecryptAES, groupEncryptAES, groupDecryptAES };
