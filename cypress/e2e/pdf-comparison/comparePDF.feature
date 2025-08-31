Feature: Comparação de PDFs

  Scenario: Verificar que o arquivo atual é idêntico ao arquivo base
    Given que o arquivo "ValidActualFile.pdf" existe na pasta de comparação
    When eu comparo com o arquivo base
    Then o conteúdo e metadados devem ser iguais

  Scenario: Verificar que o arquivo atual possui diferenças em relação ao base
    Given que o arquivo "InvalidActualFile.pdf" existe na pasta de comparação
    When eu comparo com o arquivo base
    Then o conteúdo e metadados devem ser iguais

