# PDF Comparison Project

Este projeto utiliza Cypress com BDD (Cucumber) e TypeScript para chamar atraves do cy.task() o Node.js e executar a lógica de comparação entre arquivos PDF.
A comparação ocorre em três níveis:

1. **Texto:** conteúdo textual exato entre os PDFs.
2. **Metadados:** informações embutidas como autor, título, data, etc.
3. **Visual (layout):** diferenças visuais geram uma imagem diff destacando alterações (como assinaturas, elementos gráficos ou formatações diferentes).

---

## 📁 Estrutura de Pastas

pdfs/
- base/ → PDF original de referência (ex: baseFile.pdf)
- compare/ → PDF a ser comparado (ex:validActualFile.pdf)
- diff/ → Geração automática de arquivos de diferença:
--> visual-diff.png → Imagem com destaque das alterações visuais
--> text-diff.txt → Alterações encontradas no conteúdo textual
--> meta-diff.json → Alterações nos metadados

---

## 🚀 Como rodar

### 1. Instalar dependências

```bash
npm install

npx cypress open
# ou para modo headless
npx cypress run
```

## Tecnologias utilizadas

- Cypress
- Cucumber (BDD com Gherkin)
- TypeScript
- pdf-parse – extração de texto e metadados
- pdfjs-dist-legacy – renderização visual do PDF
- pixelmatch – comparação visual de imagens
- canvas – renderização em buffer para imagem
- diff – comparação de texto linha a linha