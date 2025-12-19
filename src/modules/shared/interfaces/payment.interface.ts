export interface IPaymentStrategy {
    process(amount: number, metadata?: any): Promise<{ transactionId: string; status: string }>;
}

// src/modules/shared/strategies/cash-payment.strategy.ts
export class CashPaymentStrategy implements IPaymentStrategy {
    async process(amount: number) {
        // For cash, we simply acknowledge the collection
        return {
            transactionId: `CASH-${Date.now()}`,
            status: 'SUCCESS'
        };
    }
}
