import { WalletAccount } from "@mysten/wallet-standard";
import {
  Assemblies,
  AssemblyType,
  DetailedSmartCharacterResponse,
  Severity,
} from "./types";

/**
 * Vault context: account, connection state, and connect/disconnect handlers.
 * @category Types
 */
export interface VaultContextType {
  currentAccount: WalletAccount | null;
  walletAddress: string | undefined;
  hasEveVault: boolean;
  isConnected: boolean;
  handleConnect: () => void;
  handleDisconnect: () => void;
}

export enum SupportedWallets {
  EVE_VAULT = "Eve Vault",
  EVE_FRONTIER_CLIENT_WALLET = "EVE Frontier Client Wallet",
}

/**
 * Smart object context: assembly, owner, loading, error, and refetch.
 * @category Types
 */
export interface SmartObjectContextType {
  tenant: string;
  assembly: AssemblyType<Assemblies> | null;
  assemblyOwner: DetailedSmartCharacterResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface NotifySuccess {
  type: Severity.Success;
  txHash?: string;
  message?: string;
  onSuccess?: () => void;
}

export interface NotifyOther {
  type: Severity.Error | Severity.Warning | Severity.Info;
  message?: string;
}

/** @category Types */
export interface NotificationContextType {
  notify: (notification: NotifySuccess | NotifyOther) => void;
  notification: NotificationState;
  handleClose: () => void;
}

/** @category Types */
export interface NotificationState {
  message: string;
  txHash: string;
  onSuccess: () => void;
  severity: Severity;
  handleClose: () => void;
  isOpen: boolean;
}
