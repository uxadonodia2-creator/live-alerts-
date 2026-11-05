
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent
} from "tiktok-live-connector";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;
const USERNAME = "xzuke6";

app.use(express.static("public"));

let connection = null;
let connecting = false;

app.get("/status", (req, res) => {
  res.json({
    profile: USERNAME,
    connected: connection?.isConnected ?? false
  });
});

function getAvatar(user) {
  return (
    user?.avatarThumb?.urlList?.[0] ||
    user?.avatarMedium?.urlList?.[0] ||
    user?.avatarLarge?.urlList?.[0] ||
    ""
  );
}

function sendEvent(type, event) {
  const user = event?.user || {};

  io.emit("live-event", {
    type,
    name: user.displayName || user.displayId || "Usuário",
    username: user.displayId || "",
    avatar: getAvatar(user),
    time: new Date().toISOString()
  });

  console.log("Evento recebido:", type);
}

async function connectTikTok() {
  if (connecting) return;
  connecting = true;

  try {
    connection = new TikTokLiveConnection(USERNAME, {});

    connection.on(ControlEvent.ERROR, (data) => {
      console.error("Erro TikTok:", data);
    });

    connection.on(WebcastEvent.FOLLOW, (event) => {
      sendEvent("Novo seguidor", event);
    });

    connection.on(WebcastEvent.SHARE, (event) => {
      sendEvent("Compartilhou a live", event);
    });

    connection.on(WebcastEvent.GIFT, (event) => {
      if (event.repeatEnd === false) return;
      sendEvent("Enviou presente", event);
    });

    connection.on(WebcastEvent.LIKE, (event) => {
      sendEvent("Curtiu a live", event);
    });

    await connection.connect();

    console.log("Conectado à live de @" + USERNAME);
    io.emit("connection-status", "Conectado");
  } catch (error) {
    console.error("Falha na conexão TikTok:", error.message);
    io.emit("connection-status", "Aguardando live");

    connection = null;
    setTimeout(connectTikTok, 30000);
  } finally {
    connecting = false;
  }
}

io.on("connection", (socket) => {
  socket.emit(
    "connection-status",
    connection?.isConnected ? "Conectado" : "Aguardando live"
  );
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("Painel iniciado na porta " + PORT);
  connectTikTok();
});
