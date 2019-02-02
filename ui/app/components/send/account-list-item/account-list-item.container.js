import { connect } from 'react-redux'
import {
  getConversionRate,
  getCurrentCurrency,
  getSelectedToken,
} from '../send.selectors.js'
import AccountListItem from './account-list-item.component'

export default connect(mapStateToProps)(AccountListItem)

function mapStateToProps (state) {
  return {
    conversionRate: getConversionRate(state),
    currentCurrency: getCurrentCurrency(state),
    selectedToken: getSelectedToken(state),
  }
}
