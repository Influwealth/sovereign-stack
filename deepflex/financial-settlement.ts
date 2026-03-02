import type { FinancialIntent } from "./runtime-core";

export type SettlementStatus = "reserved" | "settled" | "rejected";

export interface SettlementContext {
  message_id: string;
  from: string;
  to: string;
  capability_id: string;
  intent: string;
}

export interface SettlementEvaluation {
  allow: boolean;
  reason: string;
  estimated_cost: number;
  max_spend?: number;
  reservation_id?: string;
  settlement_model?: string;
  currency?: string;
  status: SettlementStatus;
}

export interface SettlementRecord {
  settlement_id: string;
  reservation_id: string;
  status: SettlementStatus;
  amount: number;
  currency: string;
  sponsor?: string;
  settlement_model?: string;
  context: SettlementContext;
  created_at: string;
  updated_at: string;
}

export class FinancialSettlementStub {
  private readonly reservations = new Map<string, SettlementRecord>();
  private readonly settlements = new Map<string, SettlementRecord>();
  private sequence = 0;

  evaluate(financialIntent: FinancialIntent | undefined, context: SettlementContext): SettlementEvaluation {
    if (!financialIntent) {
      return {
        allow: true,
        reason: "No FinancialIntent provided.",
        estimated_cost: 0,
        status: "settled"
      };
    }

    const estimatedCost = this.resolveEstimatedCost(financialIntent);
    const maxSpend =
      typeof financialIntent.max_spend === "number" ? financialIntent.max_spend : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
      return {
        allow: false,
        reason: "FinancialIntent estimated cost is invalid.",
        estimated_cost: 0,
        max_spend: financialIntent.max_spend,
        status: "rejected"
      };
    }

    if (estimatedCost > maxSpend) {
      return {
        allow: false,
        reason: `FinancialIntent blocked: estimated_cost ${estimatedCost} exceeds max_spend ${maxSpend}.`,
        estimated_cost: estimatedCost,
        max_spend: financialIntent.max_spend,
        settlement_model: financialIntent.settlement_model,
        currency: financialIntent.currency,
        status: "rejected"
      };
    }

    const reservationId = `reserve-${Date.now()}-${++this.sequence}`;
    const record: SettlementRecord = {
      settlement_id: "",
      reservation_id: reservationId,
      status: "reserved",
      amount: estimatedCost,
      currency: String(financialIntent.currency || "USD").toUpperCase(),
      sponsor: financialIntent.sponsor,
      settlement_model: financialIntent.settlement_model ?? "stub",
      context,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.reservations.set(context.message_id, record);

    return {
      allow: true,
      reason: "FinancialIntent stub reservation accepted.",
      estimated_cost: estimatedCost,
      max_spend: financialIntent.max_spend,
      reservation_id: reservationId,
      settlement_model: record.settlement_model,
      currency: record.currency,
      status: "reserved"
    };
  }

  settle(messageId: string): SettlementRecord {
    const reservation = this.reservations.get(messageId);
    if (!reservation) {
      throw new Error(`No settlement reservation found for message '${messageId}'.`);
    }

    const settlementId = `settle-${Date.now()}-${++this.sequence}`;
    const settled: SettlementRecord = {
      ...reservation,
      settlement_id: settlementId,
      status: "settled",
      updated_at: new Date().toISOString()
    };

    this.settlements.set(settlementId, settled);
    this.reservations.delete(messageId);
    return settled;
  }

  listSettlements(): SettlementRecord[] {
    return [...this.settlements.values()];
  }

  getReservation(messageId: string): SettlementRecord | null {
    return this.reservations.get(messageId) ?? null;
  }

  private resolveEstimatedCost(financialIntent: FinancialIntent): number {
    if (typeof financialIntent.estimated_cost === "number") {
      return financialIntent.estimated_cost;
    }
    if (typeof financialIntent.budget === "number") {
      return financialIntent.budget;
    }
    return 0;
  }
}
