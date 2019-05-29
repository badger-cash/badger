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
    },
  } = state

  return {
    accountUtxoCache,
    historicalBchTransactions,
    historicalSlpTransactions,
    selectedAddress,
    selectedSlpAddress,
  }
}

const mapDispatchToProps = dispatch => {
  return {}
}

export default compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(TransactionView)
