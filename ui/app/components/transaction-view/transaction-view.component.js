import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import Media from 'react-media'
import MenuBar from '../menu-bar'
import TransactionViewBalance from '../transaction-view-balance'
import TransactionList from '../transaction-list'
import { REVEAL_SEED_ROUTE } from '../../../../ui/app/routes'
import localStorage from 'store'

export default class TransactionView extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    accountUtxoCache: PropTypes.object,
    historicalBchTransactions: PropTypes.object,
    historicalSlpTransactions: PropTypes.object,
    selectedAddress: PropTypes.string,
    selectedSlpAddress: PropTypes.string,
    history: PropTypes.object,
  }

  renderSeedWarning = () => {
    const {
      accountUtxoCache,
      historicalBchTransactions,
      historicalSlpTransactions,
      selectedAddress,
      selectedSlpAddress,
      history,
    } = this.props

    const warn =
      accountUtxoCache[selectedAddress].length > 0 ||
      accountUtxoCache[selectedSlpAddress].length > 0 ||
      historicalBchTransactions[selectedAddress].length > 0 ||
      historicalSlpTransactions[selectedAddress].length > 0

    if (warn) {
      return (
        <div
          className="seed-warning"
          onClick={() => history.push(REVEAL_SEED_ROUTE)}
        >
          <p> Wallet is not backed up </p>
        </div>
      )
    }
    return null
  }

  render () {
    const seedBackedUp = localStorage.get('seedwordsBackedUp')

    return (
      <div className="transaction-view">
        <Media query="(max-width: 575px)" render={() => <MenuBar />} />
        {seedBackedUp !== undefined && seedBackedUp
          ? ''
          : this.renderSeedWarning()}
        <div className="transaction-view__balance-wrapper">
          <TransactionViewBalance />
        </div>

        <TransactionList />
      </div>
    )
  }
}
