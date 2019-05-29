import { connect } from 'react-redux'
import {
  getSelectedToken,
  getSendFromBalance,
  getTokenBalance,
  getUtxos,
  getSelectedAddress,
  getSelectedSlpAddress,
} from '../../../send.selectors.js'
import { getMaxModeOn } from './amount-max-button.selectors.js'
import { calcMaxAmount } from './amount-max-button.utils.js'
import { updateSendAmount, setMaxModeTo } from '../../../../../actions'
import AmountMaxButton from './amount-max-button.component'
import { updateSendErrors } from '../../../../../ducks/send.duck'

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AmountMaxButton)

function mapStateToProps (state) {
  return {
    balance: getSendFromBalance(state),
    maxModeOn: getMaxModeOn(state),
    selectedToken: getSelectedToken(state),
    selectedAddress: getSelectedAddress(state),
    selectedSlpAddress: getSelectedSlpAddress(state),
    tokenBalance: getTokenBalance(state),
    utxo: getUtxos(state),
  }
}

function mapDispatchToProps (dispatch) {
  return {
    setAmountToMax: maxAmountDataObject => {
      dispatch(updateSendErrors({ amount: null }))
      dispatch(updateSendAmount(calcMaxAmount(maxAmountDataObject)))
    },
    setMaxModeTo: bool => dispatch(setMaxModeTo(bool)),
  }
}
