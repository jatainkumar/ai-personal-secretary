from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from app.services.auth_service import get_user_credentials, save_user_credentials

# --- Google Calendar Setup ---
SCOPES = ['https://www.googleapis.com/auth/calendar']

class MeetingDetails(BaseModel):
    summary: str = Field(description="The title of the meeting")
    start_time: str = Field(description="The start time of the meeting in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)")
    end_time: str = Field(description="The end time of the meeting in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)")
    description: str = Field(description="A brief description of the meeting", default="")
    attendees: Optional[List[str]] = Field(description="List of attendee email addresses", default=[])

def get_user_calendar_service(db: Session, user_id: int):
    """
    Get Google Calendar service for a specific user.
    Automatically refreshes expired tokens.
    """
    creds = get_user_credentials(db, user_id)
    
    if not creds:
        raise ValueError(f"No calendar credentials found for user {user_id}. User needs to authenticate.")
    
    # Refresh token if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Save refreshed credentials
        save_user_credentials(db, user_id, creds)
    
    service = build('calendar', 'v3', credentials=creds)
    return service

def create_calendar_event(service, meeting_details: MeetingDetails):
    """Create a calendar event with Google Meet conference"""
    
    # Debug: Print the meeting details
    print(f"📅 Creating event with details:")
    print(f"   Summary: {meeting_details.summary}")
    print(f"   Start: {meeting_details.start_time}")
    print(f"   End: {meeting_details.end_time}")
    print(f"   Attendees: {meeting_details.attendees}")
    
    # Clean datetime strings - remove any timezone suffix like " IST"
    # Google Calendar API expects ISO format without timezone text when using timeZone field
    import re
    start_time_clean = re.sub(r'\s+[A-Z]{2,4}$', '', meeting_details.start_time.strip())
    end_time_clean = re.sub(r'\s+[A-Z]{2,4}$', '', meeting_details.end_time.strip())
    
    print(f"🧹 Cleaned datetimes:")
    print(f"   Start: {start_time_clean}")
    print(f"   End: {end_time_clean}")
    
    event = {
        'summary': meeting_details.summary,
        'description': meeting_details.description,
        'start': {
            'dateTime': start_time_clean,
            'timeZone': 'Asia/Kolkata',  # IST timezone
        },
        'end': {
            'dateTime': end_time_clean,
            'timeZone': 'Asia/Kolkata',  # IST timezone
        },
        # Add Google Meet conference
        'conferenceData': {
            'createRequest': {
                'requestId': f"{meeting_details.summary.replace(' ', '-')}-{start_time_clean}".replace(':', '-'),
                'conferenceSolutionKey': {'type': 'hangoutsMeet'}
            }
        },
    }
    
    # Add attendees if provided
    if meeting_details.attendees:
        event['attendees'] = [{'email': email} for email in meeting_details.attendees]
    
    print(f"📤 Sending event to Google Calendar API:")
    import json
    print(json.dumps(event, indent=2))

    event = service.events().insert(
        calendarId='primary',
        body=event,
        conferenceDataVersion=1,  # Required for Google Meet
        sendUpdates='all'  # Send email invites to attendees
    ).execute()
    return event
