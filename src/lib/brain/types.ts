
export type NodeType = 'Concept' | 'Technology' | 'Problem' | 'Solution' | 'Pattern' | 'Rule' | 'Error' | 'Project' | 'Preference' | 'Client' | 'Order';

export type RelationType = 'USES' | 'DEPENDS_ON' | 'RESOLVES' | 'CAUSES' | 'IS_A' | 'HAS' | 'CONTAINS' | 'RELATED_TO' | 'LEARNS_FROM' | 'PREFERS' | 'ORDERED';

export interface Node {
    id: string;
    name: string;
    type: NodeType;
    properties: Record<string, any>;
    origin: 'local' | 'cloud' | 'federated';
    version: number;
    created_at: string;
    updated_at: string;
}

export interface Relation {
    id: string;
    source: string;
    target: string;
    type: RelationType;
    weight: number;
    bidirectional: boolean;
    context: string;
    origin: 'local' | 'cloud' | 'federated';
    version: number;
    created_at: string;
}

export interface KnowledgeGap {
    gap_type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    affected_nodes: string[];
    suggested_action: string;
    priority: number;
}
