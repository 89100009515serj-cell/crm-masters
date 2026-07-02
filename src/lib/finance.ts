import { Decimal } from "@prisma/client/runtime/library";

export interface FinanceInput {
  totalReceipt: number | string;
  expense: number | string;
}

export interface FinanceResult {
  netReceipt: Decimal;
  masterPayout: Decimal;
  managerPayout: Decimal;
  curatorPayout: Decimal;
  companyProfit: Decimal;
}

const MASTER_RATE = 0.4;
const MANAGER_RATE = 0.04;
const CURATOR_RATE = 0.05;

export function calculateFinance({ totalReceipt, expense }: FinanceInput): FinanceResult {
  const total = new Decimal(totalReceipt);
  const exp = new Decimal(expense);

  const netReceipt = total.minus(exp);
  const masterPayout = netReceipt.times(MASTER_RATE);
  const managerPayout = netReceipt.times(MANAGER_RATE);
  const curatorPayout = netReceipt.times(CURATOR_RATE);
  const companyProfit = netReceipt.minus(masterPayout).minus(managerPayout).minus(curatorPayout);

  return { netReceipt, masterPayout, managerPayout, curatorPayout, companyProfit };
}
