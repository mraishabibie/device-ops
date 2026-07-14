import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.company import Company
from app.repositories.company import company_repository
from app.schemas.company import CompanyCreate, CompanyUpdate


class CompanyService:
    """Service class for managing Company workspace profiles"""
    
    async def get_company(self, db: AsyncSession, company_id: uuid.UUID) -> Company | None:
        return await company_repository.get(db, company_id)

    async def get_company_by_slug(self, db: AsyncSession, slug: str) -> Company | None:
        return await company_repository.get_by_slug(db, slug.strip().lower())

    async def create_company(self, db: AsyncSession, *, obj_in: CompanyCreate) -> Company:
        """Create a new company tenant profile"""
        company_data = obj_in.model_dump()
        company_data["slug"] = company_data["slug"].strip().lower()
        return await company_repository.create(db, obj_in=company_data)

    async def update_company(self, db: AsyncSession, *, db_obj: Company, obj_in: CompanyUpdate) -> Company:
        """Update company metadata settings"""
        update_data = obj_in.model_dump(exclude_unset=True)
        if "slug" in update_data:
            update_data["slug"] = update_data["slug"].strip().lower()
        return await company_repository.update(db, db_obj=db_obj, obj_in=update_data)


company_service = CompanyService()
