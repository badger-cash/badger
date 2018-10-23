const BITBOXSDK = require('bitbox-sdk/lib/bitbox-sdk').default
const BITBOX = new BITBOXSDK()
const BigNumber = require('bignumber.js')

class SlpUtils {

    static get lokadIdHex() { return "534c5000" }

    static decodeTxOut(txDetails) {
        // txOut = {
        //     txid: 
        //     tx: {} //transaction details from bitbox object
        // }
        let out = {
            token: '',
            quantity: 0
        };

        const script = BITBOX.Script.toASM(Buffer.from(txDetails.vout[0].scriptPubKey.hex, 'hex')).split(' ');

        if (script[0] !== 'OP_RETURN') {
            throw new Error('Not an OP_RETURN');
        }

        if (script[1] !== this.lokadIdHex) {
            throw new Error('Not a SLP OP_RETURN');
        }

        if (script[2] != 'OP_1') { // NOTE: bitcoincashlib-js converts hex 01 to OP_1 due to BIP62.3 enforcement
            throw new Error('Unknown token type');
        }

        const type = Buffer.from(script[3], 'hex').toString('ascii').toLowerCase();

        if (type === 'genesis') {
            out.token = txDetails.txid;
            out.ticker = Buffer.from(script[4], 'hex').toString('ascii')
            out.name = Buffer.from(script[5], 'hex').toString('ascii')
            out.quantity = new BigNumber(script[10], 16);
        } else {
            throw new Error('Invalid tx type');
        }

        return out;
    }
}

module.exports = SlpUtils