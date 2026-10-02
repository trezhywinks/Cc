const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {

  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    status: "online",
    game: "Whmer Multiplayer"
  }));

});


const wss = new WebSocket.Server({
  server
});



const LARGURA = 400;
const ALTURA = 700;

const PLAYER_W = 70;
const PLAYER_H = 70;

const GRAVIDADE = 0.45;
const PULO = -8;

const VELOCIDADE = 3;

const OBSTACULO_W = 70;
const ABERTURA = 190;

const INTERVALO_OBSTACULO = 1600;
const INTERVALO_ESTRELA = 1200;



const jogadores = {};

let proximoID = 1;

let obstaculos = [];
let estrelas = [];

let proximoObstaculo = 1;
let proximaEstrela = 1;

let pontuacao = 0;

let jogoAtivo = false;

let ultimoObstaculo = 0;
let ultimaEstrela = 0;



function colisao(a, b) {

  const margem = 8;

  return !(
    a.x + a.width - margem < b.x ||
    a.x + margem > b.x + b.width ||
    a.y + a.height - margem < b.y ||
    a.y + margem > b.y + b.height
  );

}



function criarObstaculo() {

  const margem = 80;

  const maxCima =
    ALTURA -
    ABERTURA -
    margem;

  const alturaCima =
    Math.random() *
    (maxCima - margem)
    + margem;

  const alturaBaixo =
    ALTURA -
    alturaCima -
    ABERTURA;


  obstaculos.push({

    id: proximoObstaculo++,

    x: LARGURA,

    largura: OBSTACULO_W,

    cima: alturaCima,

    baixo: alturaBaixo,

    passou: false

  });

}



function criarEstrela() {

  const margem = 100;

  const y =
    margem +
    Math.random() *
    (ALTURA - margem * 2);


  estrelas.push({

    id: proximaEstrela++,

    x: LARGURA + 20,

    y,

    tamanho: 30

  });

}



function iniciarJogo() {

  jogoAtivo = true;

  pontuacao = 0;

  obstaculos = [];
  estrelas = [];

  ultimoObstaculo = Date.now();
  ultimaEstrela = Date.now();


  Object.values(jogadores)
    .forEach(jogador => {

      jogador.x = 70;

      jogador.y = ALTURA * 0.4;

      jogador.velocidadeY = 0;

      jogador.vivo = true;

      jogador.estrelas = 0;

    });

}



function enviarEstado() {

  const estado = {

    tipo: "estado",

    jogadores:
      Object.values(jogadores)
      .map(jogador => ({

        id: jogador.id,

        nome: jogador.nome,

        x: jogador.x,

        y: jogador.y,

        vivo: jogador.vivo,

        estrelas:
          jogador.estrelas || 0

      })),

    obstaculos:
      obstaculos.map(obj => ({

        id: obj.id,

        x: obj.x,

        largura: obj.largura,

        cima: obj.cima,

        baixo: obj.baixo

      })),

    estrelas,

    score: pontuacao,

    jogo:
      jogoAtivo
      ? "jogando"
      : "parado"

  };


  const mensagem =
    JSON.stringify(estado);


  wss.clients.forEach(cliente => {

    if (
      cliente.readyState ===
      WebSocket.OPEN
    ) {

      cliente.send(mensagem);

    }

  });

}



wss.on("connection", socket => {

  const id = proximoID++;


  jogadores[id] = {

    id,

    nome:
      "Jogador " + id,

    x: 70,

    y: ALTURA * 0.4,

    velocidadeY: 0,

    vivo: true,

    estrelas: 0,

    socket

  };


  socket.send(JSON.stringify({

    tipo: "id",

    id

  }));


  enviarEstado();


  socket.on("message", mensagem => {

    try {

      const dados =
        JSON.parse(mensagem);


      const jogador =
        jogadores[id];


      if (!jogador) return;



      if (
        dados.tipo === "pular"
      ) {

        if (
          jogoAtivo &&
          jogador.vivo
        ) {

          jogador.velocidadeY =
            PULO;

        }

      }



      if (
        dados.tipo === "nome"
      ) {

        let nome =
          String(
            dados.nome || ""
          ).trim();


        if (!nome) {

          nome =
            "Jogador " + id;

        }


        jogador.nome =
          nome.substring(0, 20);

      }



      if (
        dados.tipo === "comecar"
      ) {

        if (!jogoAtivo) {

          iniciarJogo();

        }

      }



      if (
        dados.tipo === "reiniciar"
      ) {

        iniciarJogo();

      }

    } catch (erro) {

      console.log(
        "Mensagem inválida:",
        erro.message
      );

    }

  });


  socket.on("close", () => {

    delete jogadores[id];


    if (
      Object.keys(jogadores).length === 0
    ) {

      jogoAtivo = false;

      obstaculos = [];

      estrelas = [];

    }

  });

});



setInterval(() => {

  if (!jogoAtivo) {

    enviarEstado();

    return;

  }


  const agora = Date.now();


  if (
    agora - ultimoObstaculo >=
    INTERVALO_OBSTACULO
  ) {

    criarObstaculo();

    ultimoObstaculo = agora;

  }



  if (
    agora - ultimaEstrela >=
    INTERVALO_ESTRELA
  ) {

    criarEstrela();

    ultimaEstrela = agora;

  }



  let jogadoresVivos = 0;


  Object.values(jogadores)
    .forEach(jogador => {

      if (!jogador.vivo) {
        return;
      }


      jogadoresVivos++;


      jogador.velocidadeY +=
        GRAVIDADE;


      jogador.y +=
        jogador.velocidadeY;



      if (
        jogador.y < 0 ||
        jogador.y + PLAYER_H >
        ALTURA
      ) {

        jogador.vivo = false;

        return;

      }


      const playerBox = {

        x: jogador.x,

        y: jogador.y,

        width: PLAYER_W,

        height: PLAYER_H

      };



      for (
        const obstaculo of obstaculos
      ) {

        const cimaBox = {

          x: obstaculo.x,

          y: 0,

          width:
            obstaculo.largura,

          height:
            obstaculo.cima

        };


        const baixoBox = {

          x: obstaculo.x,

          y:
            ALTURA -
            obstaculo.baixo,

          width:
            obstaculo.largura,

          height:
            obstaculo.baixo

        };


        if (
          colisao(
            playerBox,
            cimaBox
          ) ||
          colisao(
            playerBox,
            baixoBox
          )
        ) {

          jogador.vivo = false;

          break;

        }

      }


      if (!jogador.vivo) {
        return;
      }



      estrelas =
        estrelas.filter(estrela => {

          const estrelaBox = {

            x: estrela.x,

            y: estrela.y,

            width:
              estrela.tamanho,

            height:
              estrela.tamanho

          };


          if (
            colisao(
              playerBox,
              estrelaBox
            )
          ) {

            jogador.estrelas++;

            pontuacao += 10;

            return false;

          }


          return true;

        });

    });


  obstaculos.forEach(obstaculo => {

    obstaculo.x -=
      VELOCIDADE;


    if (
      !obstaculo.passou &&
      obstaculo.x +
      obstaculo.largura <
      70
    ) {

      obstaculo.passou = true;

      pontuacao++;

    }

  });


  estrelas.forEach(estrela => {

    estrela.x -=
      VELOCIDADE;

  });



  obstaculos =
    obstaculos.filter(
      obstaculo =>
        obstaculo.x +
        obstaculo.largura > 0
    );


  estrelas =
    estrelas.filter(
      estrela =>
        estrela.x +
        estrela.tamanho > 0
    );



  if (
    jogadoresVivos === 0 &&
    Object.keys(jogadores).length > 0
  ) {

    jogoAtivo = false;

  }


  enviarEstado();

}, 1000 / 30);



server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Servidor rodando na porta ${PORT}`
    );

  }
);
