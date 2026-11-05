
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

app.get("/status", (req, res) => {
  res.json({
    profile: USERNAME,
    connected: connection?.isConnected ?? false
  });
});

let connection;

function getAvatar(user) {
  return user?.avatarThumb?.urlList?.[0]
    || user?.avatarMedium?.urlList?.[0]
    || user?.avatarLarge?.urlList?.[0]
    || "";
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
}

async function connectTikTok() {
  connection = new TikTokLiveConnection(USERNAME);

  connection.on(ControlEvent.ERROR, ({ info }) => {
    console.error("TikTok:", info);
  });

  connection.on(WebcastEvent.FOLLOW, e =>
    sendEvent("Novo seguidor", e)
  );

  connection.on(WebcastEvent.SHARE, e =>
    sendEvent("Compartilhou a live", e)
  );

  connection.on(WebcastEvent.GIFT, e => {
    if (e.repeatEnd === false) return;
    sendEvent("Enviou presente", e);
  });

  connection.on(WebcastEvent.LIKE, e =>
    sendEvent("Curtiu a live", e)
  );

  try {
    await connection.connect();
    console.log("Conectado à live de @" + USERNAME);
    io.emit("connection-status", "Conectado");
  } catch (error) {
    console.error("Não foi possível conectar:", error.message);
    io.emit("connection-status", "Aguardando live");
    setTimeout(connectTikTok, 30000);
  }
}

io.on("connection", socket => {
  socket.emit(
    "connection-status",
    connection?.isConnected ? "Conectado" : "Aguardando live"
  );
});

httpServer.listen(PORT, () => {
  console.log("Painel iniciado na porta " + PORT);
  connectTikTok();
});
                  
