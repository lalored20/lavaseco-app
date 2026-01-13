import { LocalGraph, getGraph } from './graph';
import { KnowledgeGap } from './types';

export class ActiveInference {
    graph: LocalGraph;

    constructor(graph?: LocalGraph) {
        this.graph = graph || getGraph();
    }

    analyzeGaps(): KnowledgeGap[] {
        const gaps: KnowledgeGap[] = [];

        // 1. Detect Isolated Nodes (Islands of Knowledge)
        const connected = new Set<string>();
        this.graph.relations.forEach(r => {
            connected.add(r.source);
            connected.add(r.target);
        });

        Object.keys(this.graph.nodes).forEach(key => {
            if (!connected.has(key)) {
                gaps.push({
                    gap_type: 'isolated_node',
                    severity: 'warning',
                    description: `'${this.graph.nodes[key].name}' está aislado - sin conexiones.`,
                    affected_nodes: [key],
                    suggested_action: `Conectar '${this.graph.nodes[key].name}' con otros conceptos.`,
                    priority: 5
                });
            }
        });

        // 2. Business Logic Gaps (Lavaseco Specific)
        // Example: Clients without phone numbers
        Object.values(this.graph.nodes).forEach(node => {
            if (node.type === 'Client' && !node.properties.phone) {
                gaps.push({
                    gap_type: 'missing_data',
                    severity: 'critical',
                    description: `Cliente '${node.name}' no tiene teléfono.`,
                    affected_nodes: [node.id],
                    suggested_action: 'Solicitar número de teléfono en la próxima visita.',
                    priority: 9
                });
            }
        });

        return gaps.sort((a, b) => b.priority - a.priority);
    }
}
