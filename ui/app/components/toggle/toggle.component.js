import React, { Component } from 'react'
import PropTypes from 'prop-types'

export default class Toggle extends Component {
  static propTypes = {
    toggleState: PropTypes.func,
  }
  state = {
    checked: false,
  }
  toggleChecked = () => {
    const { checked } = this.state
    const { toggleState } = this.props

    this.setState({ checked: !checked })
    toggleState()
  }

  render () {
    const { checked } = this.state
    return (
      <div className="toggleContainer">
        <input type="checkbox" checked={checked ? true : ''} />
        <span className="slider" onClick={this.toggleChecked} />
      </div>
    )
  }
}
