"""
Pydantic schemas for request and response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ScheduleMeetingRequest(BaseModel):
    """Request schema for scheduling a meeting"""
    query: str = Field(
        ..., 
        description="Natural language query for scheduling a meeting",
        example="Schedule a meeting with Bob tomorrow at 2pm for 1 hour"
    )


class MeetingDetails(BaseModel):
    """Meeting details extracted from the query"""
    summary: str = Field(..., description="The title of the meeting")
    start_time: str = Field(
        ..., 
        description="The start time of the meeting in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)"
    )
    end_time: str = Field(
        ..., 
        description="The end time of the meeting in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)"
    )
    description: str = Field(default="", description="A brief description of the meeting")
    contact_names: List[str] = Field(default=[], description="List of person names mentioned (for email lookup)")
    attendees: List[str] = Field(default=[], description="List of attendee email addresses")


class ScheduleMeetingResponse(BaseModel):
    """Response schema for successful meeting scheduling"""
    message: str = Field(..., description="Success message")
    link: str = Field(..., description="Google Calendar event link")
    meet_link: Optional[str] = Field(None, description="Google Meet video call link")
    details: MeetingDetails = Field(..., description="Details of the scheduled meeting")


class ErrorResponse(BaseModel):
    """Error response schema"""
    detail: str = Field(..., description="Error message")


class UploadCSVResponse(BaseModel):
    """Response schema for CSV upload"""
    message: str = Field(..., description="Success message")
    count: int = Field(..., description="Number of rows in the CSV")
    columns: list[str] = Field(..., description="List of column names")


class ChatRequest(BaseModel):
    """Request schema for chat with data"""
    query: str = Field(
        ..., 
        description="Qauestion or query about the uploaded data",
        example="How many connections do I have?"
    )
    user_id: str = Field(..., description="User identifier (email)")
    history: Optional[List[dict]] = Field(default=None, description="Chat history as list of {role, message} dicts")
    model_name: str = Field(default="gemini-2.5-flash", description="AI model to use")
    api_key: Optional[str] = Field(None, description="Optional API key override")


class ProcessResponse(BaseModel):
    """Response schema for file processing"""
    message: str = Field(..., description="Success message")
    doc_count: int = Field(..., description="Number of documents processed")
    chunk_count: int = Field(..., description="Number of chunks created")


class ChatResponse(BaseModel):
    """Response schema for chat"""
    response: str = Field(..., description="AI-generated response to the query")


class HealthCheckResponse(BaseModel):
    """Response schema for health check"""
    message: str = Field(..., description="Status message")
