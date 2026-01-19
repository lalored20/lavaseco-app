import { CodeExecution } from './src/lib/brain/code_execution';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("⚡ Iniciando prueba de E2B...");
    const executor = new CodeExecution();

    // Simple Python calculation
    const code = `
x = 10
y = 32
print(f"La suma de {x} + {y} es {x+y}")
    `;

    try {
        const result = await executor.executePython(code);
        console.log("-----------------------------------------");
        console.log(result);
        console.log("-----------------------------------------");
        if (result.includes("42")) {
            console.log("✅ Prueba EXITOSA: El código Python se ejecutó correctamente en la nube.");
        } else {
            console.error("❌ Prueba FALLIDA: El resultado no es el esperado.");
        }
    } catch (error) {
        console.error("❌ Error ejecutando prueba:", error);
    }
}

main();
