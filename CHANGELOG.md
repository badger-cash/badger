# Changelog

## 0.6.4

- Instant wallets created for new users
- Send Max button for BCH and SLP tokens
- Display and spend BCH from SLP address
- Warning to backup seed for new accounts
- Schnorr signatures enabled for BCH and SLP transactions
- Import seed phrase moved to settings page
- Add latest token icons
- Deprecate all Wormhole token support
- Display import warning if current account has a balance or transactions
- Terms of Service moved to settings page
- Fix: Do not empty recieve address on bad input
- Improve long token name and amount display

## 0.6.3

- Never store seed words in state
- Replace any existing seed words with null

## 0.6.2

- Allow send to any address type

## 0.6.1

- Fix BCH tx fees

## 0.6.0

- Default SLP address and change tokens to 245 derivation path
- Continue to check for token balances on 145
- Send SLP tokens to SLP address only
- Passwords optional at account creation
- Adding token icons for $HONKS and $Nazgûl
- Fix reset account issue
- Fix wormhole transactions (soon deprecated, please move WH tokens to another wallet)

## 0.5.0

- Add Simple Ledger token transaction history
- Performance Improvements
- Display recent transactions and link to explorer for full transaction history
- Add Cash token icon

## 0.4.2

Token icons for

- SPICE
- SLP Torch
- WNT

## 0.4.1

Remove PrivKey WIF export text uppercase CSS

## 0.4.0

- Clean up UI
  - Remove 'Bitcoin Cash' string
  - Color code send/recieve txs
  - Remove 'Confirmed/Pending'
  - Add timestamp
- Add SatoshiDice logo for send/receive to SD
- Update to SLP SDK v3.x
- Increase max token name length
- Improve error messages
- Add restore info to seed notice
- Display slp address in confirm page

## 0.3.1

- Improve error messages

## 0.3.0

- Show recent BCH send and receive transaction history
- Add telegram link to info page
- Improve new account creation
- Improve QR scanner
- Fix send token issue when user has no tokens

## 0.1.1

- Replace 'MetaMask' strings w/ 'Badger'
