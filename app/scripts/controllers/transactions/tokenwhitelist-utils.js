const SLPSDK = require('slp-sdk')
const SLP = new SLPSDK()
const BITBOX = require('bitbox-sdk').BITBOX
const bitbox = new BITBOX()
const BigNumber = require('slpjs/node_modules/bignumber.js')
const slpjs = require('slpjs')
const SLPJS = new slpjs.Slp(SLP)
const axios = require('axios')
const localStorage = require('store')

class TokenWhitelistUtils {
  static async getLargestUtxo (address) {}

  static async getAllUtxo (address) {}

  // persist identity to localstorage
  static saveAccount (obj) {
    const array = accounts === undefined ? [] : accounts
    array.push(obj)
    localStorage.set('tokenBlacklist', array)
  }

  static upsertLocalStorage (key, value) {
    const existing = localStorage.get(key)
    const array = existing === undefined ? [] : existing
    array.push(value)
    return localStorage.set(key, array)
  }
}

module.exports = TokenWhitelistUtils
