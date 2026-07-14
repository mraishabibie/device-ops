from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.company import Company
from app.repositories.base import BaseRepository


class CompanyRepository(BaseRepository[Company]):
    """Repository class for Company model operations"""
    def __init__(self):
        super().__init__(Company)

    async def get_by_slug(self, db: AsyncSession, slug: str) -> Company | None:
        """Find a company by its unique slug"""
        query = select(self.model).where(self.model.slug == slug)
        result = await db.execute(query)
        return result.scalar_one_or_none()


company_repository = CompanyRepository()
