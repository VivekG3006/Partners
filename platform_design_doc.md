# Unified Team Collaboration Platform
## Complete System Architecture & Design Document

---

## Executive Summary

This document outlines a comprehensive design for a unified platform combining:
- **Keka** (File Storage & Collaboration)
- **MS Teams** (Real-time Communication, Presence, Notifications)
- **Jira** (Project Management, Kanban Boards, Issue Tracking)

### Target Scale
- 100K+ concurrent users
- Real-time messaging at sub-second latency
- 10K+ organizations
- Multi-region deployment

---

# PART 1: HIGH-LEVEL ARCHITECTURE (HLA)

## 1.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
├──────────────────────────┬──────────────────────┬──────────────────┤
│   Web (React/Next.js)    │   Mobile (React      │   Desktop        │
│                          │   Native/Flutter)    │   (Electron)     │
└──────────────────────────┴──────────────────────┴──────────────────┘
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │        API Gateway & Load Balancer (Nginx)       │
        │    (SSL/TLS, Rate Limiting, Request Routing)     │
        └───────────────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MICROSERVICES LAYER                              │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────┤
│   Auth &     │   Chat &     │   Project    │   File       │ Notif   │
│   User Mgmt  │   Messaging  │   Management │   Storage    │ Service │
│              │              │              │              │         │
│ • OAuth2     │ • WebSockets │ • Kanban     │ • S3/MinIO   │ • Push  │
│ • JWT        │ • Message    │ • Backlog    │ • CDN        │ • Email │
│ • Profile    │   Broker     │ • Issues     │ • Virus Scan │ • SMS   │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────┤
│   Presence   │   Search     │   Analytics  │   Integration│ Web Hook│
│   & Activity │   & Index    │   & Metrics  │   Service    │ Service │
│              │              │              │              │         │
│ • Redis      │ • Elastic    │ • Data       │ • Slack      │ • Slack │
│ • Activity   │   Search     │   Pipeline   │ • GitHub     │ • GitHub│
│   Log        │ • Cache      │ • Time-series│ • Jira       │ • Jira  │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              MESSAGE QUEUE & STREAMING LAYER                        │
├──────────────────────────────────────────────────────────────────────┤
│  Kafka/RabbitMQ  |  Redis Streams  |  WebSocket Gateway Cluster    │
│  (Pub/Sub, Events, Message Routing, Presence Sync)                 │
└──────────────────────────────────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                        │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────┤
│   Primary DB │   Replica DB │   Cache      │   Document   │ Time-   │
│   (PostgreSQL)              │   (Redis)    │   Store      │ Series  │
│              │              │              │   (MongoDB)  │ (Influx)│
│ • Users      │              │ • Sessions   │ • Versions   │ • Metrics
│ • Projects   │              │ • Presence   │ • Configs    │ • Events
│ • Issues     │              │ • Rate Limit │ • Changelog  │         │
│ • Teams      │              │   Data       │              │         │
├──────────────┴──────────────┴──────────────┴──────────────┴─────────┤
│            Backup & Replication (Daily + Event-based)              │
└──────────────────────────────────────────────────────────────────────┘
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │        OBSERVABILITY & MONITORING                │
        │    (Prometheus, Grafana, ELK Stack, Jaeger)      │
        └───────────────────────────────────────────────────┘
```

## 1.2 Microservices Decomposition

| Service | Responsibility | Tech Stack | Scale |
|---------|---|---|---|
| **Auth Service** | Authentication, OAuth2, JWT, Permissions | Node.js/Express + PostgreSQL | Critical |
| **User Service** | Profiles, Teams, Org Management | Node.js/Express + PostgreSQL | High |
| **Chat Service** | Real-time messaging, Thread support | Node.js + WebSocket + Kafka | Critical |
| **Presence Service** | Online/offline status, Activity tracking | Node.js + Redis Streams | High |
| **Project Service** | Projects, Kanban boards, Sprints | Node.js/Express + PostgreSQL | Critical |
| **Issue Service** | Issues, Bugs, Tasks, Subtasks | Node.js/Express + PostgreSQL | High |
| **File Service** | Upload, Storage, Versioning, Sharing | Node.js + S3/MinIO + PostgreSQL | High |
| **Search Service** | Full-text search, Indexing | Node.js + Elasticsearch | Medium |
| **Notification Service** | Push, Email, In-app notifications | Node.js + Message Queue | Medium |
| **Analytics Service** | Metrics, Dashboard, Reports | Node.js + InfluxDB/TimescaleDB | Low |
| **Integration Service** | External APIs, Webhooks | Node.js/Express | Low |

## 1.3 Communication Patterns

### Synchronous (Request-Response)
- REST APIs over HTTP/2
- gRPC for service-to-service (internal)
- Real-time bidirectional: **WebSocket** (chat, presence, board updates)

### Asynchronous (Event-Driven)
- **Kafka** for high-throughput events (messages, file uploads, project updates)
- **Redis Streams** for presence and activity updates
- **RabbitMQ** fallback for notifications and webhooks

---

## 1.4 Data Flow Architecture

### Real-time Message Flow
```
Client A ─→ WebSocket Gateway ─→ Kafka Partition (ordered by conversation)
                                   ↓
                              Message Service (persist to DB)
                                   ↓
                         Fan-out via Kafka to other clients
                                   ↓
                      WebSocket Gateway ─→ Client B, C, D
```

### File Upload Flow
```
Client ─→ API Gateway ─→ File Service ─→ S3/MinIO
                            ↓
                      Queue notification event
                            ↓
                      Search Service indexes
```

### Project Board Update Flow
```
Client ─→ Project Service ─→ PostgreSQL
                            ↓
                      Redis Cache invalidate
                            ↓
                      Kafka: board_updated event
                            ↓
                  WebSocket broadcast to all board viewers
```

---

# PART 2: LOW-LEVEL DESIGN (LLD)

## 2.1 Database Schema Design

### Core Entity Relationships

```sql
-- USERS & AUTHENTICATION
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    status ENUM('active', 'inactive', 'deleted'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    INDEX (email, username)
);

-- ORGANIZATIONS
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (owner_id)
);

-- ORGANIZATION MEMBERS
CREATE TABLE org_members (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role ENUM('owner', 'admin', 'member', 'guest'),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, user_id),
    INDEX (org_id, user_id)
);

-- TEAMS (within organizations)
CREATE TABLE teams (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (org_id)
);

-- TEAM MEMBERS
CREATE TABLE team_members (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role ENUM('owner', 'admin', 'member'),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id),
    INDEX (team_id, user_id)
);

-- CHANNELS (like Slack channels)
CREATE TABLE channels (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id),
    name VARCHAR(100) NOT NULL,
    topic TEXT,
    is_private BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (team_id),
    UNIQUE(team_id, name)
);

-- CHANNEL MEMBERS
CREATE TABLE channel_members (
    id UUID PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channels(id),
    user_id UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    muted BOOLEAN DEFAULT false,
    UNIQUE(channel_id, user_id),
    INDEX (channel_id, user_id)
);

-- MESSAGES/CHAT
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channels(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    content_type ENUM('text', 'markdown', 'code') DEFAULT 'text',
    parent_message_id UUID REFERENCES messages(id), -- for threads
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    INDEX (channel_id, created_at),
    INDEX (user_id),
    INDEX (parent_message_id)
);

-- MESSAGE REACTIONS
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id),
    user_id UUID NOT NULL REFERENCES users(id),
    emoji VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji),
    INDEX (message_id)
);

-- MESSAGE ATTACHMENTS
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id),
    file_id UUID NOT NULL REFERENCES files(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (message_id)
);

-- FILES/STORAGE
CREATE TABLE files (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    uploaded_by UUID REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    s3_key TEXT UNIQUE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    INDEX (org_id),
    INDEX (uploaded_by),
    INDEX (created_at)
);

-- FILE VERSIONS
CREATE TABLE file_versions (
    id UUID PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES files(id),
    version_number INT,
    uploaded_by UUID REFERENCES users(id),
    s3_key TEXT UNIQUE,
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, version_number),
    INDEX (file_id)
);

-- PROJECTS (Kanban/JIRA-like)
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    key VARCHAR(10) UNIQUE NOT NULL, -- e.g., "PROJ"
    description TEXT,
    project_type ENUM('kanban', 'scrum', 'hybrid'),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    INDEX (org_id),
    INDEX (key)
);

-- SPRINTS (for Scrum projects)
CREATE TABLE sprints (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    status ENUM('planned', 'active', 'closed') DEFAULT 'planned',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (project_id, status)
);

-- ISSUES (Kanban Cards / JIRA Issues)
CREATE TABLE issues (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    sprint_id UUID REFERENCES sprints(id),
    key VARCHAR(20) UNIQUE NOT NULL, -- e.g., "PROJ-123"
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_type ENUM('task', 'bug', 'feature', 'epic', 'subtask'),
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, in_review, done
    priority ENUM('lowest', 'low', 'medium', 'high', 'highest') DEFAULT 'medium',
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    parent_issue_id UUID REFERENCES issues(id), -- for subtasks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (project_id, status),
    INDEX (assigned_to),
    INDEX (sprint_id),
    INDEX (key)
);

-- KANBAN BOARDS
CREATE TABLE kanban_boards (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (project_id)
);

-- BOARD COLUMNS
CREATE TABLE board_columns (
    id UUID PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES kanban_boards(id),
    name VARCHAR(100) NOT NULL,
    position INT,
    wip_limit INT, -- Work in Progress limit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (board_id, position)
);

-- ISSUE ASSIGNEES (many-to-many)
CREATE TABLE issue_assignees (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL REFERENCES issues(id),
    user_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(issue_id, user_id),
    INDEX (issue_id)
);

-- ISSUE LABELS/TAGS
CREATE TABLE labels (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name),
    INDEX (project_id)
);

-- ISSUE LABEL MAPPING
CREATE TABLE issue_labels (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL REFERENCES issues(id),
    label_id UUID NOT NULL REFERENCES labels(id),
    UNIQUE(issue_id, label_id),
    INDEX (issue_id)
);

-- COMMENTS ON ISSUES
CREATE TABLE issue_comments (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL REFERENCES issues(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    INDEX (issue_id, created_at),
    INDEX (user_id)
);

-- ISSUE ACTIVITY LOG (for audit & history)
CREATE TABLE issue_activity (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL REFERENCES issues(id),
    user_id UUID REFERENCES users(id),
    field_changed VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (issue_id, created_at)
);

-- PRESENCE & ACTIVITY (Real-time)
CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    status ENUM('online', 'away', 'offline', 'dnd') DEFAULT 'offline',
    last_active_at TIMESTAMP,
    current_channel_id UUID REFERENCES channels(id),
    current_project_id UUID REFERENCES projects(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50), -- message, mention, assignment, comment
    actor_id UUID REFERENCES users(id),
    entity_type VARCHAR(50), -- message, issue, file
    entity_id UUID,
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, created_at),
    INDEX (is_read)
);

-- PERMISSIONS & ROLES
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY,
    role VARCHAR(50), -- 'owner', 'admin', 'member', 'guest'
    permission_id UUID REFERENCES permissions(id),
    UNIQUE(role, permission_id)
);
```

### Key Indexing Strategy

```sql
-- Performance-critical indexes
CREATE INDEX idx_messages_channel_timestamp ON messages(channel_id, created_at DESC);
CREATE INDEX idx_issues_project_status ON issues(project_id, status);
CREATE INDEX idx_files_org_uploaded_time ON files(org_id, created_at DESC);
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- Composite indexes for filtering
CREATE INDEX idx_issues_sprint_status ON issues(sprint_id, status);
CREATE INDEX idx_team_members_user_org ON team_members(user_id, team_id);
```

## 2.2 Cache Strategy

### Redis Cache Layers

```javascript
// 1. Session Cache (TTL: 24 hours)
redis:session:{sessionId} → {userId, tokenExp, permissions}

// 2. User Profile Cache (TTL: 1 hour)
redis:user:{userId} → {id, name, email, avatar, status}

// 3. Team/Org Cache (TTL: 30 minutes)
redis:team:{teamId} → {id, name, members, channels}

// 4. Presence Cache (TTL: 5 minutes, updated real-time)
redis:presence:{userId} → {status, lastActive, currentChannel}

// 5. Board Cache (TTL: 10 minutes)
redis:board:{boardId} → {columns, issues, stats}

// 6. Rate Limiting (TTL: 1 minute)
redis:ratelimit:{userId}:{endpoint} → request_count

// 7. Recent Messages Cache (TTL: 1 hour)
redis:messages:{channelId} → {last_100_messages}

// 8. User Permissions Cache (TTL: 30 minutes)
redis:permissions:{userId}:{orgId} → {roles, permissions}
```

### Cache Invalidation Strategy
- **Event-based**: Kafka messages trigger cache invalidation
- **Time-based**: TTL-based expiration for non-critical data
- **Manual**: Admin actions (user role changes, org settings)

```javascript
// Example: When issue is updated
async function updateIssue(issueId, updates) {
    // Update database
    const issue = await db.issues.update(issueId, updates);
    
    // Publish event
    await kafka.publish('issues.updated', {
        issueId, projectId: issue.projectId, changes: updates
    });
    
    // Invalidate caches
    await redis.del(`board:${issue.projectId}`);
    await redis.del(`issue:${issueId}`);
    
    // Broadcast WebSocket
    wss.broadcast(`project:${issue.projectId}`, {
        type: 'issue_updated',
        issue
    });
}
```

## 2.3 API Design - Key Endpoints

### Authentication Service
```
POST   /api/v1/auth/register         - Register new user
POST   /api/v1/auth/login            - Login with credentials
POST   /api/v1/auth/refresh-token    - Refresh JWT token
POST   /api/v1/auth/logout           - Logout
POST   /api/v1/auth/oauth/github     - OAuth GitHub callback
GET    /api/v1/auth/me               - Get current user
```

### Chat Service
```
WS     /ws/chat/{channelId}          - WebSocket connection
POST   /api/v1/messages              - Send message
GET    /api/v1/channels/{id}/msgs    - Get message history
PUT    /api/v1/messages/{id}         - Edit message
DELETE /api/v1/messages/{id}         - Delete message
POST   /api/v1/messages/{id}/react   - Add reaction
GET    /api/v1/messages/{id}/thread  - Get thread replies
```

### Project Service
```
POST   /api/v1/projects              - Create project
GET    /api/v1/projects/{id}         - Get project details
GET    /api/v1/projects/{id}/board   - Get Kanban board
POST   /api/v1/projects/{id}/issues  - Create issue
PUT    /api/v1/issues/{id}           - Update issue
PATCH  /api/v1/issues/{id}/move      - Move issue to column/status
GET    /api/v1/sprints/{id}          - Get sprint details
POST   /api/v1/sprints              - Create sprint
```

### File Service
```
POST   /api/v1/files/upload          - Upload file (multipart)
GET    /api/v1/files/{id}            - Download file
DELETE /api/v1/files/{id}            - Delete file
GET    /api/v1/files/{id}/versions   - Get file versions
POST   /api/v1/files/{id}/share      - Share file with users
```

### Presence Service
```
WS     /ws/presence                  - WebSocket for presence updates
POST   /api/v1/presence/update       - Update presence status
GET    /api/v1/presence/users        - Get online users in org
```

## 2.4 WebSocket Events

### Message Events
```javascript
// Client → Server
{
  type: 'message.send',
  channelId: 'ch_123',
  content: 'Hello team!',
  contentType: 'text'
}

// Server → Client (broadcast)
{
  type: 'message.new',
  message: {
    id: 'msg_123',
    channelId: 'ch_123',
    userId: 'user_123',
    content: 'Hello team!',
    createdAt: '2026-01-04T10:30:00Z'
  }
}
```

### Presence Events
```javascript
// Client → Server (every 30 seconds)
{
  type: 'presence.update',
  status: 'online',
  currentChannelId: 'ch_123'
}

// Server → Channel subscribers
{
  type: 'presence.changed',
  userId: 'user_123',
  status: 'online',
  timestamp: '2026-01-04T10:30:00Z'
}
```

### Board Update Events
```javascript
// Client → Server
{
  type: 'issue.move',
  issueId: 'issue_123',
  newStatus: 'in_progress',
  newColumnId: 'col_456'
}

// Server → Project subscribers
{
  type: 'issue.moved',
  issue: {...},
  fromColumn: 'col_123',
  toColumn: 'col_456',
  updatedAt: '2026-01-04T10:30:00Z'
}
```

---

# PART 3: FRONTEND ARCHITECTURE

## 3.1 Tech Stack

```
Framework:       Next.js 15 + React 19
Styling:         Tailwind CSS + shadcn/ui components
State Mgmt:      Zustand (lightweight) + React Context
Real-time:       Socket.io Client + React Query
Type Safety:     TypeScript
Build:           Turbopack (Next.js native)
Testing:         Vitest + React Testing Library
Package Mgmt:    pnpm
```

## 3.2 Project Structure

```
frontend/
├── src/
│   ├── app/                          # Next.js app directory
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── chat/[teamId]/[channelId]/
│   │   ├── projects/[projectId]/
│   │   ├── issues/[issueId]/
│   │   └── files/
│   │
│   ├── components/                   # Reusable components
│   │   ├── chat/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── ChannelHeader.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   ├── project/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── IssueCard.tsx
│   │   │   ├── IssueModal.tsx
│   │   │   └── SprintSelector.tsx
│   │   │
│   │   ├── file/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── FileBrowser.tsx
│   │   │   └── FilePreview.tsx
│   │   │
│   │   └── common/
│   │       ├── Header.tsx
│   │       ├── Navigation.tsx
│   │       └── UserProfile.tsx
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useChat.ts
│   │   ├── usePresence.ts
│   │   ├── useProject.ts
│   │   ├── useWebSocket.ts
│   │   └── useAuth.ts
│   │
│   ├── store/                        # Zustand state management
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   ├── presenceStore.ts
│   │   ├── projectStore.ts
│   │   └── fileStore.ts
│   │
│   ├── services/                     # API clients & business logic
│   │   ├── api/
│   │   │   ├── authApi.ts
│   │   │   ├── chatApi.ts
│   │   │   ├── projectApi.ts
│   │   │   ├── fileApi.ts
│   │   │   └── client.ts            # Axios instance with interceptors
│   │   │
│   │   └── websocket/
│   │       ├── chatSocket.ts
│   │       ├── presenceSocket.ts
│   │       └── boardSocket.ts
│   │
│   ├── types/                        # TypeScript types
│   │   ├── api.types.ts
│   │   ├── chat.types.ts
│   │   ├── project.types.ts
│   │   └── file.types.ts
│   │
│   ├── utils/                        # Utility functions
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   │
│   ├── middleware/                   # Next.js middleware
│   │   └── auth.middleware.ts
│   │
│   └── styles/
│       └── globals.css
│
├── public/                           # Static assets
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

## 3.3 Key Component Architecture

### Chat Component Example
```typescript
// components/chat/MessageList.tsx
import { useChat } from '@/hooks/useChat';
import { useChatSocket } from '@/services/websocket/chatSocket';

export function MessageList({ channelId }: { channelId: string }) {
  const { messages, loading } = useChat(channelId);
  const { isConnected } = useChatSocket(channelId);
  
  useEffect(() => {
    // Load initial messages
  }, [channelId]);

  return (
    <div className="flex flex-col h-full">
      <Messages messages={messages} />
      {!isConnected && <ConnectionStatus />}
      <MessageInput channelId={channelId} />
    </div>
  );
}

// hooks/useChat.ts
export function useChat(channelId: string) {
  const queryClient = useQueryClient();
  
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => chatApi.getMessages(channelId),
  });

  // Real-time updates via WebSocket
  useEffect(() => {
    socket.on('message.new', (message) => {
      queryClient.setQueryData(['messages', channelId], (old) => [
        ...old, message
      ]);
    });
  }, [channelId]);

  return { messages };
}
```

### Kanban Board Component
```typescript
// components/project/KanbanBoard.tsx
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { IssueCard } from './IssueCard';

export function KanbanBoard({ projectId, boardId }: Props) {
  const { board, issues } = useProject(projectId, boardId);
  const { moveIssue } = useProjectSocket(projectId);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id;
    const newColumnId = over.id;

    // Optimistic update
    updateLocalBoard(issueId, newColumnId);

    // Send to backend
    await moveIssue(issueId, newColumnId);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto">
        {board.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            issues={issues.filter(i => i.columnId === column.id)}
          />
        ))}
      </div>
    </DndContext>
  );
}
```

## 3.4 State Management Pattern

```typescript
// store/chatStore.ts
import { create } from 'zustand';

interface ChatStore {
  // State
  channels: Channel[];
  currentChannel: Channel | null;
  messages: Message[];
  
  // Actions
  setCurrentChannel: (channel: Channel) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  channels: [],
  currentChannel: null,
  messages: [],
  
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === id ? { ...m, ...updates } : m
    )
  }))
}));
```

---

# PART 4: BACKEND ARCHITECTURE

## 4.1 Backend Tech Stack

```
Runtime:         Node.js 20.x (LTS)
Framework:       Express.js / Fastify
Language:        TypeScript
Async/Queue:     Bull + Redis (job processing)
Real-time:       Socket.io (WebSocket abstraction)
Message Broker:  Apache Kafka + Redis Streams
Search:          Elasticsearch (full-text search)
Logging:         Winston + ELK Stack
Testing:         Jest + Supertest
ORM/Query:       Prisma + raw SQL
Validation:      Zod / Joi
```

## 4.2 Service Structure (Chat Service Example)

```
chat-service/
├── src/
│   ├── controllers/
│   │   ├── messageController.ts      # HTTP handlers
│   │   ├── channelController.ts
│   │   └── threadController.ts
│   │
│   ├── services/
│   │   ├── messageService.ts         # Business logic
│   │   ├── channelService.ts
│   │   └── threadService.ts
│   │
│   ├── repositories/
│   │   ├── messageRepository.ts      # Data access
│   │   └── channelRepository.ts
│   │
│   ├── events/
│   │   ├── messageEventListener.ts
│   │   └── messageEventPublisher.ts
│   │
│   ├── websocket/
│   │   └── chatGateway.ts            # Socket.io handlers
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   │
│   ├── validators/
│   │   └── messageValidator.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── config/
│   │   ├── database.ts
│   │   ├── kafka.ts
│   │   └── redis.ts
│   │
│   ├── utils/
│   │   └── logger.ts
│   │
│   ├── app.ts                        # Express app setup
│   └── index.ts                      # Entry point
│
└── tests/
    ├── unit/
    └── integration/
```

## 4.3 Core Service Implementation

### Message Service Business Logic
```typescript
// services/messageService.ts
import { messageRepository } from '../repositories';
import { kafkaProducer } from '../config/kafka';
import { elasticsearchClient } from '../config/elasticsearch';

export class MessageService {
  async sendMessage(input: SendMessageInput): Promise<Message> {
    // 1. Validate input
    const validated = validateMessageInput(input);
    
    // 2. Create message in database
    const message = await messageRepository.create({
      channelId: validated.channelId,
      userId: validated.userId,
      content: validated.content,
      createdAt: new Date(),
    });

    // 3. Publish event for other services
    await kafkaProducer.publish('chat.message.created', {
      messageId: message.id,
      channelId: message.channelId,
      userId: message.userId,
      timestamp: message.createdAt,
    });

    // 4. Index for full-text search (async)
    elasticsearchClient.index({
      index: 'messages',
      id: message.id,
      body: {
        content: message.content,
        channelId: message.channelId,
        userId: message.userId,
        createdAt: message.createdAt,
      },
    }).catch(err => logger.error('ES indexing failed', err));

    // 5. Clear cache
    await redis.del(`messages:${message.channelId}`);

    return message;
  }

  async getChannelMessages(
    channelId: string,
    options: { limit: number; offset: number }
  ): Promise<Message[]> {
    // Check cache first
    const cacheKey = `messages:${channelId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Fetch from database
    const messages = await messageRepository.findByChannel(
      channelId,
      options
    );

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(messages));

    return messages;
  }

  async editMessage(messageId: string, newContent: string): Promise<Message> {
    const message = await messageRepository.update(messageId, {
      content: newContent,
      updatedAt: new Date(),
    });

    // Publish update event
    await kafkaProducer.publish('chat.message.edited', {
      messageId,
      newContent,
    });

    // Invalidate cache
    await redis.del(`message:${messageId}`);

    return message;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await messageRepository.softDelete(messageId);

    await kafkaProducer.publish('chat.message.deleted', { messageId });
  }
}
```

## 4.4 WebSocket Gateway (Socket.io)

```typescript
// websocket/chatGateway.ts
import { Server, Socket } from 'socket.io';
import { messageService } from '../services';

export class ChatGateway {
  constructor(private io: Server) {
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`User connected: ${socket.id}`);

      // Join channel room
      socket.on('join_channel', (channelId: string) => {
        socket.join(`channel:${channelId}`);
        logger.info(`User ${socket.id} joined channel:${channelId}`);
      });

      // Handle message
      socket.on('send_message', async (payload, callback) => {
        try {
          const message = await messageService.sendMessage({
            channelId: payload.channelId,
            userId: socket.data.userId,
            content: payload.content,
          });

          // Broadcast to channel
          this.io.to(`channel:${payload.channelId}`).emit('message_received', {
            id: message.id,
            content: message.content,
            userId: message.userId,
            createdAt: message.createdAt,
          });

          callback({ success: true, messageId: message.id });
        } catch (error) {
          logger.error('Message send failed', error);
          callback({ success: false, error: error.message });
        }
      });

      // Handle typing indicator
      socket.on('user_typing', (channelId: string) => {
        socket.to(`channel:${channelId}`).emit('user_typing', {
          userId: socket.data.userId,
          timestamp: Date.now(),
        });
      });

      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id}`);
      });
    });
  }
}
```

## 4.5 Kafka Event Processing

```typescript
// events/messageEventListener.ts
import { kafka } from '../config/kafka';

export async function setupMessageEventListeners() {
  const consumer = kafka.consumer({ groupId: 'chat-service' });
  await consumer.connect();

  await consumer.subscribe({ topic: 'chat.message.created' });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());

        if (topic === 'chat.message.created') {
          // Send notification to mentioned users
          await notificationService.notifyMentions(event);

          // Update conversation stats
          await statsService.updateConversationStats(event.channelId);
        }
      } catch (error) {
        logger.error('Event processing failed', error);
        // Send to DLQ for manual review
        await kafka.producer().send({
          topic: 'chat.message.created.dlq',
          messages: [message],
        });
      }
    },
  });
}
```

## 4.6 Error Handling & Resilience

```typescript
// middleware/errorHandler.ts
export function createErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Distinguish error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err instanceof RateLimitError) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Default 500 error
  return res.status(500).json({
    error: 'Internal server error',
    requestId: req.id, // for tracking
  });
}
```

---

# PART 5: DEPLOYMENT & OPERATIONS

## 5.1 Deployment Architecture

```
┌─────────────────────────────────────────┐
│   Code Repository (GitHub/GitLab)       │
└────────────────┬────────────────────────┘
                 ▼
     ┌───────────────────────────┐
     │   CI/CD Pipeline (GitHub  │
     │   Actions / GitLab CI)    │
     └───────────────┬───────────┘
                     ▼
     ┌───────────────────────────┐
     │  Build & Push to Registry │
     │  (Docker Hub / ECR)       │
     └───────────────┬───────────┘
                     ▼
     ┌───────────────────────────┐
     │  Kubernetes Cluster       │
     │  (EKS / GKE / Self-hosted)│
     └───────────────┬───────────┘
                     ▼
     ┌───────────────────────────┐
     │  Service Mesh (Istio)     │
     │  Load Balancing & Routing │
     └───────────────────────────┘
```

### Docker Compose for Local Development
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  # Services
  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres:5432/platform
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  chat-service:
    build: ./services/chat-service
    ports:
      - "3002:3000"
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres:5432/platform
      KAFKA_BROKERS: kafka:9092
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - kafka
      - redis

volumes:
  postgres_data:
```

## 5.2 Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-service
  labels:
    app: chat-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chat-service
  template:
    metadata:
      labels:
        app: chat-service
    spec:
      containers:
      - name: chat-service
        image: myregistry/chat-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: connection-string
        - name: KAFKA_BROKERS
          value: "kafka-cluster:9092"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: chat-service
spec:
  selector:
    app: chat-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 5.3 Monitoring & Observability

### Prometheus Metrics Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'chat-service'
    static_configs:
      - targets: ['chat-service:3000']
    metrics_path: '/metrics'

  - job_name: 'project-service'
    static_configs:
      - targets: ['project-service:3000']
    metrics_path: '/metrics'
```

### Key Metrics to Monitor
```typescript
// Latency
histogram_request_duration_ms{service, endpoint, method}

// Throughput
counter_requests_total{service, endpoint, status}

// WebSocket Connections
gauge_websocket_connections{service}

// Database Pool
gauge_db_connections{service, state}

// Kafka Consumer Lag
gauge_kafka_consumer_lag{service, group, topic}

// Cache Hit Rate
counter_cache_hits{service}
counter_cache_misses{service}
```

---

# PART 6: IMPLEMENTATION ROADMAP

## Phase 1: MVP (Weeks 1-8)
- [ ] Auth Service (registration, login, OAuth)
- [ ] User Service (profiles, teams)
- [ ] Chat Service (basic messaging, channels)
- [ ] Web frontend (chat, team management)
- [ ] Database setup, Docker environment

## Phase 2: Collaboration (Weeks 9-16)
- [ ] File Service (upload, storage, sharing)
- [ ] Presence Service (online status)
- [ ] Project Service (projects, basic issues)
- [ ] Kanban Board UI
- [ ] Mobile app (React Native)

## Phase 3: Advanced Features (Weeks 17-24)
- [ ] Advanced Kanban (sprints, labels, advanced filtering)
- [ ] Search Service (Elasticsearch integration)
- [ ] Notifications Service (push, email)
- [ ] Analytics Service
- [ ] Integration Service (Slack, GitHub, etc.)

## Phase 4: Scale & Polish (Weeks 25-32)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Compliance (GDPR, SOC2)
- [ ] Documentation
- [ ] Production deployment

---

# PART 7: SECURITY CONSIDERATIONS

## Authentication & Authorization
- JWT with RS256 signature
- OAuth2 for third-party auth
- Rate limiting on auth endpoints
- CORS properly configured

## Data Protection
- End-to-end encryption for sensitive data
- TLS 1.3 for all communications
- Password hashing (bcrypt + salt)
- Secure file upload validation

## Infrastructure Security
- Network isolation with VPC
- Secret management (AWS Secrets Manager)
- Regular security audits
- DDoS protection (CloudFlare/AWS Shield)

---

This comprehensive document provides a complete blueprint for your platform. Would you like me to create detailed implementation specifications for any specific component or service?
