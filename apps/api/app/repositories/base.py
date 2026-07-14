from typing import Any, Generic, Type, TypeVar, Sequence
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic CRUD repository with built-in tenant isolation helpers"""
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: uuid.UUID) -> ModelType | None:
        """Fetch a record by primary key (ignores company isolation, e.g. for companies table)"""
        query = select(self.model).where(self.model.id == id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_tenant(self, db: AsyncSession, id: uuid.UUID, company_id: uuid.UUID) -> ModelType | None:
        """Fetch a record by primary key and enforce company isolation"""
        query = select(self.model).where(self.model.id == id, self.model.company_id == company_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Fetch multiple records without tenant isolation"""
        query = select(self.model).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_multi_by_tenant(
        self, db: AsyncSession, company_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> Sequence[ModelType]:
        """Fetch multiple records and enforce company isolation"""
        query = select(self.model).where(self.model.company_id == company_id).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: dict[str, Any]) -> ModelType:
        """Create a new database record"""
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def create_by_tenant(self, db: AsyncSession, *, obj_in: dict[str, Any], company_id: uuid.UUID) -> ModelType:
        """Create a new database record bound to a specific company"""
        obj_in["company_id"] = company_id
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: ModelType, obj_in: dict[str, Any]) -> ModelType:
        """Update an existing database record"""
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def remove(self, db: AsyncSession, *, id: uuid.UUID) -> ModelType | None:
        """Remove a database record (hard delete)"""
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.flush()
        return obj
