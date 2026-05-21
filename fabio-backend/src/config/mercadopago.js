// src/config/mercadopago.js
const { MercadoPagoConfig } = require('mercadopago');
 
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
 
module.exports = client;