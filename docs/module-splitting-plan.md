# EAM 多人协作模块划分与开发管理建议（Python 后端版）

## 背景

EAM 系统采用前后端分离架构：`frontend`（Next.js 15）+ `backend`（FastAPI + SQLAlchemy async）。后端已从 TypeScript (Express + Prisma) 完整迁移到 Python，共 22 个 router 模块、5,654 行 Python 代码。数据库 schema 文档保留在 `docs/schema.prisma`。

当前所有开发在 `main` 分支上进行，无 CI/CD 流水线。团队成员各自使用 Claude Code / Codex 模式开发，需要模块边界清晰、冲突最小化。

---

## 一、模块划分建议

基于代码耦合度分析，建议划分为 **5 个功能模块 + 1 个通用支持层**，每人负责一个模块（前后端一体），模块间通过数据库 schema 和 API 契约协调。

### 模块 A：EA Review 流程核心 ⭐（最复杂，建议2人）

**范围：** EA 评审全流程 — 申请、评审、会议、行动项、日历

| 层 | 文件 | 行数 |
|---|------|------|
| Backend | `app/routers/ea_requests.py` | 979 |
| Backend | `app/routers/scope.py` | 445 |
| Backend | `app/routers/actions.py` | 412 |
| Backend | `app/routers/meetings.py` | 352 |
| Backend | `app/routers/schedules.py` | 330 |
| Backend | `app/routers/meeting_decks.py` | 104 |
| Frontend | `ea-review/request-summary/page.tsx` | 111 |
| Frontend | `ea-review/request/[id]/page.tsx` | 878 |
| Frontend | `ea-review/request/create/page.tsx` | 349 |
| Frontend | `ea-review/request/[id]/create-meeting/page.tsx` | 356 |
| Frontend | `ea-review/meetings/page.tsx` + `[meetingNo]/page.tsx` | 343 |
| Frontend | `ea-review/actions/page.tsx` + `[actionId]/page.tsx` | 538 |
| Frontend | `ea-review/calendar/page.tsx` | 95 |
| **后端小计** | | **2,622 行** |
| **前端小计** | | **~2,670 行** |

**DB Tables：** `eam_request`, `eam_request_attachment`, `eam_arch_ai_check`, `eam_actions`, `eam_meetings`, `eam_ea_calendar`, `eam_scope_of_change`, `eam_scope_check_list`

**耦合说明：** 这是系统的核心聚合根，`eam_request` 表是枢纽，actions/meetings/scope 都通过 request_id 关联。

**两人分工建议：**
- 人员 A1：Request 生命周期 + Scope（`ea_requests.py` 979行, `scope.py` 445行, 前端 request 相关页面）
- 人员 A2：Meeting + Action + Calendar（`meetings.py` 352行, `actions.py` 412行, `schedules.py` 330行, `meeting_decks.py` 104行, 前端对应页面）

---

### 模块 B：App Solution 维护

**范围：** 应用数据维护 — BCM 数据管理、BCPF master data、CMDB、技术栈（纯 CRUD 维护，不含分析）

| 层 | 文件 | 行数 |
|---|------|------|
| Backend | `app/routers/applications.py`（BCM CRUD 部分） | ~350 |
| Backend | `app/routers/cmdb.py` | 169 |
| Backend | `app/routers/bcpf.py` | 123 |
| Backend | `app/routers/technology_stack.py` | 116 |
| Frontend | `app-management/bcm/page.tsx` | 675 |
| Frontend | `app-management/cmdb/page.tsx` | 260 |
| Frontend | `app-management/bcpf/page.tsx` | 86 |
| Frontend | `tech-stack/page.tsx` + `master-data/page.tsx` | 194 |
| **后端小计** | | **~758 行** |
| **前端小计** | | **~1,215 行** |

**DB Tables：** `project_app`, `cmdb_application`, `bcpf_master_data`, `tech_stack_*`

**耦合度：低** — 主要是独立的 master data CRUD，与 EA Review 模块仅通过 `project_app` 表有弱关联。

**测试覆盖：** ✅ 已有 3 个 Playwright E2E 测试（`cmdb.spec.ts`, `bcm.spec.ts`, `bcpf.spec.ts`）

---

### 模块 C：业务分析与报表

**范围：** Dashboard、Reports、业务能力分析可视化（纯分析视角，不含日志和导出）

| 层 | 文件 | 行数 |
|---|------|------|
| Backend | `app/routers/reports.py` | 126 |
| Backend | `app/routers/dashboard.py` | 61 |
| Backend | `app/routers/applications.py`（BCM visualization 部分） | ~153 |
| Frontend | `(sidebar)/reports/ea-review-dashboard/page.tsx` | 1,482 |
| Frontend | `(sidebar)/reports/ea-review-dashboard/` 子页面 (6个) | ~1,522 |
| Frontend | `(sidebar)/reports/lead-time/page.tsx` | 72 |
| Frontend | 首页 `page.tsx` (Dashboard) | 194 |
| Frontend | `app-management/bc-visualization/page.tsx` | 99 |
| Frontend | `components/bc-visualization/` (12 files，含 MindMap/Dashboard/Layout) | ~800 |
| **后端小计** | | **~340 行** |
| **前端小计** | | **~4,169 行** |

**DB Tables：** 只读聚合查询，不拥有独立表；BC Visualization 读取 `project_app` + `cmdb_application` + `bcpf_master_data` 做分析

**耦合说明：** 纯读取型模块，依赖其他模块的表做聚合统计。**不会与其他模块产生写冲突**。BC Visualization 的数据来源由模块 B 维护，本模块只做分析展示。

**注意：** `ea-review-dashboard/page.tsx` 是全项目最大文件（1,482行），建议拆分为独立组件。

**测试覆盖：** ✅ 已有 1 个 Playwright E2E 测试（`bc-visualization.spec.ts`）

---

### 通用支持层 F：日志、导出、通用服务

**范围：** Audit Log、EA Review Log、Email Log、CSV 导出 — 供各模块共同调用

| 层 | 文件 | 行数 |
|---|------|------|
| Backend | `app/routers/export.py` | 341 |
| Backend | `app/routers/audit_log.py` | 275 |
| Backend | `app/routers/ea_review_logs.py` | 84 |
| Backend | `app/utils/csv_export.py` | 31 |
| Frontend | `(sidebar)/reports/email-log/page.tsx` | 80 |
| Frontend | `(sidebar)/settings/audit-log/page.tsx` | 66 |
| Frontend | `components/ui/ExportButton.tsx` | 通用组件 |
| **后端小计** | | **731 行** |
| **前端小计** | | **~146 行** |

**定位：** 横切关注点，不属于任何业务模块，各模块按需调用。
- **CSV 导出**：`export.py` 根据 entity 参数导出不同模块数据（ea-requests, bcm, meetings 等），各模块新增实体时只需在此扩展
- **审计日志**：`audit_log.py` 记录所有模块的字段变更和操作日志
- **邮件日志**：actions/meetings 发送邮件的记录查询

**归属建议：** 可由模块 D（用户权限）负责人兼管，因日志/权限天然关联；也可单独指定一人负责。

---

### 模块 D：用户与权限（待建设）

**范围：** 认证、用户管理、权限管理、团队成员

| 层 | 文件 | 行数 |
|---|------|------|
| Backend | `app/routers/team_members.py` | 233 |
| Backend | `app/routers/resources.py` | 148 |
| Frontend | `(sidebar)/settings/team-members/page.tsx` | 173 |
| Frontend | `(sidebar)/resources/page.tsx` | 66 |
| **待建设** | 认证中间件、RBAC、SSO 集成 | — |
| **后端小计** | | **381 行** |
| **前端小计** | | **~239 行** |

**DB Tables：** `resource_pool`, `eam_bigea_team_members`, `user_profile`

**说明：** 当前系统没有认证/授权中间件。这是一个独立且重要的基础设施模块。建成后其他模块通过 FastAPI Dependency Injection 接入。

**FastAPI 特有优势：** 可利用 `Depends()` 机制实现认证中间件，对其他 router 零侵入：
```python
# 其他模块只需加一个依赖即可接入认证
@router.get("", dependencies=[Depends(require_auth)])
```

---

### 模块 E：基础数据与配置

**范围：** Master Data、字典选项、Certification、Projects、Help

| 层 | 文件 | 行数 |
|---|------|------|
| Backend | `app/routers/projects.py` | 301 |
| Backend | `app/routers/master_data.py` | 163 |
| Backend | `app/routers/certifications.py` | 103 |
| Backend | `app/routers/dict_options.py` | 76 |
| Frontend | `projects/page.tsx` | 96 |
| Frontend | `certification/page.tsx` | 91 |
| Frontend | `(sidebar)/master-data/page.tsx` | 144 |
| Frontend | `(sidebar)/data-privacy/page.tsx` | 120 |
| Frontend | `(sidebar)/help/page.tsx` | 77 |
| Frontend | `(sidebar)/settings/scope-change/page.tsx` | 68 |
| Frontend | `(sidebar)/settings/scope-checklist/page.tsx` | 91 |
| **后端小计** | | **643 行** |
| **前端小计** | | **~687 行** |

**DB Tables：** `dict_option`, `data_classification`, `company`, `data_center`, `project`, `certification`, `help_file`

**耦合度：低** — 提供基础数据给其他模块消费。`projects.py` 被 EA Review 引用但仅通过 `project_id` FK。

---

### 模块依赖关系图

```
    ┌──────────────┐   ┌─────────────────────┐
    │  D: 用户权限  │   │ F: 通用支持 (日志/导出)│
    └──────┬───────┘   └──────────┬──────────┘
           │ Depends()            │ 各模块调用
    ┌──────┴──────────────────────┴─────────┐
    │                                       │
┌───┴────────┐  ┌──────────┐  ┌────────────┴─┐
│ A: EA Review│←→│E: 基础数据│  │ B: App维护    │
│  (核心流程) │  │ (projects)│  │ (CRUD/MasterData)│
└───┬────────┘  └──────────┘  └──────┬───────┘
    │ 只读                           │ 数据供给
    ▼                                ▼
┌────────────────────────────────────────┐
│  C: 业务分析/报表 (只读聚合 + BC可视化)  │
└────────────────────────────────────────┘
```

### 各模块代码量汇总

| 模块 | 后端 (Python) | 前端 (TSX) | 合计 | 建议人数 |
|------|--------------|-----------|------|---------|
| A: EA Review 流程核心 | 2,622 行 | ~2,670 行 | ~5,292 行 | 2 人 |
| B: App Solution 维护 | ~758 行 | ~1,215 行 | ~1,973 行 | 1 人 |
| C: 业务分析与报表 | ~340 行 | ~4,169 行 | ~4,509 行 | 1 人 |
| D: 用户与权限 | 381 行 | ~239 行 | ~620 行 | 1 人 |
| E: 基础数据与配置 | 643 行 | ~687 行 | ~1,330 行 | 1 人 |
| F: 通用支持 (日志/导出) | 731 行 | ~146 行 | ~877 行 | D兼管或独立1人 |
| **共享基础设施** | 175 行 | ~450 行 | ~625 行 | — |

---

## 二、共享基础设施（所有模块共用）

### 后端共享文件（修改需全员协调）

| 文件 | 行数 | 说明 |
|------|------|------|
| `app/main.py` | 69 | Router 注册、CORS 配置 |
| `app/database.py` | 26 | 数据库连接池、schema 切换 |
| `app/config.py` | 15 | 环境变量配置 |
| `app/utils/pagination.py` | 34 | 分页参数和响应构建 |
| `app/utils/filters.py` | 25 | 多值过滤条件构建 |
| `app/utils/csv_export.py` | 31 | CSV 导出和注入防护 |

### 前端共享文件（修改需全员协调）

| 文件/目录 | 说明 |
|----------|------|
| `src/lib/api.ts` | 通用 API 客户端（33行） |
| `src/components/ui/` | 17 个通用 UI 组件 |
| `src/components/layout/` | 5 个布局组件（Header, Sidebar 等） |

---

## 三、代码管理：Git 分支工作流

### 推荐：**必须使用 Pull/Merge Request**

Claude Code / Codex 生成的代码量大、速度快，**没有 code review 极易引入隐蔽问题**。

### 分支规范

```
main (受保护, 不可直接 push)
  │
  ├── feature/module-a/request-lifecycle    ← 人员 A1
  ├── feature/module-a/meetings-actions     ← 人员 A2
  ├── feature/module-b/bcpf-crud           ← 人员 B
  ├── feature/module-c/dashboard-reports   ← 人员 C
  ├── feature/module-d/auth-middleware     ← 人员 D
  └── feature/module-e/master-data        ← 人员 E
```

| 规则 | 说明 |
|-----|------|
| **分支命名** | `feature/module-X/功能描述` |
| **保护 main** | Settings → Protected Branches → 禁止直接 push |
| **MR/PR 必须** | 至少 1 人 approve（模块 owner 互审） |
| **合并策略** | Squash merge（保持 main 历史整洁） |
| **冲突解决** | 每天从 main rebase 一次，避免大冲突 |

### 冲突高危文件（修改时需通知全员）

| 文件 | 原因 |
|------|------|
| `backend/app/main.py` | Router 注册，新增模块必改 |
| `backend/app/database.py` | 数据库配置 |
| `backend/app/utils/*.py` | 共享工具函数 |
| `frontend/src/lib/api.ts` | API 客户端 |
| `frontend/src/components/ui/*` | 共享 UI 组件 |
| `frontend/src/components/layout/*` | 导航菜单 |
| `docs/schema.prisma` | 数据库模型文档 |

### 针对 Claude Code 的特别建议

1. **每个 session 开始前** `git pull --rebase origin main`
2. **频繁小提交**，不要等一个大功能做完再提交
3. **PR 描述**由 Claude Code 自动生成，人工审核关键变更
4. **后端新增 router** 需在 `main.py` 注册 — 容易冲突，及时合并

---

## 四、测试策略

### 现有测试资产

| 测试类型 | 位置 | 覆盖范围 |
|---------|------|---------|
| Python API 测试 | `api-tests/` | 18 个模块，覆盖全部 22 个 backend router |
| Playwright E2E | `frontend/e2e/` | 4 个文件：bcpf, bc-visualization, bcm, cmdb |
| 后端单元测试 | ❌ 不存在 | 需要建设 |

### 测试优先级

| 优先级 | 内容 | 方式 |
|-------|------|------|
| 🔴 P0 | 每次 PR 必须通过 | Python API 测试 + 前端编译检查 |
| 🔴 P0 | 模块 D 认证中间件 | 先写 API 测试再写代码 (TDD) |
| 🟡 P1 | 模块 A EA Request 状态机 | API 测试覆盖所有状态转换 |
| 🟡 P1 | 模块 C 报表数据准确性 | API 测试对比聚合结果 |
| 🟢 P2 | 前端交互 | Playwright E2E 覆盖关键路径 |
| 🟢 P2 | 后端单元测试 | 复杂计算逻辑（评分、统计） |

### CI 建议配置

每次 PR 自动运行：
1. Python API 测试（`cd api-tests && pytest`）
2. 前端编译检查（`cd frontend && npm run build`）
3. Playwright E2E 测试（`cd frontend && npx playwright test`）

---

## 五、Python 后端特有的架构改进建议

### 当前问题

1. **无 Model/Schema 层** — `app/models/` 和 `app/schemas/` 目录存在但为空，所有逻辑内联在 router 中
2. **原始 SQL** — 直接用 `text()` 写 SQL，无 ORM model
3. **无认证中间件** — 所有 API 完全开放

### 建议的渐进式改进

```
阶段1（当前）：直接在 router 中写 SQL + 手动字段映射
    ↓ 各模块独立推进，不阻塞
阶段2：抽取 Pydantic schemas 到 app/schemas/（类型安全 + 自动文档）
    ↓
阶段3：认证中间件 Depends(require_auth)（模块 D 负责）
    ↓
阶段4（可选）：SQLAlchemy ORM models（如果 SQL 维护成本过高）
```

**FastAPI 自动文档优势：** 后端启动后访问 `http://localhost:4000/docs` 即可查看所有 API 的 Swagger 文档，无需额外维护。

---

## 六、实施建议时间线

| 阶段 | 动作 | 负责人 |
|-----|------|-------|
| **第1天** | Git 配置：保护 main 分支，开启 PR 必须审批 | 项目负责人 |
| **第1天** | 每人 fork 自己的 feature 分支 | 全员 |
| **第1周** | 搭建 CI 基础配置（API 测试 + 前端编译） | 模块 D 负责人 |
| **第1周** | 确认共享文件的修改流程（PR + 全员通知） | 全员 |
| **持续** | 每天 rebase main，小步提交，及时 PR | 全员 |
