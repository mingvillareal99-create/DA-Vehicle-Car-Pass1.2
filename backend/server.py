from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import jwt
import bcrypt
import base64
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from enum import Enum
from abc import ABC, abstractmethod
import io
from PIL import Image


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Define Philippine Time (UTC+8) robustly without requiring tzdata
PHT_TZ = timezone(timedelta(hours=8), name="PHT")

# Configuration Class
class Config:
    MONGO_URL = os.environ['MONGO_URL']
    DB_NAME = os.environ['DB_NAME']
    JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = 24
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    UPLOAD_DIR = ROOT_DIR / "uploads"

# Create upload directory
Config.UPLOAD_DIR.mkdir(exist_ok=True)

# Database connection
client = AsyncIOMotorClient(Config.MONGO_URL, tz_aware=True)
db = client[Config.DB_NAME]

# Helper function to convert MongoDB documents
def convert_objectid_to_str(doc):
    """Convert MongoDB ObjectId to string recursively"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [convert_objectid_to_str(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id' and isinstance(value, ObjectId):
                continue  # Skip MongoDB _id field
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, (dict, list)):
                result[key] = convert_objectid_to_str(value)
            else:
                result[key] = value
        return result
    return doc

# Create the main app
app = FastAPI(
    title="DA Vehicle Gate Pass System",
    description="Department of Agriculture Region V - Vehicle Gate Pass Management System with Mobile Registration",
    version="2.0.0"
)

# Create router
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    GUARD = "guard"

class VehicleType(str, Enum):
    PRIVATE = "private"
    DA_GOVERNMENT = "da_government"
    PUBLIC = "public"
    GOVERNMENT = "government"

class LogAction(str, Enum):
    ENTRY = "entry"
    EXIT = "exit"

class RegistrationType(str, Enum):
    PERMANENT = "permanent"
    VISITOR = "visitor"

class VisitDuration(str, Enum):
    TWO_HOURS = "2_hours"
    FOUR_HOURS = "4_hours"
    EIGHT_HOURS = "8_hours"
    ONE_DAY = "1_day"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"

class TicketStatus(str, Enum):
    OVERSTAYING = "overstaying"
    UNDER_INVESTIGATION = "under_investigation"
    ON_TRAVEL = "on_travel"
    RESOLVED = "resolved"

# Base Model Classes
class BaseEntity(BaseModel):
    """Base entity with common fields"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(PHT_TZ))

class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""
    created_at: datetime = Field(default_factory=lambda: datetime.now(PHT_TZ))
    updated_at: Optional[datetime] = None

# Database Models
class User(BaseEntity):
    username: str
    role: UserRole

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    username: str
    password: str

class DriverLicense(BaseEntity):
    """Driver's License Information"""
    last_name: str
    first_name: str
    middle_name: Optional[str] = None
    gender: Gender
    date_of_birth: str  # Format: YYYY-MM-DD
    address: str
    license_number: str
    license_photo_path: Optional[str] = None  # Path to stored license photo

class Vehicle(BaseEntity):
    plate_number: str
    vehicle_type: VehicleType
    owner_name: str
    department: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    classification: Optional[str] = None
    is_active: bool = True
    registration_type: RegistrationType = RegistrationType.PERMANENT

class VehicleCreate(BaseModel):
    plate_number: str
    vehicle_type: VehicleType
    owner_name: str
    department: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    classification: Optional[str] = None
class VisitorRegistration(BaseEntity):
    """Visitor vehicle registration"""
    plate_number: str
    vehicle_type: VehicleType
    driver_license: DriverLicense
    purpose_of_visit: str
    department_visiting: Optional[str] = None
    visit_duration: VisitDuration
    expires_at: datetime
    barcode_data: str
    is_active: bool = True
    registration_type: RegistrationType = RegistrationType.VISITOR

class VisitorRegistrationCreate(BaseModel):
    plate_number: str
    vehicle_type: VehicleType
    driver_license: Dict  # Will be converted to DriverLicense
    purpose_of_visit: str
    department_visiting: Optional[str] = None
    visit_duration: VisitDuration
    license_photo_base64: Optional[str] = None

class EntryExitLog(BaseEntity):
    plate_number: str
    action: LogAction
    timestamp: datetime = Field(default_factory=lambda: datetime.now(PHT_TZ))
    guard_username: str
    scan_method: str  # "scanner" or "manual"
    is_inside: bool = False  # True if vehicle is currently inside (default False)
    entry_time: Optional[datetime] = None  # For tracking duration
    exit_time: Optional[datetime] = None
    registration_type: Optional[RegistrationType] = None

class EntryExitLogCreate(BaseModel):
    plate_number: str
    action: LogAction
    scan_method: str = "scanner"

class ScanInput(BaseModel):
    plate_number: str
    scan_method: str = "scanner"

class VehicleStatus(BaseModel):
    plate_number: str
    is_inside: bool
    entry_time: Optional[datetime] = None
    duration_hours: Optional[float] = None
    is_overstaying: bool = False
    registration_type: Optional[RegistrationType] = None

class SyncData(BaseModel):
    """Model for syncing offline data"""
    visitor_registrations: List[Dict] = []
    entry_exit_logs: List[Dict] = []

class Notification(BaseEntity):
    title: str
    message: str
    is_read: bool = False
    reference_id: Optional[str] = None

class OverstayingTicket(BaseEntity):
    plate_number: str
    vehicle_type: str
    purpose_of_visit: Optional[str] = None
    owner_name: str
    license_number: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    entry_time: datetime
    status: TicketStatus = TicketStatus.OVERSTAYING
    resolution_note: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    ticket_number: Optional[str] = None
    travel_order_number: Optional[str] = None
    travel_location: Optional[str] = None
    travel_end_date: Optional[datetime] = None
    cause_of_overstaying: Optional[str] = None

class TicketCreate(BaseModel):
    plate_number: str
    vehicle_type: str
    owner_name: str
    entry_time: datetime
    purpose_of_visit: Optional[str] = None
    license_number: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class TicketUpdate(BaseModel):
    status: TicketStatus
    resolution_note: Optional[str] = None
    resolved_by: Optional[str] = None
    travel_order_number: Optional[str] = None
    travel_location: Optional[str] = None
    travel_end_date: Optional[datetime] = None
    cause_of_overstaying: Optional[str] = None

# Service Classes (Business Logic Layer)
class PasswordService:
    """Service for password hashing and verification"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

class JWTService:
    """Service for JWT token operations"""
    
    @staticmethod
    def create_token(username: str, role: str) -> str:
        payload = {
            'username': username,
            'role': role,
            'exp': DateTimeService.now_pht() + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
        }
        return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
    
    @staticmethod
    def decode_token(token: str) -> Dict:
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
            return {"success": True, "payload": payload}
        except jwt.ExpiredSignatureError:
            return {"success": False, "error": "Token expired"}
        except jwt.InvalidTokenError:
            return {"success": False, "error": "Invalid token"}

class DateTimeService:
    """Service for datetime operations"""
    
    @staticmethod
    def now_pht() -> datetime:
        return datetime.now(PHT_TZ)
    
    @staticmethod
    def ensure_timezone_aware(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=PHT_TZ)
        return dt
    
    @staticmethod
    def calculate_duration_hours(start_time: datetime, end_time: datetime) -> float:
        start_time = DateTimeService.ensure_timezone_aware(start_time)
        end_time = DateTimeService.ensure_timezone_aware(end_time)
        duration = end_time - start_time
        return duration.total_seconds() / 3600
    
    @staticmethod
    def calculate_expiry_time(duration: VisitDuration) -> datetime:
        now = DateTimeService.now_pht()
        duration_map = {
            VisitDuration.TWO_HOURS: timedelta(hours=2),
            VisitDuration.FOUR_HOURS: timedelta(hours=4),
            VisitDuration.EIGHT_HOURS: timedelta(hours=8),
            VisitDuration.ONE_DAY: timedelta(days=1)
        }
        return now + duration_map.get(duration, timedelta(hours=8))

class FileService:
    """Service for file operations"""
    
    @staticmethod
    def save_license_photo(base64_data: str, filename: str) -> str:
        """Save base64 image data to file"""
        try:
            # Remove data URL prefix if present
            if base64_data.startswith('data:image'):
                base64_data = base64_data.split(',')[1]
            
            # Decode base64 data
            image_data = base64.b64decode(base64_data)
            
            # Create file path
            file_path = Config.UPLOAD_DIR / filename
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(image_data)
            
            return str(file_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to save image: {str(e)}")

class BarcodeService:
    """Service for barcode generation"""
    
    @staticmethod
    def generate_barcode_data(registration: VisitorRegistration) -> str:
        """Generate barcode data for visitor registration"""
        return registration.plate_number

# Repository Classes (Data Access Layer)
class BaseRepository(ABC):
    """Abstract base repository"""
    
    def __init__(self, collection_name: str):
        self.collection = db[collection_name]
    
    @abstractmethod
    async def create(self, data: dict) -> dict:
        raise NotImplementedError
    
    @abstractmethod
    async def find_by_id(self, entity_id: str) -> Optional[dict]:
        raise NotImplementedError

class UserRepository(BaseRepository):
    """User data access layer"""
    
    def __init__(self):
        super().__init__("users")
    
    async def create(self, data: dict) -> dict:
        result = await self.collection.insert_one(data)
        return {"id": str(result.inserted_id), **data}
    
    async def find_by_id(self, entity_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"id": entity_id})
        return convert_objectid_to_str(doc)
    
    async def find_by_username(self, username: str) -> Optional[dict]:
        doc = await self.collection.find_one({"username": username})
        return convert_objectid_to_str(doc)

class VehicleRepository(BaseRepository):
    """Vehicle data access layer"""
    
    def __init__(self):
        super().__init__("vehicles")
    
    async def create(self, data: dict) -> dict:
        result = await self.collection.insert_one(data)
        return {"id": str(result.inserted_id), **data}
    
    async def find_by_id(self, entity_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"id": entity_id})
        return convert_objectid_to_str(doc)
    
    async def find_by_plate_number(self, plate_number: str) -> Optional[dict]:
        # Check standard permanent vehicles
        doc = await self.collection.find_one({"plate_number": plate_number, "is_active": True})
        if doc:
            return convert_objectid_to_str(doc)
            
        # Check da-registrations (imported JSON data)
        da_doc = await db["da-registrations"].find_one({"vehicle.plate_number": plate_number})
        if da_doc:
            da_str = convert_objectid_to_str(da_doc)
            # Map da-registrations format to Vehicle BaseModel format
            
            # Safe parsing
            owner_info = da_str.get("owner", {})
            first_name = owner_info.get("first_name", "")
            family_name = owner_info.get("family_name", "")
            owner_name = f"{first_name} {family_name}".strip() or "Unknown"
            
            plate_number_extracted = da_str.get("vehicle", {}).get("plate_number")
            return {
                "id": str(da_doc.get("_id")),
                "plate_number": plate_number_extracted if plate_number_extracted else plate_number,
                "vehicle_type": VehicleType.DA_GOVERNMENT.value, # Defaulting imported vehicles to da_government
                "owner_name": owner_name,
                "department": da_str.get("employment", {}).get("classification"),
                "brand": da_str.get("vehicle", {}).get("brand"),
                "color": da_str.get("vehicle", {}).get("color"),
                "classification": da_str.get("employment", {}).get("status"),
                "is_active": True,
                "registration_type": RegistrationType.PERMANENT.value
            }
        return None
    
    async def find_all_active(self) -> List[dict]:
        # 1. Fetch standard permanent vehicles
        cursor = self.collection.find({"is_active": True})
        docs = await cursor.to_list(1000)
        vehicles = [convert_objectid_to_str(doc) for doc in docs]
        
        # 2. Fetch da-registrations
        da_cursor = db["da-registrations"].find({})
        da_docs = await da_cursor.to_list(1000)
        
        for da_doc in da_docs:
            da_str = convert_objectid_to_str(da_doc)
            
            # Safe parsing
            owner_info = da_str.get("owner", {})
            first_name = owner_info.get("first_name", "")
            family_name = owner_info.get("family_name", "")
            owner_name = f"{first_name} {family_name}".strip() or "Unknown"
            
            plate_number_extracted = da_str.get("vehicle", {}).get("plate_number")
            plate_number = plate_number_extracted if plate_number_extracted else "UNKNOWN"
            
            vehicles.append({
                "id": str(da_doc.get("_id")),
                "plate_number": plate_number,
                "vehicle_type": VehicleType.DA_GOVERNMENT.value,
                "owner_name": owner_name,
                "department": da_str.get("employment", {}).get("classification"),
                "brand": da_str.get("vehicle", {}).get("brand"),
                "color": da_str.get("vehicle", {}).get("color"),
                "classification": da_str.get("employment", {}).get("status"),
                "is_active": True,
                "registration_type": RegistrationType.PERMANENT.value
            })
            
        # Sort by status of employment
        def get_status_priority(doc):
            status = str(doc.get("classification", "")).lower()
            if "permanent" in status:
                return 1
            elif "contract of service" in status or status == "cos":
                return 2
            elif "job order" in status or status == "jo":
                return 3
            return 4
            
        vehicles.sort(key=get_status_priority)
            
        return vehicles

class VisitorRegistrationRepository(BaseRepository):
    """Visitor registration data access layer"""
    
    def __init__(self):
        super().__init__("visitor_registrations")
    
    async def create(self, data: dict) -> dict:
        result = await self.collection.insert_one(data)
        return {"id": str(result.inserted_id), **data}
    
    async def find_by_id(self, entity_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"id": entity_id})
        return convert_objectid_to_str(doc)
    
    async def find_by_plate_number(self, plate_number: str) -> Optional[dict]:
        doc = await self.collection.find_one({
            "plate_number": plate_number, 
            "is_active": True,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        return convert_objectid_to_str(doc)
    
    async def find_all_active(self) -> List[dict]:
        cursor = self.collection.find({
            "is_active": True,
            "expires_at": {"$gt": DateTimeService.now_pht()}
        })
        docs = await cursor.to_list(1000)
        return [convert_objectid_to_str(doc) for doc in docs]
        
    async def find_all_recent(self, limit: int = 100) -> List[dict]:
        cursor = self.collection.find({}).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(limit)
        return [convert_objectid_to_str(doc) for doc in docs]
    
    async def find_expired(self) -> List[dict]:
        cursor = self.collection.find({
            "is_active": True,
            "expires_at": {"$lte": DateTimeService.now_pht()}
        })
        docs = await cursor.to_list(1000)
        return [convert_objectid_to_str(doc) for doc in docs]

class EntryExitLogRepository(BaseRepository):
    """Entry/Exit log data access layer"""
    
    def __init__(self):
        super().__init__("entry_exit_logs")
    
    async def create(self, data: dict) -> dict:
        result = await self.collection.insert_one(data)
        return {"id": str(result.inserted_id), **data}
    
    async def find_by_id(self, entity_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"id": entity_id})
        return convert_objectid_to_str(doc)
    
    async def find_latest_by_plate(self, plate_number: str) -> Optional[dict]:
        doc = await self.collection.find_one(
            {"plate_number": plate_number},
            sort=[("timestamp", -1)]
        )
        return convert_objectid_to_str(doc)
    
    async def find_all(self, limit: int = 50, plate_number: Optional[str] = None) -> List[dict]:
        query = {}
        if plate_number:
            query["plate_number"] = plate_number
        
        cursor = self.collection.find(query).sort("timestamp", -1).limit(limit)
        docs = await cursor.to_list(limit)
        return [convert_objectid_to_str(doc) for doc in docs]
    
    async def count_today(self) -> int:
        today = DateTimeService.now_pht().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        return await self.collection.count_documents({
            "timestamp": {"$gte": today, "$lt": tomorrow}
        })

class TicketRepository(BaseRepository):
    """Overstaying ticket data access layer"""
    
    def __init__(self):
        super().__init__("overstaying_tickets")
    
    async def create(self, data: dict) -> dict:
        if "ticket_number" not in data or not data["ticket_number"]:
            count = await self.collection.count_documents({})
            data["ticket_number"] = f"OVR-{count:05d}"
            
        result = await self.collection.insert_one(data)
        return {"id": str(result.inserted_id), **data}
    
    async def find_by_id(self, entity_id: str) -> Optional[dict]:
        doc = await self.collection.find_one({"id": entity_id})
        return convert_objectid_to_str(doc)
        
    async def update(self, entity_id: str, data: dict) -> bool:
        result = await self.collection.update_one(
            {"id": entity_id}, {"$set": data}
        )
        return result.modified_count > 0
        
    async def find_all(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[dict]:
        query = {}
        if start_date and end_date:
            query["created_at"] = {"$gte": start_date, "$lte": end_date}
        else:
            # By default, exclude resolved tickets older than 1 day
            yesterday = DateTimeService.now_pht() - timedelta(days=1)
            query = {
                "$or": [
                    {"status": {"$ne": TicketStatus.RESOLVED.value}},
                    {"$and": [{"status": TicketStatus.RESOLVED.value}, {"resolved_at": {"$gt": yesterday}}]}
                ]
            }
        cursor = self.collection.find(query).sort("created_at", -1)
        docs = await cursor.to_list(1000)
        return [convert_objectid_to_str(doc) for doc in docs]
        
    async def find_active_ticket(self, plate_number: str) -> Optional[dict]:
        doc = await self.collection.find_one({
            "plate_number": plate_number,
            "status": {"$ne": TicketStatus.RESOLVED.value}
        })
        return convert_objectid_to_str(doc)

# Service Classes (Business Logic)
class AuthService:
    """Authentication service"""
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.password_service = PasswordService()
        self.jwt_service = JWTService()
    
    async def register_user(self, user_data: UserCreate) -> Dict:
        # Check if username exists
        existing_user = await self.user_repo.find_by_username(user_data.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password and create user
        hashed_password = self.password_service.hash_password(user_data.password)
        user_obj = User(username=user_data.username, role=user_data.role)
        
        await self.user_repo.create({**user_obj.dict(), 'password': hashed_password})
        return {"message": "User created successfully", "user": user_obj}
    
    async def login_user(self, login_data: UserLogin) -> Dict:
        # Find user
        user = await self.user_repo.find_by_username(login_data.username)
        if not user or not self.password_service.verify_password(login_data.password, user['password']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create token
        token = self.jwt_service.create_token(user['username'], user['role'])
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "username": user['username'],
                "role": user['role']
            }
        }

class VehicleService:
    """Vehicle management service"""
    
    def __init__(self):
        self.vehicle_repo = VehicleRepository()
    
    async def create_vehicle(self, vehicle_data: VehicleCreate) -> Vehicle:
        # Check if plate number exists
        existing_vehicle = await self.vehicle_repo.find_by_plate_number(vehicle_data.plate_number)
        if existing_vehicle:
            raise HTTPException(status_code=400, detail="Vehicle with this plate number already exists")
        
        vehicle_obj = Vehicle(**vehicle_data.dict())
        await self.vehicle_repo.create(vehicle_obj.dict())
        return vehicle_obj
    
    async def get_all_vehicles(self) -> List[Vehicle]:
        vehicles = await self.vehicle_repo.find_all_active()
        import logging
        valid_vehicles = []
        for v in vehicles:
            try:
                valid_vehicles.append(Vehicle(**v))
            except Exception as e:
                logging.warning(f"Failed to parse vehicle record {v.get('id')}: {e}")
        return valid_vehicles
    
    async def get_vehicle_by_plate(self, plate_number: str) -> Optional[Vehicle]:
        vehicle = await self.vehicle_repo.find_by_plate_number(plate_number)
        if vehicle:
            return Vehicle(**vehicle)
        return None

class VisitorRegistrationService:
    """Visitor registration service"""
    
    def __init__(self):
        self.visitor_repo = VisitorRegistrationRepository()
        self.vehicle_repo = VehicleRepository()
        self.file_service = FileService()
        self.datetime_service = DateTimeService()
        self.barcode_service = BarcodeService()
    
    async def register_visitor(self, registration_data: VisitorRegistrationCreate) -> VisitorRegistration:
        # Check if vehicle already exists as permanent registration
        existing_vehicle = await self.vehicle_repo.find_by_plate_number(registration_data.plate_number)
        if existing_vehicle and existing_vehicle.get('registration_type') == RegistrationType.PERMANENT:
            raise HTTPException(status_code=400, detail="Vehicle already permanently registered")
        
        # Check if active visitor registration exists
        existing_visitor = await self.visitor_repo.find_by_plate_number(registration_data.plate_number)
        if existing_visitor:
            raise HTTPException(status_code=400, detail="Active visitor registration already exists for this plate number")
        
        # Create driver license object
        license_data = DriverLicense(**registration_data.driver_license)
        
        # Save license photo if provided
        if registration_data.license_photo_base64:
            filename = f"license_{license_data.license_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            license_data.license_photo_path = self.file_service.save_license_photo(
                registration_data.license_photo_base64, 
                filename
            )
        
        # Calculate expiry time
        expires_at = self.datetime_service.calculate_expiry_time(registration_data.visit_duration)
        
        # Create visitor registration
        visitor_registration = VisitorRegistration(
            plate_number=registration_data.plate_number.upper(),
            vehicle_type=registration_data.vehicle_type,
            driver_license=license_data,
            purpose_of_visit=registration_data.purpose_of_visit,
            department_visiting=registration_data.department_visiting,
            visit_duration=registration_data.visit_duration,
            expires_at=expires_at,
            barcode_data="",  # Will be set after creation
            registration_type=RegistrationType.VISITOR
        )
        
        # Generate barcode data
        visitor_registration.barcode_data = self.barcode_service.generate_barcode_data(visitor_registration)
        
        # Save to database
        await self.visitor_repo.create(visitor_registration.dict())
        
        return visitor_registration
    
    async def get_active_visitors(self) -> List[VisitorRegistration]:
        visitors = await self.visitor_repo.find_all_active()
        import logging
        valid_visitors = []
        for v in visitors:
            try:
                valid_visitors.append(VisitorRegistration(**v))
            except Exception as e:
                logging.warning(f"Failed to parse active visitor record {v.get('id')}: {e}")
        return valid_visitors
        
    async def get_all_recent_visitors(self, limit: int = 100) -> List[VisitorRegistration]:
        visitors = await self.visitor_repo.find_all_recent(limit)
        import logging
        valid_visitors = []
        for v in visitors:
            try:
                valid_visitors.append(VisitorRegistration(**v))
            except Exception as e:
                logging.warning(f"Failed to parse recent visitor record {v.get('id')}: {e}")
        return valid_visitors
    
    async def get_visitor_by_plate(self, plate_number: str) -> Optional[VisitorRegistration]:
        visitor = await self.visitor_repo.find_by_plate_number(plate_number)
        if visitor:
            return VisitorRegistration(**visitor)
        return None

class ScanService:
    """Vehicle scanning service"""
    
    def __init__(self):
        self.vehicle_repo = VehicleRepository()
        self.visitor_repo = VisitorRegistrationRepository()
        self.log_repo = EntryExitLogRepository()
        self.datetime_service = DateTimeService()
    
    async def process_scan(self, scan_data: ScanInput, guard_username: str) -> Dict:
        # Check if vehicle exists (permanent or visitor)
        vehicle = await self.vehicle_repo.find_by_plate_number(scan_data.plate_number)
        visitor = await self.visitor_repo.find_by_plate_number(scan_data.plate_number)
        
        if not vehicle and not visitor:
            raise HTTPException(status_code=404, detail="Vehicle not found in system")
        
        # Determine registration type and vehicle info
        if visitor:
            registration_type = RegistrationType.VISITOR
            vehicle_info = {
                "plate_number": visitor['plate_number'],
                "vehicle_type": visitor['vehicle_type'],
                "owner_name": f"{visitor['driver_license']['first_name']} {visitor['driver_license']['last_name']}"
            }
        else:
            registration_type = RegistrationType.PERMANENT
            vehicle_info = vehicle
        
        # Get latest log for this vehicle
        latest_log = await self.log_repo.find_latest_by_plate(scan_data.plate_number)
        
        # Prevent double scanning (cooldown of 60 seconds)
        if latest_log:
            last_timestamp = self.datetime_service.ensure_timezone_aware(latest_log['timestamp'])
            time_diff = (self.datetime_service.now_pht() - last_timestamp).total_seconds()
            if time_diff < 60:
                raise HTTPException(
                    status_code=429, 
                    detail="Vehicle was just scanned. Please wait a minute before scanning again."
                )
        
        # Determine action (entry or exit)
        is_inside = latest_log['is_inside'] if latest_log else False
        action = LogAction.EXIT if is_inside else LogAction.ENTRY
        
        # Create log entry
        log_data = {
            "plate_number": scan_data.plate_number,
            "action": action,
            "scan_method": scan_data.scan_method,
            "guard_username": guard_username,
            "is_inside": not is_inside,
            "timestamp": self.datetime_service.now_pht(),
            "registration_type": registration_type
        }
        
        if action == LogAction.ENTRY:
            log_data["entry_time"] = self.datetime_service.now_pht()
        else:
            log_data["exit_time"] = self.datetime_service.now_pht()
            if latest_log and latest_log.get('entry_time'):
                log_data["entry_time"] = latest_log['entry_time']
        
        log_obj = EntryExitLog(**log_data)
        await self.log_repo.create(log_obj.dict())
        
        # Check for warnings
        warning = None
        if registration_type == RegistrationType.VISITOR:
            if action == LogAction.ENTRY:
                warning = f"Visitor registration - Valid until {visitor['expires_at'].strftime('%Y-%m-%d %H:%M')}"
        elif vehicle_info.get('vehicle_type') == VehicleType.PRIVATE and action == LogAction.ENTRY:
            warning = "Timer started: 8 hours allowed for private vehicles"
        
        return {
            "message": f"Vehicle {action.value} recorded successfully",
            "action": action,
            "vehicle": vehicle_info,
            "registration_type": registration_type.value,
            "timestamp": log_obj.timestamp,
            "warning": warning
        }

class DashboardService:
    """Dashboard and reporting service"""
    
    def __init__(self):
        self.vehicle_repo = VehicleRepository()
        self.visitor_repo = VisitorRegistrationRepository()
        self.log_repo = EntryExitLogRepository()
        self.datetime_service = DateTimeService()
    
    async def get_vehicle_status(self) -> List[VehicleStatus]:
        # Get all vehicles currently inside using aggregation
        # A vehicle is inside if its latest log action is 'entry'
        pipeline = [
            {"$sort": {"timestamp": -1}},
            {"$group": {
                "_id": "$plate_number",
                "latest_log": {"$first": "$$ROOT"}
            }},
            {"$match": {"latest_log.action": "entry"}}
        ]
        
        cursor = self.log_repo.collection.aggregate(pipeline)
        inside_vehicles_raw = await cursor.to_list(1000)
        inside_vehicles = [convert_objectid_to_str(doc) for doc in inside_vehicles_raw]
        
        status_list = []
        current_time = self.datetime_service.now_pht()
        
        # Batch fetch all vehicles and visitors to avoid N+1 queries
        all_plate_numbers = [item['latest_log']['plate_number'] for item in inside_vehicles]
        
        # Fetch all matching vehicles in one query
        vehicles_cursor = self.vehicle_repo.collection.find({
            'plate_number': {'$in': all_plate_numbers},
            'is_active': True
        })
        vehicles_list = await vehicles_cursor.to_list(1000)
        vehicles_dict = {v['plate_number']: convert_objectid_to_str(v) for v in vehicles_list}
        
        # Fetch all matching visitors in one query
        visitors_cursor = self.visitor_repo.collection.find({
            'plate_number': {'$in': all_plate_numbers},
            'is_active': True,
            'expires_at': {'$gt': current_time}
        })
        visitors_list = await visitors_cursor.to_list(1000)
        visitors_dict = {v['plate_number']: convert_objectid_to_str(v) for v in visitors_list}
        
        for item in inside_vehicles:
            log = item['latest_log']
            
            # Lookup from pre-fetched dictionaries (O(1) instead of database query)
            vehicle = vehicles_dict.get(log['plate_number'])
            visitor = visitors_dict.get(log['plate_number'])
            
            vehicle_info = vehicle or visitor
            
            if vehicle_info:
                entry_time = log.get('entry_time')
                duration_hours = None
                is_overstaying = False
                registration_type = log.get('registration_type', RegistrationType.PERMANENT)
                
                if entry_time and isinstance(entry_time, datetime):
                    entry_time = self.datetime_service.ensure_timezone_aware(entry_time)
                    duration_hours = self.datetime_service.calculate_duration_hours(entry_time, current_time)
                    
                    # Check overstaying for applicable vehicles (8 hours limit)
                    applicable_types = [VehicleType.PRIVATE, VehicleType.PUBLIC, VehicleType.GOVERNMENT]
                    if vehicle_info.get('vehicle_type') in applicable_types and duration_hours > 8:
                        is_overstaying = True
                    
                    # Check overstaying for expired visitors
                    if registration_type == RegistrationType.VISITOR and visitor:
                        expires_at = visitor.get('expires_at')
                        if expires_at:
                            if isinstance(expires_at, str):
                                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                            expires_at = self.datetime_service.ensure_timezone_aware(expires_at)
                            if current_time > expires_at:
                                is_overstaying = True
                
                status_list.append(VehicleStatus(
                    plate_number=log['plate_number'],
                    is_inside=True,
                    entry_time=entry_time,
                    duration_hours=duration_hours,
                    is_overstaying=is_overstaying,
                    registration_type=registration_type
                ))
        
        # Sort consistently by entry time (newest entries at top)
        # Use fallback of 0 timestamp for None entry_times to prevent exceptions
        status_list.sort(key=lambda x: x.entry_time.timestamp() if x.entry_time else 0, reverse=True)
        
        return status_list
    
    async def get_dashboard_stats(self) -> Dict:
        # Get today's logs count
        today_logs = await self.log_repo.count_today()
        
        # Get total permanent vehicles
        total_vehicles = len(await self.vehicle_repo.find_all_active())
        
        # Get active visitors
        total_visitors = len(await self.visitor_repo.find_all_active())
        
        # Get vehicles currently inside
        vehicle_status = await self.get_vehicle_status()
        inside_count = len(vehicle_status)
        
        # Get overstaying vehicles
        overstaying_count = sum(1 for status in vehicle_status if status.is_overstaying)
        
        return {
            "today_entries_exits": today_logs,
            "total_vehicles": total_vehicles,
            "total_visitors": total_visitors,
            "vehicles_inside": inside_count,
            "overstaying_vehicles": overstaying_count
        }

class SyncService:
    """Data synchronization service for offline mobile app"""
    
    def __init__(self):
        self.visitor_service = VisitorRegistrationService()
        self.log_repo = EntryExitLogRepository()
    
    async def sync_offline_data(self, sync_data: SyncData) -> Dict:
        """Sync data from mobile device when it comes back online"""
        synced_registrations = 0
        synced_logs = 0
        errors = []
        
        # Sync visitor registrations
        for registration_data in sync_data.visitor_registrations:
            try:
                registration_create = VisitorRegistrationCreate(**registration_data)
                await self.visitor_service.register_visitor(registration_create)
                synced_registrations += 1
            except Exception as e:
                errors.append(f"Registration sync error: {str(e)}")
        
        # Sync entry/exit logs
        for log_data in sync_data.entry_exit_logs:
            try:
                log_obj = EntryExitLog(**log_data)
                await self.log_repo.create(log_obj.dict())
                synced_logs += 1
            except Exception as e:
                errors.append(f"Log sync error: {str(e)}")
        
        return {
            "synced_registrations": synced_registrations,
            "synced_logs": synced_logs,
            "errors": errors,
            "success": len(errors) == 0
        }

# Initialize services
auth_service = AuthService()
vehicle_service = VehicleService()
visitor_service = VisitorRegistrationService()
scan_service = ScanService()
dashboard_service = DashboardService()
sync_service = SyncService()

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    result = JWTService.decode_token(credentials.credentials)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["error"])
    
    payload = result["payload"]
    username = payload.get('username')
    role = payload.get('role')
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"username": username, "role": role}

# API Routes
@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    return await auth_service.register_user(user_data)

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    return await auth_service.login_user(login_data)

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return current_user

# Vehicle management routes
@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create vehicles")
    return await vehicle_service.create_vehicle(vehicle_data)

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(current_user: dict = Depends(get_current_user)):
    return await vehicle_service.get_all_vehicles()

@api_router.get("/vehicles/{plate_number}", response_model=Vehicle)
async def get_vehicle_by_plate(plate_number: str, current_user: dict = Depends(get_current_user)):
    vehicle = await vehicle_service.get_vehicle_by_plate(plate_number)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

# Visitor registration routes
@api_router.post("/visitor-registration", response_model=VisitorRegistration)
async def register_visitor(registration_data: VisitorRegistrationCreate, current_user: dict = Depends(get_current_user)):
    return await visitor_service.register_visitor(registration_data)

@api_router.get("/visitors", response_model=List[VisitorRegistration])
async def get_all_visitors(current_user: dict = Depends(get_current_user)):
    return await visitor_service.get_all_recent_visitors()

@api_router.get("/visitors/{plate_number}", response_model=VisitorRegistration)
async def get_visitor_by_plate(plate_number: str, current_user: dict = Depends(get_current_user)):
    visitor = await visitor_service.get_visitor_by_plate(plate_number)
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor registration not found")
    return visitor

# Scanning routes
@api_router.post("/scan")
async def process_scan(scan_data: ScanInput, current_user: dict = Depends(get_current_user)):
    return await scan_service.process_scan(scan_data, current_user['username'])

@api_router.get("/logs", response_model=List[EntryExitLog])
async def get_entry_exit_logs(
    limit: int = 50,
    plate_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    log_repo = EntryExitLogRepository()
    logs = await log_repo.find_all(limit, plate_number)
    import logging
    valid_logs = []
    for log in logs:
        try:
            valid_logs.append(EntryExitLog(**log))
        except Exception as e:
            logging.warning(f"Failed to parse log record {log.get('id')}: {e}")
    return valid_logs

# Dashboard routes
@api_router.get("/vehicle-status")
async def get_vehicles_status(current_user: dict = Depends(get_current_user)):
    return await dashboard_service.get_vehicle_status()

@api_router.get("/dashboard-stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    return await dashboard_service.get_dashboard_stats()

# Mobile/PWA specific routes
@api_router.post("/sync")
async def sync_offline_data(sync_data: SyncData, current_user: dict = Depends(get_current_user)):
    """Sync offline data when mobile device comes back online"""
    return await sync_service.sync_offline_data(sync_data)

@api_router.get("/barcode/{registration_id}")
async def generate_barcode_pdf(registration_id: str, current_user: dict = Depends(get_current_user)):
    """Generate printable barcode PDF for visitor registration"""
    # This would integrate with a barcode library to generate PDF
    # For now, return the barcode data
    visitor = await visitor_service.visitor_repo.find_by_id(registration_id)
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor registration not found")
    
    return {
        "barcode_data": visitor['barcode_data'],
        "plate_number": visitor['plate_number'],
        "expires_at": visitor['expires_at']
    }

# File serving routes
@api_router.get("/license-photo/{filename}")
async def get_license_photo(filename: str, current_user: dict = Depends(get_current_user)):
    """Serve license photo files"""
    file_path = Config.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(file_path)

# Database management routes (Admin only)
@api_router.get("/database/collections")
async def get_database_collections(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    collections_info = {}
    
    # Get collection stats
    collections = ['users', 'vehicles', 'visitor_registrations', 'entry_exit_logs']
    
    for collection_name in collections:
        collection = db[collection_name]
        
        if collection_name == 'vehicles':
            standard_count = await collection.count_documents({})
            da_count = await db['da-registrations'].count_documents({})
            count = standard_count + da_count
        else:
            count = await collection.count_documents({})
            
        # Get sample document for structure
        sample_doc = await collection.find_one({})
        
        collections_info[collection_name] = {
            "name": collection_name,
            "count": count,
            "sample_structure": list(sample_doc.keys()) if sample_doc else []
        }
    
    return collections_info

@api_router.get("/database/{collection_name}")
async def get_collection_data(
    collection_name: str, 
    skip: int = 0, 
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    allowed_collections = ['users', 'vehicles', 'visitor_registrations', 'entry_exit_logs']
    if collection_name not in allowed_collections:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    
    collection = db[collection_name]
    
    if collection_name == 'vehicles':
        # Get documents from standard vehicles with pagination
        cursor = collection.find({}).sort("created_at", -1)
        standard_docs = await cursor.to_list(1000)
        
        # Get from da-registrations
        da_cursor = db['da-registrations'].find({}).sort("timestamp", -1)
        da_docs = await da_cursor.to_list(1000)
        
        documents = []
        for doc in standard_docs:
            if '_id' in doc: doc['_id'] = str(doc['_id'])
            documents.append({
                "_id": doc.get('_id'),
                "plate_number": doc.get('plate_number'),
                "vehicle_type": doc.get('vehicle_type'),
                "owner_name": doc.get('owner_name'),
                "status_of_employment": doc.get('status_of_employment', 'N/A'),
                "classification": doc.get('department', 'N/A'),
                "is_active": doc.get('is_active', True)
            })
            
        for d in da_docs:
            documents.append({
                "_id": str(d.get("_id", d.get("id"))),
                "plate_number": d.get("vehicle", {}).get("plate_number"),
                "vehicle_type": d.get("vehicle", {}).get("type", "company"),
                "owner_name": f"{d.get('owner', {}).get('first_name', '')} {d.get('owner', {}).get('family_name', '')}".strip() or "Unknown",
                "status_of_employment": d.get("employment", {}).get("status", "N/A"),
                "classification": d.get("employment", {}).get("classification", "N/A"),
                "is_active": True
            })
            
        # Sort by status of employment
        def get_status_priority(doc):
            status = str(doc.get("status_of_employment", "")).lower()
            if "permanent" in status:
                return 1
            elif "contract of service" in status or status == "cos":
                return 2
            elif "job order" in status or status == "jo":
                return 3
            return 4
            
        documents.sort(key=get_status_priority)
            
        # Manually apply pagination to merged results
        total_count = len(documents)
        
        # Ensure skip and limit are integers for slicing
        skip_val = int(skip) if skip else 0
        limit_val = int(limit) if limit else 50
        documents = documents[skip_val : skip_val + limit_val]
        
    else:
        # Get documents with standard pagination
        cursor = collection.find({}).skip(skip).limit(limit).sort("created_at", -1)
        documents = await cursor.to_list(limit)
        
        # Convert ObjectId to string for JSON serialization
        for doc in documents:
            if '_id' in doc: doc['_id'] = str(doc['_id'])
        
        total_count = await collection.count_documents({})
    
    return {
        "collection": collection_name,
        "documents": documents,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@api_router.put("/database/{collection_name}/{document_id}")
async def update_document(
    collection_name: str,
    document_id: str,
    document_data: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    allowed_collections = ['users', 'vehicles', 'visitor_registrations', 'entry_exit_logs']
    if collection_name not in allowed_collections:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    
    collection = db[collection_name]
    # Remove _id from update data if present
    update_data = {k: v for k, v in document_data.items() if k != '_id'}
    
    # Auto-sync barcode_data for visitors if plate_number is updated
    if collection_name == 'visitor_registrations' and 'plate_number' in update_data:
        update_data['plate_number'] = update_data['plate_number'].upper()
        update_data['barcode_data'] = update_data['plate_number']
        
    # Update document
    result = await collection.update_one(
        {"id": document_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document updated successfully", "modified_count": result.modified_count}

@api_router.delete("/database/{collection_name}/{document_id}")
async def delete_document(
    collection_name: str,
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    allowed_collections = ['users', 'vehicles', 'visitor_registrations', 'entry_exit_logs']
    if collection_name not in allowed_collections:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    
    # Don't allow deleting the current admin user
    if collection_name == 'users':
        user_to_delete = await db.users.find_one({"id": document_id})
        if user_to_delete and user_to_delete['username'] == current_user['username']:
            raise HTTPException(status_code=400, detail="Cannot delete your own user account")
    
    collection = db[collection_name]
    
    # Delete document
    result = await collection.delete_one({"id": document_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully", "deleted_count": result.deleted_count}

@api_router.post("/database/{collection_name}")
async def create_document(
    collection_name: str,
    document_data: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    allowed_collections = ['users', 'vehicles', 'visitor_registrations', 'entry_exit_logs']
    if collection_name not in allowed_collections:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    
    collection = db[collection_name]
    
    # Add required fields
    document_data['id'] = str(uuid.uuid4())
    document_data['created_at'] = DateTimeService.now_pht()
    
    # Special handling for users (hash password)
    if collection_name == 'users' and 'password' in document_data:
        document_data['password'] = PasswordService.hash_password(document_data['password'])
    
    # Insert document
    result = await collection.insert_one(document_data)
    
    return {
        "message": "Document created successfully",
        "id": document_data['id'],
        "inserted_id": str(result.inserted_id)
    }

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db.notifications.find({}).sort("created_at", -1).limit(50)
    docs = await cursor.to_list(50)
    for doc in docs:
        doc['_id'] = str(doc['_id'])
    return docs

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.notifications.update_one({"id": notification_id}, {"$set": {"is_read": True}})
    return {"success": True}

@api_router.get("/tickets")
async def get_tickets(start_date: Optional[str] = None, end_date: Optional[str] = None):
    ticket_repo = TicketRepository()
    start = None
    end = None
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            start = DateTimeService.ensure_timezone_aware(start)
            end = DateTimeService.ensure_timezone_aware(end)
        except Exception:
            pass
    tickets = await ticket_repo.find_all(start, end)
    return tickets

class ManualTicketCreate(BaseModel):
    plate_number: str

@api_router.post("/tickets")
async def create_ticket(ticket_req: ManualTicketCreate):
    ticket_repo = TicketRepository()
    vehicle_repo = VehicleRepository()
    visitor_repo = VisitorRegistrationRepository()
    log_repo = EntryExitLogRepository()
    
    plate = ticket_req.plate_number
    
    # Needs entry_time, fetch latest entry log
    latest_log = await log_repo.find_latest_by_plate(plate)
    if not latest_log or not latest_log.get('entry_time'):
        raise HTTPException(status_code=400, detail="Vehicle is not currently logged inside.")
        
    entry_time = latest_log.get('entry_time')
    if isinstance(entry_time, str):
        entry_time = datetime.fromisoformat(entry_time.replace('Z', '+00:00'))
    
    # If already has active ticket
    if await ticket_repo.find_active_ticket(plate):
         raise HTTPException(status_code=400, detail="Active ticket already exists")
    
    v_info = await visitor_repo.find_by_plate_number(plate)
    p_info = await vehicle_repo.find_by_plate_number(plate)
    
    vehicle_type = "Unknown"
    owner_name = "Unknown"
    purpose = None
    license_num = None
    gender = None
    address = None
    
    if v_info:
        vehicle_type = v_info.get("vehicle_type", "private")
        dl = v_info.get("driver_license", {})
        owner_name = f"{dl.get('first_name','')} {dl.get('last_name','')}".strip()
        purpose = v_info.get("purpose_of_visit")
        license_num = dl.get("license_number")
        gender = dl.get("gender")
        address = dl.get("address")
    elif p_info:
        vehicle_type = p_info.get("vehicle_type", "da_government")
        owner_name = p_info.get("owner_name", "Unknown")
        
    new_ticket = OverstayingTicket(
        plate_number=plate,
        vehicle_type=vehicle_type,
        owner_name=owner_name,
        purpose_of_visit=purpose,
        license_number=license_num,
        gender=gender,
        address=address,
        entry_time=entry_time
    )
    return await ticket_repo.create(new_ticket.dict())

@api_router.put("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, update_data: TicketUpdate):
    ticket_repo = TicketRepository()
    
    update_dict = {
        "status": update_data.status.value,
        "updated_at": DateTimeService.now_pht()
    }
    
    if update_data.status == TicketStatus.RESOLVED:
        update_dict["resolved_at"] = DateTimeService.now_pht()
        update_dict["resolution_note"] = update_data.resolution_note
        update_dict["resolved_by"] = update_data.resolved_by
        
    if update_data.status == TicketStatus.ON_TRAVEL:
        update_dict["travel_order_number"] = update_data.travel_order_number
        update_dict["travel_location"] = update_data.travel_location
        update_dict["travel_end_date"] = update_data.travel_end_date
        
    if update_data.cause_of_overstaying:
        update_dict["cause_of_overstaying"] = update_data.cause_of_overstaying
        
    success = await ticket_repo.update(ticket_id, update_dict)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    return {"success": True, "message": "Ticket status updated"}

app.include_router(api_router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(Config.UPLOAD_DIR)), name="uploads")

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=Config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import asyncio

async def monitor_overstaying():
    while True:
        try:
            dashboard_service = DashboardService()
            ticket_repo = TicketRepository()
            vehicle_repo = VehicleRepository()
            visitor_repo = VisitorRegistrationRepository()
            
            status_list = await dashboard_service.get_vehicle_status()
            now = datetime.now(PHT_TZ)
            
            # First, check for any expired 'on_travel' tickets
            active_tickets = await ticket_repo.find_all()
            for ticket in active_tickets:
                if ticket.get("status") == TicketStatus.ON_TRAVEL.value and ticket.get("travel_end_date"):
                    end_date_str = ticket.get("travel_end_date")
                    if isinstance(end_date_str, str):
                         end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    else:
                         end_date = end_date_str
                    
                    if now > end_date:
                        # Revert back to overstaying
                        await ticket_repo.update(ticket["id"], {
                            "status": TicketStatus.OVERSTAYING.value,
                            "cause_of_overstaying": "Travel Exceeded Duration Limits",
                            "updated_at": now
                        })
                        # Ensure notification triggers
                        await db.notifications.insert_one(Notification(
                            title="Travel Duration Expired",
                            message=f"Vehicle {ticket.get('plate_number')} has exceeded its travel period and is overstaying.",
                            reference_id=ticket.get('plate_number')
                        ).dict())

            for status in status_list:
                if status.is_overstaying:
                    plate = status.plate_number
                    
                    # Create ticket if none active
                    if status.entry_time:
                        active_ticket = await ticket_repo.find_active_ticket(plate)
                        if not active_ticket:
                            v_info = await visitor_repo.find_by_plate_number(plate)
                            p_info = await vehicle_repo.find_by_plate_number(plate)
                            
                            vehicle_type = "Unknown"
                            owner_name = "Unknown"
                            purpose = None
                            license_num = None
                            gender = None
                            address = None
                            
                            if v_info:
                                vehicle_type = v_info.get("vehicle_type", "private")
                                dl = v_info.get("driver_license", {})
                                owner_name = f"{dl.get('first_name','')} {dl.get('last_name','')}".strip()
                                purpose = v_info.get("purpose_of_visit")
                                license_num = dl.get("license_number")
                                gender = dl.get("gender")
                                address = dl.get("address")
                            elif p_info:
                                vehicle_type = p_info.get("vehicle_type", "da_government")
                                owner_name = p_info.get("owner_name", "Unknown")
                            
                            new_ticket = OverstayingTicket(
                                plate_number=plate,
                                vehicle_type=vehicle_type,
                                owner_name=owner_name,
                                purpose_of_visit=purpose,
                                license_number=license_num,
                                gender=gender,
                                address=address,
                                entry_time=status.entry_time
                            )
                            await ticket_repo.create(new_ticket.dict())

                    today = datetime.now(PHT_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
                    existing = await db.notifications.find_one({
                        "reference_id": plate,
                        "created_at": {"$gte": today}
                    })
                    if not existing:
                        new_notif = Notification(
                            title="Vehicle Overstaying",
                            message=f"Vehicle {plate} has exceeded its allowed duration.",
                            reference_id=plate
                        )
                        await db.notifications.insert_one(new_notif.dict())
        except Exception as e:
            logger.error(f"Error in monitor_overstaying: {e}")
        
        await asyncio.sleep(60 * 15) # Check every 15 minutes

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(monitor_overstaying())