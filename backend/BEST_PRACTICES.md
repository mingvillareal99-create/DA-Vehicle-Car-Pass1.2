# Database Migration and Schema Evolution Best Practices

## The Issue
When we update Python Enums or change Pydantic models (e.g., adding/removing `VehicleType` classifications), older documents in MongoDB may still contain the legacy string values.

If our FastAPI backend fetches a list of records and encounters one of these legacy documents, Pydantic throws a `ValidationError` when it fails to deserialize the legacy string into the new Enum type.

Because we use list comprehensions (e.g., `[VisitorRegistration(**v) for v in visitors]`), a **single invalid record causes the entire API endpoint to return a 500 Internal Server Error**. In a React application that uses `Promise.all` to fetch dashboard data simultaneously, this single 500 error will cause all dashboard components to fail and surface an empty interface.

## Best Practices to Avoid This in the Long Run

### 1. Resilient Parsing (Implemented)
Never use strict list comprehensions when loading models from the database. Instead of letting one bad record crash the API line, catch the parse errors individually and skip/log the bad records:

```python
valid_records = []
for record in raw_records:
    try:
        valid_records.append(Model(**record))
    except Exception as e:
        logger.warning(f"Failed to parse record {record.get('id')}: {e}")
return valid_records
```

### 2. Backward Compatible Pydantic Models
When changing an Enum, consider leaving the legacy string in the enum temporarily, or use a Pydantic `@validator` (or `field_validator` in v2) with `pre=True` to automatically map legacy strings to updated Enums:

```python
from pydantic import field_validator

class VisitorRegistration(BaseEntity):
    vehicle_type: VehicleType

    @field_validator('vehicle_type', mode='before')
    def map_legacy_vehicle_types(cls, v):
        if v == "company":
            return "private" # Map legacy to new representation
        return v
```

### 3. Run Database Migrations
Always accompany Enum changes or mandatory schema changes with a one-time migration script. Run a script to do an `update_many` on MongoDB directly rather than leaving dirty data in the collection.

```python
db.visitor_registrations.update_many(
    {"vehicle_type": "company"},
    {"$set": {"vehicle_type": "private"}}
)
```
