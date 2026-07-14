import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.user import user_repository
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth import auth_service


class UserService:
    """Service class for User management workflows"""
    
    async def get_user(self, db: AsyncSession, user_id: uuid.UUID) -> User | None:
        return await user_repository.get(db, user_id)

    async def get_user_by_email(self, db: AsyncSession, email: str) -> User | None:
        return await user_repository.get_by_email(db, email.strip().lower())

    async def create_user(self, db: AsyncSession, *, obj_in: UserCreate, company_id: uuid.UUID) -> User:
        """Hash credentials and create a user bound to a specific tenant workspace"""
        hashed_password = auth_service.hash_password(obj_in.password)
        user_data = {
            "email": obj_in.email.strip().lower(),
            "full_name": obj_in.full_name,
            "role": obj_in.role,
            "password_hash": hashed_password,
            "status": "ACTIVE"
        }
        return await user_repository.create_by_tenant(db, obj_in=user_data, company_id=company_id)

    async def update_user(self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate) -> User:
        """Update user record, automatically hashing passwords if modified"""
        update_data = obj_in.model_dump(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = auth_service.hash_password(update_data["password"])
            del update_data["password"]
        
        if "email" in update_data:
            update_data["email"] = update_data["email"].strip().lower()
            
        return await user_repository.update(db, db_obj=db_obj, obj_in=update_data)

    async def disable_user(self, db: AsyncSession, *, user_id: uuid.UUID, company_id: uuid.UUID) -> User | None:
        """Deactivate user account status without applying soft-deletes"""
        user = await user_repository.get_by_tenant(db, id=user_id, company_id=company_id)
        if not user:
            return None
        return await user_repository.update(db, db_obj=user, obj_in={"status": "DISABLED"})


user_service = UserService()
