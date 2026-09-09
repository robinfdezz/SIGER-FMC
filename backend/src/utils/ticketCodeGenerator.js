"use strict";

var crypto = require("crypto");
var randomBytes = crypto.randomBytes;

// Alfabeto sin caracteres ambiguos: excluye 0, O, 1, I, L
var TICKET_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
var TICKET_CODE_LEN = 8;

// Genera string aleatorio con rejection sampling (sin sesgo de modulo)
function generateRawCode(length) {
  var alphabetLen = TICKET_ALPHABET.length;
  var result = "";
  while (result.length < length) {
    var b = randomBytes(1)[0];
    var limit = Math.floor(256 / alphabetLen) * alphabetLen;
    if (b < limit) {
      result += TICKET_ALPHABET[b % alphabetLen];
    }
  }
  return result;
}

// Formatea el codigo en grupos legibles: XXXX-XXXX
function formatTicketCode(raw) {
  return raw.slice(0, 4) + "-" + raw.slice(4, 8);
}

/**
 * Genera un codigo_ticket unico verificando colisiones en la BD.
 * @param {object} client - PoolClient de pg activo en la transaccion
 * @returns {Promise} Codigo formateado unico, ej: "AB3K-7YXM"
 */
async function generateUniqueTicketCode(client) {
  var MAX_RETRIES = 5;
  for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    var raw = generateRawCode(TICKET_CODE_LEN);
    var code = formatTicketCode(raw);
    var res = await client.query(
      "SELECT 1 FROM servicios_recepcion WHERE codigo_ticket = $1",
      [code]
    );
    if (res.rowCount === 0) {
      return code;
    }
    console.warn("Colision de codigo_ticket " + code + " intento " + attempt + "/" + MAX_RETRIES);
  }
  throw new Error("No se pudo generar un codigo de ticket unico despues de " + MAX_RETRIES + " intentos.");
}

module.exports = {
  generateUniqueTicketCode: generateUniqueTicketCode,
  formatTicketCode: formatTicketCode,
  generateRawCode: generateRawCode
};