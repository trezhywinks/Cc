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


let proximoID = 1;

const jogadores = {};

let obstaculos = [];

let score = 0;

let jogoAtivo = false;

let ultimoObstaculo = 0;

let proximoObstaculo = 0;




const LARGURA = 400;

const ALTURA = 700;

const PLAYER_W = 55;

const PLAYER_H = 55;

const GRAVIDADE = 0.45;

const PULO = -8;

const VELOCIDADE = 3.5;

const OBSTACULO_W = 65;

const ABERTURA = 190;

const INTERVALO = 1600;




function criarObstaculo() {

  const margem = 80;

  const max =
    ALTURA -
    ABERTURA -
    margem;

  const aberturaY =
    Math.floor(
      Math.random() *
      (max - margem)
    ) + margem;


  obstaculos.push({

    id: ++proximoObstaculo,

    x: LARGURA + 20,

    aberturaY,

    abertura: ABERTURA,

    passou: false

  });

}




function colisao(a, b) {

  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );

}


function jogadorColidiu(jogador) {

  if (
    jogador.y < 0 ||
    jogador.y + PLAYER_H > ALTURA
  ) {

    return true;

  }


  const player = {

    x: jogador.x,

    y: jogador.y,

    width: PLAYER_W,

    height: PLAYER_H

  };


  for (
    const obstaculo of obstaculos
  ) {

    const cima = {

      x: obstaculo.x,

      y: 0,

      width: OBSTACULO_W,

      height:
        obstaculo.aberturaY

    };


    const baixo = {

      x: obstaculo.x,

      y:
        obstaculo.aberturaY +
        obstaculo.abertura,

      width: OBSTACULO_W,

      height:
        ALTURA -
        (
          obstaculo.aberturaY +
          obstaculo.abertura
        )

    };


    if (
      colisao(player, cima) ||
      colisao(player, baixo)
    ) {

      return true;

    }

  }


  return false;

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

          vivo: jogador.vivo

        })),

    obstaculos,

    score,

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




function iniciarJogo() {

  if (
    Object.keys(jogadores).length === 0
  ) {

    return;

  }


  score = 0;

  obstaculos = [];

  proximoObstaculo = 0;

  jogoAtivo = true;

  ultimoObstaculo =
    Date.now();


  Object.values(jogadores)
    .forEach(jogador => {

      jogador.x = 70;

      jogador.y = 300;

      jogador.velocidadeY = 0;

      jogador.vivo = true;

    });


  enviarEstado();

}




wss.on("connection", ws => {

  const id =
    proximoID++;


  jogadores[id] = {

    id,

    nome:
      "Jogador " + id,

    x: 70,

    y: 300,

    velocidadeY: 0,

    vivo: true,

    ws

  };


  console.log(
    "Jogador entrou:",
    id
  );


  ws.send(
    JSON.stringify({

      tipo: "id",

      id

    })
  );


  enviarEstado();




  ws.on("message", mensagem => {

    try {

      const dados =
        JSON.parse(
          mensagem.toString()
        );


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

        if (
          typeof dados.nome ===
          "string"
        ) {

          jogador.nome =
            dados.nome
              .trim()
              .slice(0, 20);

        }

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
        "Mensagem inválida"
      );

    }

  });




  ws.on("close", () => {

    delete jogadores[id];


    console.log(
      "Jogador saiu:",
      id
    );


    if (
      Object.keys(jogadores)
        .length === 0
    ) {

      jogoAtivo = false;

      obstaculos = [];

      score = 0;

    }


    enviarEstado();

  });

});




setInterval(() => {

  if (!jogoAtivo) {

    return;

  }




  Object.values(jogadores)
    .forEach(jogador => {

      if (!jogador.vivo) {

        return;

      }


      jogador.velocidadeY +=
        GRAVIDADE;


      jogador.y +=
        jogador.velocidadeY;


      if (
        jogadorColidiu(jogador)
      ) {

        jogador.vivo = false;

      }

    });




  obstaculos.forEach(
    obstaculo => {

      obstaculo.x -=
        VELOCIDADE;

    }
  );




  if (
    Date.now() -
    ultimoObstaculo >
    INTERVALO
  ) {

    criarObstaculo();

    ultimoObstaculo =
      Date.now();

  }




  obstaculos.forEach(
    obstaculo => {

      if (
        !obstaculo.passou &&
        obstaculo.x +
        OBSTACULO_W < 70
      ) {

        obstaculo.passou = true;

        score++;

      }

    }
  );




  obstaculos =
    obstaculos.filter(
      obstaculo =>
        obstaculo.x +
        OBSTACULO_W > 0
    );



  const vivos =
    Object.values(jogadores)
      .filter(
        jogador =>
          jogador.vivo
      );


  if (
    vivos.length === 0
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
      "Servidor multiplayer online"
    );

    console.log(
      "Porta:",
      PORT
    );

  }
);
