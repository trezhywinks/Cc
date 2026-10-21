
const http = require("http");
const WebSocket = require("ws");

const CODIGO_VERIFICACAO = "QERD";
const usuariosVerificados = new Set();

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

const wss = new WebSocket.Server({ server });
const usuarios = new Map();

function enviar(ws, dados) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(dados));
  }
}

function enviarTodos(dados) {
  const mensagem = JSON.stringify(dados);

  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(mensagem);
    }
  }
}

function dadosUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    foto: usuario.foto,
    verificado: usuariosVerificados.has(usuario.id)
  };
}

wss.on("connection", (ws) => {
  const id = Math.random().toString(36).substring(2, 10);

  const usuario = {
    id,
    nome: "Anônimo",
    foto: FOTO_PADRAO
  };

  usuarios.set(id, usuario);
  ws.usuarioId = id;

  enviar(ws, {
    tipo: "conectado",
    seuId: id,
    foto: usuario.foto,
    verificado: usuariosVerificados.has(id),
    verificados: [...usuariosVerificados]
      .map(id => usuarios.get(id))
      .filter(Boolean)
      .map(u => ({
        id: u.id,
        nome: u.nome
      }))
  });

  ws.on("message", (dados) => {
    try {
      const data = JSON.parse(dados);
      const usuario = usuarios.get(ws.usuarioId);

      if (!usuario) return;

      // CONFIGURAR USUÁRIO
      if (data.tipo === "usuario") {
        if (typeof data.nome === "string" && data.nome.trim()) {
          usuario.nome = data.nome.trim().substring(0, 30);
        }

        if (
          typeof data.foto === "string" &&
          data.foto.startsWith("data:image/")
        ) {
          usuario.foto = data.foto;
        }

        enviar(ws, {
          tipo: "usuario_configurado",
          usuario: dadosUsuario(usuario)
        });

        // Atualiza o nome/foto para os conectados
        enviarTodos({
          tipo: "usuarioAtualizado",
          usuario: dadosUsuario(usuario)
        });

        return;
      }

      // VERIFICAR USUÁRIO
      if (data.tipo === "verificar") {
        if (data.codigo !== CODIGO_VERIFICACAO) {
          enviar(ws, {
            tipo: "resultadoVerificacao",
            sucesso: false,
            mensagem: "Código incorreto."
          });

          return;
        }

        usuariosVerificados.add(usuario.id);

        enviar(ws, {
          tipo: "resultadoVerificacao",
          sucesso: true,
          mensagem: "Conta verificada!",
          id: usuario.id
        });

        // Avisa todos os usuários conectados
        enviarTodos({
          tipo: "usuarioVerificado",
          id: usuario.id,
          nome: usuario.nome
        });

        return;
      }

      // MENSAGEM DE TEXTO
      if (data.tipo === "mensagem") {
        if (
          typeof data.texto !== "string" ||
          !data.texto.trim()
        ) {
          return;
        }

        enviarTodos({
          tipo: "mensagem",
          id: Date.now() + "-" +
            Math.random().toString(36).substring(2, 7),
          usuario: dadosUsuario(usuario),
          texto: data.texto.trim().substring(0, 2000),
          data: Date.now()
        });

        return;
      }

      // STICKER
      if (data.tipo === "sticker") {
        if (
          typeof data.imagem !== "string" ||
          !data.imagem.trim()
        ) {
          return;
        }

        enviarTodos({
          tipo: "sticker",
          id: Date.now() + "-" +
            Math.random().toString(36).substring(2, 7),
          usuario: dadosUsuario(usuario),
          imagem: data.imagem.trim(),
          data: Date.now()
        });

        return;
      }
    } catch (erro) {
      console.log("Erro ao processar mensagem:", erro.message);
    }
  });

  ws.on("close", () => {
    usuarios.delete(ws.usuarioId);

    // O selo permanece na memória do servidor
    // durante a sessão, mesmo se desconectar.
  });

  ws.on("error", (erro) => {
    console.log("WebSocket:", erro.message);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Whmer Chat rodando na porta ${PORT}`);
});
