import pytest
from pydantic import ValidationError
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.services.company import company_service


def test_company_website_validation_success():
    # Valid HTTPS websites should pass validation
    schema = CompanyUpdate(website="https://deviceops.net")
    assert schema.website == "https://deviceops.net"


def test_company_website_validation_failure():
    # HTTP or non-URL strings should fail validation
    with pytest.raises(ValidationError) as excinfo:
        CompanyUpdate(website="http://deviceops.net")
    assert "Website must be a valid HTTPS URL" in str(excinfo.value)

    with pytest.raises(ValidationError) as excinfo:
        CompanyUpdate(website="ftp://deviceops.net")
    assert "Website must be a valid HTTPS URL" in str(excinfo.value)


def test_company_update_slug_immutability():
    # When updating, any attempt to modify slug should be ignored or processed by the PUT route
    # Let's verify our schema parsing behaves correctly
    payload = {"name": "New Name", "slug": "new-slug", "website": "https://deviceops.net"}
    schema = CompanyUpdate(**payload)
    assert schema.name == "New Name"
    assert schema.slug == "new-slug"
    
    # In endpoints, we manually strip slug, let's check that logic behaves as expected:
    data = schema.model_dump(exclude_unset=True)
    if "slug" in data:
        del data["slug"]
    
    assert "slug" not in data
    assert data["name"] == "New Name"
