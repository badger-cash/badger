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
    identities: PropTypes.object,
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

  toggleAccountWarning = () => {
    localStorage.set('accountWarningDismissed', true)
  }

  renderAccountConsolidation = () => {
    const { identities } = this.props
    const copy = { ...identities }
    delete copy.isAccountMenuOpen
    delete copy.isUnencrypted
    const hasMultipleAccounts = Object.keys(copy).length >= 2

    const accountWarning = localStorage.get('accountWarningDismissed')

    if (!hasMultipleAccounts || accountWarning) {
      return
    }
    return (
      <div className="seed-warning" style={{ background: '#c10a1b' }}>
        <p>
          WARNING: Accounts are being deprecated! Please consolidate your funds
          or you may lose access to them!
        </p>
        <a
          style={{ fontSize: '18px', lineHeight: '32px' }}
          href="https://github.com/Bitcoin-com/badger/wiki/Badger-v0.7.14-Account-Consolidation"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read More Here
        </a>
        <p
          onClick={() => {
            this.toggleAccountWarning()
          }}
        >
          [X] Dismiss warning.
        </p>
      </div>
    )

    // determine "main" addresses
    // create transaction(s) for each account to send to main address
  }
  render () {
    const seedBackedUp = localStorage.get('seedwordsBackedUp')

    return (
      <div className="transaction-view">
        <Media query="(max-width: 575px)" render={() => <MenuBar />} />
        {this.renderAccountConsolidation()}

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
