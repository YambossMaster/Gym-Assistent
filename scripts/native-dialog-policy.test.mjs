import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Repository tooling uses the existing JS compiler from the API toolchain.
// Web's native TypeScript compiler does not expose the compiler API.
const root = fileURLToPath(new URL('../apps/web/src/', import.meta.url))
function productionSources(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name)
    if (entry.isDirectory()) return productionSources(child)
    return /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [child] : []
  })
}

test('product flows do not call native alert, confirm, prompt or beforeunload dialogs', () => {
  const files = productionSources(root)
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.dom.d.ts', 'lib.es2022.d.ts'],
    types: [],
    noResolve: true,
  })
  const checker = program.getTypeChecker()
  const violations = []
  const paths = new Set(files.map((file) => file.replaceAll('\\', '/')))
  const inspected = program
    .getSourceFiles()
    .filter((source) => paths.has(source.fileName.replaceAll('\\', '/')))
  assert.ok(
    inspected.some((source) =>
      source.fileName.replaceAll('\\', '/').endsWith('/pages/training/TrainingWorkspace.tsx'),
    ),
  )
  for (const file of inspected) {
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const expression = node.expression
        const symbol = checker.getSymbolAtLocation(
          ts.isPropertyAccessExpression(expression) ? expression.name : expression,
        )
        const native = symbol?.declarations?.some((declaration) =>
          /[\\/]lib\.dom\.d\.ts$/.test(declaration.getSourceFile().fileName),
        )
        if (native && symbol && ['alert', 'confirm', 'prompt'].includes(symbol.name))
          violations.push(`${file.fileName}: ${expression.getText(file)}`)
        if (
          node.arguments.some(
            (argument) => ts.isStringLiteral(argument) && argument.text === 'beforeunload',
          )
        )
          violations.push(`${file.fileName}: beforeunload listener`)
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  assert.deepEqual(violations, [])
})
