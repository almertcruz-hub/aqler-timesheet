import { createContext, useContext } from 'react'

const AppUtilitiesContext = createContext(null)

function useAppUtilities() {
  const context = useContext(AppUtilitiesContext)

  if (!context) {
    throw new Error('useAppUtilities must be used inside AppUtilitiesProvider')
  }

  return context
}

export { AppUtilitiesContext, useAppUtilities }
