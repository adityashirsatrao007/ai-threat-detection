"""
Pydantic Schemas
Request/response models for all API endpoints.
"""


import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ──────────────────────────────────────────────────────────────────────────────
# Auth Schemas
# ──────────────────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="user", pattern="^(sysadmin|soc|operator|user)$")
    organization_name: str | None = Field(default=None, description="Provide when registering as a new SOC to create an org")

class UserInviteRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="user", pattern="^(operator|user)$")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID | None
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────────────────
# Email Analysis Schemas
# ──────────────────────────────────────────────────────────────────────────────

class EmailAnalysisRequest(BaseModel):
    sender: str = Field(..., max_length=255)
    subject: str = Field(..., max_length=1000)
    body: str = Field(..., max_length=50_000)
    attachments: list[str] | None = Field(default=None, description="Attachment filenames")
    target_department: str | None = Field(default=None, max_length=100)
    target_role: str | None = Field(default=None, max_length=100)
    async_processing: bool = Field(default=False, description="Process via Celery task queue")
    force_risk_score: float | None = None


# ──────────────────────────────────────────────────────────────────────────────
# SMS Analysis Schemas
# ──────────────────────────────────────────────────────────────────────────────

class SMSAnalysisRequest(BaseModel):
    sender: str = Field(..., max_length=50)
    message: str = Field(..., max_length=5000)
    target_department: str | None = Field(default=None, max_length=100)
    target_role: str | None = Field(default=None, max_length=100)
    async_processing: bool = False
    force_risk_score: float | None = None


# ──────────────────────────────────────────────────────────────────────────────
# Call / Audio Analysis Schemas
# ──────────────────────────────────────────────────────────────────────────────

class CallAnalysisRequest(BaseModel):
    transcript: str = Field(..., max_length=100_000)
    caller_id: str | None = Field(default=None, max_length=50)
    duration_seconds: int | None = None


class TranscriptionResponse(BaseModel):
    transcript: str
    language: str | None = None
    duration_seconds: float | None = None


# ──────────────────────────────────────────────────────────────────────────────
# Threat Analysis Response (shared)
# ──────────────────────────────────────────────────────────────────────────────

class ThreatAnalysisResponse(BaseModel):
    threat_id: uuid.UUID | None = None
    threat_detected: bool
    risk_score: float = Field(..., description="Overall risk score (1-10)")
    threat_level: str
    confidence: float = Field(..., ge=0, le=1)
    classification_label: str
    reasons: list[str]
    extracted_urls: list[str] = []
    nlp_score: float
    behavior_score: float
    url_score: float
    reputation_score: float
    target_department: str | None = None
    target_role: str | None = None
    processing_mode: str = "sync"  # sync | async
    task_id: str | None = None  # set when async_processing=True


# ──────────────────────────────────────────────────────────────────────────────
# Dashboard & Summary Schemas
# ──────────────────────────────────────────────────────────────────────────────

class ThreatSummary(BaseModel):
    id: uuid.UUID
    type: str
    channel: str
    risk_score: float
    threat_level: str
    threat_detected: bool
    sender: str | None
    classification_label: str | None = None
    target_department: str | None = None
    target_role: str | None = None
    reasons: list[str] = []
    content_excerpt: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

class DashboardStats(BaseModel):
    total_threats: int
    phishing_attempts: int
    high_risk_alerts: int
    critical_alerts: int
    threats_today: int
    avg_risk_score: float
    unacknowledged_alerts: int


# ──────────────────────────────────────────────────────────────────────────────
# Alert Schemas
# ──────────────────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: uuid.UUID
    threat_id: uuid.UUID
    severity: str
    title: str
    description: str | None
    acknowledged: bool
    acknowledged_at: datetime | None
    created_at: datetime
    threat: ThreatSummary | None = None

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    total: int
    alerts: list[AlertResponse]


class AcknowledgeAlertResponse(BaseModel):
    id: uuid.UUID
    acknowledged: bool
    acknowledged_at: datetime


class ThreatListResponse(BaseModel):
    total: int
    threats: list[ThreatSummary]


class ThreatTrend(BaseModel):
    date: str
    count: int
    avg_risk_score: float
    channel: str


class DashboardTrends(BaseModel):
    trends: list[ThreatTrend]
    period_days: int


# ──────────────────────────────────────────────────────────────────────────────
# Generic API Responses
# ──────────────────────────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    success: bool = True
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: str | None = None

# Rebuild models to resolve forward references (Pydantic v2)
UserResponse.model_rebuild()
AlertResponse.model_rebuild()
ThreatSummary.model_rebuild()
ThreatAnalysisResponse.model_rebuild()
