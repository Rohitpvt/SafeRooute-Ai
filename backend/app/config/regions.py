from pydantic import BaseModel


class RegionConfig(BaseModel):
    region_name: str
    display_name: str
    bounding_box: tuple[float, float, float, float]  # (min_lat, min_lng, max_lat, max_lng)
    default_h3_resolution: int = 8
    description: str


REGIONS: dict[str, RegionConfig] = {
    "delhi_ncr": RegionConfig(
        region_name="delhi_ncr",
        display_name="Delhi National Capital Region",
        bounding_box=(28.40, 76.85, 28.88, 77.45),
        default_h3_resolution=8,
        description="Bounding box envelope covering Delhi, Gurgaon, Noida, Ghaziabad, and Faridabad.",
    )
}


def get_region_config(region_name: str = "delhi_ncr") -> RegionConfig:
    """Returns RegionConfig for the specified region name.
    
    Args:
        region_name: Name of region (e.g. 'delhi_ncr')
        
    Returns:
        RegionConfig instance.
    """
    if region_name not in REGIONS:
        raise ValueError(
            f"Region '{region_name}' is not configured. Configured regions: {list(REGIONS.keys())}"
        )
    return REGIONS[region_name]
