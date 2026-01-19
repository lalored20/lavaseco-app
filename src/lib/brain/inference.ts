import { RemoteGraph, getGraph } from './graph';
import { KnowledgeGap } from './types';

export class ActiveInference {
    graph: RemoteGraph;

    constructor(graph?: RemoteGraph) {
        this.graph = graph || getGraph();
    }

    async analyzeGaps(): Promise<KnowledgeGap[]> {
        const gaps: KnowledgeGap[] = [];

        // Fetch current state from DB
        const nodes = await this.graph.getNodes({ limit: 200 });
        const relations = await this.graph.getRelations();

        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        // 1. Detect Isolated Nodes
        const connected = new Set<string>();
        relations.forEach(r => {
            connected.add(r.source);
            connected.add(r.target);
        });

        nodes.forEach(node => {
            if (!connected.has(node.id)) {
                gaps.push({
                    gap_type: 'isolated_node',
                    severity: 'warning',
                    description: `'${node.name}' está aislado - sin conexiones.`,
                    affected_nodes: [node.id],
                    suggested_action: `Conectar '${node.name}' con otros conceptos.`,
                    priority: 5
                });
            }
        });

        // 2. Business Logic Gaps
        nodes.forEach(node => {
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
