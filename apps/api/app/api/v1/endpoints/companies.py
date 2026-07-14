import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user, get_current_active_company
from app.models.user import User
from app.models.company import Company
from app.schemas.company import CompanyUpdate, CompanyResponse
from app.services.company import company_service

logger = logging.getLogger("deviceops.company_api")
router = APIRouter()


@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    company: Company = Depends(get_current_active_company)
):
    """Retrieve the company profile associated with the current user workspace"""
    return company


@router.put("/me", response_model=CompanyResponse)
async def update_my_company(
    company_in: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Update the company profile. Restricted to OWNER or ADMIN roles."""
    # Enforce Role-Based Access Control (RBAC) validation
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify company settings"
        )

    # Exclude slug changes (refinement 1: slug is read-only after creation)
    company_data = company_in.model_dump(exclude_unset=True)
    if "slug" in company_data:
        del company_data["slug"]

    # Update company details using the service layer
    updated_company = await company_service.update_company(
        db,
        db_obj=company,
        obj_in=CompanyUpdate(**company_data)
    )

    # Commit changes
    await db.commit()
    await db.refresh(updated_company)

    # Audit Logging (refinement 4)
    logger.info(
        f"Company profile updated successfully. "
        f"CompanyID: {updated_company.id}, "
        f"UserID: {current_user.id}, "
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
    )

    return updated_company
