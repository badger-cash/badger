// Amount comes in as a string
const formatTokenAmount = amount => {
  try {
    const value = parseFloat(amount)
    const formatted = value.toLocaleString()
    return formatted
  } catch (e) {
    return amount
  }
}

export { formatTokenAmount }
