import type { WalletAccount } from '@mysten/wallet-standard'
import type { EntityData, EntityOwner } from './entity'
import {
  Assemblies,
  type AssemblyType,
  type DetailedSmartCharacterResponse,
  Severity,
} from './types'

/**
 * Vault context: account, connection state, and connect/disconnect handlers.
 * @category Types
 */
export interface VaultContextType {
  currentAccount: WalletAccount | null
  walletAddress: string | undefined
  hasEveVault: boolean
  isConnected: boolean
  handleConnect: () => void
  handleDisconnect: () => void
}

export enum SupportedWallets {
  EVE_VAULT = 'Eve Vault',
  EVE_FRONTIER_CLIENT_WALLET = 'EVE Frontier Client Wallet',
}

/**
 * Smart object context: entity, owner, loading, error, and refetch.
 * @category Types
 */
export interface SmartObjectContextType {
  tenant: string
  /** The selected world entity and its components */
  entity: EntityData | null
  /** Who controls the entity, resolved from its AccessCap */
  entityOwner: EntityOwner | null
  /** @deprecated Always null; the provider now reads world entities. Use `entity`. */
  assembly: AssemblyType<Assemblies> | null
  /** @deprecated Always null; the provider now reads world entities. Use `entityOwner`. */
  assemblyOwner: DetailedSmartCharacterResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface NotifySuccess {
  type: Severity.Success
  txHash?: string
  message?: string
  onSuccess?: () => void
}

export interface NotifyOther {
  type: Severity.Error | Severity.Warning | Severity.Info
  message?: string
}

/** @category Types */
export interface NotificationContextType {
  notify: (notification: NotifySuccess | NotifyOther) => void
  notification: NotificationState
  handleClose: () => void
}

/** @category Types */
export interface NotificationState {
  message: string
  txHash: string
  onSuccess: () => void
  severity: Severity
  handleClose: () => void
  isOpen: boolean
}
