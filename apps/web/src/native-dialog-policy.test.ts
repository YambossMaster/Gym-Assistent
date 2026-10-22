import ts from 'typescript'
import { expect, it } from 'vitest'

const sources = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
  eager: true,
  query: '?raw',
  import: 'default'
})

it('keeps native alert, confirm, prompt and beforeunload dialogs out of product flows', () => {
  const files = Object.keys(sources).map((path) => `src/${path.slice(2)}`)
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.dom.d.ts', 'lib.es2022.d.ts'],
    types: [],
    noResolve: true
  })
  const checker = program.getTypeChecker()
  const violations: string[] = []
  const paths = new Set(files.map((file) => file.replaceAll('\\', '/')))
  const inspected = program
    .getSourceFiles()
    .filter((source) => paths.has(source.fileName.replaceAll('\\', '/')))
  expect(inspected.map((source) => source.fileName.replaceAll('\\', '/'))).toContain(
    'src/pages/training/TrainingWorkspace.tsx'
  )
  for (const file of inspected) {
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const expression = node.expression
        const symbol = checker.getSymbolAtLocation(
          ts.isPropertyAccessExpression(expression) ? expression.name : expression
        )
        const native = symbol?.declarations?.some((declaration) =>
          /[\\/]lib\.dom\.d\.ts$/.test(declaration.getSourceFile().fileName)
        )
        if (native && symbol && ['alert', 'confirm', 'prompt'].includes(symbol.name))
          violations.push(`${file.fileName}: ${expression.getText(file)}`)
        if (
          node.arguments.some(
            (argument) => ts.isStringLiteral(argument) && argument.text === 'beforeunload'
          )
        )
          violations.push(`${file.fileName}: beforeunload listener`)
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  expect(violations).toEqual([])
}, 30_000)
