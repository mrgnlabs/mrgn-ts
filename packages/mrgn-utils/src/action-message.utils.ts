import {
  ActionMessageUIType,
  ActionMessageType,
  canBeBorrowed,
  canBeLent,
  canBeRepaidCollat,
  canBeRepaid,
  canBeWithdrawn,
  canBeLooped,
  DYNAMIC_SIMULATION_ERRORS,
  LstData,
  canBeDepositSwapped,
  STATIC_SIMULATION_ERRORS,
  getTradeSpecificChecks,
  ArenaGroupStatus,
} from ".";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { EmodeImpact, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { QuoteResponse } from "@jup-ag/api";
import { WalletToken } from "@mrgnlabs/mrgn-common";

export function getColorForActionMessageUIType(type?: ActionMessageUIType) {
  if (type === "INFO") {
    return "info";
  } else if (type === "WARNING") {
    return "alert";
  } else {
    return "alert";
  }
}

interface CheckActionAvailableProps {
  amount: number | null;
  connected: boolean;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionQuote: QuoteResponse | null;
  maxOverflowHit?: boolean;
}

interface CheckLendActionAvailableProps {
  amount: number | null;
  connected: boolean;
  nativeSolBalance: number;
  showCloseBalance?: boolean;
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  marginfiAccount: MarginfiAccountWrapper | null;
  lendMode: ActionType;
}

export function checkLendActionAvailable({
  amount,
  nativeSolBalance,
  connected,
  showCloseBalance,
  selectedBank,
  banks,
  marginfiAccount,
  lendMode,
}: CheckLendActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0, showCloseBalance);
  if (generalChecks) checks.push(...generalChecks);

  // allert checks
  if (selectedBank) {
    switch (lendMode) {
      case ActionType.Deposit:
        const lentChecks = canBeLent(selectedBank, nativeSolBalance);
        if (lentChecks.length) checks.push(...lentChecks);
        break;
      case ActionType.Withdraw:
        const withdrawChecks = canBeWithdrawn(selectedBank, marginfiAccount, amount);
        if (withdrawChecks.length) checks.push(...withdrawChecks);
        break;
      case ActionType.Borrow:
        const borrowChecks = canBeBorrowed(selectedBank, banks, marginfiAccount);
        if (borrowChecks.length) checks.push(...borrowChecks);
        break;
      case ActionType.Repay:
        const repayChecks = canBeRepaid(selectedBank, undefined, amount);
        if (repayChecks) checks.push(...repayChecks);
        break;
    }
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

interface CheckLoopActionAvailableProps {
  amount: number | null;
  connected: boolean;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionQuote: QuoteResponse | null;
  emodeImpact: EmodeImpact | null;
  banks?: ExtendedBankInfo[];
}

export function checkLoopActionAvailable({
  amount,
  connected,
  selectedBank,
  selectedSecondaryBank,
  banks,
  actionQuote,
  emodeImpact,
}: CheckLoopActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0);
  if (generalChecks) checks.push(...generalChecks);

  // alert checks
  if (selectedBank) {
    const loopChecks = canBeLooped(selectedBank, selectedSecondaryBank, emodeImpact, actionQuote, banks);
    if (loopChecks.length) checks.push(...loopChecks);
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

export function checkRepayActionAvailable({
  amount,
  connected,
  selectedBank,
  selectedSecondaryBank,
  actionQuote,
  maxOverflowHit,
}: CheckActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0);
  if (generalChecks) checks.push(...generalChecks);

  let repayChecks: ActionMessageType[] = [];
  if (
    selectedBank &&
    selectedSecondaryBank &&
    selectedBank.address.toString().toLowerCase() === selectedSecondaryBank.address.toString().toLowerCase()
  ) {
    repayChecks = canBeRepaid(selectedBank, true, amount);
  } else if (selectedBank && selectedSecondaryBank) {
    repayChecks = canBeRepaidCollat(selectedBank, selectedSecondaryBank, actionQuote, maxOverflowHit);
  }
  if (repayChecks) checks.push(...repayChecks);

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

function getRequiredCheck(connected: boolean, selectedBank: ExtendedBankInfo | null): ActionMessageType | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!selectedBank) {
    return { isEnabled: false };
  }

  return null;
}

function getGeneralChecks(amount: number = 0, showCloseBalance?: boolean, leverage?: number): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  if (showCloseBalance) {
    checks.push({ actionMethod: "INFO", description: "Close lending balance.", isEnabled: true });
  } // TODO: only for lend and withdraw

  if (amount === 0) {
    checks.push({ isEnabled: false });
  }

  if (leverage !== undefined && leverage === 0) {
    checks.push({ isEnabled: false });
  }

  return checks;
}

interface CheckStakeActionAvailableProps {
  amount: number | null;
  connected: boolean;
  selectedBank: ExtendedBankInfo | null;
  actionQuote: QuoteResponse | null;
  lstData: LstData | null;
}

export function checkStakeActionAvailable({
  amount,
  connected,
  selectedBank,
  actionQuote,
  lstData,
}: CheckStakeActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0);
  if (generalChecks) checks.push(...generalChecks);

  // if (selectedBank?.meta.tokenSymbol !== "SOL" && !actionQuote) checks.push({ isEnabled: false });

  if (actionQuote?.priceImpactPct && Number(actionQuote.priceImpactPct) > 0.01) {
    if (actionQuote?.priceImpactPct && Number(actionQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(actionQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(actionQuote.priceImpactPct)));
    }
  }

  if (lstData && lstData?.updateRequired)
    checks.push({
      isEnabled: false,
      description: "Epoch change detected - staking available again shortly",
    });

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

interface CheckDepositSwapActionAvailableProps {
  amount: number | null;
  connected: boolean;
  nativeSolBalance: number;
  showCloseBalance?: boolean;
  depositBank: ExtendedBankInfo | null;
  swapBank: ExtendedBankInfo | WalletToken | null;
  banks: ExtendedBankInfo[];
  marginfiAccount: MarginfiAccountWrapper | null;
  lendMode: ActionType;
  allBanks?: ExtendedBankInfo[];
}

export function checkDepositSwapActionAvailable({
  amount,
  nativeSolBalance,
  connected,
  showCloseBalance,
  depositBank,
  swapBank,
  banks,
  marginfiAccount,
  lendMode,
  allBanks,
}: CheckDepositSwapActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  if (
    (depositBank || swapBank) &&
    allBanks &&
    allBanks.some((bank) => bank.isActive && bank.info.rawBank.config.assetTag === 2)
  ) {
    checks.push(STATIC_SIMULATION_ERRORS.STAKED_ONLY_SOL_CHECK);
    return checks;
  }

  if (!connected || !depositBank || !swapBank) {
    checks.push({ isEnabled: false });
    return checks;
  }

  const generalChecks = getGeneralChecks(amount ?? 0, showCloseBalance);
  if (generalChecks) checks.push(...generalChecks);

  // alert checks
  if (depositBank) {
    const depositChecks = canBeDepositSwapped(depositBank, swapBank, nativeSolBalance);
    if (depositChecks.length) checks.push(...depositChecks);
  }
  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

interface CheckTradeActionAvailableProps {
  amount: number | null;
  connected: boolean;
  depositBank: ExtendedBankInfo | null;
  borrowBank: ExtendedBankInfo | null;
  actionQuote: QuoteResponse | null;
  tradeState: "long" | "short";
  leverage: number;
  groupStatus: ArenaGroupStatus;
}

export function checkTradeActionAvailable({
  amount,
  connected,
  depositBank,
  borrowBank,
  actionQuote,
  tradeState,
  groupStatus,
  leverage,
}: CheckTradeActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  const requiredCheck = getRequiredCheck(connected, depositBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0, false, leverage);
  if (generalChecks) checks.push(...generalChecks);

  const tradeSpecificChecks = getTradeSpecificChecks(groupStatus, tradeState, borrowBank, depositBank);
  if (tradeSpecificChecks) checks.push(...tradeSpecificChecks);

  if (depositBank) {
    const tradeChecks = canBeLooped(depositBank, borrowBank, null, actionQuote);
    if (tradeChecks.length) checks.push(...tradeChecks);
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}
