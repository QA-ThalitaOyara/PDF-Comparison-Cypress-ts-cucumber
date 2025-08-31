import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

let paths: { base: string; compare: string };

Given("que o arquivo {string} existe na pasta de comparação", (comparePDF: string) => {
  paths = {
    base: 'pdfs/base/baseFile.pdf',
    compare: `pdfs/compare/${comparePDF}`
  };
  cy.readFile(paths.compare, 'binary', { timeout: 10000 }).should('exist');
});

When("eu comparo com o arquivo base", () => {
  cy.task('comparePDFs', paths).then((result: any) => {
    expect(result.pass).to.be.true;
  });
});

Then("o conteúdo e metadados devem ser iguais", () => {
  // Resultado já foi verificado na task
});
