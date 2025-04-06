from datetime import datetime
from typing import Optional, List

class User:
    """Basic user model for the NATO document summarizer"""
    
    def __init__(
        self,
        id: str,
        username: str,
        email: str,
        password_hash: str,
        created_at: datetime = None,
        last_login: datetime = None,
        role: str = "user"
    ):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.created_at = created_at or datetime.utcnow()
        self.last_login = last_login
        self.role = role  # e.g., "user", "admin", "analyst"
        
    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission"""
        # Implement role-based permission checking
        if self.role == "admin":
            return True
        
        permission_matrix = {
            "user": ["read", "summarize", "save_own"],
            "analyst": ["read", "summarize", "save_own", "view_stats"],
            "admin": ["read", "summarize", "save_own", "view_stats", "manage_users"]
        }
        
        return permission in permission_matrix.get(self.role, [])
    
    def to_dict(self) -> dict:
        """Convert user to dictionary (without sensitive data)"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "role": self.role
        }
