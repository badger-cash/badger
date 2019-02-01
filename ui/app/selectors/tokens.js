import { createSelector } from 'reselect'

export const selectedTokenAddressSelector = state =>
  state.metamask.selectedTokenAddress
export const tokenSelector = state => {
  const selectedAddress =
    state.metamask.selectedAddress || Object.keys(state.metamask.accounts)[0]
  const providerType = state.metamask.provider.type
  const addressAccountTokens = state.metamask.accountTokens[selectedAddress]
  const accountTokens = addressAccountTokens
    ? addressAccountTokens[providerType]
    : []
  return accountTokens
}
export const selectedTokenSelector = createSelector(
  tokenSelector,
  selectedTokenAddressSelector,
  (tokens = [], selectedTokenAddress = '') => {
    const selectedToken = tokens.filter(({ address, string }) => {
      // TODO: filter for mint baton by properties
      if (string === 'Mint Baton') return false
      return address === selectedTokenAddress
    })[0]
    return selectedToken
  }
)
