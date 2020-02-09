import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'recompose'
import TransactionView from './transaction-view.component'
import { showModal } from '../../actions'

const mapStateToProps = state => {
  const {
    metamask: {
      accountUtxoCache,
      historicalBchTransactions,
      historicalSlpTransactions,
      selectedAddress,
      selectedSlpAddress,
      identities,
      accounts,
    },
  } = state

  return {
    accountUtxoCache,
    historicalBchTransactions,
    historicalSlpTransactions,
    selectedAddress,
    selectedSlpAddress,
    identities,
    accounts,
  }
}

const mapDispatchToProps = dispatch => {
  return {}
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(TransactionView)
