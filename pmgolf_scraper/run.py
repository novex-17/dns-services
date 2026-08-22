import os
from scraper import scrape_categories
from excel_handler import update_excel_file
from notifier import send_alert

def main():
    # Example categories for daily scraping
    categories = [
        "https://www.pmgolfclub.com/product/driver",
        "https://www.pmgolfclub.com/product/fairway_wood",
        "https://www.pmgolfclub.com/product/iron_set"
    ]
    
    # You can configure this via env vars
    target_urls_env = os.environ.get('TARGET_URLS')
    if target_urls_env:
        categories = target_urls_env.split(',')
        
    print(f"Starting daily scrape for {len(categories)} categories...")
    
    # Scrape data
    # new_only can be configured via env var if needed
    data = scrape_categories(categories, new_only=False)
    
    print(f"Scraped {len(data)} products.")
    
    if not data:
        print("No data scraped. Exiting.")
        return
        
    file_path = "pmgolf_data.xlsx"
    print(f"Saving data and checking changes against {file_path}...")
    
    changes = update_excel_file(file_path, data)
    
    if changes:
        print(f"Found {len(changes)} changes. (Notifications are currently disabled)")
        # send_alert(changes)
    else:
        print("No changes detected.")
        
    print("Done!")

if __name__ == "__main__":
    main()
