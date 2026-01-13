import { Node, Relation, NodeType, RelationType } from './types';

export class LocalGraph {
    nodes: Record<string, Node> = {};
    relations: Relation[] = [];

    constructor(initialData?: { nodes: Record<string, Node>, relations: Relation[] }) {
        if (initialData) {
            this.nodes = initialData.nodes;
            this.relations = initialData.relations;
        }
    }

    addNode(name: string, type: NodeType = 'Concept', properties: Record<string, any> = {}): string {
        const key = name.toLowerCase().trim();
        if (!this.nodes[key]) {
            this.nodes[key] = {
                id: key,
                name,
                type,
                properties,
                origin: 'local',
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
        return key;
    }

    addRelation(source: string, type: RelationType, target: string, context: string = ""): string {
        const id = `${source}_${type}_${target}`.toLowerCase();
        const existing = this.relations.find(r => r.id === id);

        if (existing) {
            existing.context = context;
            existing.version++;
            return existing.id;
        }

        this.addNode(source); // Ensure nodes exist
        this.addNode(target);

        const relation: Relation = {
            id,
            source: source.toLowerCase(),
            target: target.toLowerCase(),
            type,
            weight: 1.0,
            bidirectional: false,
            context,
            origin: 'local',
            version: 1,
            created_at: new Date().toISOString()
        };

        this.relations.push(relation);
        return id;
    }

    // --- QUERY METHODS ---

    query(pattern: string): any[] {
        // Simple simplified query logic
        const term = pattern.toLowerCase();
        const results = [];

        // Search Nodes
        for (const key in this.nodes) {
            if (key.includes(term) || this.nodes[key].name.toLowerCase().includes(term)) {
                results.push({ type: 'node', data: this.nodes[key] });
            }
        }

        // Search Relations
        // TODO: Implement relationship pattern matching if needed
        return results;
    }
}

// Singleton for client-side usage (or server-side per request)
let graphInstance: LocalGraph | null = null;

export const getGraph = () => {
    if (!graphInstance) {
        graphInstance = new LocalGraph();
        // Seed initial knowledge
        graphInstance.addNode("Lavaseco Orquídeas", "Project");
    }
    return graphInstance;
};
