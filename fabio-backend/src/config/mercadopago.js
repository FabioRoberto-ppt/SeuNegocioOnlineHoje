// src/config/mercadopago.js
const { MercadoPagoConfig } = require('mercadopago');
require('dotenv').config(); // 👈 ADICIONE ISSO AQUI PARA LER O .ENV

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

module.exports = client;