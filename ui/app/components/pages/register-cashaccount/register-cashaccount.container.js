import { connect } from 'react-redux'
import RegisterCashAccount from './register-cashaccount.component'

const {
  setCashAccount,
  setCashAccountRegistration,
  signTx,
  updateTransaction,
  updateSendTo,
} = require('../../../actions')

import {
  getSendAmount,
  getSendEditingTransactionId,
  getSendFromObject,
  getSendTo,
  getSendToAccounts,
  getSendHexData,
  getUnapprovedTxs,
  getSelectedToken,
} from '../../send/send.selectors'

// import {
//   constructTxParams,
//   constructUpdatedTx,
// } from '../../send/send-footer/send-footer.utils'

const mapStateToProps = state => {
  const { metamask } = state
  const {
    selectedAddress,
    selectedSlpAddress,
    cashaccount,
    cashaccountRegistrations,
  } = metamask

  return {
    selectedAddress,
    selectedSlpAddress,
    cashaccount,
    cashaccountRegistrations,
    amount: getSendAmount(state),
    data: getSendHexData(state),
    editingTransactionId: getSendEditingTransactionId(state),
    from: getSendFromObject(state),
    to: getSendTo(state),
    selectedToken: getSelectedToken(state),
    toAccounts: getSendToAccounts(state),
    unapprovedTxs: getUnapprovedTxs(state),
  }
}

const mapDispatchToProps = dispatch => {
  return {
    setCashAccount: x => dispatch(setCashAccount(x)),
    setCashAccountRegistration: x => dispatch(setCashAccountRegistration(x)),
    updateSendTo: (to, nickname) => dispatch(updateSendTo(to, nickname)),
    sign: ({ selectedToken, to, amount, from, data }) => {
      const txParams = {
        to: to,
        from: from,
        value: '400',
        opReturn: {
          data: data,
        },
      }
      return dispatch(signTx(txParams))
    },
    update: ({
      amount,
      data,
      editingTransactionId,
      from,
      to,
      unapprovedTxs,
    }) => {
      const editingTx = constructUpdatedTx({
        amount,
        data,
        editingTransactionId,
        from,
        to,
        unapprovedTxs,
      })
      return dispatch(updateTransaction(editingTx))
    },
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RegisterCashAccount)
