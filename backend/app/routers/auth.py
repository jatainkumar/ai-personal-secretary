from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
from app.models.database import get_db, User
from app.services.auth_service import (
    create_oauth_flow,
    save_user_credentials,
    delete_user_credentials,
    create_session_token,
    verify_session_token,
    get_or_create_user
)
from app.core.config import FRONTEND_URL

router = APIRouter()

# Store OAuth states temporarily (In memory - consider Redis for prod)
oauth_states = {}

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token in Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "")
    payload = verify_session_token(token)
    
    if not payload:
        return None
    
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    return user

def require_auth(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    """Require authentication for protected endpoints"""
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

# --- OAUTH ENDPOINTS ---

@router.get("/google/login")
async def google_login():
    """Initiate Google OAuth2 flow"""
    flow = create_oauth_flow()
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'  # Force consent to get refresh token
    )
    
    # Store state for verification
    oauth_states[state] = True
    
    # Direct redirect instead of returning JSON
    return RedirectResponse(authorization_url)

@router.get("/google/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Handle Google OAuth2 callback"""
    # Verify state
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Remove used state
    del oauth_states[state]
    
    try:
        # Exchange code for credentials
        flow = create_oauth_flow(state)
        
        # Fetch token - may raise Warning if scopes changed
        try:
            flow.fetch_token(code=code)
        except Warning as w:
            # Google dropped some scopes (likely calendar) - continue anyway
            print(f"⚠️  OAuth scope warning: {w}")
            print("   Continuing authentication with reduced scopes")
            # The flow still has valid credentials even with the warning
        
        credentials = flow.credentials
        
        # Get user info from Google
        from googleapiclient.discovery import build
        user_info_service = build('oauth2', 'v2', credentials=credentials)
        user_info = user_info_service.userinfo().get().execute()
        
        # Create or update user
        user = get_or_create_user(
            db=db,
            google_id=user_info['id'],
            email=user_info['email'],
            name=user_info.get('name', ''),
            picture=user_info.get('picture', '')
        )
        
        # Save OAuth credentials
        save_user_credentials(db, user.id, credentials)
        
        # Create session token
        session_token = create_session_token(user)
        
        # Redirect to frontend with token
        return RedirectResponse(url=f"{FRONTEND_URL}?token={session_token}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@router.get("/status")
async def auth_status(user: User = Depends(get_current_user)):
    """Check authentication status"""
    if not user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    }

@router.post("/logout")
async def logout(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Logout and revoke calendar access"""
    delete_user_credentials(db, user.id)
    return {"message": "Logged out successfully"}
