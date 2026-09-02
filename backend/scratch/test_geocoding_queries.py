import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.services.ai_geocoding_service import AIGeocodingService

async def main():
    service = AIGeocodingService()
    test_queries = [
        "Inderlok Delhi",
        "Inderlok",
        "Shalimar Bagh near Max Hospital",
        "Karol Bagh",
        "Cyber City",
        "Noida Sector 18",
    ]
    for q in test_queries:
        res = await service.geocode(q)
        print(f"Query: '{q}' -> Status: {res['match_status']}, Name: '{res['location_name']}', Source: {res['source']}, Coords: ({res['latitude']}, {res['longitude']})")

if __name__ == "__main__":
    asyncio.run(main())
