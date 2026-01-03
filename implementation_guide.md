# Implementation Guide & Code Examples

## Part 1: Project Structure & Initial Setup

### Getting Started with Docker Compose

```bash
# Clone and setup
git clone https://github.com/yourorg/platform
cd platform

# Create environment files
cp .env.example .env
cp .env.example .env.local

# Start all services
docker-compose up -d

# Initialize databases
docker-compose exec api npm run migrate

# Access services
# Frontend: http://localhost:3000
# API: http://localhost:4000
# Kafka UI: http://localhost:8080
# Elasticsearch: http://localhost:9200
```

---

## Part 2: Core Service Implementation Examples

### 1. Authentication Service (Node.js + Express)

```typescript
// services/auth/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Error handling
app.use(errorHandler);

export default app;

// services/auth/src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/authController';
import { validateRequest } from '../middleware/validation';
import { LoginSchema, RegisterSchema } from '../validators/auth.validator';

export const authRouter = Router();

authRouter.post('/register', validateRequest(RegisterSchema), register);
authRouter.post('/login', validateRequest(LoginSchema), login);
authRouter.post('/refresh-token', refresh);
authRouter.post('/logout', logout);

// services/auth/src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, fullName } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Store refresh token in Redis
    await redis.setex(
      `refresh_token:${user.id}`,
      7 * 24 * 60 * 60,
      refreshToken
    );

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    await redis.setex(
      `refresh_token:${user.id}`,
      7 * 24 * 60 * 60,
      refreshToken
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}
```

### 2. Chat Service with WebSocket (Socket.io)

```typescript
// services/chat/src/websocket/chatGateway.ts
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { messageService } from '../services/messageService';
import { presenceService } from '../services/presenceService';
import { redis } from '../lib/redis';
import { logger } from '../utils/logger';

export class ChatGateway {
  private io: Server;

  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
      adapter: require('socket.io-redis')({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      }),
    });

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication failed'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        socket.data.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupHandlers() {
    this.io.on('connection', async (socket: Socket) => {
      const userId = socket.data.userId;
      logger.info(`User ${userId} connected via socket ${socket.id}`);

      // Update presence
      await presenceService.setOnline(userId);
      this.io.emit('presence:changed', {
        userId,
        status: 'online',
      });

      // Join channel
      socket.on('channel:join', async (channelId: string) => {
        socket.join(`channel:${channelId}`);
        socket.data.currentChannelId = channelId;

        // Broadcast join event
        this.io.to(`channel:${channelId}`).emit('user:joined', {
          userId,
          channelId,
        });

        logger.info(`User ${userId} joined channel ${channelId}`);
      });

      // Leave channel
      socket.on('channel:leave', async (channelId: string) => {
        socket.leave(`channel:${channelId}`);
        socket.data.currentChannelId = null;

        this.io.to(`channel:${channelId}`).emit('user:left', {
          userId,
          channelId,
        });
      });

      // Send message
      socket.on('message:send', async (payload, callback) => {
        try {
          const { channelId, content } = payload;

          // Validate
          if (!content || content.trim().length === 0) {
            return callback({
              success: false,
              error: 'Message cannot be empty',
            });
          }

          // Create message
          const message = await messageService.createMessage({
            channelId,
            userId,
            content,
          });

          // Broadcast to channel
          this.io.to(`channel:${channelId}`).emit('message:new', {
            id: message.id,
            channelId: message.channelId,
            userId: message.userId,
            content: message.content,
            createdAt: message.createdAt,
          });

          // Acknowledge to sender
          callback({
            success: true,
            message: {
              id: message.id,
              createdAt: message.createdAt,
            },
          });
        } catch (error) {
          logger.error('Message send failed', error);
          callback({ success: false, error: error.message });
        }
      });

      // Typing indicator
      socket.on('message:typing', (channelId: string) => {
        socket.to(`channel:${channelId}`).emit('user:typing', {
          userId,
          channelId,
        });
      });

      // Edit message
      socket.on('message:edit', async (payload, callback) => {
        try {
          const { messageId, content } = payload;

          const message = await messageService.editMessage(messageId, content, userId);

          this.io.to(`channel:${message.channelId}`).emit('message:edited', {
            id: message.id,
            content: message.content,
            updatedAt: message.updatedAt,
          });

          callback({ success: true });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Delete message
      socket.on('message:delete', async (messageId: string, callback) => {
        try {
          const message = await messageService.deleteMessage(messageId, userId);

          this.io.to(`channel:${message.channelId}`).emit('message:deleted', {
            id: messageId,
          });

          callback({ success: true });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        await presenceService.setOffline(userId);
        this.io.emit('presence:changed', {
          userId,
          status: 'offline',
        });

        logger.info(`User ${userId} disconnected`);
      });
    });
  }

  start(port: number) {
    this.io.listen(port);
    logger.info(`Chat gateway listening on port ${port}`);
  }
}

// services/chat/src/services/messageService.ts
import { prisma } from '../lib/prisma';
import { kafka } from '../lib/kafka';
import { redis } from '../lib/redis';

export class MessageService {
  async createMessage(input: {
    channelId: string;
    userId: string;
    content: string;
  }) {
    // Create message in database
    const message = await prisma.message.create({
      data: {
        channelId: input.channelId,
        userId: input.userId,
        content: input.content,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Publish event to Kafka
    await kafka.producer().send({
      topic: 'chat.message.created',
      messages: [
        {
          key: input.channelId,
          value: JSON.stringify({
            messageId: message.id,
            channelId: message.channelId,
            userId: message.userId,
            timestamp: message.createdAt.toISOString(),
          }),
        },
      ],
    });

    // Index in Elasticsearch asynchronously
    this.indexMessage(message).catch((err) =>
      console.error('ES indexing failed:', err)
    );

    // Invalidate cache
    await redis.del(`messages:channel:${input.channelId}`);

    return message;
  }

  private async indexMessage(message: any) {
    const client = require('../lib/elasticsearch');
    await client.index({
      index: 'messages',
      id: message.id,
      body: {
        messageId: message.id,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  }

  async getChannelMessages(channelId: string, limit: number = 50, offset: number = 0) {
    // Try cache first
    const cacheKey = `messages:channel:${channelId}:${offset}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        reactions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(messages));

    return messages;
  }

  async editMessage(messageId: string, content: string, userId: string) {
    // Verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (message?.userId !== userId) {
      throw new Error('Not authorized to edit this message');
    }

    // Update
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content },
    });

    // Publish event
    await kafka.producer().send({
      topic: 'chat.message.edited',
      messages: [
        {
          key: updated.channelId,
          value: JSON.stringify({
            messageId: updated.id,
            content: updated.content,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    // Invalidate cache
    await redis.del(`message:${messageId}`);

    return updated;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (message?.userId !== userId) {
      throw new Error('Not authorized to delete this message');
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    await kafka.producer().send({
      topic: 'chat.message.deleted',
      messages: [
        {
          key: updated.channelId,
          value: JSON.stringify({ messageId: updated.id }),
        },
      ],
    });

    return updated;
  }
}
```

### 3. Project/Kanban Service

```typescript
// services/project/src/services/issueService.ts
import { prisma } from '../lib/prisma';
import { kafka } from '../lib/kafka';
import { redis } from '../lib/redis';

export class IssueService {
  async createIssue(input: {
    projectId: string;
    title: string;
    description?: string;
    issueType: 'task' | 'bug' | 'feature' | 'epic';
    priority: string;
    userId: string;
  }) {
    // Generate issue key
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });

    const issueCount = await prisma.issue.count({
      where: { projectId: input.projectId },
    });

    const issueKey = `${project.key}-${issueCount + 1}`;

    // Create issue
    const issue = await prisma.issue.create({
      data: {
        projectId: input.projectId,
        key: issueKey,
        title: input.title,
        description: input.description,
        issueType: input.issueType,
        priority: input.priority,
        createdBy: input.userId,
        status: 'todo',
      },
      include: {
        assignees: true,
        labels: true,
      },
    });

    // Publish event
    await kafka.producer().send({
      topic: 'project.issue.created',
      messages: [
        {
          key: input.projectId,
          value: JSON.stringify({
            issueId: issue.id,
            projectId: issue.projectId,
            key: issue.key,
            title: issue.title,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    // Invalidate cache
    await redis.del(`project:board:${input.projectId}`);

    return issue;
  }

  async moveIssue(
    issueId: string,
    newStatus: string,
    userId: string
  ) {
    // Verify authorization (user has project access)
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });

    // Update issue
    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: { status: newStatus },
      include: {
        project: true,
        assignees: true,
      },
    });

    // Log activity
    await prisma.issueActivity.create({
      data: {
        issueId,
        userId,
        fieldChanged: 'status',
        oldValue: issue.status,
        newValue: newStatus,
      },
    });

    // Publish event for WebSocket broadcast
    await kafka.producer().send({
      topic: 'project.issue.moved',
      messages: [
        {
          key: issue.projectId,
          value: JSON.stringify({
            issueId: updated.id,
            projectId: updated.projectId,
            newStatus: newStatus,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    // Invalidate cache
    await redis.del(`project:board:${issue.projectId}`);

    return updated;
  }

  async getProjectBoard(projectId: string) {
    // Try cache
    const cached = await redis.get(`project:board:${projectId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get board with columns and issues
    const board = await prisma.kanbanBoard.findFirst({
      where: { projectId, isDefault: true },
      include: {
        columns: {
          include: {
            issues: {
              where: { deletedAt: null },
              include: {
                assignees: true,
                labels: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    // Cache for 10 minutes
    await redis.setex(
      `project:board:${projectId}`,
      600,
      JSON.stringify(board)
    );

    return board;
  }

  async updateIssueAssignee(
    issueId: string,
    assigneeId: string,
    userId: string
  ) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    // Check if already assigned
    const existing = await prisma.issueAssignee.findFirst({
      where: { issueId, userId: assigneeId },
    });

    if (!existing) {
      await prisma.issueAssignee.create({
        data: { issueId, userId: assigneeId },
      });
    }

    // Log activity
    await prisma.issueActivity.create({
      data: {
        issueId,
        userId,
        fieldChanged: 'assignee',
        newValue: assigneeId,
      },
    });

    // Publish event
    await kafka.producer().send({
      topic: 'project.issue.assigned',
      messages: [
        {
          key: issue.projectId,
          value: JSON.stringify({
            issueId,
            assigneeId,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    return this.getIssue(issueId);
  }

  async getIssue(issueId: string) {
    return prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        assignees: true,
        labels: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
        activity: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }
}
```

---

## Part 3: Frontend Implementation Examples

### Chat Component (React + Next.js)

```typescript
// frontend/src/components/chat/ChatWindow.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { usePresenceStore } from '@/store/presenceStore';
import { chatSocket } from '@/services/websocket/chatSocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChannelHeader from './ChannelHeader';

interface ChatWindowProps {
  channelId: string;
  teamId: string;
}

export default function ChatWindow({ channelId, teamId }: ChatWindowProps) {
  const { currentChannel, messages, addMessage, updateMessage } = useChatStore();
  const { users, setUserTyping } = usePresenceStore();
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Join channel
  useEffect(() => {
    setLoading(true);
    chatSocket.emit('channel:join', channelId);
    setLoading(false);

    return () => {
      chatSocket.emit('channel:leave', channelId);
    };
  }, [channelId]);

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      addMessage(message);
    };

    const handleEditedMessage = (data: any) => {
      updateMessage(data.id, { content: data.content });
    };

    const handleDeletedMessage = (data: any) => {
      updateMessage(data.id, { deletedAt: new Date() });
    };

    const handleUserTyping = (data: any) => {
      setUserTyping(data.userId, true);
      setTimeout(() => setUserTyping(data.userId, false), 3000);
    };

    chatSocket.on('message:new', handleNewMessage);
    chatSocket.on('message:edited', handleEditedMessage);
    chatSocket.on('message:deleted', handleDeletedMessage);
    chatSocket.on('user:typing', handleUserTyping);

    return () => {
      chatSocket.off('message:new', handleNewMessage);
      chatSocket.off('message:edited', handleEditedMessage);
      chatSocket.off('message:deleted', handleDeletedMessage);
      chatSocket.off('user:typing', handleUserTyping);
    };
  }, [addMessage, updateMessage, setUserTyping]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white">
      <ChannelHeader />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput channelId={channelId} />
    </div>
  );
}

// frontend/src/components/chat/MessageInput.tsx
'use client';

import { useState, useRef } from 'react';
import { chatSocket } from '@/services/websocket/chatSocket';
import { useAuth } from '@/hooks/useAuth';

interface MessageInputProps {
  channelId: string;
}

export default function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout>();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Emit typing indicator
    chatSocket.emit('message:typing', channelId);

    // Debounce
    clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => {}, 2000));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || sending) return;

    setSending(true);

    chatSocket.emit(
      'message:send',
      {
        channelId,
        content: content.trim(),
      },
      (response: any) => {
        if (response.success) {
          setContent('');
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
          }
        } else {
          alert(`Error: ${response.error}`);
        }
        setSending(false);
      }
    );
  };

  return (
    <form
      onSubmit={handleSend}
      className="border-t border-gray-200 p-4 bg-gray-50"
    >
      <div className="flex gap-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Type a message..."
          rows={1}
          disabled={sending}
          className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
}

// frontend/src/store/chatStore.ts
import { create } from 'zustand';

interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

interface ChatStore {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),

  clearMessages: () => set({ messages: [] }),
}));
```

### Kanban Board Component

```typescript
// frontend/src/components/project/KanbanBoard.tsx
'use client';

import { useProject } from '@/hooks/useProject';
import { useProjectSocket } from '@/services/websocket/projectSocket';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import BoardColumn from './BoardColumn';

interface KanbanBoardProps {
  projectId: string;
  boardId: string;
}

export default function KanbanBoard({ projectId, boardId }: KanbanBoardProps) {
  const { board, issues, loading, moveIssue } = useProject(projectId, boardId);
  const { onIssueMoved } = useProjectSocket(projectId);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const newStatus = over.id as string;

    // Optimistic update
    const issue = issues.find((i) => i.id === issueId);
    if (issue) {
      issue.status = newStatus;
    }

    // Send to backend
    try {
      await moveIssue(issueId, newStatus);
    } catch (error) {
      // Revert on error
      if (issue) {
        issue.status = active.data.current.status;
      }
    }
  };

  if (loading) {
    return <div>Loading board...</div>;
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto p-4 bg-gray-50 min-h-screen">
        {board?.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            issues={issues.filter((i) => i.status === column.name)}
          />
        ))}
      </div>
    </DndContext>
  );
}

// frontend/src/components/project/BoardColumn.tsx
import { useDroppable } from '@dnd-kit/core';
import IssueCard from './IssueCard';

interface BoardColumnProps {
  column: any;
  issues: any[];
}

export default function BoardColumn({ column, issues }: BoardColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.name,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-100 rounded-lg p-4 w-80 flex-shrink-0"
    >
      <h3 className="font-bold text-lg mb-4">
        {column.name}
        <span className="ml-2 text-sm text-gray-600">({issues.length})</span>
      </h3>

      {column.wipLimit && (
        <p className="text-sm text-orange-600 mb-3">
          WIP: {issues.length}/{column.wipLimit}
        </p>
      )}

      <div className="space-y-3">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

// frontend/src/components/project/IssueCard.tsx
import { useDraggable } from '@dnd-kit/core';

interface IssueCardProps {
  issue: any;
}

export default function IssueCard({ issue }: IssueCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: issue.id,
    data: { status: issue.status },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white p-3 rounded-lg shadow hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      <p className="text-sm font-mono text-gray-600">{issue.key}</p>
      <p className="font-medium mt-1">{issue.title}</p>

      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(issue.priority)}`}>
          {issue.priority}
        </span>

        {issue.assignees.length > 0 && (
          <div className="flex -space-x-2">
            {issue.assignees.slice(0, 3).map((assignee: any) => (
              <img
                key={assignee.id}
                src={assignee.avatarUrl}
                alt={assignee.fullName}
                className="w-6 h-6 rounded-full border-2 border-white"
                title={assignee.fullName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getPriorityColor(priority: string) {
  const colors = {
    highest: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
    lowest: 'bg-blue-100 text-blue-800',
  };
  return colors[priority as keyof typeof colors] || colors.medium;
}
```

---

## Part 4: Database Migration Example

```typescript
// Migration: Create core tables
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating organizations table...');
  await prisma.$executeRaw`
    CREATE TABLE organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      owner_id UUID,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (owner_id)
    );
  `;

  console.log('Creating projects table...');
  await prisma.$executeRaw`
    CREATE TABLE projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL REFERENCES organizations(id),
      name VARCHAR(255) NOT NULL,
      key VARCHAR(10) UNIQUE NOT NULL,
      description TEXT,
      project_type VARCHAR(50) DEFAULT 'kanban',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (org_id),
      INDEX (key)
    );
  `;

  console.log('All migrations completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

---

## Summary

This implementation guide provides:

1. **Service Architecture**: How to structure microservices
2. **Authentication**: Secure user registration and login
3. **Real-time Communication**: WebSocket implementation with Socket.io
4. **Chat Features**: Message creation, editing, deletion with real-time updates
5. **Project Management**: Kanban board with drag-and-drop
6. **Frontend Patterns**: React hooks, state management with Zustand
7. **Database Design**: Proper schema with relationships and indexes

Use this as a foundation and adapt based on your specific requirements!

