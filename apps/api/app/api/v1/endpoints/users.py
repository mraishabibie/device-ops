import logging
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user, get_current_active_company
from app.models.user import User
from app.models.company import Company
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserStatusUpdate, UserListResponse
from app.services.user import user_service
from app.repositories.user import user_repository

logger = logging.getLogger("deviceops.user_api")
router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Returns the authenticated user's own profile including role and company context"""
    return current_user



async def is_last_active_owner(db: AsyncSession, company_id: uuid.UUID, target_user_id: uuid.UUID) -> bool:
    """Helper to check if target user is the last ACTIVE OWNER in the company"""
    query = select(func.count(User.id)).where(
        User.company_id == company_id,
        User.role == "OWNER",
        User.status == "ACTIVE",
        User.deleted_at.is_(None)
    )
    result = await db.execute(query)
    count = result.scalar_one_or_none() or 0
    
    if count > 1:
        return False
        
    # If count is 1, check if that 1 is the target user
    if count == 1:
        query_owner = select(User.id).where(
            User.company_id == company_id,
            User.role == "OWNER",
            User.status == "ACTIVE",
            User.deleted_at.is_(None)
        )
        owner_result = await db.execute(query_owner)
        owner_id = owner_result.scalar_one_or_none()
        return owner_id == target_user_id
        
    return False


@router.get("/", response_model=UserListResponse)
async def list_users(
    search: str | None = None,
    page: int = 1,
    size: int = 10,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve a paginated and searchable list of users belonging to the active company workspace"""
    if page < 1:
        page = 1
    if size < 1:
        size = 10
        
    skip = (page - 1) * size

    # Base query for active workspace users (not deleted)
    base_filter = [User.company_id == company.id, User.deleted_at.is_(None)]

    if search:
        search_term = f"%{search.strip().lower()}%"
        base_filter.append(
            or_(
                func.lower(User.full_name).like(search_term),
                func.lower(User.email).like(search_term)
            )
        )

    # Count total matches
    count_query = select(func.count(User.id)).where(*base_filter)
    count_result = await db.execute(count_query)
    total = count_result.scalar_one_or_none() or 0

    # Retrieve paginated items
    select_query = select(User).where(*base_filter).order_by(User.created_at.desc()).offset(skip).limit(size)
    items_result = await db.execute(select_query)
    items = items_result.scalars().all()

    return UserListResponse(
        items=list(items),
        total=total,
        page=page,
        size=size
    )


@router.post("/", response_model=UserResponse)
async def create_workspace_user(
    user_in: UserCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user within the active company workspace. Enforces tenant isolation and strict RBAC limits."""
    # RBAC Validation: Viewer cannot create users
    if current_user.role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create users"
        )

    # RBAC Validation: Admin cannot create Owner users
    if current_user.role == "ADMIN" and user_in.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot create Owner accounts"
        )

    # Enforce Email Uniqueness within the SAME company (Refinement 2)
    email_clean = user_in.email.strip().lower()
    query = select(User).where(
        User.company_id == company.id,
        User.email == email_clean,
        User.deleted_at.is_(None)
    )
    dup_result = await db.execute(query)
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists in this workspace"
        )

    # Create the user using the Service layer
    new_user = await user_service.create_user(db, obj_in=user_in, company_id=company.id)
    await db.commit()
    await db.refresh(new_user)

    # Log successful creation event (Refinement 5)
    logger.info(
        f"User Created. CompanyID: {company.id}, "
        f"ActorUserID: {current_user.id}, "
        f"TargetUserID: {new_user.id}, "
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
    )

    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_workspace_user(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Edit user details. Enforces strict tenant isolation, RBAC constraints, and active owner guards."""
    target_user = await user_repository.get_by_tenant(db, id=user_id, company_id=company.id)
    if not target_user or target_user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # RBAC Validation: Viewer cannot edit users
    if current_user.role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify users"
        )

    # RBAC Validation: Admin cannot modify Owner accounts
    if current_user.role == "ADMIN" and target_user.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot modify Owner accounts"
        )

    # RBAC Validation: Admin cannot elevate other users to Owner role
    if current_user.role == "ADMIN" and user_in.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot elevate user roles to Owner"
        )

    # Active Owner Safeguard (Refinement 1): Last active owner cannot be demoted (role changed from OWNER)
    if target_user.role == "OWNER" and user_in.role is not None and user_in.role != "OWNER":
        if await is_last_active_owner(db, company.id, target_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active Owner of the company workspace"
            )

    # Email Uniqueness within same tenant checks
    if user_in.email:
        email_clean = user_in.email.strip().lower()
        if email_clean != target_user.email:
            query = select(User).where(
                User.company_id == company.id,
                User.email == email_clean,
                User.id != target_user.id,
                User.deleted_at.is_(None)
            )
            dup_result = await db.execute(query)
            if dup_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email address already exists in this workspace"
                )

    # Prevent empty passwords from overwriting (Refinement 3)
    update_params = user_in.model_dump(exclude_unset=True)
    if "password" in update_params and (update_params["password"] is None or update_params["password"] == ""):
        del update_params["password"]

    # Save updates using service wrapper
    updated_user = await user_service.update_user(db, db_obj=target_user, obj_in=UserUpdate(**update_params))
    await db.commit()
    await db.refresh(updated_user)

    # Log successful update event (Refinement 5)
    logger.info(
        f"User Updated. CompanyID: {company.id}, "
        f"ActorUserID: {current_user.id}, "
        f"TargetUserID: {updated_user.id}, "
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
    )

    return updated_user


@router.put("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: uuid.UUID,
    status_in: UserStatusUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Enables or disables user account status inside active workspace."""
    target_user = await user_repository.get_by_tenant(db, id=user_id, company_id=company.id)
    if not target_user or target_user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # RBAC Validation: Viewer cannot modify user statuses
    if current_user.role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify user statuses"
        )

    # RBAC Validation: Admin cannot disable Owner accounts
    if current_user.role == "ADMIN" and target_user.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot modify Owner accounts"
        )

    # Self-Disabling Safeguard (Refinement 4): Prevent users from disabling themselves
    if target_user.id == current_user.id and status_in.status == "DISABLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own user account"
        )

    # Active Owner Safeguard (Refinement 1): Last active owner cannot be disabled
    if target_user.role == "OWNER" and status_in.status == "DISABLED":
        if await is_last_active_owner(db, company.id, target_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot disable the last active Owner of the company workspace"
            )

    # Update status
    updated_user = await user_repository.update(db, db_obj=target_user, obj_in={"status": status_in.status})
    await db.commit()
    await db.refresh(updated_user)

    # Log successful status toggle event (Refinement 5)
    log_action = "User Enabled" if status_in.status == "ACTIVE" else "User Disabled"
    logger.info(
        f"{log_action}. CompanyID: {company.id}, "
        f"ActorUserID: {current_user.id}, "
        f"TargetUserID: {updated_user.id}, "
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
    )

    return updated_user
