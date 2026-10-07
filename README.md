# MDP Meeting Hub — GitHub Pages + Google Sheets

Interface do Comité de Gestão da Monte do Pasto. O código público não contém os textos das reuniões, palavras-passe nem sessões. Os dados são carregados da Google Sheet privada, através do Google Apps Script, depois de iniciar sessão.

## Instalação

1. Na Google Sheet `meetings`, abrir **Extensões → Apps Script**.
2. Colar `backend/Code.gs` no projeto associado à Sheet e guardar.
3. Em **Definições do projeto → Propriedades do script**, guardar `PASSWORD_INITIAL` com uma palavra-passe de pelo menos 12 caracteres. Executar `configurarPalavraPasse` para a converter em hash e remover o valor inicial; o Google pede autorização para o script aceder às folhas de cálculo. Apenas a Sheet identificada no código é utilizada.
4. **Implementar → Nova implementação → Aplicação Web**, executar como o proprietário, acesso **Qualquer pessoa**. O endpoint é acessível, mas leitura e escrita dos dados exigem uma sessão autenticada pela palavra-passe; a Sheet mantém-se privada.
5. Copiar o URL terminado em `/exec` para `public/config.js` em `API_URL` e executar `npm run build`. Pode também configurar o endereço uma vez no ecrã de login da app; apenas o endereço é guardado localmente.
6. Publicar a pasta `dist` no GitHub Pages. A interface usa caminhos relativos, compatíveis com subpastas de repositório.

## Dados e histórico

A Sheet tem `Base` (40 assuntos e reunião inicial, importação do Excel) e `Eventos` (registo cronológico das alterações). A app reconstrói o estado atual desses registos. Cada escrita utiliza bloqueio do Apps Script e validação da revisão, para evitar atualizações simultâneas perdidas. O encerramento de uma reunião preserva um snapshot; só os assuntos não finalizados transitam.

Não editar ou apagar manualmente a Base ou as linhas de Eventos: a aplicação depende da integridade desse histórico. Pode consultar e exportar os dados na app. Folha1 foi preservada.

## Execução

Node.js 22 ou posterior. `npm install` e `npm run build`. A pasta `dist` é a interface pronta para Pages. Não existe backend Cloudflare ou dependência de Sites nesta versão.

Login partilhado do Comité; sessões de até 6 horas. A palavra-passe é guardada com salt e hash nas propriedades do Apps Script, nunca no repositório. Não existe atribuição individual dos autores dos updates nesta versão.
