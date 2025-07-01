from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Body, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
import os
from pydantic import BaseModel, Field, EmailStr
from users_db import get_user, create_user, update_user, update_user_password  # Import the SQLite retrieval and creation functions

# --- Configuration ---
SECRET_KEY = os.getenv("AUTH_SECRET_KEY")  # Replace with a secure key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour

# --- Password Hashing Utility ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- OAuth2 Scheme ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
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

# Pydantic model for signup data
class SignUpData(BaseModel):
    username: str
    full_name: Optional[str] = None
    email: EmailStr
    password: str

# Pydantic model for updating profile data
class UpdateProfileData(BaseModel):
    username: str
    full_name: str | None = None
    email: EmailStr
    currentPassword: str = Field(..., alias="currentPassword")

# Pydantic model for changing password
class ChangePasswordData(BaseModel):
    currentPassword: str = Field(..., alias="currentPassword")
    newPassword:     str = Field(..., alias="newPassword")

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
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
    try:
        new_user = create_user(user_data.username, user_data.full_name, user_data.email, user_data.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"msg": "User created successfully", "username": new_user["username"]}

@router.get("/settings")
async def read_settings(current_user = Depends(get_current_user)):
    user = dict(current_user)
    return {
        "username":  user["username"],
        "full_name": user.get("full_name"),
        "email":     user["email"]
    }

@router.put("/settings")
async def update_settings(
    data: UpdateProfileData,
    current_user = Depends(get_current_user)
):
    # 1) verify their current password
    if not verify_password(data.currentPassword, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    # 2) write the new fields into the DB
    updated = update_user(
        username=current_user["username"],
        new_username=data.username,
        full_name=data.full_name,
        email=data.email
    )

    # issue a fresh token for the new username
    from datetime import timedelta
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
    current_user = Depends(get_current_user)
):
    # 1) verify current password
    if not verify_password(data.currentPassword, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    # 2) hash & persist the new password
    new_hashed = pwd_context.hash(data.newPassword)
    update_user_password(current_user["username"], new_hashed)

    return {"detail": "Password changed successfully."}