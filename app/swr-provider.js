'use client'

import { SWRConfig } from 'swr'

export default function SWRProvider({ children }) {
  return (
    <SWRConfig value={{
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }}>
      {children}
    </SWRConfig>
  )
}
