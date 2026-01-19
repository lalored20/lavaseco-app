import { RemoteGraph } from './src/lib/brain/graph';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("🧠 Iniciando prueba de Antigravity Brain (RemoteGraph)...");
    const graph = new RemoteGraph();

    try {
        console.log("📡 Conectando a Supabase...");
        // Intentar leer nodos existentes (debería haber 37 según la introspección previa)
        const nodes = await graph.getNodes({ limit: 5 });

        console.log("-----------------------------------------");
        console.log(`✅ Conexión Exitosa. Se encontraron ${nodes.length} nodos.`);
        if (nodes.length > 0) {
            console.log("Muestra de nodos:", nodes.map(n => n.name).join(", "));
        } else {
            console.log("⚠️ La base de datos está vacía, pero la conexión funciona.");
        }
        console.log("-----------------------------------------");

    } catch (error) {
        console.error("❌ Error conectando al Cerebro:", error);
    }
}

main();
