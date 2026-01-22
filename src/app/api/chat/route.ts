import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    // Verificar si OpenAI está configurado
    if (!process.env.OPENAI_API_KEY) {
        return new Response(JSON.stringify({
            error: 'El asistente de IA no está disponible',
            message: 'Esta funcionalidad requiere configuración adicional de OpenAI'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { messages } = await req.json();

    const result = streamText({
        model: openai('gpt-4o'),
        system: `You are the "Orquídeas AI", an expert business analyst and assistant for Lavaseco Orquídeas.
    
    You have direct read-access to the PostgreSQL database via the \`run_sql_query\` tool.
    You have access to unstructured knowledge (manuals, policies) via the \`query_vector_store\` tool.
    
    ## Database Schema
    
    model User {
      id String @id
      name String?
      role Role @default(STAFF)
    }

    model Client {
      id String @id 
      cedula String? @unique
      name String
      phone String?
      address String?
      orders Order[]
    }

    model Order {
      id String @id
      ticketNumber Int // Use this for "Order #123"
      status String // 'PENDIENTE', 'EN_PROCESO', 'delivered', 'CANCELADO', 'PROBLEMA'
      location String
      totalValue Float
      paidAmount Float
      paymentStatus String // 'PENDIENTE', 'PAGADO', 'ABONO', 'CANCELADO'
      consumption Date // createdAt
      scheduledDate DateTime?
      deliveredDate DateTime?
      client Client
      items OrderItem[]
      payments PaymentLog[]
    }

    model OrderItem {
      id String @id
      quantity Int
      type String // Description of garment e.g. "Pantalon", "Camisa"
      color String?
      notes String? // Defects like "Mancha", "Roto"
      price Float
    }

    model PaymentLog {
      amount Float
      type String // 'ABONO', 'CANCELACION'
      note String? // e.g. "Abono registrado (Efectivo)"
      createdAt DateTime
    }

    model Expense {
      description String
      amount Float
      category String?
      date DateTime
    }

    model DailyGarmentCount {
      date DateTime @unique
      plantCount Int
      homeCount Int
      plantNotes String?
      homeNotes String?
    }

    ## Guidelines
    
    1. **SQL Queries**: ALWAYS prioritize using \`run_sql_query\` for questions about numbers, orders, money, or clients.
       - READ ONLY. Do not ever output INSERT/UPDATE/DELETE.
       - If asked "How much did we make today?", query \`PaymentLog\` filtering by \`createdAt\`.
       - If asked "Where is order 1045?", query \`Order\` by \`ticketNumber\`.
    
    2. **Unstructured Data**: Use \`query_vector_store\` for questions about cleaning processes, prices (if not in DB), or general policies.
    
    3. **Tone**: Professional, concise, and helpful. You are talking to the business owner or staff.
    
    4. **Safety**: If a user asks to delete or modify data, respectfully decline and say you are read-only.
    
    5. **Current Time**: Always get current time if the user asks "today", "yesterday", or assumes a date context.
    `,
        messages,
        tools: {
            // @ts-ignore - Bypassing tool type mismatch for production build
            run_sql_query: tool({
                description: 'Execute a read-only SQL query on the PostgreSQL database.',
                parameters: z.object({
                    sql: z.string().describe('The SQL query to execute. Must be a SELECT statement.'),
                    explanation: z.string().describe('Brief explanation of what this query retrieves.')
                }),
                execute: async ({ sql }: { sql: string }) => {
                    // SECURITY CHECK: only SELECT allowed
                    if (!/^\s*SELECT/i.test(sql.trim())) {
                        return "ERROR: Only SELECT statements are allowed for safety.";
                    }
                    if (/;.*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)/i.test(sql)) {
                        return "ERROR: Destructive commands detected and blocked.";
                    }

                    try {
                        // Execute raw SQL
                        const result = await prisma.$queryRawUnsafe(sql);
                        // Convert BigInt to string for JSON serialization
                        return JSON.parse(JSON.stringify(result, (key, value) =>
                            typeof value === 'bigint'
                                ? value.toString()
                                : value // return everything else unchanged
                        ));
                    } catch (error: any) {
                        return `Database Error: ${error.message}`;
                    }
                },
                // @ts-ignore
                query_vector_store: tool({
                    description: 'Search the knowledge base (manuals, policies) for text answers.',
                    parameters: z.object({
                        query: z.string().describe('The search query for the vector store.')
                    }),
                    execute: async ({ query }: { query: string }) => {
                        // Placeholder: Returing a mock for now until Vector Store is set up
                        return `[Mock Result] Found info on: "${query}". Context: "Lavaseco Orquídeas standard procedure for silk is dry clean only..."`;
                        // @ts-ignore
                        get_current_time: tool({
                            description: 'Get the current server time and date.',
                            parameters: z.object({}),
                            execute: async () => {
                                return new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
                            },
                        },
        },
                });

                return result.toDataStreamResponse();
            }
