import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Media from 'react-media'
import MenuBar from '../menu-bar'
import TransactionViewBalance from '../transaction-view-balance'
import TransactionList from '../transaction-list'
import { REVEAL_SEED_ROUTE } from '../../../../ui/app/routes'
import localStorage from 'store'

export default class TransactionView extends Component {
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

    const hasBchUtxos =
      accountUtxoCache &&
      accountUtxoCache[selectedAddress] &&
      accountUtxoCache[selectedAddress].length > 0

    const hasSlpUtxos =
      accountUtxoCache &&
      accountUtxoCache[selectedSlpAddress] &&
      accountUtxoCache[selectedSlpAddress].length > 0

    const hasBchTxs =
      historicalBchTransactions &&
      historicalBchTransactions[selectedAddress] &&
      historicalBchTransactions[selectedAddress].length > 0

    const hasSlpTxs =
      historicalSlpTransactions &&
      historicalSlpTransactions[selectedAddress] &&
      historicalSlpTransactions[selectedAddress].length > 0

    const warn = hasBchUtxos || hasSlpUtxos || hasBchTxs || hasSlpTxs

    if (warn) {
      return (
        <div
          className="seed-warning"
          onClick={() => history.push(REVEAL_SEED_ROUTE)}
        >
          <p> Please backup your wallet </p>
        </div>
      )
    }
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
