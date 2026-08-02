
from pydantic import BaseModel


class TargetMetric(BaseModel):
    name: str
    threat_count: int
    avg_risk_score: float

class TargetAnalyticsResponse(BaseModel):
    departments: list[TargetMetric]
    roles: list[TargetMetric]
