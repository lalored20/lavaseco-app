import { Node, Relation, NodeType, RelationType } from './types';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class RemoteGraph {

    constructor() { }

    async getNodes(params?: { type?: NodeType, limit?: number }): Promise<Node[]> {
        const where: Prisma.memory_nodesWhereInput = {};
        if (params?.type) where.type = params.type;

        const nodes = await prisma.memory_nodes.findMany({
            where,
            take: params?.limit || 100
        });

        return nodes.map(n => ({
            id: n.id,
            name: n.name,
            type: (n.type as NodeType) || 'Concept',
            properties: (n.properties as Record<string, any>) || {},
            origin: 'cloud',
            version: 1,
            created_at: n.created_at?.toISOString() || new Date().toISOString(),
            updated_at: n.updated_at?.toISOString() || new Date().toISOString()
        }));
    }

    async getRelations(): Promise<Relation[]> {
        const relations = await prisma.memory_relations.findMany({ take: 500 });
        return relations.map(r => ({
            id: r.id,
            source: r.source,
            target: r.target,
            type: (r.relationship as RelationType),
            weight: r.confidence || 1.0,
            bidirectional: false,
            context: r.context || "",
            origin: 'cloud',
            version: 1,
            created_at: r.created_at?.toISOString() || new Date().toISOString()
        }));
    }

    async addNode(name: string, type: NodeType = 'Concept', properties: Record<string, any> = {}): Promise<string> {
        const key = name.toLowerCase().trim();

        await prisma.memory_nodes.upsert({
            where: { id: key },
            update: {
                updated_at: new Date(),
                properties: properties
            },
            create: {
                id: key,
                name,
                type,
                properties,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return key;
    }

    async addRelation(source: string, type: RelationType, target: string, context: string = ""): Promise<string> {
        const id = `${source}_${type}_${target}`.toLowerCase();

        await this.addNode(source);
        await this.addNode(target);

        await prisma.memory_relations.upsert({
            where: { id },
            update: {
                context,
                confidence: 1.0,
            },
            create: {
                id,
                source: source.toLowerCase(),
                target: target.toLowerCase(),
                relationship: type,
                context,
                confidence: 1.0,
                created_at: new Date()
            }
        });

        return id;
    }

    async query(pattern: string): Promise<any[]> {
        const term = pattern.toLowerCase();

        const nodes = await prisma.memory_nodes.findMany({
            where: {
                OR: [
                    { id: { contains: term, mode: 'insensitive' } },
                    { name: { contains: term, mode: 'insensitive' } }
                ]
            }
        });

        return nodes.map(n => ({ type: 'node', data: n }));
    }
}

let graphInstance: RemoteGraph | null = null;

export const getGraph = () => {
    if (!graphInstance) {
        graphInstance = new RemoteGraph();
    }
    return graphInstance;
};
