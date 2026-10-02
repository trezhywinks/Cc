const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const FOTO_PADRAO = "personagem.png";

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    status: "online",
    sistema: "Whmer Chat"
  }));
});

const wss = new WebSocket.Server({
  server
});

const usuarios = new Map();

function enviarTodos(dados) {
  const mensagem = JSON.stringify(dados);

  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(mensagem);
    }
  }
}

function enviar(ws, dados) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(dados));
  }
}

wss.on("connection", (ws) => {

  const id =
    Math.random().toString(36).substring(2, 10);

  const usuario = {
    id: id,
    nome: "Anônimo",
    foto: FOTO_PADRAO
  };

  usuarios.set(id, usuario);

  ws.usuarioId = id;



  enviar(ws, {
    tipo: "conectado",
    seuId: id,
    foto: FOTO_PADRAO
  });



  ws.on("message", (dados) => {

    try {

      const data = JSON.parse(dados);

      const usuario =
        usuarios.get(ws.usuarioId);

      if (!usuario) return;


      /*
      =========================
      USUÁRIO
      =========================
      */

      if (data.tipo === "usuario") {

        if (
          typeof data.nome === "string" &&
          data.nome.trim()
        ) {

          usuario.nome =
            data.nome
              .trim()
              .substring(0, 30);

        }

        usuario.foto = FOTO_PADRAO;

        enviar(ws, {
          tipo: "usuario_configurado",
          usuario: usuario
        });

        return;
      }


      /*
      =========================
      TEXTO
      =========================
      */

      if (data.tipo === "mensagem") {

        if (
          typeof data.texto !== "string" ||
          !data.texto.trim()
        ) {
          return;
        }

        enviarTodos({

          tipo: "mensagem",

          id:
            Date.now() +
            "-" +
            Math.random()
              .toString(36)
              .substring(2, 7),

          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            foto: FOTO_PADRAO
          },

          texto:
            data.texto
              .trim()
              .substring(0, 2000),

          data: Date.now()

        });

        return;
      }


      /*
      =========================
      STICKER
      =========================
      */

      if (data.tipo === "sticker") {

        if (
          typeof data.imagem !== "string" ||
          !data.imagem.trim()
        ) {
          return;
        }

        enviarTodos({

          tipo: "sticker",

          id:
            Date.now() +
            "-" +
            Math.random()
              .toString(36)
              .substring(2, 7),

          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            foto: FOTO_PADRAO
          },

          imagem:
            data.imagem.trim(),

          data: Date.now()

        });

        return;
      }

    } catch (erro) {

      console.log(
        "Erro ao processar mensagem:",
        erro.message
      );

    }

  });


  /*
  =========================
  DESCONECTOU
  =========================
  */

  ws.on("close", () => {

    usuarios.delete(ws.usuarioId);

  });


  /*
  =========================
  ERRO
  =========================
  */

  ws.on("error", (erro) => {

    console.log(
      "WebSocket:",
      erro.message
    );

  });

});



server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Whmer Chat rodando na porta ${PORT}`
    );

  }
);
