# Epochs Idle — Especificação de Design e Comportamento

**Version:** 1.6
**Status:** FINAL DESIGN CANDIDATE — READY FOR USER APPROVAL

---

# 0. Finalidade deste documento

Este documento define **o jogo que Epochs Idle deve ser no estado final desejado**.

Ele não descreve como o código atual funciona e não deve usar limitações da implementação atual para redefinir o design.

O código existente é apenas evidência do estado atual do projeto.

Este documento deve ser suficientemente detalhado para que uma implementação futura possa ser comparada contra ele sem depender de interpretações subjetivas.

Quando uma regra de produto ou comportamento ainda não estiver decidida, ela deve permanecer explicitamente marcada como **QUESTÃO ABERTA DE DESIGN**.

Nenhuma questão aberta deste documento pode ser transformada silenciosamente em requisito pelo agente de engenharia.

---

# 1. Autoridade e hierarquia

A autoridade de produto segue esta ordem:

1. decisões de design explicitamente aprovadas pelo usuário;
2. este documento, quando consolidado e aprovado;
3. documentação técnica derivada deste documento;
4. implementação;
5. testes e evidências de comportamento;
6. interpretações e propostas técnicas.

O usuário é a fonte principal para decisões de produto.

O assistente e o agente de engenharia são responsáveis por:

* identificar inconsistências;
* identificar lacunas;
* analisar consequências;
* encontrar riscos;
* propor soluções técnicas;
* demonstrar conflitos entre requisitos;
* definir posteriormente o caminho de implementação.

Nenhuma limitação técnica deve silenciosamente alterar uma decisão de produto.

---

# 2. Relação com a documentação existente

`docs/design/EPOCHS-IDLE-DESIGN-SPEC.md` é a especificação canônica destinada a consolidar o comportamento final do jogo.

`docs/game-design/DESIGN-DECISIONS.md` permanece como **registro histórico e de rastreabilidade das decisões de Game Design**.

A função de cada documento é diferente.

### `EPOCHS-IDLE-DESIGN-SPEC.md`

Responde:

> **Como o jogo deve ser?**

É a fonte canônica das regras finais de produto e comportamento depois de aprovada.

### `DESIGN-DECISIONS.md`

Responde:

> **Quais decisões foram tomadas durante a evolução do projeto?**

Preserva:

* decisões anteriores;
* contexto;
* status;
* histórico;
* rastreabilidade.

Não deve ser tratado como uma segunda especificação concorrente.

Quando uma decisão histórica for posteriormente substituída por uma decisão aprovada mais recente, a decisão antiga pode permanecer no registro histórico, mas não deve ser considerada a regra vigente.

---

# 3. Visão geral do jogo

Epochs Idle é uma simulação estratégica de grande escala em que o jogador acompanha e influencia a evolução de uma sociedade humana desde os primeiros agrupamentos humanos até sociedades complexas e futuras.

O mundo deve ser vivo, persistente e causal.

O jogador não controla simplesmente um contador de recursos nem seleciona uma civilização pronta para receber bônus.

O jogador participa da história por meio de um personagem pertencente a uma dinastia, dentro de uma sociedade e de um mundo em transformação.

A sociedade evolui, entra em conflito, migra, aprende, produz, desenvolve cultura, cria e transforma religiões, cria instituições, forma e perde entidades políticas, desenvolve tecnologias e sofre consequências ambientais e sociais.

O mundo possui seu próprio começo e sua própria história.

Cada campanha deve poder produzir uma trajetória histórica própria, diferente das demais.

A história de cada partida depende fortemente:

* das escolhas do jogador;
* das ações dos NPCs;
* da evolução das sociedades;
* das interações entre os sistemas;
* dos acontecimentos emergentes;
* das condições do mundo.

O mundo continua existindo e evoluindo mesmo quando o jogador não está presente, obedecendo às regras de simulação e às configurações de automação definidas.

---

# 4. Princípios fundamentais do jogo

## 4.1. Mundo vivo

O mundo deve continuar existindo e produzindo consequências independentemente da presença do jogador.

A ausência do jogador não deve fazer o mundo artificialmente parar, salvo nas situações explicitamente definidas pelas regras de pausa e offline.

## 4.2. Causalidade

Eventos importantes devem ter causas e consequências compreensíveis.

O jogador deve conseguir compreender, em linguagem do próprio universo do jogo, por que algo aconteceu quando isso for perceptível ao mundo.

Exemplo:

seca → queda da produção de alimentos → escassez → fome → mortalidade e/ou migração → instabilidade → revolta.

A informação deve permitir que o jogador aprenda com os acontecimentos e modifique seu comportamento para alterar acontecimentos futuros.

## 4.3. Consequência real

Decisões importantes devem produzir consequências reais e persistentes no mundo.

O jogo não deve criar a aparência de consequência sem alterar de fato os sistemas afetados.

## 4.4. Sistemas interligados

Economia, população, cultura, religião, tecnologia, governo, diplomacia, guerra, geografia, logística e personagens devem interagir de maneira causal.

Nenhum sistema principal deve existir apenas como decoração isolada.

## 4.5. Semântica acima de truques

Desempenho, execução em lote, aceleração temporal ou otimização não podem mudar silenciosamente o significado do mundo.

Uma aproximação técnica só é aceitável quando preserva a semântica exigida pelo design.

---

# 5. Modo de jogo

## 5.1. Free / Single-Player

O modo principal de jogo é **Free**.

O mundo evolui organicamente de forma totalmente livre.

Não existe uma narrativa histórica obrigatória que determine a sequência dos acontecimentos.

Não existe um Story Mode separado que imponha uma cronologia fixa ou uma sequência obrigatória de eventos.

Cada partida deve ser capaz de produzir uma história:

* nova;
* diferente;
* orgânica;
* emergente;
* própria;
* potencialmente única.

O mundo começa nos primeiros agrupamentos humanos e desenvolve sua própria trajetória histórica.

A evolução depende:

* das ações do jogador;
* das ações dos NPCs;
* da geografia;
* das condições ambientais;
* da cultura;
* da religião;
* da tecnologia;
* da política;
* da diplomacia;
* da economia;
* da guerra;
* da migração;
* dos acontecimentos emergentes.

Não existe obrigação de reproduzir a História humana real.

O enredo e os acontecimentos de cada partida devem se adaptar organicamente ao que aconteceu naquela campanha.

## 5.2. Multiplayer

Modo multiplayer futuro baseado em um mundo compartilhado.

O desenvolvimento do multiplayer deve preservar os princípios fundamentais de tempo, causalidade, persistência e continuidade do mundo definidos neste documento.

Não existe obrigação de reproduzir a História humana real também no multiplayer.

---

# 6. Mundo, mapa e ambiente

## 6.1. Princípio geográfico

A referência geográfica do mundo deve reproduzir a configuração física desejada dos continentes e grandes massas de água do planeta.

O objetivo é possuir um mapa com aparência e estrutura geográfica familiar, incluindo:

* continentes;
* oceanos;
* mares;
* estreitos;
* rios;
* relevo;
* montanhas;
* desertos;
* regiões polares;
* áreas de gelo;
* costas;
* águas navegáveis;
* zonas climáticas;
* fauna;
* flora.

## 6.2. Não é uma reconstrução histórica do mundo real

Epochs Idle **não é um simulador de História humana real**.

O jogo não possui obrigação de reproduzir:

* povos históricos reais;
* fronteiras históricas;
* impérios históricos;
* guerras históricas;
* datas históricas;
* religiões históricas;
* culturas históricas;
* tecnologias na mesma ordem da História real;
* acontecimentos históricos reais.

O mundo possui seu próprio começo, sua própria evolução e sua própria história.

O jogador constrói sua própria trajetória histórica dentro desse mundo.

## 6.3. Geografia como ambiente

A semelhança com o mundo real está principalmente no **ambiente físico e geográfico**.

O relevo, clima, flora, fauna, disponibilidade ambiental e configuração territorial devem formar o cenário sobre o qual a história emergente acontece.

## 6.4. Escala

O mundo possui aproximadamente:

* 320.000 hexágonos;
* representação geográfica em grande escala;
* continentes;
* oceanos;
* mares;
* estreitos;
* rios;
* relevo;
* clima;
* desertos;
* regiões montanhosas;
* áreas de gelo;
* águas navegáveis;
* áreas selvagens ou ainda não exploradas.

## 6.5. Geografia

A geografia deve possuir importância estratégica real.

Ela deve influenciar, conforme os sistemas correspondentes:

* sobrevivência;
* produção;
* população;
* migração;
* comércio;
* guerra;
* logística;
* acesso;
* navegação;
* expansão;
* riscos ambientais.

## 6.6. Navegação espacial

O mapa deve permitir deslocamento horizontal amplo e contínuo.

O mundo não deve funcionar como um mapa pequeno com bordas artificiais usadas para limitar permanentemente a expansão horizontal.

A extensão vertical representa a extensão geográfica do mundo.

## 6.7. Exploração

Regiões desconhecidas devem poder permanecer fora do conhecimento do jogador até serem exploradas.

O jogo deve suportar:

### Modo de mundo visível

O jogador consegue visualizar o mundo físico completo, mas isso não implica conhecimento automático das informações internas dos povos que ainda não foram descobertos.

### Modo com névoa de guerra

A informação começa limitada e aumenta conforme a exploração e os contatos permitem.

A existência física de um território não implica automaticamente conhecimento de:

* população;
* forças militares;
* economia;
* tecnologia;
* religião;
* intenções diplomáticas;
* outros dados internos.

---

# 7. Criação de campanha e início do jogador

## 7.1. Região inicial

O jogador escolhe uma **região inicial**.

A região é escolhida porque representa uma localização geográfica inicial, e não uma civilização pronta.

## 7.2. Civilização não é escolhida no início

O jogador **não escolhe uma civilização pronta** no início da campanha.

O mundo começa com os primeiros agrupamentos humanos e sociedades iniciais em desenvolvimento.

A civilização emerge ao longo da história.

## 7.3. Cultura não é classe inicial

O jogador não escolhe simplesmente uma cultura pronta como classe.

A cultura de sua sociedade deve emergir da combinação de:

* região;
* ambiente;
* história;
* relações com outros grupos;
* migração;
* religião;
* políticas;
* comércio;
* guerras;
* assimilação;
* mistura cultural;
* transmissão entre gerações.

A escolha de região pode produzir uma maior probabilidade de determinadas características culturais, mas isso não deve transformar cultura em uma opção fixa equivalente a uma classe de personagem.

## 7.4. Religião não é escolhida no início

A criação da campanha **não deve perguntar ao jogador qual religião ele deseja**.

O jogador não começa escolhendo uma religião.

As religiões devem surgir naturalmente dentro das sociedades à medida que:

* os grupos humanos se desenvolvem;
* as culturas se formam;
* crenças aparecem;
* crenças se organizam;
* instituições religiosas se desenvolvem;
* as sociedades interagem.

A religião deve ser parte da evolução orgânica do mundo.

## 7.5. Posição pessoal diante da religião

A posição pessoal do personagem diante da religião é diferente da religião existente na sociedade.

O jogador pode definir uma posição pessoal, quando essa opção estiver disponível, como:

* **ateísmo**;
* **agnosticismo**;
* outras posições pessoais que venham a ser definidas.

Essa escolha **não é uma escolha de religião** e não determina qual religião surgirá na sociedade.

As regras mecânicas específicas aplicáveis a posições sem religião institucional (como as vantagens científicas do ateísmo e as regras do agnosticismo) estão definidas no sistema religioso correspondente (ver Seção 15.6).

## 7.6. Adoção de religião pelo jogador

O jogador pode posteriormente escolher uma religião existente em sua sociedade ou em seu contexto político e adotá-la como religião oficial, de acordo com as regras do sistema religioso e governamental.

Para as regras completas de adoção de uma religião oficial existente, ver a Seção 15.3.

A religião continua sendo parte da história orgânica do mundo.

## 7.7. Personagem inicial

O jogador controla um personagem específico.

A criação pode permitir:

* escolha ou geração de aparência;
* geração ou seleção de identidade;
* distribuição de atributos iniciais;
* geração de avatar;
* envio de um avatar/imagem pelo jogador;
* outros elementos de personalização definidos pela versão final da criação de personagem.

O personagem ganha experiência, evolui e pode desenvolver suas capacidades ao longo da campanha.

A quantidade exata de pontos de atributos e o balanceamento numérico devem ser definidos separadamente.

---

# 8. Tempo

## 8.1. Unidade fundamental

**1 tick = 1 dia de jogo.**

O calendário utiliza:

* 30 dias por mês;
* 12 meses por ano;
* 360 dias por ano.

## 8.2. Calendário

O mundo deve apresentar um calendário compreensível.

O jogador deve conseguir saber:

* ano;
* mês;
* dia, quando essa precisão estiver disponível na interface.

## 8.3. Velocidade

O jogo possui velocidades de processamento de:

**1x até 30x.**

Velocidade altera a velocidade de processamento dos ticks.

Ela **não altera a duração matemática ou semântica de cada tick**.

Em particular:

* 1 tick continua representando 1 dia;
* 30x não transforma 1 tick em um período de tempo diferente;
* velocidade maior apenas permite processar mais tempo de jogo por unidade de tempo real enquanto o jogo está em execução.

## 8.4. Referência temporal de processamento

A referência temporal base definida para o jogo é:

**1 tick de jogo = 10 segundos reais em 1x.**

Assim, em 1x:

* 10 segundos reais → 1 dia de jogo;
* 300 segundos reais → 30 dias de jogo;
* 3.600 segundos reais → 360 dias de jogo;
* 100 anos de jogo → 36.000 ticks.

A 30x, o processamento pode alcançar:

**300 dias de jogo por 10 segundos reais**, sem alterar a definição de um tick.

## 8.5. Regra de fidelidade

O jogo não pode tratar 30x como autorização para ignorar causas intermediárias que seriam importantes em velocidade normal.

Eventos, descobertas, mudanças de população, mudanças religiosas, alterações econômicas e demais efeitos cuja ordem temporal seja importante devem manter sua causalidade.

## 8.6. Apresentação visual em velocidades altas

Em velocidades elevadas, o jogo pode simplificar visualmente:

* animações;
* efeitos gráficos;
* quantidade de detalhes visuais;
* frequência de atualizações puramente cosméticas;
* outros elementos de apresentação que não alterem o estado da simulação.

Essa simplificação visual **não pode alterar a semântica, o resultado ou a causalidade da simulação**.

## 8.7. Pausa voluntária

Quando o jogador pressiona **Pause**:

* o processamento da simulação para;
* o estado do mundo permanece congelado exatamente naquele ponto;
* o tempo real continua correndo fora da simulação, mas não é convertido em tempo de jogo;
* fechar o aplicativo enquanto o jogo estiver pausado preserva esse mesmo estado;
* ao reabrir o jogo, ele deve continuar pausado e exatamente no mesmo tick em que foi pausado;
* clicar em Play retoma a simulação a partir daquele mesmo estado;
* nenhuma progressão offline deve ser calculada enquanto o jogo estiver pausado.

**Regra explícita:** se o jogador não quiser que o mundo prossiga enquanto estiver ausente, deve pausar o jogo antes de sair do aplicativo.

---

# 9. Offline e continuidade do mundo

## 9.1. Princípio

Quando o jogador fecha o aplicativo **sem ter pausado o jogo**, o mundo pode continuar sua evolução segundo as regras de simulação.

A ausência do jogador não interrompe automaticamente a simulação.

Por outro lado, **se o jogador tiver pausado o jogo antes de sair**, o mundo não deve continuar durante sua ausência.

Portanto:

**Jogo em execução + aplicativo fechado → simulação offline pode ocorrer.**

**Jogo pausado + aplicativo fechado → nenhuma simulação offline ocorre.**

## 9.2. Velocidade durante o offline

Quando o jogador fecha o aplicativo, o processamento offline deve usar **a referência de velocidade 1x**, independentemente da velocidade selecionada antes do fechamento.

A velocidade escolhida enquanto o jogo estava aberto não deve ser carregada para o processamento offline.

Portanto:

* jogador fecha em 1x → offline em 1x;
* jogador fecha em 10x → offline em 1x;
* jogador fecha em 30x → offline em 1x.

A velocidade de 1x–30x é uma configuração da experiência de processamento enquanto o jogo está sendo executado e não altera a taxa de referência do processamento offline.

## 9.3. Conversão de tempo real para tempo de jogo

O tempo real transcorrido durante a ausência pode ser convertido em ticks de jogo usando a referência temporal de **1x** definida na Seção 8.

A relação temporal deve permanecer coerente com a semântica do jogo:

**1 tick = 1 dia de jogo.**

Em termos da referência base:

**10 segundos reais em 1x = 1 tick.**

Como o offline utiliza 1x, a conversão não depende da última velocidade escolhida antes do fechamento.

O cálculo offline não deve utilizar uma segunda definição independente de tempo.

A execução offline deve preservar a semântica de eventos e causalidade do jogo conforme os requisitos da simulação em lote definidos posteriormente no documento técnico de implementação.

A existência de execução offline não autoriza substituir silenciosamente a simulação por multiplicações que alterem seus efeitos intermediários.

## 9.4. Limite offline

Em single-player, o jogador pode configurar um limite offline de:

**1 a 100 anos de jogo.**

Como:

1 ano = 360 ticks,

100 anos correspondem a:

**36.000 ticks.**

## 9.5. Congelamento exato

Ao alcançar o limite offline configurado:

* a simulação deve parar naquele ponto;
* o mundo deve permanecer exatamente naquele tick;
* não deve continuar acumulando tempo virtual além do limite.

## 9.6. Retorno após atingir o limite

Ao reabrir o jogo após o mundo ter atingido o limite:

* o jogo permanece pausado;
* o mundo permanece exatamente no tick congelado;
* o tempo real transcorrido depois do congelamento é completamente ignorado;
* ao clicar em Play, a simulação continua daquele mesmo estado.

Não deve haver cálculo retroativo do tempo real ocorrido enquanto o mundo estava congelado.

## 9.7. Retorno após pausa voluntária

Quando o jogador tiver pausado voluntariamente antes de fechar o aplicativo:

* o estado salvo deve representar o ponto exato da pausa;
* nenhuma progressão offline deve ser aplicada;
* o tempo real transcorrido durante a ausência deve ser completamente ignorado;
* ao reabrir o jogo, ele continua pausado;
* ao pressionar Play, a simulação continua exatamente do tick em que foi pausada.

## 9.8. Distinção entre pausa voluntária e limite offline

Pausa voluntária e congelamento por limite offline possuem a mesma consequência temporal básica — o mundo fica parado —, mas possuem causas diferentes:

* **Pausa voluntária:** o jogador escolheu interromper a simulação.
* **Limite offline:** a simulação offline atingiu o máximo configurado.

Nos dois casos, o tempo real posterior ao congelamento não deve ser transformado em tempo de jogo.

## 9.9. Resumo do comportamento temporal

| Situação                                | Velocidade usada                  | Mundo continua?           | Ao reabrir                       |
| --------------------------------------- | --------------------------------- | ------------------------- | -------------------------------- |
| Jogo rodando e jogador fecha sem pausar | Offline usa 1x                    | Sim, até o limite offline | Retoma do ponto alcançado        |
| Jogador está em 30x e fecha sem pausar  | Offline usa 1x                    | Sim, até o limite offline | Retoma do ponto alcançado        |
| Jogador pausa e fecha                   | Não há processamento offline      | Não                       | Continua pausado no mesmo estado |
| Offline atinge o limite                 | O processamento para no limite    | Não                       | Permanece pausado no tick limite |
| Jogador pressiona Play                  | Velocidade escolhida pelo jogador | Sim                       | Retoma daquele tick              |

---

# 10. Automação e controle do jogador

## 10.1. Controle manual

Manual significa:

**o jogo não toma novas decisões estratégicas no lugar do jogador naquele setor.**

Isso não significa que todas as atividades parem.

Ações já iniciadas continuam.

Respostas automáticas necessárias à sobrevivência ou defesa direta podem continuar.

## 10.2. Automação por setor

Cada setor relevante pode ter configuração independente.

Exemplos:

* militar;
* religião;
* comércio;
* diplomacia;
* administração;
* outros setores que forem definidos.

O jogador pode escolher:

* controle manual;
* automação.

## 10.3. Estilos de automação

Os estilos devem expressar a intenção estratégica do jogador.

Exemplos já definidos:

### Militar

* defensivo passivo;
* defensivo com retaliação;
* moderado;
* agressivo;
* expansionista.

### Religião

* conservação;
* expansão;
* outras políticas definidas futuramente.

### Comércio

* manutenção;
* busca agressiva por mercados;
* outras políticas definidas futuramente.

A lista final de políticas e parâmetros será consolidada posteriormente.

## 10.4. Princípio de fidelidade ao jogador

A automação deve executar a política escolhida pelo jogador.

Ela não deve transformar:

> "meu setor militar é defensivo"

em uma estratégia expansionista por decisão própria.

O sistema pode reagir a ameaças e preservar o Estado, mas não deve inventar uma nova filosofia estratégica.

## 10.5. Manutenção

Pequenas ações de manutenção podem ser executadas automaticamente quando necessárias para evitar degradação puramente administrativa.

Isso pode incluir renovações ou ajustes administrativos que não representem nova decisão estratégica importante.

## 10.6. Ausência não gera punição artificial

O jogador não deve sofrer uma penalidade simplesmente porque não tomou uma decisão nova durante sua ausência.

O mundo continua funcionando de acordo com:

* condições reais;
* ações já iniciadas;
* automação configurada;
* comportamento dos demais agentes.

---

# 11. Explicabilidade e cadeia causal

## 11.1. Objetivo

O jogador deve compreender os acontecimentos relevantes que afetam:

* seu personagem;
* sua sociedade;
* seu território;
* seus povos;
* suas guerras;
* sua religião;
* sua economia;
* seus rivais;
* o mundo em geral.

## 11.2. Linguagem

A explicação deve usar linguagem do universo do jogo.

Não deve apresentar ao jogador:

* variáveis internas;
* arrays;
* algoritmos;
* ticks como detalhes técnicos;
* fórmulas de programação;
* nomes de sistemas internos.

## 11.3. Cadeias causais

Quando apropriado, o jogo deve permitir compreender sequências como:

evento ambiental → produção → alimentos → população → migração → estabilidade → política.

## 11.4. Exceção: força natural

Um fenômeno natural aleatório pode ser apresentado como uma força natural quando não houver uma causa identificável que o jogador precise entender.

## 11.5. Intervenção sobrenatural

Quando um efeito sobrenatural for causado por uma entidade identificável, especialmente pelo próprio jogador, a origem deve ser explicitada.

Exemplo:

religião inimiga sofre uma praga provocada por intervenção divina → o sistema deve poder indicar a origem e o resultado relevantes.

---

# 12. População

## 12.1. Princípio

A população é viva e possui consequências sistêmicas reais.

Ela não deve crescer apenas como um número abstrato.

## 12.2. Crescimento

O crescimento deve depender de condições sociais, ambientais e econômicas.

## 12.3. Fome

Falta de alimentos pode produzir consequências reais como:

* fome;
* mortalidade;
* migração;
* instabilidade;
* revoltas;
* enfraquecimento político;
* outros efeitos derivados.

## 12.4. Classes e grupos sociais

A sociedade deve permitir diferenciação de grupos quando isso produzir consequências úteis.

Os grupos podem incluir, conforme o sistema final:

* nobres;
* clero;
* camponeses;
* soldados;
* comerciantes;
* outros grupos que surjam historicamente.

## 12.5. Migração

Migração deve ser fluida e natural.

Pode ser provocada ou intensificada por:

* fome;
* guerra;
* perseguição;
* pressão religiosa;
* oportunidades econômicas;
* superpopulação;
* políticas governamentais;
* condições ambientais;
* conquista;
* outros fatores relevantes.

Migração não deve ser uma teletransportação arbitrária sem causa.

---

# 13. Cultura

## 13.1. Definição

Cultura é uma dimensão própria da sociedade, distinta de:

* reino;
* Estado;
* civilização;
* religião.

## 13.2. Persistência

Uma cultura pode sobreviver à:

* queda de um reino;
* conquista;
* mudança de governo;
* formação de uma nova entidade política.

## 13.3. Coexistência

Uma região pode conter várias culturas simultaneamente.

Exemplo conceitual:

* cultura A: 62%;
* cultura B: 25%;
* cultura C: 13%.

## 13.4. Difusão

A cultura pode se espalhar por:

* contato;
* comércio;
* migração;
* conquista;
* vizinhança;
* convivência;
* gerações sucessivas.

A intensidade de contato pode aumentar a velocidade da difusão.

## 13.5. Assimilação e mistura

Culturas podem:

* resistir;
* crescer;
* declinar;
* assimilar outras;
* misturar-se;
* desaparecer localmente;
* sobreviver em outras regiões.

## 13.6. Cultura não determinística

Cultura não deve funcionar como uma tabela rígida:

> cultura X = bônus fixo A e penalidade fixa B para sempre.

A cultura deve exercer influência e pressão, mas as sociedades podem:

* mudar;
* aprender;
* adaptar-se;
* educar novas gerações;
* incorporar influências externas;
* reformar instituições.

## 13.7. Política cultural

O jogador pode adotar políticas como:

* promoção cultural;
* assimilação;
* preservação;
* tolerância à diversidade;
* outras políticas a definir.

A transformação cultural deve normalmente ser gradual e exigir tempo.

---

# 14. Cultura, civilização e entidade política

Esses conceitos não devem ser tratados como sinônimos.

## Cultura

Conjunto persistente de características sociais e simbólicas de grupos humanos.

## Civilização

Estágio ou forma complexa de organização social e histórica.

Não é escolhida como classe no início.

## Reino/Estado/entidade política

Entidade de poder territorial e institucional.

Pode:

* surgir;
* crescer;
* dividir-se;
* ser conquistada;
* ser vassalizada;
* perder território;
* desaparecer;
* ser substituída;
* renascer em outra forma.

Uma cultura pode atravessar várias entidades políticas.

---

# 15. Religião

## 15.1. Sistema independente

Religião é relacionada à cultura, mas possui simulação própria.

Uma cultura pode conter várias religiões.

Uma religião pode atravessar várias culturas.

## 15.2. Surgimento natural

Religiões devem surgir organicamente dentro das sociedades.

O surgimento religioso pode ser influenciado por:

* cultura;
* sociedade;
* ambiente;
* história local;
* contato com outras populações;
* personagens;
* acontecimentos;
* necessidades e transformações sociais.

Religião não deve ser criada pelo jogador simplesmente por uma escolha obrigatória no início da campanha.

## 15.3. Adoção pelo jogador

O jogador pode posteriormente escolher uma religião que exista em sua sociedade ou em seu contexto político e **adotá-la como religião oficial**, de acordo com as regras do sistema religioso e governamental.

A adoção de uma religião oficial é diferente de:

* criar aquela religião;
* escolher uma religião no início;
* determinar o surgimento daquela religião.

A religião continua sendo parte da história orgânica do mundo.

## 15.4. Influência religiosa

Religião, especialmente quando organizada e liderada pelo personagem do jogador, representa uma importante fonte de **influência social e política**.

A participação e a liderança religiosa podem proporcionar vantagens em áreas como:

* coesão social;
* legitimidade;
* mobilização coletiva;
* influência sobre comportamento social;
* capacidade de formar consenso;
* autoridade sobre instituições religiosas;
* capacidade de influenciar decisões coletivas;
* influência política derivada da fé e da liderança.

Essas vantagens não significam que a religião seja superior em todos os aspectos.

Elas constituem um caminho estratégico diferente do caminho de sociedades ou personagens sem orientação religiosa.

## 15.5. Fundação de nova religião

O jogador pode futuramente **fundar uma nova religião** quando o sistema correspondente estiver disponível.

Isso ocorre durante a campanha, e não durante o onboarding.

A fundação de uma nova religião:

* não é uma escolha de religião inicial;
* não transforma religião em classe;
* é um acontecimento histórico dentro da campanha;
* pode tornar o jogador fundador e líder supremo;
* deve criar uma nova trajetória religiosa dentro do mundo.

A fundação de uma religião **não pode depender de uma quantidade prévia de Fé gerada pela própria religião**, pois essa religião ainda não possuiria seguidores suficientes para gerar esse recurso.

A Fé é uma consequência posterior da existência e da expansão dos fiéis.

A fundação poderá possuir outros requisitos, custos ou um sistema de pontos de design, conforme definido posteriormente.

## 15.6. Posições sem religião institucional (Ateísmo e Agnosticismo)

### Ateísmo

Quando o personagem mantém uma posição ateísta:

* não gera Fé para si pela via religiosa;
* não recebe Fé como seguidor de uma religião;
* não se beneficia das mecânicas de poder religioso que dependam de adesão a uma religião;
* recebe, como compensação de design, uma vantagem específica relacionada a ciência e pesquisa.

A vantagem científica deve representar a principal compensação de design ao caminho religioso.

O objetivo é criar **trade-off estratégico**, e não determinar um vencedor universal:

* caminho religioso → maior potencial de influência social, legitimidade religiosa e mobilização coletiva;
* caminho ateísta → maior potencial científico e de pesquisa.

A forma exata dessa vantagem poderá envolver, por exemplo:

* maior velocidade de pesquisa;
* pontos adicionais para evolução de pesquisa;
* maior eficiência científica;
* ou combinação equivalente.

O princípio da compensação científica é definido; o valor e a forma matemática exata ainda serão especificados.

### Agnosticismo

Agnosticismo também é uma posição pessoal e não equivale a escolher uma religião.

O comportamento mecânico específico do agnosticismo será definido quando necessário.

## 15.7. Fé

Fé é uma moeda estratégica real.

Ela não deve existir somente como número visual.

Pode ser acumulada e gasta em ações religiosas ou milagres.

## 15.8. Fiéis

Para a geração de Fé, "fiéis" significa os seguidores da religião, e não um subconjunto arbitrário de seguidores considerados mais ativos.

## 15.9. Geração de Fé e liderança religiosa

A quantidade de Fé recebida pelo jogador depende de sua posição dentro da estrutura religiosa.

Quando o jogador é o **líder supremo** da religião:

* pode receber Fé proveniente dos fiéis de sua religião em seu próprio território;
* pode também receber Fé proveniente de fiéis da mesma religião em outros territórios.

Quando o jogador **não é o líder supremo**:

* recebe uma quantidade muito menor;
* a geração fica vinculada principalmente aos fiéis sob sua própria esfera territorial.

Os valores matemáticos exatos ainda precisam ser definidos.

## 15.10. Liderança religiosa

O jogador pode:

* adotar uma religião existente como religião oficial;
* liderar uma religião conforme as regras dessa religião;
* tentar assumir a liderança suprema de uma religião existente;
* exercer liderança religiosa sobre sua própria população;
* **fundar uma nova religião e tornar-se seu líder supremo quando o sistema de fundação estiver disponível**, conforme a Seção 15.5.

A liderança suprema de uma religião existente deve ser construída ao longo do tempo.

A legitimidade religiosa necessária deve observar, como princípios já definidos:

* pelo menos **5 anos** de construção de legitimidade;
* ofertas à religião podem acelerar o processo;
* controle da cidade sagrada fornece um grande bônus;
* reconhecimento de outros líderes fornece bônus;
* os fatores atuam de forma **aditiva**;
* atingido o limiar necessário, o jogador pode exigir/reivindicar a liderança.

O limiar matemático final ainda precisa ser definido.

## 15.11. Religiões existentes

Quando o jogador tenta assumir o comando de uma religião existente, a legitimidade deve ser construída ao longo do tempo.

Não deve ser uma mudança instantânea simplesmente porque o jogador possui um território grande.

## 15.12. Difusão religiosa

Religiões podem se espalhar naturalmente por:

* missionários;
* migração;
* comerciantes;
* contato entre populações;
* outras formas coerentes com a sociedade.

## 15.13. Cismas e resistência

Mudanças religiosas impostas podem provocar:

* resistência;
* divisão;
* heresia;
* cisma;
* conflitos internos;
* perda de apoio.

## 15.14. Conversão

Conversão pode ser rápida em determinadas condições, mas não deve ser instantânea e total sem justificativa.

Grandes mudanças de composição religiosa devem representar processo, pressão e transformação social.

## 15.15. Milagres

Fé pode ser gasta em milagres.

Exemplos:

* cessar peste;
* cessar praga;
* cessar seca;
* cessar enchente;
* reduzir impacto de desastre;
* aumentar colheita;
* gerar prosperidade;
* proteger território;
* efeitos militares;
* lançar pragas contra inimigos;
* conversão;
* expansão religiosa.

Milagres devem possuir custo real.

## 15.16. Automação religiosa

O jogador pode automatizar o uso de fé com políticas como:

* sobrevivência;
* prosperidade;
* guerra;
* expansão religiosa;
* reserva mínima.

---

# 16. Tecnologia

## 16.1. Árvore de pesquisa

A sociedade possui desenvolvimento tecnológico progressivo.

O jogador pode orientar o futuro tecnológico.

## 16.2. Controle

Pesquisa pode ser:

* manual;
* automática.

## 16.3. Conclusão tecnológica

Quando uma tecnologia é concluída, seus efeitos entram em vigor imediatamente.

Se uma tecnologia concluída modifica o ritmo da pesquisa, capacidades governamentais ou outros sistemas, as consequências passam a existir a partir de sua conclusão.

## 16.4. Eras

Mudanças de era são individuais para cada sociedade.

Não existe obrigação de todas as sociedades do mundo mudarem de era simultaneamente.

## 16.5. Tecnologia cultural

A possibilidade de árvores tecnológicas culturais complementares existe como direção de design, mas a estrutura final ainda deve ser decidida.

---

# 17. Governo e administração

## 17.1. Evolução política

A sociedade pode evoluir de grupos humanos simples para formas políticas mais complexas.

Exemplos de estágios podem incluir:

* grupos;
* conselhos;
* chefias;
* Estados;
* monarquias;
* outras formas.

A lista final de governos não deve ser limitada artificialmente aos exemplos atuais.

## 17.2. Administração

Administração deve representar capacidade de governar território e população.

## 17.3. Ministros

Ministros:

* ocupam funções;
* possuem níveis;
* ganham experiência;
* podem melhorar com o tempo;
* oferecem conselhos;
* podem sugerir ações ao jogador.

Quando o jogador aceita uma sugestão, a ação correspondente deve ser aplicada de forma clara.

## 17.4. Autonomia

O jogador pode assumir controle direto ou automatizar áreas do governo.

---

# 18. Legitimidade, alertas e crise política

## 18.1. Legitimidade

Legitimidade é um elemento político real.

Ela representa a aceitação e a sustentação do poder do governante.

## 18.2. Limiar de crise

Quando a legitimidade cai para **menos de 20%**, começa um **contador de crise de legitimidade**.

O contador mede tempo consecutivo abaixo de 20%.

Como o calendário possui 30 dias por mês:

**1 mês = 30 dias de jogo.**

A duração definida para o período de crise é:

**30 dias consecutivos com legitimidade abaixo de 20%.**

## 18.3. Alertas e consequências

A entrada abaixo de 20% não deve produzir somente uma mensagem abstrata de aviso.

Enquanto o contador estiver ativo, o jogo pode produzir **alertas e eventos que sejam consequências reais da baixa legitimidade**.

Esses eventos devem fazer sentido dentro da situação política concreta.

Podem representar, por exemplo:

* aumento de oposição;
* perda de apoio;
* resistência de grupos;
* pressão de conselheiros;
* instabilidade;
* contestação da autoridade;
* risco de revolta;
* outras consequências coerentes.

Esses exemplos não definem a lista final de eventos.

O princípio obrigatório é:

> **os alertas devem representar consequências da baixa legitimidade, e não punições arbitrárias ou simples mensagens decorativas.**

## 18.4. Duração das consequências

Uma consequência iniciada durante a crise pode possuir duração própria.

Assim, recuperar a legitimidade não significa necessariamente apagar instantaneamente todos os efeitos já iniciados.

Quando a legitimidade voltar para **20% ou mais**:

* cessam os novos eventos específicos disparados pela condição de baixa legitimidade;
* o contador de crise é encerrado;
* efeitos que já tenham duração própria continuam somente até seu término previsto;
* não devem surgir novas consequências de crise apenas porque efeitos antigos ainda estão ativos.

## 18.5. Recuperação e reinício

Se o governante recuperar a legitimidade para **20% ou mais antes de completar 30 dias consecutivos abaixo de 20%**:

* o contador é interrompido;
* os novos disparos de crise cessam;
* o contador deve ser reiniciado do zero caso a legitimidade volte a cair novamente abaixo de 20%.

Períodos separados abaixo de 20% não devem ser somados artificialmente para atingir o prazo de crise.

## 18.6. Estado de crise

Ao permanecer **30 dias consecutivos abaixo de 20%**, o governante entra em um estado formal de **crise de legitimidade**.

Esse estado representa uma situação política mais grave e pode intensificar os riscos de perda do poder.

A mecânica exata de deposição, reação política, sucessão e demais consequências deve ser detalhada no sistema político correspondente.

## 18.7. Legitimidade em 0%

Quando a legitimidade chega a **0%**, ocorre **deposição imediata**, independentemente do contador de 30 dias.

## 18.8. Princípio da recuperação

O sistema deve permitir que o jogador perceba que recuperar legitimidade produz melhoria real.

Recuperação não deve ser apenas uma mudança visual no número.

Ela deve interromper a geração de novas consequências associadas ao estado de crise.

---

# 19. Dinastia e personagem do jogador

## 19.1. Personagem específico

O jogador controla um personagem específico, e não um conceito abstrato de "civilização".

## 19.2. Experiência e evolução

O personagem do jogador:

* ganha XP;
* evolui;
* pode melhorar seus atributos;
* pode desenvolver capacidades;
* pode adquirir experiência durante sua vida;
* constrói uma trajetória própria.

## 19.3. Morte e sucessão

Quando o personagem morre, o controle passa para o herdeiro.

A campanha continua.

A morte do personagem não encerra automaticamente a partida.

## 19.4. Perda do Estado ou do cargo

A perda do poder político ou do controle territorial também não encerra automaticamente a campanha.

O personagem pode:

* ser deposto;
* ser exilado;
* ser assassinado;
* ser rebaixado;
* perder seu território;
* ficar temporariamente sem Estado;
* buscar apoio;
* tentar recuperar o poder;
* tentar reconstruir sua posição;
* atuar em outra sociedade quando as circunstâncias permitirem.

A campanha acompanha a trajetória do personagem e de sua dinastia, e não apenas a existência de um reino específico.

## 19.5. Envelhecimento

No modo normal:

* personagens envelhecem;
* podem morrer de causas relacionadas à idade;
* podem morrer de outras causas.

## 19.6. Imortalidade

Existe um modo especial de imortalidade/idade desativada.

Quando esse modo está ativo:

* ninguém envelhece;
* a passagem do tempo não causa envelhecimento mundial.

Isso não significa imunidade universal a:

* combate;
* doenças;
* assassinato;
* acidentes;
* outras causas de morte não relacionadas ao envelhecimento.

---

# 20. Personagens procedurais

Personagens comuns devem poder ser gerados proceduralmente.

O mundo não pode depender apenas de uma lista fixa de indivíduos.

Novos personagens podem surgir conforme o mundo evolui.

Cada indivíduo pode possuir:

* identidade;
* atributos;
* características;
* histórico;
* cultura;
* religião;
* posição;
* experiência;
* riqueza;
* influência;
* relações.

Quando um personagem passa a possuir estado histórico relevante, esse estado deve persistir.

---

# 21. Personagens épicos e modo Lendário

## 21.1. Personagens épicos

Personagens épicos são personagens raros e excepcionais do mundo.

Podem existir:

* personagens épicos preexistentes;
* personagens épicos gerados proceduralmente ao longo da história.

Eles não devem ser confundidos com civilizações, religiões ou entidades políticas.

## 21.2. Funções

Um personagem épico pode:

* ser ministro;
* ocupar qualquer cargo compatível com o sistema político;
* comandar exércitos;
* governar;
* assumir posições em outros Estados;
* tornar-se governante de outra sociedade.

## 21.3. Adaptação

Personagens épicos podem:

* aprender;
* ganhar habilidades;
* mudar;
* adaptar-se;
* adquirir novas características;
* aprender a viver dentro de outras culturas.

## 21.4. Compatibilidade cultural

A probabilidade de surgirem ou se estabelecerem em ambientes compatíveis com sua origem pode ser maior.

Isso não significa que estejam proibidos de viver em outras culturas ou governar povos de outras origens.

## 21.5. Morte, desaparecimento e retorno

Personagens épicos podem morrer ou desaparecer do fluxo histórico.

Um retorno não precisa ocorrer imediatamente.

Um personagem pode permanecer ausente por um período significativo antes de reaparecer, conforme as regras do sistema.

## 21.6. Modo Lendário

O **modo Lendário ON/OFF** define o comportamento da identidade desses personagens após a morte.

### Lendário ON

A mesma identidade do personagem pode retornar ao fluxo histórico após a morte.

### Lendário OFF

O retorno gera um novo indivíduo associado ao padrão/template correspondente, mas não é a mesma identidade.

O modo Lendário não define a existência ou raridade dos personagens épicos; ele define a regra de retorno de suas identidades.

---

# 22. Reinos e entidades políticas dinâmicas

A quantidade de reinos do mundo não é fixa.

A campanha começa com determinadas entidades iniciais, mas elas não representam o limite do mundo.

Ao longo da história podem ocorrer:

* nascimento de novos reinos;
* crescimento;
* fragmentação;
* guerras civis;
* sucessões que provoquem divisão;
* anexação;
* conquista total;
* desaparecimento;
* vassalagem;
* emancipação;
* rebeliões;
* formação de novos Estados;
* perda territorial;
* redução a pequenos territórios;
* existência temporária sem território;
* retorno de territórios à condição selvagem;
* posterior colonização ou ocupação.

Os reinos iniciais são apenas o estado inicial da campanha.

---

# 23. Diplomacia

Diplomacia é um sistema real e dinâmico.

Pode possuir:

* relações;
* tratados;
* alianças;
* hostilidade;
* neutralidade;
* vassalagem;
* submissão;
* tributos;
* reconhecimento;
* negociações;
* ameaças;
* pedidos;
* blefes;
* mudanças de posição.

NPCs podem tomar decisões imperfeitas.

Eles não devem conhecer automaticamente todas as informações do mundo.

Suas decisões podem ser influenciadas por:

* percepção;
* características de liderança;
* informação incompleta;
* força militar percebida;
* interesses;
* relações;
* religião;
* cultura;
* economia;
* história.

---

# 24. Comércio e economia

A economia deve possuir recursos e fluxos reais.

Exemplos de recursos/sistemas incluem:

* ouro;
* alimento;
* madeira;
* ferro;
* fé;
* legitimidade.

Os recursos econômicos não devem existir apenas como contadores visuais.

Eles devem ser afetados por:

* produção;
* consumo;
* comércio;
* guerra;
* população;
* impostos;
* infraestrutura;
* geografia;
* tecnologia;
* administração;
* desastres.

## Vassalagem e tributos

Estados subordinados podem enviar tributos ao soberano.

A transferência deve possuir consequência econômica real para os dois lados.

---

# 25. Construções e infraestrutura

Infraestrutura deve refletir:

* desenvolvimento tecnológico;
* organização social;
* geografia;
* capacidade política;
* recursos;
* estágio da sociedade.

Uma sociedade primitiva não deve ter acesso arbitrário a infraestrutura incompatível com seu desenvolvimento.

Exemplos de infraestrutura futura:

* portos;
* infraestrutura naval;
* docas de pesca;
* celeiros;
* templos avançados;
* fortificações;
* universidades;
* outras estruturas.

Os requisitos definitivos de cada construção devem ser especificados posteriormente.

---

# 26. Guerra e forças militares

## 26.1. Guerra

Guerras são processos, não eventos instantâneos.

Uma guerra pode durar anos.

## 26.2. Fases

Uma guerra pode passar por fases de:

* preparação;
* combate;
* conquista;
* desgaste;
* negociação;
* trégua;
* rendição;
* paz.

## 26.3. Desgaste

Guerras prolongadas produzem consequências.

Podem afetar:

* economia;
* população;
* alimentos;
* moral;
* estabilidade;
* exaustão;
* política interna.

## 26.4. Logística

Exércitos dependem de:

* abastecimento;
* território;
* rotas;
* distância;
* recursos;
* suporte.

A logística deve ser parte real da guerra.

## 26.5. Conquista

Conquista política e transformação cultural não são a mesma coisa.

O controle territorial pode mudar antes da cultura local.

Mudança cultural deve normalmente exigir tempo e interação.

## 26.6. Migração após conquista

Conquista pode provocar migração.

A intensidade depende de fatores como:

* forma da conquista;
* agressividade;
* diferença cultural;
* guerra;
* política;
* segurança;
* oportunidades.

Não existe regra universal de migração instantânea de toda a população.

---

# 27. Desastres

Desastres naturais podem incluir:

* secas;
* enchentes;
* incêndios;
* pestes;
* pragas;
* outros fenômenos.

Devem produzir efeitos reais.

## Mitigação

Os impactos podem ser tratados por diferentes meios, incluindo:

* administração;
* tecnologia;
* economia;
* comércio/importação;
* medidas naturais;
* religião.

Uma resposta religiosa deve ser distinta de uma resposta administrativa.

---

# 28. Explicação de catástrofes

Quando uma catástrofe produz consequências sociais importantes, o jogador deve conseguir compreender os principais efeitos.

Exemplo:

seca → menor produção → queda de alimentos → fome → mortalidade → deslocamento da população → instabilidade.

O jogador deve poder usar essa compreensão para alterar políticas futuras.

---

# 29. Jogador ausente e mundo autônomo

Quando o jogador não está presente:

* atividades já iniciadas continuam;
* processos naturais continuam;
* sociedades continuam;
* NPCs continuam;
* guerras continuam;
* comércio continua;
* população continua;
* tecnologia continua;
* religião continua;
* diplomacia continua;
* migração continua;
* personagens continuam vivendo.

O jogo não deve inventar uma penalidade artificial chamada "inatividade do jogador".

A única exceção é quando o jogador tenha explicitamente pausado o jogo antes de sair.

Nesse caso, o mundo permanece congelado no estado da pausa.

---

# 30. Modo Deus / Creator Mode

Existe uma função especial de criação/teste para desenvolvimento e experimentação.

O acesso atual é planejado por uma ação secreta específica na interface.

Esse modo pode disponibilizar ferramentas de teste e intervenção que não pertencem à experiência normal.

O modo Deus não deve ser usado como justificativa para alterar as regras do modo normal.

---

# 31. Multiplayer futuro

O multiplayer é parte da arquitetura futura.

Princípios já definidos:

* jogadores não congelam o mundo simplesmente por estarem offline;
* o mundo continua;
* regras temporais precisam ser compartilhadas;
* o limite offline/catch-up é definido para a partida;
* esse limite deve ser acordado/configurado para a partida e aplicado de maneira consistente aos jogadores;
* a simulação precisa permanecer coerente entre participantes.

A especificação de rede, autoridade, sincronização e resolução de conflitos ainda é uma questão técnica futura.

---

# 32. Persistência

O estado histórico relevante do mundo deve persistir.

Isso inclui, conforme o sistema:

* estado político;
* população;
* cultura;
* religião;
* tecnologia;
* economia;
* personagens;
* guerras;
* relações;
* eventos;
* demais estados que possuam importância histórica.

O carregamento não deve apagar a história para reconstruir o mundo como se nada tivesse acontecido.

Conteúdo procedural que adquira estado histórico deve deixar de ser tratado como conteúdo efêmero.

---

# 33. Geração procedural

A geração procedural deve ser usada para ampliar a capacidade do mundo de gerar:

* nomes;
* personagens;
* identidades;
* grupos;
* conteúdo emergente;
* eventos.

A geração procedural não deve reescrever silenciosamente uma entidade histórica já existente.

Depois que um elemento tiver histórico relevante:

**histórico persistido > nova geração procedural.**

---

# 34. Coerência temporal

O jogo deve obedecer a uma única semântica temporal.

Não podem coexistir silenciosamente interpretações conflitantes como:

* tick = dia em um sistema;
* tick = mês em outro;
* cooldown em data real;
* cooldown em tempo de jogo;
* crescimento por intervalo real;
* crescimento por calendário sem regra explícita.

Sempre que uma mecânica depender do tempo, sua natureza temporal deve ser definida.

---

# 35. Relação entre tempo e velocidade

Velocidade:

* não altera a natureza do tick;
* não altera a duração conceitual do dia;
* não autoriza pular eventos causais relevantes;
* não deve criar bônus matemáticos fictícios;
* não deve funcionar como mecanismo de trapaça.

A aceleração é apenas uma forma de processar a simulação mais rapidamente enquanto o jogo está em execução.

Ao fechar o aplicativo, a velocidade usada para o offline volta à referência de **1x**.

---

# 36. O que Epochs Idle NÃO deve ser

Epochs Idle não deve se transformar em:

* um simples acumulador de recursos;
* uma calculadora de crescimento populacional;
* uma árvore tecnológica isolada;
* uma sequência de telas com números sem consequências;
* um jogo em que o jogador escolhe uma civilização pronta e recebe bônus estáticos;
* um sistema em que cultura é apenas uma skin;
* um sistema em que religião é apenas um modificador passivo;
* um mundo que congela simplesmente porque o jogador fechou o aplicativo sem pausar;
* um mundo que pune artificialmente o jogador apenas por ficar ausente;
* um sistema em que a IA muda a estratégia do jogador sem autorização;
* um sistema em que velocidade alta elimina causalidade importante;
* um sistema em que offline produz resultados diferentes apenas por usar uma lógica temporal incompatível;
* um sistema em que guerras terminam instantaneamente sem processo;
* um sistema em que populações aparecem ou desaparecem sem causa;
* um sistema em que conquista política implica conversão cultural instantânea;
* um sistema em que reinos iniciais formam um limite fixo para a quantidade de entidades políticas;
* um sistema em que cultura é um modificador determinístico permanente;
* um sistema em que religião é limitada a uma cultura;
* um sistema em que pequenas mudanças de legitimidade são punidas sem relação causal;
* um sistema em que efeitos de uma crise política aparecem como punições arbitrárias sem explicação;
* um sistema em que o jogador não consegue entender as causas relevantes dos principais acontecimentos;
* um sistema que tenta reproduzir obrigatoriamente a História real da humanidade;
* um sistema em que fronteiras, povos, governos, religiões ou eventos históricos reais determinam previamente o futuro da campanha;
* um sistema em que a religião inicial é escolhida pelo jogador simplesmente no início da campanha;
* um sistema em que todas as partidas seguem uma mesma sequência histórica obrigatória;
* um sistema em que fundar uma religião exige Fé previamente gerada pela própria religião inexistente;
* um sistema em que o caminho religioso ou o caminho ateísta é universalmente superior, sem trade-off entre influência social e vantagem científica.

---

# 37. Critério geral de qualidade do estado final

O jogo estará conceitualmente de acordo com esta especificação quando:

1. o mundo possuir continuidade histórica;
2. o mundo possuir seu próprio desenvolvimento histórico, sem depender da História real;
3. a geografia física reproduzir a referência geográfica desejada;
4. as sociedades puderem evoluir organicamente;
5. cada campanha puder desenvolver uma história própria;
6. cultura, religião e política forem sistemas distintos e interligados;
7. religião puder surgir organicamente dentro das sociedades;
8. população tiver consequências reais;
9. guerras tiverem processo e desgaste;
10. diplomacia produzir mudanças reais;
11. tecnologia alterar a sociedade;
12. personagens tiverem história;
13. personagens do jogador evoluírem;
14. dinastias continuarem através das gerações;
15. entidades políticas puderem nascer e desaparecer;
16. o jogador puder controlar diretamente ou automatizar setores;
17. a automação respeitar a intenção do jogador;
18. o mundo continuar funcionando sem o jogador quando o jogo não estiver pausado;
19. a pausa voluntária impedir completamente a progressão durante a ausência;
20. o sistema offline respeitar os limites definidos e usar a referência 1x;
21. o tempo possuir uma semântica única;
22. eventos relevantes possuírem explicações compreensíveis;
23. cultura puder mudar sem ficar presa a uma identidade fixa;
24. religião puder atuar como sistema estratégico independente;
25. decisões importantes produzirem consequências verificáveis;
26. nenhuma otimização puder alterar silenciosamente a lógica do mundo;
27. baixa legitimidade produzir um processo político observável e recuperável;
28. recuperação de legitimidade interromper novos efeitos de crise;
29. consequências que possuam duração própria respeitarem sua própria duração mesmo após a recuperação;
30. a narrativa se adaptar às ações do jogador e aos acontecimentos emergentes;
31. o mundo possuir história própria em cada campanha;
32. a experiência de cada campanha puder ser materialmente diferente das demais;
33. a posição ateísta puder produzir a compensação científica definida sem gerar Fé;
34. a liderança religiosa puder oferecer maior potencial de influência social e mobilização;
35. a criação de uma religião nova não depender de Fé previamente gerada pela própria religião;
36. a religião oficial de uma sociedade continuar sendo uma consequência de sua evolução e das decisões do jogador, e não uma escolha obrigatória no início.

Esses critérios são de design.

A forma de implementá-los pertence ao Documento 2.

---

# 38. Questões abertas de design

As questões abaixo ainda não devem ser inventadas nem resolvidas silenciosamente.

Estas questões são principalmente de **balanceamento, valores exatos ou especificação detalhada**, e não devem alterar os princípios fundamentais já definidos neste documento.

## População e migração — definição quantitativa

* fórmula final de crescimento populacional;
* mortalidade;
* impacto quantitativo da fome;
* limiares e intensidade de migração;
* influência quantitativa de guerra, oportunidade, pressão demográfica e religião sobre migração;
* demais parâmetros matemáticos de população e migração ainda não definidos pelo design.

## Cultura

* Qual será exatamente o mecanismo quantitativo de difusão?
* Como será calculada a resistência cultural?
* Como serão representadas culturas muito pequenas?
* Quando uma cultura pode desaparecer?
* Como políticas culturais alteram a dinâmica?

## Tecnologia

* Como funcionará exatamente uma árvore tecnológica cultural?
* Será complementar, híbrida ou separada?
* Quais são os limites de transferência tecnológica entre culturas e Estados?

## Religião

* Fórmula definitiva de geração de Fé.
* Armazenamento máximo.
* Custos de milagres.
* Cooldowns.
* Regras anti-spam.
* Relação quantitativa entre território, população e poder religioso.
* Valores e limiares exatos para assumir liderança de uma religião.
* Regras completas de cisma e heresia.
* Modelo quantitativo de surgimento das novas religiões.
* Critérios exatos para uma crença se transformar em uma religião organizada.
* Requisitos e custos exatos para fundar uma nova religião.
* Se será utilizado um orçamento de pontos de design para customização religiosa e quais serão seus valores.
* Comparação quantitativa entre fundar uma religião nova e assumir a liderança de uma religião existente.
* Forma exata da vantagem científica concedida ao ateísmo.
* Valores e limites da vantagem científica do ateísmo.
* Efeitos mecânicos específicos do agnosticismo.

## Construções

* Como construções futuras serão apresentadas quando bloqueadas?
* Escondidas?
* Exibidas desabilitadas?
* Exibindo requisitos?
* Organizadas por estágio?

## Geografia

* Grau exato de influência climática.
* Modelo detalhado de navegação.
* Sistema naval.
* Pesca.
* Transporte marítimo.
* Navegação fluvial.

## Economia

* Fórmulas finais de produção.
* Consumo.
* Inflação.
* Tributação.
* Comércio.
* Preços.
* Escassez.

## Guerra

* Modelo definitivo de logística.
* Duração mínima/média de fases.
* Rendição.
* Paz.
* Tréguas.
* Guerra civil.
* Ocupação.
* Conquista total.

## Legitimidade

A regra básica já está decidida:

* menos de 20% inicia contador;
* 30 dias consecutivos abaixo de 20% estabelece crise de legitimidade;
* enquanto abaixo de 20%, podem surgir eventos/consequências políticos;
* recuperar para 20% ou mais impede novos disparos da crise;
* efeitos que tenham duração própria podem continuar até o vencimento;
* nova queda abaixo de 20% inicia novo contador;
* 0% provoca deposição imediata.

Ainda precisam ser detalhados:

* lista definitiva de eventos de crise;
* frequência dos eventos;
* intensidade;
* condições que tornam cada evento mais ou menos provável;
* duração dos efeitos;
* mecanismo exato de deposição após a crise;
* mecanismos de recuperação de legitimidade;
* interação com ministros, população, religião, guerra, cultura e outras fontes de legitimidade.

## Personagens

* Fórmulas de envelhecimento.
* Regras detalhadas de herança.
* Sistema completo de personagens épicos.
* Regras de desaparecimento e retorno.

## Multiplayer

* autoridade do estado;
* sincronização;
* resolução de conflitos;
* persistência compartilhada;
* segurança;
* comunicação.

Essas questões devem ser decididas antes da implementação correspondente.

---

# 39. Regra final deste documento

Este documento descreve **o destino do projeto**.

Ele não deve ser usado para justificar a implementação atual.

Quando o código não corresponder a este documento, isso representa uma divergência a ser analisada posteriormente no planejamento técnico.

Quando este documento entrar em conflito com uma decisão de produto explicitamente aprovada pelo usuário, a decisão aprovada deve prevalecer e o documento deve ser atualizado.

Quando o documento não possuir informação suficiente para determinar um comportamento, a resposta correta é:

**QUESTÃO DE DESIGN EM ABERTO.**

Não é permitido preencher a lacuna com uma suposição silenciosa.

O objetivo deste documento é definir com precisão **o que queremos construir**.

O Documento 2 definirá, separadamente, **como transformar o estado atual do projeto nesse estado desejado**.
