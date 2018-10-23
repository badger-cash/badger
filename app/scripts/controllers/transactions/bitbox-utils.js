const log = require('loglevel')
const BITBOXSDK = require('bitbox-sdk/lib/bitbox-sdk').default
const BITBOX = new BITBOXSDK()

class BitboxUtils {
  static async getLargestUtxo (address) {
    return new Promise((resolve, reject) => {
      BITBOX.Address.utxo(address).then(
        result => {
          try {
            const utxo = result.sort((a, b) => {
              return a.satoshis - b.satoshis
            })[result.length - 1]
            resolve(utxo)
          } catch (ex) {
            reject(ex)
          }
        },
        err => {
          reject(err)
        }
      )
    })
  }

  static async getAllUtxo (address) {
    return new Promise((resolve, reject) => {
      BITBOX.Address.utxo(address).then(
        result => {
          resolve(result)
        },
        err => {
          reject(err)
        }
      )
    })
  }

  static async getTransactionDetails (txid) {
    return new Promise((resolve, reject) => {
      BITBOX.Transaction.details(txid).then(
        result => {
          if (result) {
            resolve(result)
          } else {
            reject('Undefined transaction details for', txid)
          }
        },
        err => {
          reject(err)
        }
      )
    })
  }

  static async publishTx (hex) {
    return new Promise((resolve, reject) => {
      BITBOX.RawTransactions.sendRawTransaction(hex).then(
        result => {
          try {
            console.log('txid: ', result)
            if (result.length !== 64) {
              // TODO: Validate result is a txid
              reject('Transaction failed: ' + result)
            } else {
              resolve(result)
            }
          } catch (ex) {
            reject(ex)
          }
        },
        err => {
          reject(err)
        }
      )
    })
  }

  static signAndPublishTransaction (txParams, keyPair, utxos) {
    return new Promise(async (resolve, reject) => {
      try {
        const from = txParams.from
        const to = txParams.to
        const satoshisToSend = parseInt(txParams.value)

        if (!utxos || utxos.length === 0) {
            throw new Error('Insufficient funds')
        }

        const transactionBuilder = new BITBOX.TransactionBuilder('bitcoincash')

        let totalUtxoAmount = 0
        utxos.forEach((utxo) => {
            if (utxo.spendable !== true) {
              throw new Error('Cannot spend unspendable utxo')
            }
            transactionBuilder.addInput(utxo.txid, utxo.vout)
            totalUtxoAmount += utxo.satoshis
        })

        const byteCount = BITBOX.BitcoinCash.getByteCount({ P2PKH: utxos.length }, { P2PKH: 2 })
        
        const satoshisRemaining = totalUtxoAmount - byteCount - satoshisToSend

        // Destination output
        transactionBuilder.addOutput(to, satoshisToSend)

        // Return remaining balance output
        transactionBuilder.addOutput(from, satoshisRemaining)

        let redeemScript
        utxos.forEach((utxo, index) => {
            transactionBuilder.sign(index, keyPair, redeemScript, transactionBuilder.hashTypes.SIGHASH_ALL, utxo.satoshis)
        })

        const hex = transactionBuilder.build().toHex()

        // TODO: Handle failures: transaction already in blockchain, mempool length, networking
        const txid = await this.publishTx(hex)
        resolve(txid)
      } catch (err) {
        reject(err)
      }
    })
  }
}

module.exports = BitboxUtils
