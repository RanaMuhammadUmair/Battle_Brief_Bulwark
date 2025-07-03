"""
Authentication router for user signup, login, profile management, and password change.

This module provides:
  - JWT creation and validation using HS256.
  - OAuth2 password flow via FastAPI.
  - User operations: signup, login, settings update, password change.
  - Dependencies: users_db for persistence, passlib for hashing, jose for JWT.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Body, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
import os
from pydantic import BaseModel, Field, EmailStr

from users_db import (
    get_user,
    create_user,
    update_user,
    update_user_password
)

# --- Configuration ---
SECRET_KEY = os.getenv("AUTH_SECRET_KEY")  # JWT signing key (set via environment)
ALGORITHM = "HS256"                        # JWT signing algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = 60           # Token validity

# --- Password Hashing Context ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare a plaintext password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(username: str, password: str):
    """
    Retrieve user by username and verify password.
    Returns the user record or None if authentication fails.
    """
    user = get_user(username)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT token containing `data` as payload.
    Adds an expiry claim (`exp`) based on expires_delta or defaults to 15 minutes.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- OAuth2 Scheme ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Decode and validate JWT, then fetch the corresponding user.
    Raises HTTPException(401) if token is invalid or user not found.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = get_user(username)
    if not user:
        raise credentials_exc
    return user

# --- Router Setup ---
router = APIRouter()

# --- Request Schemas ---
class SignUpData(BaseModel):
    """Schema for new user registration."""
    username: str
    full_name: Optional[str] = None
    email: EmailStr
    password: str

class UpdateProfileData(BaseModel):
    """Schema for updating user profile information."""
    username: str
    full_name: Optional[str] = None
    email: EmailStr
    currentPassword: str = Field(..., alias="currentPassword")

class ChangePasswordData(BaseModel):
    """Schema for changing a user's password."""
    currentPassword: str = Field(..., alias="currentPassword")
    newPassword: str = Field(..., alias="newPassword")

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate user credentials and return a JWT access token.
    Returns: { access_token: str, token_type: "bearer" }
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/signup")
async def signup(user_data: SignUpData = Body(...)):
    """
    Register a new user.
    Raises HTTPException(400) if the username already exists.
    Returns confirmation message and created username.
    """
    try:
        new_user = create_user(
            user_data.username,
            user_data.full_name,
            user_data.email,
            user_data.password
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"msg": "User created successfully", "username": new_user["username"]}

@router.get("/settings")
async def read_settings(current_user=Depends(get_current_user)):
    """
    Retrieve the authenticated user's profile settings.
    Returns: { username, full_name, email }
    """
    user = dict(current_user)
    return {
        "username": user["username"],
        "full_name": user.get("full_name"),
        "email": user["email"],
    }

@router.put("/settings")
async def update_settings(
    data: UpdateProfileData,
    current_user=Depends(get_current_user)
):
    """
    Update profile fields after verifying current password.
    Returns updated profile and a fresh access token.
    """
    # 1) Verify current password
    if not verify_password(data.currentPassword, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    # 2) Persist new profile data
    updated = update_user(
        username=current_user["username"],
        new_username=data.username,
        full_name=data.full_name,
        email=data.email
    )

    # 3) Issue new token (in case the username changed)
    access_token = create_access_token(
        data={"sub": updated["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "username":     updated["username"],
        "full_name":    updated.get("full_name"),
        "email":        updated["email"],
        "access_token": access_token,
        "token_type":   "bearer"
    }

@router.post("/change-password")
async def change_password(
    data: ChangePasswordData,
    current_user=Depends(get_current_user)
):
    """
    Change the authenticated user's password.
    Steps:
      1) Verify current password.
      2) Hash & persist the new password.
    Returns success message.
    """
    # Verify current password
    if not verify_password(data.currentPassword, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    # Hash and update new password
    new_hashed = pwd_context.hash(data.newPassword)
    update_user_password(current_user["username"], new_hashed)

    return {"detail": "Password changed successfully."}