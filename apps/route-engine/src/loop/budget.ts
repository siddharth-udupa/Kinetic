import { LOOP_BUDGET_MS, MAX_VALHALLA_CALLS } from "./config.js"
import type { Budget } from "./types.js"

export function createBudget(): Budget {
  return {
    calls: 0,
    deadline: performance.now() + LOOP_BUDGET_MS,
  }
}

export function canCall(budget: Budget): boolean {
  return (
    budget.calls < MAX_VALHALLA_CALLS && performance.now() < budget.deadline
  )
}

export function remainingBudgetMs(budget: Budget): number {
  return budget.deadline - performance.now()
}

/** Stops any further attempts after a transport failure. */
export function stopBudget(budget: Budget): void {
  budget.deadline = 0
}
