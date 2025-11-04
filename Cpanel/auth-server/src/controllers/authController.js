const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateTokens, verifyToken } = require('../middleware/auth');
const pool = require('../config/db');
const { promisify } = require('util');
require('dotenv').config();
const { passwordEncryptAES } = require('../utils/decryptAES')
const { sendMail } = require("../utils/mailer.js");