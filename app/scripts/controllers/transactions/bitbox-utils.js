const log = require('loglevel')
const BITBOXSDK = require('bitbox-sdk/lib/bitbox-sdk').default
const BITBOX = new BITBOXSDK()

class BitboxUtils {
  static async getUtxo (address) {
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
          console.log(err)
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
          console.log(err)
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
          console.log(err)
          reject(err)
        }
      )
    })
  }

  static signAndPublishTransaction (txParams, keyPair) {
    return new Promise(async (resolve, reject) => {
      try {
        const from = txParams.from
        const to = txParams.to
        const satoshisToSend = parseInt(txParams.value)

        const utxos = await this.getAllUtxo(from)
        if (!utxos || utxos.length === 0) {
            throw new Error('Insufficient funds')
        }

        const transactionBuilder = new BITBOX.TransactionBuilder('bitcoincash')

        let totalUtxoAmount = 0
        utxos.forEach((utxo) => {
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
