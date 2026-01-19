// import { CodeInterpreter } from '@e2b/code-interpreter';

export class CodeExecution {

    async executePython(code: string): Promise<string> {
        const apiKey = process.env.E2B_API_KEY;
        if (!apiKey) {
            console.warn("E2B_API_KEY missing. Skipping code execution.");
            return "Code execution skipped: API Key missing.";
        }

        console.log("🚀 Starting E2B Code Interpreter...");
        let sandbox;
        try {
            // @ts-ignore - Bypass TS check for dynamic import
            const module = await import('@e2b/code-interpreter');
            const CodeInterpreter = (module as any).CodeInterpreter || (module as any).default?.CodeInterpreter;
            sandbox = await CodeInterpreter.create({ apiKey });
            console.log("📝 Executing Python code:", code);

            const execution = await sandbox.notebook.execCell(code);

            let output = "";
            if (execution.text) output += execution.text + "\n";
            // if (execution.results) output += JSON.stringify(execution.results) + "\n";
            if (execution.logs?.stdout) output += execution.logs.stdout.join('\n') + "\n";
            if (execution.logs?.stderr) output += "ERROR: " + execution.logs.stderr.join('\n') + "\n";
            if (execution.error) output += "EXCEPTION: " + execution.error.name + ": " + execution.error.value;

            return output.trim() || "Code executed successfully (No output).";

        } catch (err: any) {
            console.error("🔥 Critical Sandbox Error:", err);
            return `System Error: ${err.message}`;
        } finally {
            if (sandbox) {
                try {
                    await sandbox.close();
                } catch (e) { console.error("Error closing sandbox", e); }
            }
        }
    }
}
