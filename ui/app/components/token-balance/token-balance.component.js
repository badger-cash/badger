import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'

import { formatTokenAmount } from '../../helpers/formatter-numbers.util'

export default class TokenBalance extends PureComponent {
  static propTypes = {
    token: PropTypes.object,
    className: PropTypes.string,
    withSymbol: PropTypes.bool,
  }

  render () {
    const { className, withSymbol, token } = this.props
    const { symbol, string } = token


    return (
      <div className={classnames('hide-text-overflow', className)}>
        {formatTokenAmount(string || '0') + (withSymbol ? ` ${symbol}` : '')}
      </div>
    )
  }
}
