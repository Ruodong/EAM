"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.routers import (
    health,
    projects,
    ea_requests,
    meetings,
    actions,
    schedules,
    applications,
    bcpf,
    cmdb,
    dashboard,
    team_members,
    master_data,
    resources,
    certifications,
    dict_options,
    audit_log,
    reports,
    export,
    ea_review_logs,
    scope,
    meeting_decks,
    technology_stack,
)

app = FastAPI(title="EAM API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(ea_requests.router, prefix="/api/ea-requests", tags=["EA Requests"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["Schedules"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(bcpf.router, prefix="/api/bcpf-master-data", tags=["BCPF"])
app.include_router(cmdb.router, prefix="/api/cmdb", tags=["CMDB"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(team_members.router, prefix="/api/team-members", tags=["Team Members"])
app.include_router(master_data.router, prefix="/api/master-data", tags=["Master Data"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(certifications.router, prefix="/api/certifications", tags=["Certifications"])
app.include_router(dict_options.router, prefix="/api/dict-options", tags=["Dict Options"])
app.include_router(audit_log.router, prefix="/api", tags=["Audit Log"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(ea_review_logs.router, prefix="/api/ea-review-logs", tags=["EA Review Logs"])
app.include_router(scope.router, prefix="/api", tags=["Scope"])
app.include_router(meeting_decks.router, prefix="/api/meeting-decks", tags=["Meeting Decks"])
app.include_router(technology_stack.router, prefix="/api/technology-stack", tags=["Technology Stack"])


if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
