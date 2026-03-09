import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { JwtPayload } from '../types/index.js';
import { NotificationWithDetails } from '../repositories/notification.repository.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

let socketService: SocketService | null = null;

export class SocketService {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token as string, config.jwtSecret) as JwtPayload;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId!;
      console.log(`User connected: ${userId}`);

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });

      // Handle notification read
      socket.on('notification:read', (notificationId: string) => {
        // Broadcast to all user's devices
        socket.to(`user:${userId}`).emit('notification:marked-read', notificationId);
      });
    });
  }

  sendNotification(userId: string, notification: NotificationWithDetails): void {
    this.io.to(`user:${userId}`).emit('notification:new', notification);
  }

  sendToAllDoctors(event: string, data: unknown): void {
    // We don't track roles in sockets, so we'd need to query or maintain a doctor list
    // For simplicity, we broadcast to all and let clients filter
    this.io.emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}

export const initializeSocketService = (httpServer: HttpServer): SocketService => {
  socketService = new SocketService(httpServer);
  return socketService;
};

export const getSocketService = (): SocketService | null => {
  return socketService;
};
