import { createDAppKit } from '@mysten/dapp-kit-react'
import { SuiGrpcClient } from '@mysten/sui/grpc'

import { SUI_GRPC_URLS } from '../utils/constants'

type SupportedNetwork = keyof typeof SUI_GRPC_URLS
const SUPPORTED_NETWORKS = Object.keys(SUI_GRPC_URLS) as SupportedNetwork[]

/** DApp Kit instance for Sui wallet and network. @category Config */
export const dAppKit = createDAppKit({
  networks: SUPPORTED_NETWORKS,
  createClient(network) {
    return new SuiGrpcClient({
      network,
      baseUrl: SUI_GRPC_URLS[network as keyof typeof SUI_GRPC_URLS],
    })
  },
})
