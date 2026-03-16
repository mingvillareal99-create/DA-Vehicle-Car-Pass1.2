import json
from pymongo import MongoClient

def upload_data():
    try:
        # Connect to MongoDB (default locahost:27017)
        print("Connecting to MongoDB...")
        client = MongoClient("mongodb://localhost:27017/")
        
        # Access database and collection
        db = client["vehicle_pass_db"]
        collection = db["da-registrations"]
        
        # Read the transformed JSON file
        print("Reading transformed_registrations.json...")
        with open("transformed_registrations.json", "r") as f:
            data = json.load(f)
            
        if not data:
            print("No data found to insert.")
            return

        # Insert data
        print(f"Uploading {len(data)} records to 'da-registrations' collection...")
        result = collection.insert_many(data)
        
        print(f"Successfully inserted {len(result.inserted_ids)} records!")
        
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    upload_data()
