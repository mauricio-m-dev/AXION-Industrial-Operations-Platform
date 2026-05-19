import latex from "node-latex";
import { Readable, PassThrough } from "stream";
import { log } from "../logger";
import os from "os";
import path from "path";

/**
 * Compiles LaTeX source string to PDF buffer.
 * If pdflatex is not available on the system, this will fail or log error.
 */
export async function compileLatexToPdf(texSource: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const input = Readable.from([texSource]);
      const output = new PassThrough();
      const pdfBuffer: Buffer[] = [];

      output.on("data", (chunk) => pdfBuffer.push(chunk));
      output.on("end", () => resolve(Buffer.concat(pdfBuffer)));
      output.on("error", (err) => {
        log(`LaTeX Stream Error: ${err.message}`, "ERROR");
        reject(err);
      });

      // Opções para o compilador
      const options = {
        command: 'pdflatex', // Comando padrão do TeX Live
        errorLogs: path.join(os.tmpdir(), 'latex-errors.log')
      };

      const pdf = latex(input, options);
      pdf.pipe(output);

      pdf.on("error", (err) => {
        log(`LaTeX Compilation Error: ${err.message}. Check if pdflatex is installed.`, "ERROR");
        reject(new Error(`Falha na compilação LaTeX: ${err.message}`));
      });
    } catch (err: any) {
      log(`Unexpected error during LaTeX compilation: ${err.message}`, "ERROR");
      reject(err);
    }
  });
}
