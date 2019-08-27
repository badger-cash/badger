import { connect } from 'react-redux'
import { getSendFromBalance } from '../send.selectors.js'
import { getMaxModeOn } from '../send-content/send-amount-row/amount-max-button/amount-max-button.selectors.js'
import { updateSendAmount, setMaxModeTo } from '../../../actions'
import { updateSendErrors } from '../../../ducks/send.duck'
import CurrencyDisplay from './currency-display'

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CurrencyDisplay)

function mapStateToProps (state) {
  return {
    balance: getSendFromBalance(state),
    maxModeOn: getMaxModeOn(state),
  }
}

function mapDispatchToProps (dispatch) {
  return {
    updateSendAmount: amount => {
      dispatch(updateSendAmount(amount))
    },
    updateSendErrors: () => dispatch(updateSendErrors({ amount: null })),
    setMaxModeTo: bool => dispatch(setMaxModeTo(bool)),
  }
}
