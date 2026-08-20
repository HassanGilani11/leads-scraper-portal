from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import (
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    UpdateProfileRequest,
    UserCreateRequest,
    UserUpdateRequest,
    ChangePasswordRequest,
    UserListResponse
)
from app.api.deps import get_current_active_user, require_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT access token."""
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    
    # Auto-recovery for Default Super Admin if database has stale/corrupted initial hash
    default_admin_emails = [
        settings.DEFAULT_ADMIN_EMAIL.strip().lower(),
        "admin@leadpulse.local",
        "sales@syntexdev.com"
    ]
    
    if email_clean in default_admin_emails and payload.password == settings.DEFAULT_ADMIN_PASSWORD:
        if not user:
            user = User(
                email=email_clean,
                full_name=settings.DEFAULT_ADMIN_NAME or "Super Admin",
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.hashed_password = get_password_hash(settings.DEFAULT_ADMIN_PASSWORD)
            user.is_active = True
            user.role = "admin"
            db.commit()
            db.refresh(user)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )
    
    access_token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """Fetch current logged-in user profile."""
    return UserResponse.model_validate(current_user)

@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile (name or email)."""
    if payload.email:
        new_email = payload.email.strip().lower()
        if new_email != current_user.email:
            existing = db.query(User).filter(User.email == new_email).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already taken by another account")
            current_user.email = new_email
            
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() if payload.full_name else None
        
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match"
        )
    
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

# ----------------- User Management (Admin Only) -----------------

@router.get("/users", response_model=UserListResponse)
def list_allocated_users(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all allocated users in the system (Admin only)."""
    query = db.query(User).order_by(User.created_at.desc())
    total = query.count()
    users = query.offset(offset).limit(limit).all()
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total
    )

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_allocated_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Allocate and create a new user (Admin only)."""
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    if payload.role not in ["admin", "member", "viewer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'admin', 'member', or 'viewer'"
        )
    
    user = User(
        email=email_clean,
        full_name=payload.full_name.strip() if payload.full_name else None,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=payload.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_allocated_user(
    user_id: str,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update user role, active status, name, or password (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Safety: Cannot deactivate or demote oneself
    if user.id == admin.id:
        if payload.is_active is False:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own admin account")
        if payload.role and payload.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot revoke your own admin role")
            
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip() if payload.full_name else None
    if payload.role is not None:
        if payload.role not in ["admin", "member", "viewer"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)
        
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@router.delete("/users/{user_id}")
def delete_allocated_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete an allocated user (Admin only)."""
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own admin account")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User successfully deleted"}
