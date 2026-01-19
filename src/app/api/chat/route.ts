import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { CodeExecution } from '@/lib/brain/code_execution';
import { RemoteGraph } from '@/lib/brain/graph';
import { NextResponse } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Force Node.js runtime for E2B (Code Interpreter) as it uses native Node modules
export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const codeExecution = new CodeExecution();
        const graph = new RemoteGraph();

        // specific converter because convertToCoreMessages is missing in some builds
        const coreMessages = messages.map((m: any) => {
            if (m.role === 'user') return { role: 'user', content: m.content };
            if (m.role === 'assistant') {
                const content: any[] = [];
                if (m.content) content.push({ type: 'text', text: m.content });
                if (m.toolInvocations) {
                    m.toolInvocations.forEach((ti: any) => {
                        content.push({
                            type: 'tool-call',
                            toolCallId: ti.toolCallId,
                            toolName: ti.toolName,
                            args: ti.args
                        });
                    });
                }
                return { role: 'assistant', content };
            }
            if (m.role === 'tool') {
                return {
                    role: 'tool',
                    content: [{
                        type: 'tool-result',
                        toolCallId: m.toolCallId,
                        toolName: m.toolName,
                        result: m.content
                    }]
                }
            }
            return { role: 'user', content: m.content };
        }).filter((m: any) => m !== null);


        const result = await streamText({
            model: openai('gpt-4o'),
            messages: coreMessages as any, // Cast to any to avoid strict type checks if CoreMessage type is tricky
            system: `You are a helpful assistant for the Lavaseco Orquídeas application.
      
      Time: ${new Date().toLocaleString('es-CO')}
      
      You have access to tools:
      - executePython: For math, data analysis, or running code snippets.
      - saveMemory: To remember important facts, preferences, or errors for the long run.
      
      Be concise and helpful.`,
            tools: {
                executePython: tool({
                    description: 'Execute Python code in a secure sandbox. Use this for complex calculations, date manipulations, or data analysis.',
                    parameters: z.object({
                        code: z.string().describe('The python code to execute'),
                    }) as any,
                    execute: async ({ code }: { code: string }) => {
                        return await codeExecution.executePython(code);
                    },
                } as any),
                saveMemory: tool({
                    description: 'Save a concept, fact, or entity to the long-term memory graph.',
                    parameters: z.object({
                        name: z.string().describe('The name of the concept or entity'),
                        type: z.enum([
                            'Concept', 'Technology', 'Problem', 'Solution', 'Pattern',
                            'Rule', 'Error', 'Project', 'Preference', 'Client', 'Order'
                        ]).optional().describe('The type of the node. Defaults to Concept.'),
                        properties: z.record(z.string(), z.any()).optional().describe('Additional properties or metadata'),
                    }) as any,
                    execute: async ({ name, type = 'Concept', properties = {} }: { name: string, type?: string, properties?: any }) => {
                        return await graph.addNode(name, type as any, properties);
                    },
                } as any)
            },
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
