import { QueryClientProvider } from '@tanstack/react-query'
import type { JSX } from 'react'
import { type PropsWithChildren, useState } from 'react'

import { createQueryClient } from './queryClient'

export const Providers = ({ children }: PropsWithChildren): JSX.Element => {
  const [client] = useState(createQueryClient)

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
