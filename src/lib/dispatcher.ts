export type IntentType = 'CREATE_ORDER' | 'SEARCH_ORDER' | 'STATUS_UPDATE' | 'UNKNOWN';

export interface IntentResult {
    type: IntentType;
    entities: {
        client?: string;
        items?: any[];
        orderId?: string;
        raw?: string;
    };
    confidence: number;
}

export async function classifyIntent(text: string): Promise<IntentResult> {
    const lowerText = text.toLowerCase();

    // Basic Keyword Matching (Placeholder for AI)
    if (lowerText.includes('nuevo') || lowerText.includes('crear') || lowerText.includes('ingreso')) {
        return {
            type: 'CREATE_ORDER',
            entities: {
                raw: text
            },
            confidence: 0.9
        };
    }

    if (lowerText.includes('buscar') || lowerText.includes('donde') || lowerText.includes('estado')) {
        return {
            type: 'SEARCH_ORDER',
            entities: {
                raw: text
            },
            confidence: 0.8
        };
    }

    return {
        type: 'UNKNOWN',
        entities: { raw: text },
        confidence: 0.5
    };
}
