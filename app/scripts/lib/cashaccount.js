const axios = require('axios');

class CashAccount {
  /**
   * get the address for user's handle
   *
   * @static
   * @param {string} string - ie: jonathan#100
   * @returns {obj}
   * @memberof CashAccount
   */
  static async getAddressByCashAccount(string) {
    let split = string.split('#');
    let name = split[0];
    let number = split[1];

    let data = await axios
      .get(`http://api.cashaccount.info/account/${number}/${name}`)
      .then(x => {
        return x.data;
      })
      .catch(err => {
        console.log(err.response);
      });

    console.log('data cashacount', data);
    return data;
  }

  /**
   * check if cash account
   *
   * @static
   * @param {string} string - ie: jonathan#100
   * @returns {boolean}
   * @memberof CashAccount
   */
  static isCashAccount(string) {
    const cashAccountRegex = /^([a-zA-Z0-9_]+)(#([0-9]+)(([0-9]+))).([0-9]+)?$/i;

    return cashAccountRegex.test(string);
  }
}

module.exports = CashAccount;
