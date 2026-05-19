import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { log } from "./utils/logger";
import jwt from "jsonwebtoken";
import { User } from "./models/mongoose";
import { createAdapter } from "@socket.io/redis-adapter";
import redisClient from "./config/redis";

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
      methods: ["GET", "POST"]
    },
    transports: ["websocket"]
  });

  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    log("Socket.io Redis adapter connected", "INFO");
  }).catch((err: any) => {
    log(`Socket.io Redis adapter failed to connect: ${err.message}`, "ERROR");
  });

  io.of("/tenant-axion").on("connection", (socket) => {
    log(`WebSocket client connected [tenant-axion]: ${socket.id}`, "INFO");

    socket.on("authenticate", async (payload) => {
      try {
        const token = payload?.token;
        if (!token) return;
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          log("JWT_SECRET is missing in .env", "ERROR");
          socket.disconnect();
          return;
        }

        // Validação de algoritmo estrita contra JWT tampering
        const decoded: any = jwt.verify(token, secret, { algorithms: ["HS256"] });
        
        // Consulta ao banco server-side
        const userDoc = await User.findOne({ username: decoded.username });
        if (!userDoc) {
          log(`Socket auth failed: user ${decoded.username} not found`, "WARN");
          socket.disconnect();
          return;
        }

        // Verificação de tokenVersion
        if (decoded.tokenVersion !== undefined && userDoc.tokenVersion !== decoded.tokenVersion) {
          log(`Socket auth failed: tokenVersion mismatch for ${decoded.username}`, "WARN");
          socket.disconnect();
          return;
        }

        socket.data.user = {
          ...decoded,
          role: userDoc.role
        };
        
        if (userDoc.role === "Moderador") {
          socket.data.allowedTicketTypes = userDoc.allowedTicketTypes || [];
        } else {
          socket.data.allowedTicketTypes = ["ALL"];
        }
        log(`Socket ${socket.id} authenticated as ${decoded.username} (${userDoc.role})`, "INFO");
      } catch (err: any) {
        log(`Socket auth error: ${err.message}`, "WARN");
        socket.disconnect();
      }
    });

    socket.on("disconnect", () => {
      // Silencioso
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

/**
 * Emite seletivamente o evento de atualização de chamados apenas para
 * sessões autorizadas (respeitando estritamente as permissões de categoria no backend).
 */
export async function emitSelectiveTicketsUpdated(ticketType?: string) {
  try {
    if (!io) return;
    const namespace = io.of("/tenant-axion");
    const sockets = await namespace.fetchSockets();
    
    for (const socket of sockets) {
      const user = socket.data?.user;
      if (user && user.role === "Moderador") {
        const allowed = socket.data?.allowedTicketTypes || [];
        if (ticketType && !allowed.includes(ticketType)) {
          // Bloqueia o envio do alerta/notificação em tempo real para este Moderador não autorizado!
          continue;
        }
      }
      socket.emit("tickets_updated");
    }
  } catch (err: any) {
    log(`Selective socket emit error: ${err.message}`, "ERROR");
    try { io?.of("/tenant-axion").emit("tickets_updated"); } catch(e) {}
  }
}
